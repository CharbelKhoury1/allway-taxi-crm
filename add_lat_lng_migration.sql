-- Run this in Supabase Dashboard → SQL Editor
-- Adds plain lat/lng columns so the admin Drivers map can read coordinates directly

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS lat numeric(10,7);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS lng numeric(10,7);
