-- ════════════════════════════════════════════════════════════════
--  Allway Taxi — Demo Data  (full clean version)
--  Run once in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ════════════════════════════════════════════════════════════════

-- ─── 0. Add any missing columns (all idempotent) ─────────────
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS lat       DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng       DOUBLE PRECISION;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS email     TEXT,
  ADD COLUMN IF NOT EXISTS address   TEXT;

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS distance_km DOUBLE PRECISION;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS last_message   TEXT,
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS direction TEXT,
  ADD COLUMN IF NOT EXISTS body      TEXT;

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS type       TEXT,
  ADD COLUMN IF NOT EXISTS status     TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0;

ALTER TABLE promo_codes
  ADD COLUMN IF NOT EXISTS discount_pct INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_uses     INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS uses_count   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expires_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS active       BOOLEAN DEFAULT true;

ALTER TABLE loyalty_accounts
  ADD COLUMN IF NOT EXISTS points          INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tier            TEXT DEFAULT 'bronze',
  ADD COLUMN IF NOT EXISTS lifetime_points INTEGER DEFAULT 0;

-- ─── 1. Drivers ───────────────────────────────────────────────
INSERT INTO drivers (id, full_name, phone, plate, car_model, status, online, rating, total_trips, pwa_pin, lat, lng, last_seen)
VALUES
  ('d1000000-0000-0000-0000-000000000001','Karim Mansour',    '+96171111001','123456 LB','Toyota Camry',   'offline',false,4.9,127,'1234',33.8938,35.5018, NOW()-INTERVAL '5 minutes'),
  ('d1000000-0000-0000-0000-000000000002','Fadi Abou Jaoude', '+96171111002','234567 LB','Kia Sportage',   'offline',false,4.7, 89,'1234',33.8812,35.4733, NOW()-INTERVAL '2 hours'),
  ('d1000000-0000-0000-0000-000000000003','Charbel Khoury',   '+96171111003','345678 LB','Hyundai Sonata', 'offline',false,4.8,203,'1234',33.9017,35.5156, NOW()-INTERVAL '1 day'),
  ('d1000000-0000-0000-0000-000000000004','Georges Haddad',   '+96171111004','456789 LB','Mercedes C200',  'offline',false,4.6, 56,'1234',33.9143,35.5420, NOW()-INTERVAL '3 hours'),
  ('d1000000-0000-0000-0000-000000000005','Joe Nassar',       '+96171111005','567890 LB','BMW 520',        'offline',false,4.9,312,'1234',33.8684,35.5614, NOW()-INTERVAL '30 minutes')
ON CONFLICT (id) DO UPDATE SET
  full_name=EXCLUDED.full_name, phone=EXCLUDED.phone, plate=EXCLUDED.plate,
  car_model=EXCLUDED.car_model, rating=EXCLUDED.rating, total_trips=EXCLUDED.total_trips,
  pwa_pin=EXCLUDED.pwa_pin, lat=EXCLUDED.lat, lng=EXCLUDED.lng;

-- ─── 2. Customers ─────────────────────────────────────────────
INSERT INTO customers (id, full_name, phone, email, address, created_at)
VALUES
  ('c1000000-0000-0000-0000-000000000001','Ahmad Khalil',   '+96170201001','ahmad.khalil@gmail.com',   'Hamra, Beirut',          NOW()-INTERVAL '8 months'),
  ('c1000000-0000-0000-0000-000000000002','Sara Rizk',      '+96170201002','sara.rizk@outlook.com',    'Achrafieh, Beirut',      NOW()-INTERVAL '6 months'),
  ('c1000000-0000-0000-0000-000000000003','Maya Haddad',    '+96170201003','maya.h@gmail.com',         'Jounieh, Mount Lebanon', NOW()-INTERVAL '5 months'),
  ('c1000000-0000-0000-0000-000000000004','Joe Nasr',       '+96170201004','joe.nasr@gmail.com',       'Mar Mikhael, Beirut',    NOW()-INTERVAL '7 months'),
  ('c1000000-0000-0000-0000-000000000005','Lara Farah',     '+96170201005','lara.farah@icloud.com',    'Zalka, Metn',            NOW()-INTERVAL '4 months'),
  ('c1000000-0000-0000-0000-000000000006','Bassem Nasser',  '+96170201006','bassem.n@gmail.com',       'Verdun, Beirut',         NOW()-INTERVAL '3 months'),
  ('c1000000-0000-0000-0000-000000000007','Rania Mousa',    '+96170201007','rania.m@hotmail.com',      'Gemmayzeh, Beirut',      NOW()-INTERVAL '2 months'),
  ('c1000000-0000-0000-0000-000000000008','Tarek Saleh',    '+96170201008','tarek.s@gmail.com',        'Downtown, Beirut',       NOW()-INTERVAL '1 month'),
  ('c1000000-0000-0000-0000-000000000009','Nour Karam',     '+96170201009','nour.karam@gmail.com',     'Dbayeh, Metn',           NOW()-INTERVAL '3 weeks'),
  ('c1000000-0000-0000-0000-000000000010','Elie Gemayel',   '+96170201010','elie.g@outlook.com',       'Antelias, Metn',         NOW()-INTERVAL '2 weeks'),
  ('c1000000-0000-0000-0000-000000000011','Christelle Abi', '+96170201011','christelle.a@gmail.com',   'Jdeideh, Metn',          NOW()-INTERVAL '10 days'),
  ('c1000000-0000-0000-0000-000000000012','Mariam Khoury',  '+96170201012','mariam.k@gmail.com',       'Baabda, Mount Lebanon',  NOW()-INTERVAL '8 days'),
  ('c1000000-0000-0000-0000-000000000013','Patrick Saade',  '+96170201013','patrick.s@icloud.com',     'Hazmieh, Baabda',        NOW()-INTERVAL '6 days'),
  ('c1000000-0000-0000-0000-000000000014','Celine Khoury',  '+96170201014','celine.k@gmail.com',       'Hamra, Beirut',          NOW()-INTERVAL '5 days'),
  ('c1000000-0000-0000-0000-000000000015','Walid Mansour',  '+96170201015','walid.m@gmail.com',        'Bourj Hammoud, Metn',    NOW()-INTERVAL '4 days'),
  ('c1000000-0000-0000-0000-000000000016','Rita Hanna',     '+96170201016','rita.h@outlook.com',       'Ashrafieh, Beirut',      NOW()-INTERVAL '3 days'),
  ('c1000000-0000-0000-0000-000000000017','Tony Frangieh',  '+96170201017','tony.f@gmail.com',         'Jounieh, Mount Lebanon', NOW()-INTERVAL '2 days'),
  ('c1000000-0000-0000-0000-000000000018','Hana Sleiman',   '+96170201018','hana.s@gmail.com',         'Verdun, Beirut',         NOW()-INTERVAL '1 day'),
  ('c1000000-0000-0000-0000-000000000019','Michel Aoun',    '+96170201019','michel.a@gmail.com',       'Rabieh, Metn',           NOW()-INTERVAL '12 hours'),
  ('c1000000-0000-0000-0000-000000000020','Joelle Tabbara', '+96170201020','joelle.t@icloud.com',      'Hamra, Beirut',          NOW()-INTERVAL '3 hours')
ON CONFLICT (id) DO UPDATE SET
  full_name=EXCLUDED.full_name, phone=EXCLUDED.phone,
  email=EXCLUDED.email, address=EXCLUDED.address;

-- ─── 3. Trips ─────────────────────────────────────────────────
INSERT INTO trips (id, customer_id, driver_id, pickup_address, dropoff_address, status, fare_usd, distance_km, requested_at, accepted_at, completed_at)
VALUES
-- Today
  ('f0000000-0000-0000-0000-000000000100','c1000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','Hamra, Beirut','Beirut Rafic Hariri Airport','completed',22.00,18.2, NOW()-INTERVAL '3 hours',  NOW()-INTERVAL '3 hours' +INTERVAL '2 min',  NOW()-INTERVAL '2 hours'),
  ('f0000000-0000-0000-0000-000000000101','c1000000-0000-0000-0000-000000000020','d1000000-0000-0000-0000-000000000002','Hamra, Beirut','Verdun, Beirut',             'completed', 8.00, 3.1, NOW()-INTERVAL '2 hours',  NOW()-INTERVAL '2 hours' +INTERVAL '3 min',  NOW()-INTERVAL '90 minutes'),
  ('f0000000-0000-0000-0000-000000000102','c1000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000003','Achrafieh, Beirut','Jounieh, Mount Lebanon', 'completed',18.00,14.5, NOW()-INTERVAL '90 minutes',NOW()-INTERVAL '90 minutes'+INTERVAL '2 min', NOW()-INTERVAL '40 minutes'),
  ('f0000000-0000-0000-0000-000000000103','c1000000-0000-0000-0000-000000000019','d1000000-0000-0000-0000-000000000001','Rabieh, Metn','Downtown, Beirut',           'completed',15.00,12.0, NOW()-INTERVAL '60 minutes',NOW()-INTERVAL '60 minutes'+INTERVAL '4 min', NOW()-INTERVAL '20 minutes'),
  ('f0000000-0000-0000-0000-000000000104','c1000000-0000-0000-0000-000000000016','d1000000-0000-0000-0000-000000000004','Ashrafieh, Beirut','Hamra, Beirut',          'pending',  NULL, NULL, NOW()-INTERVAL '5 minutes', NULL, NULL),
  ('f0000000-0000-0000-0000-000000000105','c1000000-0000-0000-0000-000000000018','d1000000-0000-0000-0000-000000000005','Verdun, Beirut','Gemmayzeh, Beirut',          'pending',  NULL, NULL, NOW()-INTERVAL '2 minutes', NULL, NULL),
-- Yesterday
  ('f0000000-0000-0000-0000-000000000106','c1000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000002','Jounieh, Mount Lebanon','Downtown, Beirut', 'completed',20.00,16.0, NOW()-INTERVAL '1 day',                            NOW()-INTERVAL '1 day'               +INTERVAL '3 min', NOW()-INTERVAL '1 day'               +INTERVAL '45 min'),
  ('f0000000-0000-0000-0000-000000000107','c1000000-0000-0000-0000-000000000004','d1000000-0000-0000-0000-000000000005','Mar Mikhael, Beirut','Dbayeh, Metn',        'completed',12.00, 9.5, NOW()-INTERVAL '1 day'-INTERVAL '2 hours',         NOW()-INTERVAL '1 day'-INTERVAL '2 hours'+INTERVAL '2 min', NOW()-INTERVAL '1 day'-INTERVAL '90 minutes'),
  ('f0000000-0000-0000-0000-000000000108','c1000000-0000-0000-0000-000000000005','d1000000-0000-0000-0000-000000000001','Zalka, Metn','Hamra, Beirut',               'completed', 9.00, 7.2, NOW()-INTERVAL '1 day'-INTERVAL '4 hours',         NOW()-INTERVAL '1 day'-INTERVAL '4 hours'+INTERVAL '5 min', NOW()-INTERVAL '1 day'-INTERVAL '3 hours'),
  ('f0000000-0000-0000-0000-000000000109','c1000000-0000-0000-0000-000000000006','d1000000-0000-0000-0000-000000000003','Verdun, Beirut','Antelias, Metn',            'cancelled', NULL, NULL,NOW()-INTERVAL '1 day'-INTERVAL '5 hours',         NULL, NULL),
  ('f0000000-0000-0000-0000-000000000110','c1000000-0000-0000-0000-000000000007','d1000000-0000-0000-0000-000000000002','Gemmayzeh, Beirut','Achrafieh, Beirut',      'completed', 6.00, 2.0, NOW()-INTERVAL '1 day'-INTERVAL '6 hours',         NOW()-INTERVAL '1 day'-INTERVAL '6 hours'+INTERVAL '1 min', NOW()-INTERVAL '1 day'-INTERVAL '5 hours'-INTERVAL '30 min'),
-- 2–3 days ago
  ('f0000000-0000-0000-0000-000000000111','c1000000-0000-0000-0000-000000000008','d1000000-0000-0000-0000-000000000004','Downtown, Beirut','Beirut Rafic Hariri Airport','completed',20.00,17.0,NOW()-INTERVAL '2 days',                          NOW()-INTERVAL '2 days'              +INTERVAL '3 min', NOW()-INTERVAL '2 days'              +INTERVAL '40 min'),
  ('f0000000-0000-0000-0000-000000000112','c1000000-0000-0000-0000-000000000009','d1000000-0000-0000-0000-000000000001','Dbayeh, Metn','Hamra, Beirut',               'completed',14.00,11.0, NOW()-INTERVAL '2 days'-INTERVAL '2 hours',         NOW()-INTERVAL '2 days'-INTERVAL '2 hours'+INTERVAL '4 min', NOW()-INTERVAL '2 days'-INTERVAL '90 minutes'),
  ('f0000000-0000-0000-0000-000000000113','c1000000-0000-0000-0000-000000000010','d1000000-0000-0000-0000-000000000005','Antelias, Metn','Mar Mikhael, Beirut',        'completed', 7.00, 5.5, NOW()-INTERVAL '3 days',                            NOW()-INTERVAL '3 days'              +INTERVAL '2 min', NOW()-INTERVAL '3 days'              +INTERVAL '25 min'),
  ('f0000000-0000-0000-0000-000000000114','c1000000-0000-0000-0000-000000000011','d1000000-0000-0000-0000-000000000003','Jdeideh, Metn','Downtown, Beirut',            'completed',11.00, 8.5, NOW()-INTERVAL '3 days'-INTERVAL '3 hours',         NOW()-INTERVAL '3 days'-INTERVAL '3 hours'+INTERVAL '3 min', NOW()-INTERVAL '3 days'-INTERVAL '2 hours'),
  ('f0000000-0000-0000-0000-000000000115','c1000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000002','Hamra, Beirut','Jounieh, Mount Lebanon',     'completed',19.00,15.5, NOW()-INTERVAL '3 days'-INTERVAL '5 hours',         NOW()-INTERVAL '3 days'-INTERVAL '5 hours'+INTERVAL '5 min', NOW()-INTERVAL '3 days'-INTERVAL '4 hours'),
-- 4–7 days ago
  ('f0000000-0000-0000-0000-000000000116','c1000000-0000-0000-0000-000000000012','d1000000-0000-0000-0000-000000000004','Baabda, Mount Lebanon','Verdun, Beirut',     'completed',10.00, 8.0, NOW()-INTERVAL '4 days',                            NOW()-INTERVAL '4 days'              +INTERVAL '2 min', NOW()-INTERVAL '4 days'              +INTERVAL '30 min'),
  ('f0000000-0000-0000-0000-000000000117','c1000000-0000-0000-0000-000000000013','d1000000-0000-0000-0000-000000000001','Hazmieh, Baabda','Achrafieh, Beirut',        'completed', 8.00, 6.5, NOW()-INTERVAL '4 days'-INTERVAL '4 hours',         NOW()-INTERVAL '4 days'-INTERVAL '4 hours'+INTERVAL '3 min', NOW()-INTERVAL '4 days'-INTERVAL '3 hours'-INTERVAL '30 min'),
  ('f0000000-0000-0000-0000-000000000118','c1000000-0000-0000-0000-000000000014','d1000000-0000-0000-0000-000000000005','Hamra, Beirut','Gemmayzeh, Beirut',           'cancelled', NULL, NULL,NOW()-INTERVAL '5 days',                            NULL, NULL),
  ('f0000000-0000-0000-0000-000000000119','c1000000-0000-0000-0000-000000000015','d1000000-0000-0000-0000-000000000003','Bourj Hammoud, Metn','Hamra, Beirut',        'completed',10.00, 7.8, NOW()-INTERVAL '5 days'-INTERVAL '2 hours',         NOW()-INTERVAL '5 days'-INTERVAL '2 hours'+INTERVAL '4 min', NOW()-INTERVAL '5 days'-INTERVAL '90 minutes'),
  ('f0000000-0000-0000-0000-000000000120','c1000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000002','Achrafieh, Beirut','Verdun, Beirut',          'completed', 7.00, 3.5, NOW()-INTERVAL '5 days'-INTERVAL '6 hours',         NOW()-INTERVAL '5 days'-INTERVAL '6 hours'+INTERVAL '2 min', NOW()-INTERVAL '5 days'-INTERVAL '5 hours'),
  ('f0000000-0000-0000-0000-000000000121','c1000000-0000-0000-0000-000000000016','d1000000-0000-0000-0000-000000000001','Ashrafieh, Beirut','Downtown, Beirut',        'completed', 5.00, 1.8, NOW()-INTERVAL '6 days',                            NOW()-INTERVAL '6 days'              +INTERVAL '2 min', NOW()-INTERVAL '6 days'              +INTERVAL '20 min'),
  ('f0000000-0000-0000-0000-000000000122','c1000000-0000-0000-0000-000000000017','d1000000-0000-0000-0000-000000000004','Jounieh, Mount Lebanon','Dbayeh, Metn',       'completed',10.00, 6.0, NOW()-INTERVAL '6 days'-INTERVAL '3 hours',         NOW()-INTERVAL '6 days'-INTERVAL '3 hours'+INTERVAL '3 min', NOW()-INTERVAL '6 days'-INTERVAL '2 hours'),
  ('f0000000-0000-0000-0000-000000000123','c1000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000005','Jounieh, Mount Lebanon','Beirut Rafic Hariri Airport','completed',25.00,22.0,NOW()-INTERVAL '7 days',                     NOW()-INTERVAL '7 days'              +INTERVAL '5 min', NOW()-INTERVAL '7 days'              +INTERVAL '50 min'),
-- Week 2
  ('f0000000-0000-0000-0000-000000000124','c1000000-0000-0000-0000-000000000018','d1000000-0000-0000-0000-000000000002','Verdun, Beirut','Mar Mikhael, Beirut',         'completed', 7.00, 4.5, NOW()-INTERVAL '8 days',                            NOW()-INTERVAL '8 days'              +INTERVAL '3 min', NOW()-INTERVAL '8 days'              +INTERVAL '25 min'),
  ('f0000000-0000-0000-0000-000000000125','c1000000-0000-0000-0000-000000000019','d1000000-0000-0000-0000-000000000003','Rabieh, Metn','Antelias, Metn',               'completed', 5.00, 4.0, NOW()-INTERVAL '9 days',                            NOW()-INTERVAL '9 days'              +INTERVAL '2 min', NOW()-INTERVAL '9 days'              +INTERVAL '20 min'),
  ('f0000000-0000-0000-0000-000000000126','c1000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','Hamra, Beirut','Achrafieh, Beirut',            'completed', 6.00, 3.0, NOW()-INTERVAL '10 days',                           NOW()-INTERVAL '10 days'             +INTERVAL '2 min', NOW()-INTERVAL '10 days'             +INTERVAL '20 min'),
  ('f0000000-0000-0000-0000-000000000127','c1000000-0000-0000-0000-000000000020','d1000000-0000-0000-0000-000000000004','Hamra, Beirut','Baabda, Mount Lebanon',        'completed',12.00, 9.0, NOW()-INTERVAL '10 days'-INTERVAL '4 hours',        NOW()-INTERVAL '10 days'-INTERVAL '4 hours'+INTERVAL '4 min', NOW()-INTERVAL '10 days'-INTERVAL '3 hours'),
  ('f0000000-0000-0000-0000-000000000128','c1000000-0000-0000-0000-000000000004','d1000000-0000-0000-0000-000000000005','Mar Mikhael, Beirut','Zalka, Metn',            'completed', 8.00, 6.5, NOW()-INTERVAL '11 days',                           NOW()-INTERVAL '11 days'             +INTERVAL '3 min', NOW()-INTERVAL '11 days'             +INTERVAL '30 min'),
  ('f0000000-0000-0000-0000-000000000129','c1000000-0000-0000-0000-000000000005','d1000000-0000-0000-0000-000000000002','Zalka, Metn','Verdun, Beirut',                 'cancelled', NULL, NULL,NOW()-INTERVAL '11 days'-INTERVAL '5 hours',        NULL, NULL),
  ('f0000000-0000-0000-0000-000000000130','c1000000-0000-0000-0000-000000000006','d1000000-0000-0000-0000-000000000001','Verdun, Beirut','Downtown, Beirut',            'completed', 5.00, 2.5, NOW()-INTERVAL '12 days',                           NOW()-INTERVAL '12 days'             +INTERVAL '2 min', NOW()-INTERVAL '12 days'             +INTERVAL '18 min'),
  ('f0000000-0000-0000-0000-000000000131','c1000000-0000-0000-0000-000000000007','d1000000-0000-0000-0000-000000000003','Gemmayzeh, Beirut','Jounieh, Mount Lebanon',   'completed',15.00,12.0, NOW()-INTERVAL '12 days'-INTERVAL '3 hours',        NOW()-INTERVAL '12 days'-INTERVAL '3 hours'+INTERVAL '4 min', NOW()-INTERVAL '12 days'-INTERVAL '2 hours'),
  ('f0000000-0000-0000-0000-000000000132','c1000000-0000-0000-0000-000000000008','d1000000-0000-0000-0000-000000000004','Downtown, Beirut','Hamra, Beirut',             'completed', 6.00, 2.8, NOW()-INTERVAL '13 days',                           NOW()-INTERVAL '13 days'             +INTERVAL '2 min', NOW()-INTERVAL '13 days'             +INTERVAL '22 min'),
  ('f0000000-0000-0000-0000-000000000133','c1000000-0000-0000-0000-000000000009','d1000000-0000-0000-0000-000000000005','Dbayeh, Metn','Achrafieh, Beirut',             'completed',13.00,10.5, NOW()-INTERVAL '13 days'-INTERVAL '2 hours',        NOW()-INTERVAL '13 days'-INTERVAL '2 hours'+INTERVAL '3 min', NOW()-INTERVAL '13 days'-INTERVAL '90 minutes'),
  ('f0000000-0000-0000-0000-000000000134','c1000000-0000-0000-0000-000000000010','d1000000-0000-0000-0000-000000000001','Antelias, Metn','Verdun, Beirut',              'completed', 9.00, 7.0, NOW()-INTERVAL '14 days',                           NOW()-INTERVAL '14 days'             +INTERVAL '4 min', NOW()-INTERVAL '14 days'             +INTERVAL '35 min'),
-- Week 3
  ('f0000000-0000-0000-0000-000000000135','c1000000-0000-0000-0000-000000000011','d1000000-0000-0000-0000-000000000002','Jdeideh, Metn','Mar Mikhael, Beirut',          'completed', 8.00, 6.0, NOW()-INTERVAL '15 days',                           NOW()-INTERVAL '15 days'             +INTERVAL '3 min', NOW()-INTERVAL '15 days'             +INTERVAL '28 min'),
  ('f0000000-0000-0000-0000-000000000136','c1000000-0000-0000-0000-000000000012','d1000000-0000-0000-0000-000000000003','Baabda, Mount Lebanon','Gemmayzeh, Beirut',    'completed',11.00, 9.0, NOW()-INTERVAL '16 days',                           NOW()-INTERVAL '16 days'             +INTERVAL '3 min', NOW()-INTERVAL '16 days'             +INTERVAL '38 min'),
  ('f0000000-0000-0000-0000-000000000137','c1000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000004','Achrafieh, Beirut','Beirut Rafic Hariri Airport','completed',21.00,18.5,NOW()-INTERVAL '17 days',                          NOW()-INTERVAL '17 days'             +INTERVAL '4 min', NOW()-INTERVAL '17 days'             +INTERVAL '45 min'),
  ('f0000000-0000-0000-0000-000000000138','c1000000-0000-0000-0000-000000000013','d1000000-0000-0000-0000-000000000005','Hazmieh, Baabda','Hamra, Beirut',              'completed',10.00, 8.5, NOW()-INTERVAL '17 days'-INTERVAL '4 hours',        NOW()-INTERVAL '17 days'-INTERVAL '4 hours'+INTERVAL '3 min', NOW()-INTERVAL '17 days'-INTERVAL '3 hours'),
  ('f0000000-0000-0000-0000-000000000139','c1000000-0000-0000-0000-000000000014','d1000000-0000-0000-0000-000000000001','Hamra, Beirut','Zalka, Metn',                  'completed', 9.00, 7.5, NOW()-INTERVAL '18 days',                           NOW()-INTERVAL '18 days'             +INTERVAL '2 min', NOW()-INTERVAL '18 days'             +INTERVAL '32 min'),
  ('f0000000-0000-0000-0000-000000000140','c1000000-0000-0000-0000-000000000015','d1000000-0000-0000-0000-000000000002','Bourj Hammoud, Metn','Verdun, Beirut',         'cancelled', NULL, NULL,NOW()-INTERVAL '19 days',                           NULL, NULL),
  ('f0000000-0000-0000-0000-000000000141','c1000000-0000-0000-0000-000000000016','d1000000-0000-0000-0000-000000000003','Ashrafieh, Beirut','Antelias, Metn',           'completed',12.00, 9.5, NOW()-INTERVAL '20 days',                           NOW()-INTERVAL '20 days'             +INTERVAL '4 min', NOW()-INTERVAL '20 days'             +INTERVAL '40 min'),
  ('f0000000-0000-0000-0000-000000000142','c1000000-0000-0000-0000-000000000017','d1000000-0000-0000-0000-000000000004','Jounieh, Mount Lebanon','Hamra, Beirut',       'completed',18.00,14.0, NOW()-INTERVAL '20 days'-INTERVAL '3 hours',        NOW()-INTERVAL '20 days'-INTERVAL '3 hours'+INTERVAL '5 min', NOW()-INTERVAL '20 days'-INTERVAL '2 hours'),
  ('f0000000-0000-0000-0000-000000000143','c1000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000005','Hamra, Beirut','Baabda, Mount Lebanon',        'completed',12.00, 9.5, NOW()-INTERVAL '21 days',                           NOW()-INTERVAL '21 days'             +INTERVAL '3 min', NOW()-INTERVAL '21 days'             +INTERVAL '38 min'),
-- Week 4
  ('f0000000-0000-0000-0000-000000000144','c1000000-0000-0000-0000-000000000018','d1000000-0000-0000-0000-000000000001','Verdun, Beirut','Dbayeh, Metn',                'completed',10.00, 8.0, NOW()-INTERVAL '22 days',                           NOW()-INTERVAL '22 days'             +INTERVAL '2 min', NOW()-INTERVAL '22 days'             +INTERVAL '33 min'),
  ('f0000000-0000-0000-0000-000000000145','c1000000-0000-0000-0000-000000000019','d1000000-0000-0000-0000-000000000002','Rabieh, Metn','Downtown, Beirut',              'completed',15.00,12.0, NOW()-INTERVAL '23 days',                           NOW()-INTERVAL '23 days'             +INTERVAL '4 min', NOW()-INTERVAL '23 days'             +INTERVAL '42 min'),
  ('f0000000-0000-0000-0000-000000000146','c1000000-0000-0000-0000-000000000020','d1000000-0000-0000-0000-000000000003','Hamra, Beirut','Mar Mikhael, Beirut',           'completed', 6.00, 3.5, NOW()-INTERVAL '24 days',                           NOW()-INTERVAL '24 days'             +INTERVAL '2 min', NOW()-INTERVAL '24 days'             +INTERVAL '22 min'),
  ('f0000000-0000-0000-0000-000000000147','c1000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000004','Jounieh, Mount Lebanon','Achrafieh, Beirut',   'completed',17.00,13.5, NOW()-INTERVAL '25 days',                           NOW()-INTERVAL '25 days'             +INTERVAL '5 min', NOW()-INTERVAL '25 days'             +INTERVAL '48 min'),
  ('f0000000-0000-0000-0000-000000000148','c1000000-0000-0000-0000-000000000004','d1000000-0000-0000-0000-000000000005','Mar Mikhael, Beirut','Hamra, Beirut',           'completed', 7.00, 4.0, NOW()-INTERVAL '25 days'-INTERVAL '4 hours',        NOW()-INTERVAL '25 days'-INTERVAL '4 hours'+INTERVAL '3 min', NOW()-INTERVAL '25 days'-INTERVAL '3 hours'),
  ('f0000000-0000-0000-0000-000000000149','c1000000-0000-0000-0000-000000000005','d1000000-0000-0000-0000-000000000001','Zalka, Metn','Downtown, Beirut',               'completed',11.00, 9.0, NOW()-INTERVAL '26 days',                           NOW()-INTERVAL '26 days'             +INTERVAL '3 min', NOW()-INTERVAL '26 days'             +INTERVAL '37 min'),
  ('f0000000-0000-0000-0000-000000000150','c1000000-0000-0000-0000-000000000006','d1000000-0000-0000-0000-000000000002','Verdun, Beirut','Gemmayzeh, Beirut',            'completed', 6.00, 3.0, NOW()-INTERVAL '27 days',                           NOW()-INTERVAL '27 days'             +INTERVAL '2 min', NOW()-INTERVAL '27 days'             +INTERVAL '21 min'),
  ('f0000000-0000-0000-0000-000000000151','c1000000-0000-0000-0000-000000000007','d1000000-0000-0000-0000-000000000003','Gemmayzeh, Beirut','Zalka, Metn',              'cancelled', NULL, NULL,NOW()-INTERVAL '28 days',                           NULL, NULL),
  ('f0000000-0000-0000-0000-000000000152','c1000000-0000-0000-0000-000000000008','d1000000-0000-0000-0000-000000000004','Downtown, Beirut','Antelias, Metn',            'completed',10.00, 7.5, NOW()-INTERVAL '28 days'-INTERVAL '3 hours',        NOW()-INTERVAL '28 days'-INTERVAL '3 hours'+INTERVAL '3 min', NOW()-INTERVAL '28 days'-INTERVAL '2 hours'),
  ('f0000000-0000-0000-0000-000000000153','c1000000-0000-0000-0000-000000000009','d1000000-0000-0000-0000-000000000005','Dbayeh, Metn','Mar Mikhael, Beirut',           'completed',11.00, 8.8, NOW()-INTERVAL '29 days',                           NOW()-INTERVAL '29 days'             +INTERVAL '4 min', NOW()-INTERVAL '29 days'             +INTERVAL '35 min'),
  ('f0000000-0000-0000-0000-000000000154','c1000000-0000-0000-0000-000000000010','d1000000-0000-0000-0000-000000000001','Antelias, Metn','Hamra, Beirut',               'completed', 9.00, 7.2, NOW()-INTERVAL '30 days',                           NOW()-INTERVAL '30 days'             +INTERVAL '3 min', NOW()-INTERVAL '30 days'             +INTERVAL '33 min')
ON CONFLICT (id) DO UPDATE SET
  customer_id=EXCLUDED.customer_id, driver_id=EXCLUDED.driver_id,
  pickup_address=EXCLUDED.pickup_address, dropoff_address=EXCLUDED.dropoff_address,
  status=EXCLUDED.status, fare_usd=EXCLUDED.fare_usd, distance_km=EXCLUDED.distance_km,
  requested_at=EXCLUDED.requested_at, accepted_at=EXCLUDED.accepted_at, completed_at=EXCLUDED.completed_at;

-- ─── 4. Update driver trip counts ────────────────────────────
UPDATE drivers SET total_trips=127 WHERE id='d1000000-0000-0000-0000-000000000001';
UPDATE drivers SET total_trips= 89 WHERE id='d1000000-0000-0000-0000-000000000002';
UPDATE drivers SET total_trips=203 WHERE id='d1000000-0000-0000-0000-000000000003';
UPDATE drivers SET total_trips= 56 WHERE id='d1000000-0000-0000-0000-000000000004';
UPDATE drivers SET total_trips=312 WHERE id='d1000000-0000-0000-0000-000000000005';

-- ─── 5. Conversations + Messages ─────────────────────────────
INSERT INTO conversations (id, customer_id, customer_phone, last_message, updated_at)
VALUES
  ('b0000000-0000-0000-0000-000000002001','c1000000-0000-0000-0000-000000000002','+96170201002','Can I get a refund for my last trip?',  NOW()-INTERVAL '5 minutes'),
  ('b0000000-0000-0000-0000-000000002002','c1000000-0000-0000-0000-000000000004','+96170201004','بدي agent، مش راضي عن السائق',           NOW()-INTERVAL '20 minutes'),
  ('b0000000-0000-0000-0000-000000002003','c1000000-0000-0000-0000-000000000001','+96170201001','شكراً، الشوفير وصل بالوقت',              NOW()-INTERVAL '45 minutes'),
  ('b0000000-0000-0000-0000-000000002004','c1000000-0000-0000-0000-000000000003','+96170201003','Can I book for tomorrow morning at 8?',  NOW()-INTERVAL '2 hours'),
  ('b0000000-0000-0000-0000-000000002005','c1000000-0000-0000-0000-000000000005','+96170201005','Booking confirmed, thank you!',          NOW()-INTERVAL '3 hours')
ON CONFLICT (id) DO UPDATE SET
  last_message=EXCLUDED.last_message, updated_at=EXCLUDED.updated_at,
  customer_phone=EXCLUDED.customer_phone;

INSERT INTO messages (id, conversation_id, direction, body, created_at)
VALUES
  -- Conv 1 (Sara - refund)
  ('e0000000-0000-0000-0000-000000001001','b0000000-0000-0000-0000-000000002001','inbound',  'Hello, I took a trip yesterday from Achrafieh to the airport.',          NOW()-INTERVAL '30 minutes'),
  ('e0000000-0000-0000-0000-000000001002','b0000000-0000-0000-0000-000000002001','inbound',  'The driver took a longer route and charged me extra.',                   NOW()-INTERVAL '25 minutes'),
  ('e0000000-0000-0000-0000-000000001003','b0000000-0000-0000-0000-000000002001','outbound', 'Hi Sara, we''re sorry to hear that. Can you share the trip ID?',        NOW()-INTERVAL '20 minutes'),
  ('e0000000-0000-0000-0000-000000001004','b0000000-0000-0000-0000-000000002001','inbound',  'The trip was earlier today. Can I get a refund for the difference?',    NOW()-INTERVAL '15 minutes'),
  ('e0000000-0000-0000-0000-000000001005','b0000000-0000-0000-0000-000000002001','outbound', 'We''ve reviewed the trip. A $3 credit has been added to your account.', NOW()-INTERVAL '5 minutes'),
  -- Conv 2 (Joe - complaint)
  ('e0000000-0000-0000-0000-000000001006','b0000000-0000-0000-0000-000000002002','inbound',  'مرحبا، السائق ما رد على التلفون وتأخر 20 دقيقة',                       NOW()-INTERVAL '50 minutes'),
  ('e0000000-0000-0000-0000-000000001007','b0000000-0000-0000-0000-000000002002','outbound', 'أهلاً جو، معك نحن آسفين على هالتجربة. بنتواصل مع السائق.',             NOW()-INTERVAL '40 minutes'),
  ('e0000000-0000-0000-0000-000000001008','b0000000-0000-0000-0000-000000002002','inbound',  'بدي agent، مش راضي عن السائق',                                         NOW()-INTERVAL '20 minutes'),
  -- Conv 3 (Ahmad - positive)
  ('e0000000-0000-0000-0000-000000001009','b0000000-0000-0000-0000-000000002003','inbound',  'السلام عليكم، بدي احجز رحلة لمطار رفيق الحريري',                       NOW()-INTERVAL '2 hours'),
  ('e0000000-0000-0000-0000-000000001010','b0000000-0000-0000-0000-000000002003','outbound', 'أهلاً أحمد! تم إرسال السائق. وقت الوصول ١٥ دقيقة.',                    NOW()-INTERVAL '110 minutes'),
  ('e0000000-0000-0000-0000-000000001011','b0000000-0000-0000-0000-000000002003','inbound',  'شكراً، الشوفير وصل بالوقت',                                            NOW()-INTERVAL '45 minutes'),
  -- Conv 4 (Maya - booking)
  ('e0000000-0000-0000-0000-000000001012','b0000000-0000-0000-0000-000000002004','inbound',  'Hi, I need a ride from Jounieh to Downtown tomorrow at 8am.',           NOW()-INTERVAL '3 hours'),
  ('e0000000-0000-0000-0000-000000001013','b0000000-0000-0000-0000-000000002004','outbound', 'Hi Maya! Sure, I''ll schedule a driver for 7:50am to be early.',       NOW()-INTERVAL '150 minutes'),
  ('e0000000-0000-0000-0000-000000001014','b0000000-0000-0000-0000-000000002004','inbound',  'Can I book for tomorrow morning at 8?',                                 NOW()-INTERVAL '2 hours'),
  -- Conv 5 (Lara - confirmation)
  ('e0000000-0000-0000-0000-000000001015','b0000000-0000-0000-0000-000000002005','outbound', 'Hi Lara, your trip from Zalka to Gemmayzeh is confirmed for 3pm.',      NOW()-INTERVAL '4 hours'),
  ('e0000000-0000-0000-0000-000000001016','b0000000-0000-0000-0000-000000002005','inbound',  'Booking confirmed, thank you!',                                         NOW()-INTERVAL '3 hours')
ON CONFLICT (id) DO NOTHING;

-- ─── 6. Campaigns ────────────────────────────────────────────
INSERT INTO campaigns (id, name, type, status, sent_count, created_at)
VALUES
  ('c0000000-0000-0000-0000-000000003001','Weekend Rush Promo',    'whatsapp','active',   1240, NOW()-INTERVAL '5 days'),
  ('c0000000-0000-0000-0000-000000003002','Airport Re-engagement', 'sms',     'active',    860, NOW()-INTERVAL '10 days'),
  ('c0000000-0000-0000-0000-000000003003','New Customer Welcome',  'whatsapp','scheduled',   0, NOW()-INTERVAL '2 days'),
  ('c0000000-0000-0000-0000-000000003004','Ramadan Offer Blast',   'whatsapp','ended',    2100, NOW()-INTERVAL '45 days')
ON CONFLICT (id) DO UPDATE SET
  name=EXCLUDED.name, status=EXCLUDED.status, sent_count=EXCLUDED.sent_count;

-- ─── 7. Promo codes ──────────────────────────────────────────
INSERT INTO promo_codes (id, code, discount_pct, max_uses, uses_count, expires_at, active)
VALUES
  ('p0000000-0000-0000-0000-000000004001','WELCOME20',20,500, 134, NOW()+INTERVAL '60 days', true),
  ('p0000000-0000-0000-0000-000000004002','AIRPORT10',10,200,  89, NOW()+INTERVAL '30 days', true),
  ('p0000000-0000-0000-0000-000000004003','WEEKEND15',15,300,  47, NOW()+INTERVAL '14 days', true),
  ('p0000000-0000-0000-0000-000000004004','RAMADAN25',25,1000,843, NOW()-INTERVAL '5 days',  false)
ON CONFLICT (id) DO UPDATE SET
  code=EXCLUDED.code, uses_count=EXCLUDED.uses_count, active=EXCLUDED.active;

-- ─── 8. Loyalty accounts ─────────────────────────────────────
INSERT INTO loyalty_accounts (id, customer_id, points, tier, lifetime_points)
VALUES
  ('a0000000-0000-0000-0000-000000005001','c1000000-0000-0000-0000-000000000001',12480,'platinum',12480),
  ('a0000000-0000-0000-0000-000000005002','c1000000-0000-0000-0000-000000000002', 8910,'gold',     8910),
  ('a0000000-0000-0000-0000-000000005003','c1000000-0000-0000-0000-000000000003', 6240,'gold',     6240),
  ('a0000000-0000-0000-0000-000000005004','c1000000-0000-0000-0000-000000000004', 4100,'silver',   4100),
  ('a0000000-0000-0000-0000-000000005005','c1000000-0000-0000-0000-000000000005', 3750,'silver',   3750),
  ('a0000000-0000-0000-0000-000000005006','c1000000-0000-0000-0000-000000000006', 2200,'silver',   2200),
  ('a0000000-0000-0000-0000-000000005007','c1000000-0000-0000-0000-000000000007', 1800,'silver',   1800),
  ('a0000000-0000-0000-0000-000000005008','c1000000-0000-0000-0000-000000000008', 1200,'silver',   1200),
  ('a0000000-0000-0000-0000-000000005009','c1000000-0000-0000-0000-000000000009',  950,'bronze',    950),
  ('a0000000-0000-0000-0000-000000005010','c1000000-0000-0000-0000-000000000010',  720,'bronze',    720),
  ('a0000000-0000-0000-0000-000000005011','c1000000-0000-0000-0000-000000000011',  580,'bronze',    580),
  ('a0000000-0000-0000-0000-000000005012','c1000000-0000-0000-0000-000000000012',  430,'bronze',    430),
  ('a0000000-0000-0000-0000-000000005013','c1000000-0000-0000-0000-000000000013',  310,'bronze',    310),
  ('a0000000-0000-0000-0000-000000005014','c1000000-0000-0000-0000-000000000014',  250,'bronze',    250),
  ('a0000000-0000-0000-0000-000000005015','c1000000-0000-0000-0000-000000000015',  180,'bronze',    180)
ON CONFLICT (id) DO UPDATE SET
  points=EXCLUDED.points, tier=EXCLUDED.tier, lifetime_points=EXCLUDED.lifetime_points;

-- ─── Done ────────────────────────────────────────────────────
-- Drivers log in with phone + PIN 1234:
--   Karim   → 71111001 / 1234
--   Fadi    → 71111002 / 1234
--   Charbel → 71111003 / 1234
--   Georges → 71111004 / 1234
--   Joe     → 71111005 / 1234
