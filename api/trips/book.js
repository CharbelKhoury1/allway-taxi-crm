/**
 * POST /api/trips/book
 *
 * Creates a new trip in 'pending' status and returns the trip ID plus the
 * customer-facing tracking URL.  The dispatcher/CRM will assign a driver.
 *
 * Authentication: x-api-key header must match AGENT_API_SECRET env var.
 *
 * Body (JSON):
 *   customer_phone   string  required  — used to look up the customer record
 *   pickup_address   string  required  — human-readable pickup location
 *   dropoff_address  string  required  — human-readable drop-off location
 *   pickup_lat       number  optional  — improves driver matching
 *   pickup_lng       number  optional
 *   dropoff_lat      number  optional  — used for fare/distance estimate
 *   dropoff_lng      number  optional
 *   notes            string  optional  — extra instructions for the driver
 *
 * Response:
 *   trip_id, status, tracking_url
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY — write operations bypass RLS.
 */

import { requireApiKey, setCors } from '../_lib/auth.js'
import { supabaseAdmin, requireAdmin } from '../_lib/supabase.js'


export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!requireApiKey(req, res)) return
  if (!requireAdmin(res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Merge body and query to handle any way the agent platform sends data
  const params = { ...req.query, ...req.body }

  const {
    customer_phone,
    phone_number,
    pickup_address,
    dropoff_address,
    pickup_lat  = null,
    pickup_lng  = null,
    dropoff_lat = null,
    dropoff_lng = null,
    notes       = null,
  } = params


  const phone = customer_phone || phone_number


  if (!phone)  return res.status(400).json({ error: 'customer_phone (or phone_number) is required' })

  if (!pickup_address)  return res.status(400).json({ error: 'pickup_address is required' })
  if (!dropoff_address) return res.status(400).json({ error: 'dropoff_address is required' })

  // ── Resolve or Create Customer ──────────────────────────────────────────
  const digits = String(phone).replace(/\D/g, '')

  const { data: customers } = await supabaseAdmin
    .from('customers')
    .select('id, full_name, status')
    .ilike('phone', `%${digits.slice(-8)}`)
    .limit(1)

  let customer = customers?.[0]

  if (!customer) {
    // Auto-register new customer
    const { data: newCust, error: custErr } = await supabaseAdmin
      .from('customers')
      .insert({
        phone:     digits,
        full_name: 'WhatsApp Customer',
        status:    'regular'
      })
      .select()
      .single()

    if (custErr) return res.status(500).json({ error: 'Failed to register customer. Please try again.' })
    customer = newCust
  }


  if (customer.status === 'blocked')
    return res.status(403).json({ error: 'This customer account is blocked.' })

  // ── Guard: no duplicate active trip ──────────────────────────────────────
  const { data: existing } = await supabaseAdmin
    .from('trips')
    .select('id, status')
    .eq('customer_id', customer.id)
    .in('status', ['pending', 'dispatching', 'accepted', 'on_trip'])
    .limit(1)


  if (existing?.length) {
    const baseUrl = process.env.APP_BASE_URL || `https://${req.headers.host}`
    return res.status(409).json({
      error:        'Customer already has an active trip.',
      existing_trip_id:    existing[0].id,
      existing_trip_status: existing[0].status,
      tracking_url: `${baseUrl}/track/${existing[0].id}`,
    })
  }

  // ── Insert trip ───────────────────────────────────────────────────────────
  const tripRow = {
    customer_id:     customer.id,
    pickup_address,
    dropoff_address,
    pickup_lat:      pickup_lat  != null ? Number(pickup_lat)  : null,
    pickup_lng:      pickup_lng  != null ? Number(pickup_lng)  : null,
    dropoff_lat:     dropoff_lat != null ? Number(dropoff_lat) : null,
    dropoff_lng:     dropoff_lng != null ? Number(dropoff_lng) : null,
    status:          'pending',
    requested_at:    new Date().toISOString(),
    ...(notes ? { cancel_reason: null } : {}),  // notes stored separately if schema supports it
  }

  const { data: newTrip, error: insertErr } = await supabaseAdmin
    .from('trips')
    .insert(tripRow)
    .select('id, status, pickup_address, dropoff_address, requested_at')
    .single()

  if (insertErr || !newTrip)
    return res.status(500).json({ error: 'Failed to create trip. Please try again.' })

  const baseUrl      = process.env.APP_BASE_URL || `https://${req.headers.host}`
  const tracking_url = `${baseUrl}/track/${newTrip.id}`

  return res.status(201).json({
    trip_id:         newTrip.id,
    status:          newTrip.status,
    pickup_address:  newTrip.pickup_address,
    dropoff_address: newTrip.dropoff_address,
    customer_name:   customer.full_name,
    tracking_url,
    message:         `Trip booked for ${customer.full_name}. A driver will be assigned shortly.`,
  })
}
