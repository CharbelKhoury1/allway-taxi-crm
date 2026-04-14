/**
 * GET /api/promo/validate?code=<CODE>&customer_phone=<PHONE>
 *
 * Validates a promo code and returns the discount details.
 * Checks: code exists, is active, has not expired, and has not exceeded max_uses.
 * Optionally accepts customer_phone to check if the customer has already used it.
 *
 * Authentication: x-api-key header must match AGENT_API_SECRET env var.
 *
 * Response:
 *   valid: true  → code details + discount amount/percent
 *   valid: false → reason the code is not usable
 */

import { requireApiKey, setCors } from '../_lib/auth.js'
import { supabaseAdmin, requireAdmin } from '../_lib/supabase.js'

export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!requireApiKey(req, res)) return
  if (!requireAdmin(res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { code, customer_phone } = req.query
  if (!code) return res.status(400).json({ error: 'code query parameter is required' })

  // ── Fetch promo code ──────────────────────────────────────────────────────
  const { data: promo } = await supabaseAdmin
    .from('promo_codes')
    .select('id, code, description, discount_type, discount_value, status, use_count, max_uses, expires_at')
    .ilike('code', code.trim())
    .single()

  if (!promo) {
    return res.status(200).json({
      valid: false,
      reason: 'This promo code does not exist. Please check the code and try again.',
    })
  }

  // ── Status check ──────────────────────────────────────────────────────────
  if (promo.status !== 'active') {
    const reason = promo.status === 'expired'
      ? 'This promo code has expired.'
      : 'This promo code is currently paused.'
    return res.status(200).json({ valid: false, reason })
  }

  // ── Expiry check ──────────────────────────────────────────────────────────
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return res.status(200).json({
      valid: false,
      reason: 'This promo code has expired.',
    })
  }

  // ── Usage cap check ───────────────────────────────────────────────────────
  if (promo.max_uses !== null && promo.use_count >= promo.max_uses) {
    return res.status(200).json({
      valid: false,
      reason: 'This promo code has reached its maximum number of uses.',
    })
  }

  // ── Per-customer duplicate check ──────────────────────────────────────────
  if (customer_phone) {
    const digits = String(customer_phone).replace(/\D/g, '')
    const { data: customers } = await supabaseAdmin
      .from('customers')
      .select('id')
      .ilike('phone', `%${digits.slice(-8)}`)
      .limit(1)

    const customerId = customers?.[0]?.id
    if (customerId) {
      const { data: used } = await supabaseAdmin
        .from('promo_code_usage')
        .select('id')
        .eq('promo_code_id', promo.id)
        .eq('customer_id', customerId)
        .limit(1)

      if (used?.length) {
        return res.status(200).json({
          valid: false,
          reason: 'You have already used this promo code.',
        })
      }
    }
  }

  // ── All checks passed ─────────────────────────────────────────────────────
  const discountLabel = promo.discount_type === 'percent'
    ? `${promo.discount_value}% off`
    : `$${Number(promo.discount_value).toFixed(2)} off`

  return res.status(200).json({
    valid: true,
    promo_code_id:  promo.id,
    code:           promo.code,
    description:    promo.description,
    discount_type:  promo.discount_type,   // 'percent' | 'fixed'
    discount_value: Number(promo.discount_value),
    discount_label: discountLabel,
    expires_at:     promo.expires_at ?? null,
    uses_remaining: promo.max_uses !== null
      ? promo.max_uses - promo.use_count
      : null,
    message: `Promo code applied! You get ${discountLabel} on your next ride.`,
  })
}
