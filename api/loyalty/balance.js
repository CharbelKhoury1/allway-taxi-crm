/**
 * GET /api/loyalty/balance?phone=<PHONE>
 *
 * Returns a customer's loyalty account: points balance, tier, and
 * a human-readable summary the AI agent can relay directly to the customer.
 *
 * Tier thresholds (from DB trigger):
 *   Bronze   0 – 999 pts
 *   Silver   1 000 – 4 999 pts
 *   Gold     5 000 – 9 999 pts
 *   Platinum 10 000+ pts
 *
 * Authentication: x-api-key header must match AGENT_API_SECRET env var.
 */

import { requireApiKey, setCors } from '../_lib/auth.js'
import { supabaseAnon }           from '../_lib/supabase.js'

// Points needed to reach the next tier
const NEXT_TIER = {
  bronze:   1_000,
  silver:   5_000,
  gold:     10_000,
  platinum: null,      // already at the top
}

const TIER_EMOJI = {
  bronze: '🥉',
  silver: '🥈',
  gold:   '🥇',
  platinum: '💎',
}

export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!requireApiKey(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { phone } = req.query
  if (!phone) return res.status(400).json({ error: 'phone query parameter is required' })

  // ── Resolve customer ──────────────────────────────────────────────────────
  const digits = String(phone).replace(/\D/g, '')
  const { data: customers } = await supabaseAnon
    .from('customers')
    .select('id, full_name')
    .ilike('phone', `%${digits.slice(-8)}`)
    .limit(1)

  const customer = customers?.[0]
  if (!customer) {
    return res.status(404).json({
      error: 'Customer not found.',
      message: 'I could not find an account linked to this number.',
    })
  }

  // ── Loyalty account ───────────────────────────────────────────────────────
  const { data: account } = await supabaseAnon
    .from('loyalty_accounts')
    .select('tier, points_balance, total_points_earned, enrolled_at')
    .eq('customer_id', customer.id)
    .single()

  if (!account) {
    return res.status(200).json({
      enrolled: false,
      customer_name: customer.full_name,
      message: `${customer.full_name} is not yet enrolled in the Allway Loyalty Program. They earn points automatically on their next completed trip.`,
    })
  }

  const tier          = account.tier
  const points        = account.points_balance
  const nextThreshold = NEXT_TIER[tier]
  const pointsToNext  = nextThreshold ? nextThreshold - points : null

  // ── Recent transactions (last 5) ──────────────────────────────────────────
  const { data: recent } = await supabaseAnon
    .from('loyalty_transactions')
    .select('type, points, description, created_at')
    .eq('account_id', (
      // We need the account ID — fetch it
      await supabaseAnon
        .from('loyalty_accounts')
        .select('id')
        .eq('customer_id', customer.id)
        .single()
    ).data?.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Build a natural-language summary for the AI to relay
  let summary = `${TIER_EMOJI[tier]} ${customer.full_name} has ${points.toLocaleString()} loyalty points (${tier.charAt(0).toUpperCase() + tier.slice(1)} tier).`
  if (pointsToNext) {
    const nextTierName = Object.keys(NEXT_TIER).find(t => NEXT_TIER[t] === nextThreshold)
    summary += ` They need ${pointsToNext.toLocaleString()} more points to reach ${nextTierName?.charAt(0).toUpperCase() + nextTierName?.slice(1)} tier.`
  } else {
    summary += ` They are at the highest Platinum tier — congratulations!`
  }

  return res.status(200).json({
    enrolled:             true,
    customer_name:        customer.full_name,
    tier,
    tier_emoji:           TIER_EMOJI[tier],
    points_balance:       points,
    total_points_earned:  account.total_points_earned,
    points_to_next_tier:  pointsToNext,
    next_tier:            pointsToNext
      ? Object.keys(NEXT_TIER).find(t => NEXT_TIER[t] === nextThreshold)
      : null,
    enrolled_since:       account.enrolled_at,
    recent_transactions:  (recent ?? []).map(t => ({
      type:        t.type,         // 'earned' | 'redeemed' | 'expired'
      points:      t.points,
      description: t.description,
      date:        t.created_at,
    })),
    summary,   // ready-to-send message for the AI agent
  })
}
