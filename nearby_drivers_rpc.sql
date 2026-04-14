-- ============================================================
-- RPC: get_nearest_drivers
-- Used by: /api/drivers/nearby
-- ============================================================

CREATE OR REPLACE FUNCTION get_nearest_drivers(
  p_lat numeric,
  p_lng numeric,
  p_limit int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  full_name text,
  plate text,
  car_model text,
  rating numeric,
  lat numeric,
  lng numeric,
  distance_meters float,
  status text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.full_name,
    d.plate,
    d.car_model,
    d.rating,
    d.lat,
    d.lng,
    -- Calculate distance in meters using PostGIS (spheroid)
    ST_DistanceSphere(
      d.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)
    ) AS distance_meters,
    d.status
  FROM
    drivers d
  WHERE
    d.online = true
    AND d.status = 'available'
    AND d.location IS NOT NULL
  ORDER BY
    d.location <-> ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)
  LIMIT p_limit;
END;
$$;
