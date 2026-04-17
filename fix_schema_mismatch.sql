-- Fix Schema Mismatch Migration

-- 1. Update Customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes text;

-- 2. Create Staff table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'manager', 'dispatcher', 'support')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for staff table
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_all_staff" ON staff;
CREATE POLICY "staff_all_staff" ON staff FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Update Conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message text;
-- Ensure last_message_at exists (it does in schema, but good to be sure)
-- ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at timestamptz DEFAULT now();

-- 4. Update Drivers table
-- User said drivers.phone is NOT NULL UNIQUE but form treats it as optional.
-- I will keep it NOT NULL in schema but make sure the form requires it.
-- However, if there are existing rows with nulls (unlikely due to NOT NULL), we should handle them.
-- If I want to make it optional:
-- ALTER TABLE drivers ALTER COLUMN phone DROP NOT NULL;

-- 5. Seed some staff data if empty (optional, but helpful)
INSERT INTO staff (full_name, email, role)
SELECT full_name, email, role FROM (
  SELECT 'Admin User' as full_name, 'admin@allwaytaxi.com' as email, 'admin' as role
) s
WHERE NOT EXISTS (SELECT 1 FROM staff LIMIT 1)
ON CONFLICT (email) DO NOTHING;
