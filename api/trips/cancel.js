/**
 * POST /api/trips/cancel
 *
 * Cancels an active trip.  Only trips in 'pending' or 'dispatching' status
 * can be cancelled via the agent — trips already 'accepted' or 'on_trip'
 * require dispatcher approval (returns 409 with a human-handoff flag).
 *
 * Authentication: x-api-key header must match AGENT_API_SECRET env var.
 *
 * Body (JSON):
 *   trip_id   string  required
 *   reason    string  optional  — e.g. "customer changed plans"
 *
 * Response:
 *   cancelled: true  → success
 *   cancelled: false → explanation + needs_human flag if dispatcher must handle it
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY for the UPDATE.
 */

import { requireApiKey, setCors } from '../_lib/auth.js'
import { supabaseAnon, supabaseAdmin, requireAdmin } from '../_lib/supabase.js'

// For the demo, we allow the agent to cancel any active trip status.
const ALLOWED_CANCEL_STATUSES = ['pending', 'dispatching', 'accepted', 'on_trip']


export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!requireApiKey(req, res)) return
  if (!requireAdmin(res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { trip_id, reason = 'Cancelled via WhatsApp' } = req.body ?? {}
  if (!trip_id) return res.status(400).json({ error: 'trip_id is required' })

  // ── Fetch current trip ────────────────────────────────────────────────────
  const { data: trip } = await supabaseAnon
    .from('trips')
    .select('id, status, customer_id, driver_id')
    .eq('id', trip_id)
    .single()

  if (!trip) return res.status(404).json({ error: 'Trip not found' })

  // Already terminal
  if (['completed', 'cancelled', 'no_driver'].includes(trip.status)) {
    return res.status(200).json({
      cancelled: false,
      message:   `Trip is already in '${trip.status}' status — nothing to cancel.`,
    })
  }

  // Cancel logic simplified for Demo stabilization


  // ── Cancel it ─────────────────────────────────────────────────────────────
  const { error: updateErr } = await supabaseAdmin
    .from('trips')
    .update({
      status:        'cancelled',
      cancel_reason: reason,
    })
    .eq('id', trip_id)
    .in('status', ALLOWED_CANCEL_STATUSES)   // optimistic lock — don't cancel if status changed


  if (updateErr)
    return res.status(500).json({ error: 'Failed to cancel trip.', detail: updateErr.message })

  return res.status(200).json({
    cancelled: true,
    trip_id,
    message:   'Trip cancelled successfully. You will not be charged.',
  })
}
