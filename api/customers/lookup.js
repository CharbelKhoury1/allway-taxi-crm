/**
 * GET /api/customers/lookup?phone=<number>
 *
 * Identifies a customer by their WhatsApp phone number and returns their
 * profile plus any currently active trip.  Call this first in every
 * conversation flow so the agent knows who it is talking to.
 *
 * Phone matching is flexible: the query strips non-digits and does a suffix
 * match, so "+961 70 123 456", "0070123456", and "70123456" all resolve to
 * the same record.
 *
 * Authentication: x-api-key header must match AGENT_API_SECRET env var.
 *
 * Response:
 *   found: true  → customer fields + active_trip (or null)
 *   found: false → 404 with message the agent can relay to the customer
 */

import { requireApiKey, setCors } from '../_lib/auth.js'
import { supabaseAnon }           from '../_lib/supabase.js'

const ACTIVE_STATUSES = ['pending', 'dispatching', 'accepted', 'on_trip']

export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!requireApiKey(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const raw = req.query.phone
  if (!raw) return res.status(400).json({ error: 'phone query parameter is required' })

  // Normalise: keep digits only, then suffix-match
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 7) return res.status(400).json({ error: 'Phone number too short' })

  // ── Customer lookup ───────────────────────────────────────────────────────
  const { data: customers } = await supabaseAnon
    .from('customers')
    .select('id, full_name, phone, status, total_trips, total_spend, avg_rating, wa_thread_id')
    .ilike('phone', `%${digits.slice(-8)}`)   // last 8 digits covers local + intl formats
    .limit(1)

  const customer = customers?.[0]
  if (!customer) {
    return res.status(404).json({
      found: false,
      message: 'No customer account found for this number. They may need to register first.',
    })
  }

  // ── Active trip ───────────────────────────────────────────────────────────
  const { data: trips } = await supabaseAnon
    .from('trips')
    .select('id, status, pickup_address, dropoff_address, driver_id, requested_at')
    .eq('customer_id', customer.id)
    .in('status', ACTIVE_STATUSES)
    .order('requested_at', { ascending: false })
    .limit(1)

  const active_trip = trips?.[0] ?? null
  const baseUrl     = process.env.APP_BASE_URL || `https://${req.headers.host}`

  return res.status(200).json({
    found: true,
    customer: {
      id:          customer.id,
      full_name:   customer.full_name,
      phone:       customer.phone,
      status:      customer.status,          // 'regular' | 'vip' | 'blocked'
      total_trips: customer.total_trips,
      total_spend: customer.total_spend,
      avg_rating:  customer.avg_rating,
    },
    active_trip: active_trip
      ? {
          id:              active_trip.id,
          status:          active_trip.status,
          pickup_address:  active_trip.pickup_address,
          dropoff_address: active_trip.dropoff_address,
          has_driver:      !!active_trip.driver_id,
          tracking_url:    `${baseUrl}/track/${active_trip.id}`,
        }
      : null,
  })
}
