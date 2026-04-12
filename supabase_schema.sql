-- ============================================================
-- Allway Taxi — Full Schema Migration  (fixed table order)
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run All
-- ============================================================

-- Enable PostGIS for driver location geometry
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- 1. PROFILES  (extends auth.users)
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text NOT NULL,
  role       text NOT NULL DEFAULT 'dispatcher' CHECK (role IN ('admin', 'dispatcher')),
  initials   text,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (NEW.id, NEW.email, 'dispatcher');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 2. CUSTOMERS
-- ============================================================

CREATE TABLE IF NOT EXISTS customers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name    text NOT NULL,
  phone        text UNIQUE NOT NULL,
  language     text DEFAULT 'Arabic' CHECK (language IN ('Arabic','English','French')),
  status       text DEFAULT 'regular' CHECK (status IN ('vip','regular','blocked')),
  total_trips  int DEFAULT 0,
  total_spend  numeric(10,2) DEFAULT 0,
  avg_rating   numeric(3,2) DEFAULT 0,
  wa_thread_id text,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_saved_locations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label       text NOT NULL,
  address     text NOT NULL,
  lat         numeric(10,7),
  lng         numeric(10,7),
  use_count   int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- 3. DRIVERS
-- ============================================================

CREATE TABLE IF NOT EXISTS drivers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     text NOT NULL,
  phone         text UNIQUE NOT NULL,
  plate         text,
  car_model     text,
  photo_url     text,
  rating        numeric(3,2) DEFAULT 5.0,
  total_trips   int DEFAULT 0,
  online        boolean DEFAULT false,
  status        text DEFAULT 'offline' CHECK (status IN ('available','on_trip','offline')),
  location      geometry(Point, 4326),
  last_seen     timestamptz,
  license_url   text,
  insurance_url text,
  id_doc_url    text,
  pwa_pin       text,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS drivers_location_idx ON drivers USING GIST (location);
CREATE INDEX IF NOT EXISTS drivers_online_idx   ON drivers (online) WHERE online = true;

CREATE TABLE IF NOT EXISTS driver_location_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id   uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  location    geometry(Point, 4326) NOT NULL,
  recorded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dlh_driver_idx ON driver_location_history (driver_id);
CREATE INDEX IF NOT EXISTS dlh_time_idx   ON driver_location_history (recorded_at DESC);

CREATE OR REPLACE FUNCTION auto_offline_stale_drivers()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE drivers
  SET online = false, status = 'offline'
  WHERE last_seen < NOW() - INTERVAL '5 minutes'
    AND online = true
    AND status != 'on_trip';
END;
$$;

-- ============================================================
-- 4. PROMO CODES  (must exist before trips)
-- ============================================================

CREATE TABLE IF NOT EXISTS promo_codes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text UNIQUE NOT NULL,
  description    text,
  discount_type  text NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric(8,2) NOT NULL,
  status         text DEFAULT 'active' CHECK (status IN ('active','paused','expired')),
  use_count      int DEFAULT 0,
  max_uses       int,
  expires_at     timestamptz,
  created_at     timestamptz DEFAULT now()
);

-- ============================================================
-- 5. TRIPS  (references customers, drivers, promo_codes)
-- ============================================================

CREATE TABLE IF NOT EXISTS trips (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      uuid REFERENCES customers(id) ON DELETE SET NULL,
  driver_id        uuid REFERENCES drivers(id) ON DELETE SET NULL,
  pickup_address   text NOT NULL,
  pickup_lat       numeric(10,7),
  pickup_lng       numeric(10,7),
  dropoff_address  text NOT NULL,
  dropoff_lat      numeric(10,7),
  dropoff_lng      numeric(10,7),
  status           text DEFAULT 'pending' CHECK (status IN (
                     'pending','dispatching','accepted',
                     'on_trip','completed','cancelled','no_driver'
                   )),
  cancel_reason    text,
  fare_usd         numeric(8,2),
  fare_lbp         numeric(12,0),
  distance_km      numeric(6,2),
  duration_min     int,
  promo_code_id    uuid REFERENCES promo_codes(id) ON DELETE SET NULL,
  driver_rating    int CHECK (driver_rating BETWEEN 1 AND 5),
  customer_rating  int CHECK (customer_rating BETWEEN 1 AND 5),
  requested_at     timestamptz DEFAULT now(),
  accepted_at      timestamptz,
  pickup_at        timestamptz,
  completed_at     timestamptz
);

CREATE INDEX IF NOT EXISTS trips_customer_idx   ON trips (customer_id);
CREATE INDEX IF NOT EXISTS trips_driver_idx     ON trips (driver_id);
CREATE INDEX IF NOT EXISTS trips_status_idx     ON trips (status);
CREATE INDEX IF NOT EXISTS trips_requested_idx  ON trips (requested_at DESC);

CREATE TABLE IF NOT EXISTS trip_dispatch_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  driver_id  uuid REFERENCES drivers(id) ON DELETE SET NULL,
  action     text NOT NULL CHECK (action IN ('offered','accepted','declined','timeout','manual_assign')),
  note       text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 6. CONVERSATIONS & MESSAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS conversations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         uuid REFERENCES customers(id) ON DELETE SET NULL,
  wa_thread_id        text UNIQUE,
  status              text DEFAULT 'active' CHECK (status IN ('active','resolved','needs_human')),
  fallback_to_human   boolean DEFAULT false,
  takeover_by         uuid REFERENCES profiles(id) ON DELETE SET NULL,
  takeover_expires_at timestamptz,
  agent_state         jsonb,
  last_message_at     timestamptz DEFAULT now(),
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversations_customer_idx ON conversations (customer_id);
CREATE INDEX IF NOT EXISTS conversations_status_idx   ON conversations (status);

CREATE TABLE IF NOT EXISTS messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction       text NOT NULL CHECK (direction IN ('inbound','outbound')),
  sender          text NOT NULL CHECK (sender IN ('customer','ai','dispatcher','system','driver')),
  body            text NOT NULL,
  wa_message_id   text,
  sent_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS messages_sent_idx         ON messages (sent_at DESC);

-- ============================================================
-- 7. MARKETING
-- ============================================================

CREATE TABLE IF NOT EXISTS campaigns (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  channel          text NOT NULL CHECK (channel IN ('whatsapp','sms')),
  audience         text NOT NULL,
  status           text DEFAULT 'draft' CHECK (status IN ('draft','scheduled','live','ended')),
  scheduled_at     timestamptz,
  ended_at         timestamptz,
  sent_count       int DEFAULT 0,
  conversion_count int DEFAULT 0,
  revenue_usd      numeric(10,2) DEFAULT 0,
  created_by       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promo_code_usage (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  customer_id   uuid REFERENCES customers(id) ON DELETE SET NULL,
  trip_id       uuid REFERENCES trips(id) ON DELETE SET NULL,
  used_at       timestamptz DEFAULT now()
);

-- ============================================================
-- 8. LOYALTY
-- ============================================================

CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         uuid UNIQUE NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tier                text DEFAULT 'bronze' CHECK (tier IN ('bronze','silver','gold','platinum')),
  points_balance      int DEFAULT 0,
  total_points_earned int DEFAULT 0,
  enrolled_at         timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('earned','redeemed','expired')),
  points      int NOT NULL,
  description text,
  trip_id     uuid REFERENCES trips(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_loyalty_tier()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.tier := CASE
    WHEN NEW.points_balance >= 10000 THEN 'platinum'
    WHEN NEW.points_balance >= 5000  THEN 'gold'
    WHEN NEW.points_balance >= 1000  THEN 'silver'
    ELSE 'bronze'
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS loyalty_tier_update ON loyalty_accounts;
CREATE TRIGGER loyalty_tier_update
  BEFORE UPDATE OF points_balance ON loyalty_accounts
  FOR EACH ROW EXECUTE FUNCTION update_loyalty_tier();

-- ============================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_saved_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_location_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_dispatch_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns                ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_usage         ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_accounts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions     ENABLE ROW LEVEL SECURITY;

-- Authenticated staff — full access
CREATE POLICY "staff_all_profiles"    ON profiles                 FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_all_customers"   ON customers                FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_all_cust_locs"   ON customer_saved_locations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_all_drivers"     ON drivers                  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_all_dlh"         ON driver_location_history  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_all_trips"       ON trips                    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_all_dispatch"    ON trip_dispatch_log        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_all_convos"      ON conversations            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_all_messages"    ON messages                 FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_all_campaigns"   ON campaigns                FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_all_promos"      ON promo_codes              FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_all_promo_use"   ON promo_code_usage         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_all_loyalty"     ON loyalty_accounts         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_all_loyalty_tx"  ON loyalty_transactions     FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Driver PWA (anon) — login select + update own location + read assigned trip
CREATE POLICY "driver_select_login" ON drivers
  FOR SELECT TO anon USING (true);

CREATE POLICY "driver_read_customers" ON customers
  FOR SELECT TO anon USING (true);

CREATE POLICY "driver_update_location" ON drivers
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "driver_insert_history" ON driver_location_history
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "driver_read_trips" ON trips
  FOR SELECT TO anon USING (true);

CREATE POLICY "driver_update_trips" ON trips
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "driver_insert_dispatch_log" ON trip_dispatch_log
  FOR INSERT TO anon WITH CHECK (true);
