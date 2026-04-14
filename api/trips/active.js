/**
 * GET /api/trips/active?trip_id=<uuid>
 *
 * Returns the full trip snapshot: status, addresses, assigned driver's live
 * coordinates, distance from driver to the pickup point, ETA, and the
 * customer-facing tracking URL.
 *
 * Authentication: x-api-key header must match AGENT_API_SECRET env var.
 *
 * Used by:
 *   - WhatsApp AI agent  ("Where is my driver?")
 *   - Customer tracking page  (initial data load — uses Supabase directly after)
 */

import { requireApiKey, setCors } from '../_lib/auth.js'
import { supabaseAnon }           from '../_lib/supabase.js'

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, r = d => d * Math.PI / 180
  const a =
    Math.sin(r(lat2 - lat1) / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) *
    Math.sin(r(lng2 - lng1) / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!requireApiKey(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { trip_id } = req.query
  if (!trip_id) return res.status(400).json({ error: 'trip_id is required' })

  // ── Trip ──────────────────────────────────────────────────────────────────
  const { data: trip, error: tripErr } = await supabaseAnon
    .from('trips')
    .select(`
      id, status,
      pickup_address,  pickup_lat,  pickup_lng,
      dropoff_address, dropoff_lat, dropoff_lng,
      fare_usd, distance_km, duration_min,
      driver_id,
      customers ( full_name, phone )
    `)
    .eq('id', trip_id)
    .single()

  if (tripErr || !trip) return res.status(404).json({ error: 'Trip not found' })

  // ── Driver location ───────────────────────────────────────────────────────
  let driver = null
  let distance_to_pickup_km = null
  let eta_min = null

  if (trip.driver_id) {
    const { data: drv } = await supabaseAnon
      .from('drivers')
      .select('id, full_name, plate, car_model, rating, lat, lng, last_seen, online, status')
      .eq('id', trip.driver_id)
      .single()

    if (drv) {
      driver = {
        id:        drv.id,
        full_name: drv.full_name,
        plate:     drv.plate,
        car_model: drv.car_model,
        rating:    drv.rating,
        lat:       drv.lat  != null ? Number(drv.lat)  : null,
        lng:       drv.lng  != null ? Number(drv.lng)  : null,
        last_seen: drv.last_seen,
        online:    drv.online,
        status:    drv.status,
      }

      if (
        driver.lat && driver.lng &&
        trip.pickup_lat && trip.pickup_lng &&
        ['accepted', 'dispatching'].includes(trip.status)
      ) {
        distance_to_pickup_km = Math.round(
          haversineKm(driver.lat, driver.lng, Number(trip.pickup_lat), Number(trip.pickup_lng)) * 100
        ) / 100
        eta_min = Math.max(1, Math.ceil((distance_to_pickup_km / 28) * 60))
      }
    }
  }

  const baseUrl      = process.env.APP_BASE_URL || `https://${req.headers.host}`
  const tracking_url = `${baseUrl}/track/${trip.id}`

  return res.status(200).json({
    trip: {
      id:              trip.id,
      status:          trip.status,
      pickup_address:  trip.pickup_address,
      pickup_lat:      trip.pickup_lat  ? Number(trip.pickup_lat)  : null,
      pickup_lng:      trip.pickup_lng  ? Number(trip.pickup_lng)  : null,
      dropoff_address: trip.dropoff_address,
      dropoff_lat:     trip.dropoff_lat ? Number(trip.dropoff_lat) : null,
      dropoff_lng:     trip.dropoff_lng ? Number(trip.dropoff_lng) : null,
      fare_usd:        trip.fare_usd    ? Number(trip.fare_usd)    : null,
      distance_km:     trip.distance_km ? Number(trip.distance_km) : null,
      customer_name:   trip.customers?.full_name ?? null,
    },
    driver,
    distance_to_pickup_km,
    eta_min,
    tracking_url,
  })
}
