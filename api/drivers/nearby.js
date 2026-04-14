/**
 * GET /api/drivers/nearby
 *
 * Finds the nearest available drivers to a given pickup point.
 *
 * Authentication: x-api-key header must match AGENT_API_SECRET env var.
 *
 * Query Params:
 *   lat    number  required — latitude of the pickup point
 *   lng    number  required — longitude of the pickup point
 *   limit  number  optional — max number of drivers to return (default: 5)
 *
 * Response (JSON):
 *   drivers: array of { id, full_name, plate, car_model, rating, lat, lng, distance_meters, eta_min }
 */

import { requireApiKey, setCors } from '../_lib/auth.js'
import { supabaseAdmin, requireAdmin } from '../_lib/supabase.js'

export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!requireApiKey(req, res)) return
  if (!requireAdmin(res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { lat, lng, limit = 5 } = req.query

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng query parameters are required' })
  }

  // Use the RPC function created in nearby_drivers_rpc.sql
  const { data: drivers, error } = await supabaseAdmin.rpc('get_nearest_drivers', {
    p_lat: Number(lat),
    p_lng: Number(lng),
    p_limit: Number(limit)
  })

  if (error) {
    console.error('Nearby drivers search failed:', error)
    return res.status(500).json({ error: 'Failed to search for nearby drivers' })
  }

  // Add ETA estimates (rough calculation based on city speed ~25km/h)
  const results = (drivers || []).map(d => ({
    ...d,
    eta_min: Math.max(1, Math.ceil((d.distance_meters / 1000 / 25) * 60))
  }))

  return res.status(200).json({
    drivers: results,
    count: results.length,
    requested_at: new Date().toISOString()
  })
}
