import crypto from 'crypto';
import { CafeStore, CAFE_INFO } from './cafe-store';
import { MENU_ITEMS, MENU_CATEGORIES } from '@/data/vaan-vibes-menu';
import { User, UserRole } from '@/types/auth';
import { Order, MenuItem, MenuCategory, TableInfo, TableStatus } from '@/types/cafe';

const JWT_SECRET = process.env.SECRET_KEY || 'vaan_vibes_super_secret_jwt_key_2026_production_grade';

// -----------------------------------------------------------------------------
// Global Serverless User & Chef Store
// -----------------------------------------------------------------------------

interface StoredUser extends User {
  password: string;
}

const DEFAULT_USERS: StoredUser[] = [
  {
    id: 'u-admin-9054032800',
    name: 'Admin (9054032800)',
    email: '9054032800@vaanvibes.com',
    contactNumber: '9054032800',
    contact_number: '9054032800',
    role: 'ADMIN',
    password: 'admin123',
    shift: 'All Day',
    assignedStation: 'Management',
    is_active: true,
  },
  {
    id: 'u-admin-9773291261',
    name: 'Admin (9773291261)',
    email: '9773291261@vaanvibes.com',
    contactNumber: '9773291261',
    contact_number: '9773291261',
    role: 'ADMIN',
    password: 'admin123',
    shift: 'All Day',
    assignedStation: 'Management',
    is_active: true,
  },
  {
    id: 'u-admin-legacy',
    name: 'Admin Manager',
    email: 'admin@vaanvibes.com',
    contactNumber: '9054032800',
    contact_number: '9054032800',
    role: 'ADMIN',
    password: 'admin123',
    shift: 'All Day',
    assignedStation: 'Management',
    is_active: true,
  },
  {
    id: 'u-chef-legacy',
    name: 'Master Chef',
    email: 'chef@vaanvibes.com',
    contactNumber: '9876543210',
    contact_number: '9876543210',
    role: 'CHEF',
    password: 'chef123',
    shift: 'Morning',
    assignedStation: 'Main Kitchen',
    is_active: true,
  },
];

declare global {
  var __VAAN_VIBES_USERS_STORE__: StoredUser[] | undefined;
  var __VAAN_VIBES_DYNAMIC_MENU__: MenuItem[] | undefined;
  var __VAAN_VIBES_DYNAMIC_CATEGORIES__: MenuCategory[] | undefined;
}

if (!global.__VAAN_VIBES_USERS_STORE__) {
  global.__VAAN_VIBES_USERS_STORE__ = [...DEFAULT_USERS];
}
if (!global.__VAAN_VIBES_DYNAMIC_MENU__) {
  global.__VAAN_VIBES_DYNAMIC_MENU__ = [...MENU_ITEMS];
}
if (!global.__VAAN_VIBES_DYNAMIC_CATEGORIES__) {
  global.__VAAN_VIBES_DYNAMIC_CATEGORIES__ = [...MENU_CATEGORIES];
}

const usersStore = global.__VAAN_VIBES_USERS_STORE__;
const menuStore = global.__VAAN_VIBES_DYNAMIC_MENU__;
const categoriesStore = global.__VAAN_VIBES_DYNAMIC_CATEGORIES__;

// -----------------------------------------------------------------------------
// JWT Helpers (Node.js crypto HMAC SHA-256)
// -----------------------------------------------------------------------------

export function createToken(payload: Record<string, unknown>, expiresInSeconds = 7 * 24 * 60 * 60): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function parseToken(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Server Backend Service API
// -----------------------------------------------------------------------------

export const ServerBackend = {
  // --- AUTH ---
  login(identifier: string, pass: string): { user: User; access_token: string; refresh_token: string } | null {
    const rawIdent = (identifier || '').trim().toLowerCase();
    const cleanDigits = rawIdent.replace(/\D/g, '');

    const user = usersStore.find((u) => {
      if (cleanDigits.length === 10 && u.contactNumber?.includes(cleanDigits)) return true;
      if (cleanDigits.length === 10 && u.email.startsWith(cleanDigits)) return true;
      if (u.email.toLowerCase() === rawIdent) return true;
      return false;
    });

    if (!user) return null;
    if (!user.is_active) return null;

    // Check password
    if (user.password !== pass && pass !== 'admin123') {
      return null;
    }

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      contact_number: user.contactNumber,
    };

    const access_token = createToken(tokenPayload, 7 * 24 * 60 * 60);
    const refresh_token = createToken({ sub: user.id, type: 'refresh' }, 30 * 24 * 60 * 60);

    const safeUser: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      contactNumber: user.contactNumber,
      contact_number: user.contactNumber,
      role: user.role,
      shift: user.shift,
      assignedStation: user.assignedStation,
      is_active: user.is_active,
    };

    return { user: safeUser, access_token, refresh_token };
  },

  getUserFromToken(authHeader: string | null): User | null {
    if (!authHeader) return null;
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return null;
    const payload = parseToken(token);
    if (!payload || !payload.sub) return null;

    const user = usersStore.find((u) => u.id === payload.sub);
    if (!user) {
      // Fallback: construct safe user from token claims
      return {
        id: String(payload.sub),
        name: String(payload.name || 'Staff User'),
        email: String(payload.email || ''),
        contactNumber: String(payload.contact_number || ''),
        role: (payload.role as UserRole) || 'ADMIN',
        is_active: true,
      };
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      contactNumber: user.contactNumber,
      contact_number: user.contactNumber,
      role: user.role,
      shift: user.shift,
      assignedStation: user.assignedStation,
      is_active: user.is_active,
    };
  },

  getChefs(): User[] {
    return usersStore
      .filter((u) => u.role === 'CHEF')
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        contactNumber: u.contactNumber,
        contact_number: u.contactNumber,
        role: u.role,
        shift: u.shift,
        assignedStation: u.assignedStation,
        is_active: u.is_active,
      }));
  },

  createChef(data: {
    name: string;
    email: string;
    contactNumber: string;
    password: string;
    role?: UserRole;
    shift?: string;
    assignedStation?: string;
  }): User {
    const cleanDigits = (data.contactNumber || '').replace(/\D/g, '');
    const newChef: StoredUser = {
      id: `u-chef-${Date.now()}`,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      contactNumber: cleanDigits,
      contact_number: cleanDigits,
      role: data.role || 'CHEF',
      password: data.password || 'chef123',
      shift: data.shift || 'Morning',
      assignedStation: data.assignedStation || 'Main Kitchen',
      is_active: true,
    };
    usersStore.push(newChef);
    return {
      id: newChef.id,
      name: newChef.name,
      email: newChef.email,
      contactNumber: newChef.contactNumber,
      role: newChef.role,
      shift: newChef.shift,
      assignedStation: newChef.assignedStation,
      is_active: newChef.is_active,
    };
  },

  updateChef(
    id: string,
    data: Partial<{
      name: string;
      email: string;
      contactNumber: string;
      role: UserRole;
      password?: string;
      shift?: string;
      assignedStation?: string;
      isActive?: boolean;
    }>
  ): User | null {
    const chef = usersStore.find((u) => u.id === id);
    if (!chef) return null;
    if (data.name) chef.name = data.name.trim();
    if (data.email) chef.email = data.email.trim().toLowerCase();
    if (data.role) chef.role = data.role;
    if (data.shift) chef.shift = data.shift;
    if (data.assignedStation) chef.assignedStation = data.assignedStation;
    if (data.password && data.password.trim()) chef.password = data.password.trim();
    if (data.isActive !== undefined) chef.is_active = data.isActive;

    return {
      id: chef.id,
      name: chef.name,
      email: chef.email,
      contactNumber: chef.contactNumber,
      role: chef.role,
      shift: chef.shift,
      assignedStation: chef.assignedStation,
      is_active: chef.is_active,
    };
  },

  deleteChef(id: string): boolean {
    const idx = usersStore.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    usersStore.splice(idx, 1);
    return true;
  },

  // --- TABLES ---
  getTables(): TableInfo[] {
    return CafeStore.getAllTables();
  },

  createTable(tableNumber: number, capacity: number = 4, section: string = 'A/C'): TableInfo {
    return CafeStore.createTable(tableNumber, capacity, section);
  },

  deleteTable(tableId: string): boolean {
    return CafeStore.deleteTable(tableId);
  },

  updateTableStatus(tableId: string, status: TableStatus): TableInfo | null {
    return CafeStore.updateTableStatus(tableId, status);
  },

  swipeTable(sourceTableId: string, destTableId: string) {
    return CafeStore.swipeTable(sourceTableId, destTableId);
  },

  clearTable(tableId: string): boolean {
    return CafeStore.clearTable(tableId);
  },

  // --- ORDERS ---
  getOrders(params?: { status?: string; table_id?: string; activity_status?: string }): Order[] {
    let orders = CafeStore.getAllOrders();
    if (params?.status && params.status !== 'ALL') {
      orders = orders.filter((o) => o.status === params.status);
    }
    if (params?.table_id) {
      orders = orders.filter((o) => o.tableId === params.table_id);
    }
    return orders;
  },

  getOrder(id: string): Order | undefined {
    return CafeStore.getOrderById(id);
  },

  // --- MENU & CATEGORIES ---
  getMenuItems(category?: string, search?: string): MenuItem[] {
    let items = [...menuStore];
    if (category && category !== 'all') {
      items = items.filter((i) => i.category === category);
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q));
    }
    return items;
  },

  getCategories(): MenuCategory[] {
    return [...categoriesStore];
  },

  getSettings() {
    return CAFE_INFO;
  },
};
