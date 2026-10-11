/**
 * Persistence for tables and orders (bills live on the orders).
 *
 * - With DATABASE_URL (or POSTGRES_URL) set, data is stored in Postgres so it survives
 *   serverless cold starts and is shared by every Vercel instance.
 * - Without it (unit tests, quick local runs) an in-memory store is used.
 *
 * All writes go through `withWrite`, which serializes them (a Postgres advisory lock or an
 * in-process queue) so two phones ordering at once cannot overwrite each other.
 */
import { Pool, PoolClient } from 'pg';
import { Order, TableInfo } from '@/types/cafe';

export interface OrderQuery {
  tableId?: string;
  sessionToken?: string;
  /** Only orders that are not yet paid. */
  unpaidOnly?: boolean;
  from?: Date;
  to?: Date;
}

export interface StoreRepo {
  listTables(): Promise<TableInfo[]>;
  saveTables(tables: TableInfo[]): Promise<void>;
  deleteTable(id: string): Promise<boolean>;
  /** Newest first. */
  listOrders(query?: OrderQuery): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  saveOrders(orders: Order[]): Promise<void>;
  nextOrderNumber(): Promise<number>;
  /** Deletes every order and replaces the tables. */
  resetAll(tables: TableInfo[]): Promise<void>;
}

export const FIRST_ORDER_NUMBER = 1001;

let initialTablesFactory: () => TableInfo[] = () => [];

/** The store module registers how to build the default tables for first-run seeding. */
export function setInitialTablesFactory(factory: () => TableInfo[]) {
  initialTablesFactory = factory;
}

function connectionString(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(connectionString());
}

function matchesQuery(o: Order, q: OrderQuery): boolean {
  if (q.tableId && o.tableId !== q.tableId) return false;
  if (q.sessionToken && o.sessionToken !== q.sessionToken) return false;
  if (q.unpaidOnly && o.paymentStatus === 'PAID') return false;
  const created = new Date(o.createdAt).getTime();
  if (q.from && created < q.from.getTime()) return false;
  if (q.to && created > q.to.getTime()) return false;
  return true;
}

const byNewest = (a: Order, b: Order) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
const byNumber = (a: TableInfo, b: TableInfo) => a.tableNumber - b.tableNumber;

// -----------------------------------------------------------------------------
// In-memory implementation
// -----------------------------------------------------------------------------

interface MemoryState {
  tables: TableInfo[] | null;
  orders: Order[];
  orderCounter: number;
  queue: Promise<unknown>;
}

declare global {
  var __VAAN_VIBES_MEMORY_DB__: MemoryState | undefined;
}

function memoryState(): MemoryState {
  if (!global.__VAAN_VIBES_MEMORY_DB__) {
    global.__VAAN_VIBES_MEMORY_DB__ = {
      tables: null,
      orders: [],
      orderCounter: FIRST_ORDER_NUMBER,
      queue: Promise.resolve(),
    };
  }
  const state = global.__VAAN_VIBES_MEMORY_DB__;
  if (!state.tables) state.tables = initialTablesFactory();
  return state;
}

// Copies in and out so callers must save explicitly, exactly like the database.
const clone = <T>(v: T): T => structuredClone(v);

const memoryRepo: StoreRepo = {
  async listTables() {
    return clone(memoryState().tables!).sort(byNumber);
  },
  async saveTables(tables) {
    const state = memoryState();
    for (const t of tables) {
      const idx = state.tables!.findIndex((x) => x.id === t.id);
      if (idx === -1) state.tables!.push(clone(t));
      else state.tables![idx] = clone(t);
    }
  },
  async deleteTable(id) {
    const state = memoryState();
    const before = state.tables!.length;
    state.tables = state.tables!.filter((t) => t.id !== id);
    return state.tables.length !== before;
  },
  async listOrders(query = {}) {
    return clone(memoryState().orders.filter((o) => matchesQuery(o, query))).sort(byNewest);
  },
  async getOrder(id) {
    const found = memoryState().orders.find((o) => o.id === id);
    return found ? clone(found) : undefined;
  },
  async saveOrders(orders) {
    const state = memoryState();
    for (const o of orders) {
      const idx = state.orders.findIndex((x) => x.id === o.id);
      if (idx === -1) state.orders.push(clone(o));
      else state.orders[idx] = clone(o);
    }
  },
  async nextOrderNumber() {
    return memoryState().orderCounter++;
  },
  async resetAll(tables) {
    const state = memoryState();
    state.orders = [];
    state.tables = clone(tables);
    state.orderCounter = FIRST_ORDER_NUMBER;
  },
};

// -----------------------------------------------------------------------------
// Postgres implementation
// -----------------------------------------------------------------------------

declare global {
  var __VAAN_VIBES_PG_POOL__: Pool | undefined;
  var __VAAN_VIBES_PG_READY__: Promise<void> | undefined;
}

const WRITE_LOCK_KEY = 727001;

function pool(): Pool {
  if (!global.__VAAN_VIBES_PG_POOL__) {
    const url = connectionString()!;
    global.__VAAN_VIBES_PG_POOL__ = new Pool({
      connectionString: url,
      max: 3,
      idleTimeoutMillis: 10_000,
      ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
    });
  }
  return global.__VAAN_VIBES_PG_POOL__;
}

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS vv_tables (
    id TEXT PRIMARY KEY,
    table_number INTEGER NOT NULL,
    data JSONB NOT NULL
  );
  CREATE TABLE IF NOT EXISTS vv_orders (
    id TEXT PRIMARY KEY,
    table_id TEXT,
    session_token TEXT,
    payment_status TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    data JSONB NOT NULL
  );
  CREATE INDEX IF NOT EXISTS vv_orders_table_idx ON vv_orders (table_id, payment_status);
  CREATE INDEX IF NOT EXISTS vv_orders_session_idx ON vv_orders (session_token);
  CREATE INDEX IF NOT EXISTS vv_orders_created_idx ON vv_orders (created_at DESC);
  CREATE TABLE IF NOT EXISTS vv_meta (
    key TEXT PRIMARY KEY,
    value BIGINT NOT NULL
  );
`;

async function ensureSchema(): Promise<void> {
  if (!global.__VAAN_VIBES_PG_READY__) {
    global.__VAAN_VIBES_PG_READY__ = (async () => {
      const client = await pool().connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock($1)', [WRITE_LOCK_KEY]);
        await client.query(SCHEMA_SQL);
        // Seed the default tables exactly once (not again if an admin later deletes them all).
        const seeded = await client.query(`SELECT 1 FROM vv_meta WHERE key = 'seeded'`);
        if (seeded.rowCount === 0) {
          await upsertTables(client, initialTablesFactory());
          await client.query(
            `INSERT INTO vv_meta (key, value) VALUES ('seeded', 1), ('order_counter', $1)
             ON CONFLICT (key) DO NOTHING`,
            [FIRST_ORDER_NUMBER - 1]
          );
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        global.__VAAN_VIBES_PG_READY__ = undefined;
        throw err;
      } finally {
        client.release();
      }
    })();
  }
  return global.__VAAN_VIBES_PG_READY__;
}

async function upsertTables(client: PoolClient, tables: TableInfo[]) {
  for (const t of tables) {
    await client.query(
      `INSERT INTO vv_tables (id, table_number, data) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET table_number = EXCLUDED.table_number, data = EXCLUDED.data`,
      [t.id, t.tableNumber, JSON.stringify(t)]
    );
  }
}

function pgRepo(client: PoolClient): StoreRepo {
  return {
    async listTables() {
      const res = await client.query<{ data: TableInfo }>('SELECT data FROM vv_tables ORDER BY table_number');
      return res.rows.map((r) => r.data);
    },
    async saveTables(tables) {
      await upsertTables(client, tables);
    },
    async deleteTable(id) {
      const res = await client.query('DELETE FROM vv_tables WHERE id = $1', [id]);
      return (res.rowCount ?? 0) > 0;
    },
    async listOrders(query = {}) {
      const where: string[] = [];
      const params: unknown[] = [];
      const add = (sql: string, value: unknown) => {
        params.push(value);
        where.push(sql.replace('?', `$${params.length}`));
      };
      if (query.tableId) add('table_id = ?', query.tableId);
      if (query.sessionToken) add('session_token = ?', query.sessionToken);
      if (query.unpaidOnly) where.push(`payment_status IS DISTINCT FROM 'PAID'`);
      if (query.from) add('created_at >= ?', query.from.toISOString());
      if (query.to) add('created_at <= ?', query.to.toISOString());
      const res = await client.query<{ data: Order }>(
        `SELECT data FROM vv_orders ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC`,
        params
      );
      return res.rows.map((r) => r.data);
    },
    async getOrder(id) {
      const res = await client.query<{ data: Order }>('SELECT data FROM vv_orders WHERE id = $1', [id]);
      return res.rows[0]?.data;
    },
    async saveOrders(orders) {
      for (const o of orders) {
        await client.query(
          `INSERT INTO vv_orders (id, table_id, session_token, payment_status, created_at, data)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET
             table_id = EXCLUDED.table_id,
             session_token = EXCLUDED.session_token,
             payment_status = EXCLUDED.payment_status,
             data = EXCLUDED.data`,
          [o.id, o.tableId, o.sessionToken, o.paymentStatus, o.createdAt, JSON.stringify(o)]
        );
      }
    },
    async nextOrderNumber() {
      const res = await client.query<{ value: string }>(
        `INSERT INTO vv_meta (key, value) VALUES ('order_counter', $1)
         ON CONFLICT (key) DO UPDATE SET value = vv_meta.value + 1
         RETURNING value`,
        [FIRST_ORDER_NUMBER]
      );
      return Number(res.rows[0].value);
    },
    async resetAll(tables) {
      await client.query('DELETE FROM vv_orders');
      await client.query('DELETE FROM vv_tables');
      await upsertTables(client, tables);
      await client.query(
        `INSERT INTO vv_meta (key, value) VALUES ('order_counter', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [FIRST_ORDER_NUMBER - 1]
      );
    },
  };
}

// -----------------------------------------------------------------------------
// Public entry points
// -----------------------------------------------------------------------------

/** Runs read-only work against the store. */
export async function withRead<T>(fn: (repo: StoreRepo) => Promise<T>): Promise<T> {
  if (!isDatabaseConfigured()) return fn(memoryRepo);
  await ensureSchema();
  const client = await pool().connect();
  try {
    return await fn(pgRepo(client));
  } finally {
    client.release();
  }
}

/** Runs work that changes data; writes are serialized and all-or-nothing. */
export async function withWrite<T>(fn: (repo: StoreRepo) => Promise<T>): Promise<T> {
  if (!isDatabaseConfigured()) {
    const state = memoryState();
    const run = state.queue.then(() => fn(memoryRepo));
    state.queue = run.catch(() => {});
    return run;
  }
  await ensureSchema();
  const client = await pool().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [WRITE_LOCK_KEY]);
    const result = await fn(pgRepo(client));
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
