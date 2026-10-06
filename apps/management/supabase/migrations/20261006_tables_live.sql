-- Migration: 20261006_tables_live.sql
-- Table Live Dashboard Schema Enhancements, Security Policies & Atomic Stored Procedures

-- 1. Tables Table Enhancements
ALTER TABLE tables 
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS zone TEXT DEFAULT 'Indoor',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_tables_sort_order ON tables(sort_order);
CREATE INDEX IF NOT EXISTS idx_tables_zone ON tables(zone);
CREATE INDEX IF NOT EXISTS idx_tables_deleted_at ON tables(deleted_at);

-- 2. Table Sessions Table Enhancements (Discounts & Atomic Settlements)
ALTER TABLE dining_sessions 
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS discount_type TEXT NULL,
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS discount_reason TEXT NULL;

-- 3. Cafes Settings Enhancements
ALTER TABLE cafe_settings
  ADD COLUMN IF NOT EXISTS staff_max_discount_percent NUMERIC(5, 2) DEFAULT 10.00;

-- 4. Service Requests Table (if not exists)
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id TEXT NOT NULL DEFAULT 'van-vibes',
  table_id TEXT NOT NULL,
  table_number INTEGER NOT NULL,
  session_id TEXT NULL,
  request_type TEXT NOT NULL, -- 'request_bill', 'call_waiter', 'water', 'cleaning'
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'IN_PROGRESS', 'RESOLVED'
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  resolved_at TIMESTAMPTZ NULL,
  resolved_by TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_service_requests_cafe_status ON service_requests(cafe_id, status);
CREATE INDEX IF NOT EXISTS idx_service_requests_table_id ON service_requests(table_id);

-- =========================================================================
-- Stored Procedure 1: get_tables_live(p_cafe_id uuid/text)
-- Returns all active tables with their live status, active session, running total,
-- order count, item count, oldest unserved order time, and active service requests.
-- =========================================================================
CREATE OR REPLACE FUNCTION get_tables_live(p_cafe_id TEXT DEFAULT 'van-vibes')
RETURNS TABLE (
  id TEXT,
  table_number INTEGER,
  name TEXT,
  capacity INTEGER,
  sort_order INTEGER,
  zone TEXT,
  is_active BOOLEAN,
  state TEXT, -- 'FREE', 'OCCUPIED', 'READY', 'ATTENTION', 'BILL_REQUESTED', 'INACTIVE'
  open_session_id TEXT,
  session_start_time TIMESTAMPTZ,
  running_total NUMERIC,
  order_count BIGINT,
  item_count BIGINT,
  oldest_unserved_order_time TIMESTAMPTZ,
  has_ready_order BOOLEAN,
  open_request_types TEXT[]
)
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  WITH active_sessions AS (
    SELECT 
      ds.id AS session_id,
      ds.table_id,
      ds.created_at AS session_created_at,
      COALESCE(ds.discount_amount, 0.00) AS discount_amount,
      COALESCE(ds.discount_type, '') AS discount_type
    FROM dining_sessions ds
    WHERE ds.status = 'OPEN'
  ),
  session_orders AS (
    SELECT 
      o.dining_session_id,
      COUNT(o.id) AS ord_cnt,
      COALESCE(SUM(o.subtotal), 0.00) AS sum_subtotal,
      MIN(CASE WHEN o.status NOT IN ('SERVED', 'COMPLETED', 'CANCELLED') THEN o.created_at ELSE NULL END) AS oldest_pending_time,
      BOOL_OR(o.status = 'READY') AS has_ready
    FROM orders o
    WHERE o.status != 'CANCELLED'
    GROUP BY o.dining_session_id
  ),
  session_items AS (
    SELECT 
      o.dining_session_id,
      COALESCE(SUM(oi.quantity), 0) AS total_items
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.status != 'CANCELLED'
    GROUP BY o.dining_session_id
  ),
  table_requests AS (
    SELECT 
      sr.table_id,
      ARRAY_AGG(sr.request_type) AS req_types
    FROM service_requests sr
    WHERE sr.status = 'PENDING'
    GROUP BY sr.table_id
  )
  SELECT
    t.id,
    t.table_number,
    t.name,
    t.capacity,
    t.sort_order,
    COALESCE(t.zone, 'Indoor') AS zone,
    t.is_active,
    CASE
      WHEN NOT t.is_active THEN 'INACTIVE'
      WHEN 'request_bill' = ANY(COALESCE(tr.req_types, ARRAY[]::TEXT[])) THEN 'BILL_REQUESTED'
      WHEN (COALESCE(so.has_ready, false) = true) THEN 'READY'
      WHEN (so.oldest_pending_time IS NOT NULL AND so.oldest_pending_time < (NOW() - INTERVAL '15 minutes'))
           OR ('call_waiter' = ANY(COALESCE(tr.req_types, ARRAY[]::TEXT[]))) THEN 'ATTENTION'
      WHEN ases.session_id IS NOT NULL THEN 'OCCUPIED'
      ELSE 'FREE'
    END AS state,
    ases.session_id AS open_session_id,
    ases.session_created_at AS session_start_time,
    COALESCE(so.sum_subtotal, 0.00) AS running_total,
    COALESCE(so.ord_cnt, 0) AS order_count,
    COALESCE(si.total_items, 0) AS item_count,
    so.oldest_pending_time AS oldest_unserved_order_time,
    COALESCE(so.has_ready, false) AS has_ready_order,
    COALESCE(tr.req_types, ARRAY[]::TEXT[]) AS open_request_types
  FROM tables t
  LEFT JOIN active_sessions ases ON ases.table_id = t.id
  LEFT JOIN session_orders so ON so.dining_session_id = ases.session_id
  LEFT JOIN session_items si ON si.dining_session_id = ases.session_id
  LEFT JOIN table_requests tr ON tr.table_id = t.id
  WHERE t.deleted_at IS NULL
  ORDER BY t.sort_order ASC, t.table_number ASC;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- Stored Procedure 2: get_today_order_stats(p_cafe_id text)
-- Returns today's KPI metrics for midnight to midnight Asia/Kolkata timezone.
-- =========================================================================
CREATE OR REPLACE FUNCTION get_today_order_stats(p_cafe_id TEXT DEFAULT 'van-vibes')
RETURNS TABLE (
  revenue_today NUMERIC,
  orders_today BIGINT,
  running_orders BIGINT,
  completed_orders BIGINT,
  occupied_tables BIGINT,
  total_tables BIGINT,
  average_order_value NUMERIC
)
SECURITY INVOKER
AS $$
DECLARE
  today_start TIMESTAMPTZ;
  today_end TIMESTAMPTZ;
BEGIN
  -- Midnight to midnight in Asia/Kolkata
  today_start := date_trunc('day', timezone('Asia/Kolkata', now())) AT TIME ZONE 'Asia/Kolkata';
  today_end := today_start + INTERVAL '1 day';

  RETURN QUERY
  WITH today_orders AS (
    SELECT 
      o.id,
      o.total,
      o.subtotal,
      o.status
    FROM orders o
    WHERE o.created_at >= today_start 
      AND o.created_at < today_end
      AND o.status != 'CANCELLED'
  ),
  running_stats AS (
    SELECT COUNT(*) AS running_cnt
    FROM orders o
    WHERE o.created_at >= today_start 
      AND o.created_at < today_end
      AND o.status IN ('PLACED', 'ORDER_PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'IN_KITCHEN')
  ),
  completed_stats AS (
    SELECT COUNT(*) AS completed_cnt
    FROM orders o
    WHERE o.created_at >= today_start 
      AND o.created_at < today_end
      AND o.status IN ('SERVED', 'COMPLETED')
  ),
  table_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE t.status = 'OCCUPIED' AND t.is_active = true AND t.deleted_at IS NULL) AS occ_tables,
      COUNT(*) FILTER (WHERE t.is_active = true AND t.deleted_at IS NULL) AS tot_tables
    FROM tables t
  )
  SELECT
    COALESCE(SUM(to_ord.total), 0.00) AS revenue_today,
    COUNT(to_ord.id) AS orders_today,
    rs.running_cnt AS running_orders,
    cs.completed_cnt AS completed_orders,
    ts.occ_tables AS occupied_tables,
    ts.tot_tables AS total_tables,
    CASE 
      WHEN COUNT(to_ord.id) > 0 THEN ROUND(COALESCE(SUM(to_ord.total), 0.00) / COUNT(to_ord.id), 2)
      ELSE 0.00
    END AS average_order_value
  FROM today_orders to_ord
  CROSS JOIN running_stats rs
  CROSS JOIN completed_stats cs
  CROSS JOIN table_stats ts
  GROUP BY rs.running_cnt, cs.completed_cnt, ts.occ_tables, ts.tot_tables;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- Stored Procedure 3: transfer_table_session(p_source_table_id text, p_dest_table_id text)
-- Transfers an active session & its orders to a FREE destination table atomically.
-- =========================================================================
CREATE OR REPLACE FUNCTION transfer_table_session(
  p_source_table_id TEXT,
  p_dest_table_id TEXT
)
RETURNS TABLE (
  session_id TEXT,
  source_table_id TEXT,
  dest_table_id TEXT,
  order_count BIGINT
)
SECURITY INVOKER
AS $$
DECLARE
  v_session_id TEXT;
  v_dest_status TEXT;
  v_dest_table_number INT;
  v_order_count BIGINT;
BEGIN
  -- 1. Check destination table is AVAILABLE
  SELECT status, table_number INTO v_dest_status, v_dest_table_number
  FROM tables
  WHERE id = p_dest_table_id AND is_active = true AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Destination table % does not exist or is inactive', p_dest_table_id;
  END IF;

  IF v_dest_status != 'AVAILABLE' THEN
    RAISE EXCEPTION 'Destination table is currently % (must be AVAILABLE)', v_dest_status;
  END IF;

  -- 2. Find active session on source
  SELECT id INTO v_session_id
  FROM dining_sessions
  WHERE table_id = p_source_table_id AND status = 'OPEN'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active open session found on table %', p_source_table_id;
  END IF;

  -- 3. Atomic transfer
  UPDATE dining_sessions
  SET table_id = p_dest_table_id,
      table_number = v_dest_table_number,
      updated_at = timezone('utc', now())
  WHERE id = v_session_id;

  UPDATE orders
  SET table_id = p_dest_table_id,
      table_number = v_dest_table_number,
      updated_at = timezone('utc', now())
  WHERE dining_session_id = v_session_id;

  GET DIAGNOSTICS v_order_count = ROW_COUNT;

  UPDATE tables SET status = 'AVAILABLE', updated_at = timezone('utc', now()) WHERE id = p_source_table_id;
  UPDATE tables SET status = 'OCCUPIED', updated_at = timezone('utc', now()) WHERE id = p_dest_table_id;

  RETURN QUERY SELECT v_session_id, p_source_table_id, p_dest_table_id, v_order_count;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- Stored Procedure 4: merge_table_sessions(p_source_session_id text, p_target_session_id text)
-- Merges source session into target session atomically.
-- =========================================================================
CREATE OR REPLACE FUNCTION merge_table_sessions(
  p_source_session_id TEXT,
  p_target_session_id TEXT
)
RETURNS TABLE (
  target_session_id TEXT,
  source_table_id TEXT,
  merged_order_count BIGINT
)
SECURITY INVOKER
AS $$
DECLARE
  v_source_table_id TEXT;
  v_target_table_id TEXT;
  v_target_table_number INT;
  v_count BIGINT;
BEGIN
  -- Verify sessions exist & open
  SELECT table_id INTO v_source_table_id
  FROM dining_sessions WHERE id = p_source_session_id AND status = 'OPEN' FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source session % is not open', p_source_session_id;
  END IF;

  SELECT table_id, table_number INTO v_target_table_id, v_target_table_number
  FROM dining_sessions WHERE id = p_target_session_id AND status = 'OPEN' FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target session % is not open', p_target_session_id;
  END IF;

  -- Reassign all orders from source to target
  UPDATE orders
  SET dining_session_id = p_target_session_id,
      table_id = v_target_table_id,
      table_number = v_target_table_number,
      updated_at = timezone('utc', now())
  WHERE dining_session_id = p_source_session_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Close source session
  UPDATE dining_sessions
  SET status = 'CLOSED',
      closed_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  WHERE id = p_source_session_id;

  -- Free source table if no other open sessions
  UPDATE tables
  SET status = 'AVAILABLE', updated_at = timezone('utc', now())
  WHERE id = v_source_table_id;

  RETURN QUERY SELECT p_target_session_id, v_source_table_id, v_count;
END;
$$ LANGUAGE plpgsql;
