/**
 * Shared Supabase clients for serverless functions.
 *
 * supabaseAnon  — public anon key, respects RLS.  Use for all SELECTs.
 * supabaseAdmin — service role key, bypasses RLS. Use for INSERT / UPDATE / DELETE.
 *
 * Required Vercel env vars:
 *   SUPABASE_URL               – your project URL
 *   SUPABASE_ANON_KEY          – public anon key
 *   SUPABASE_SERVICE_ROLE_KEY  – secret service-role key (never expose client-side)
 */

import { createClient } from '@supabase/supabase-js'

const url    = process.env.SUPABASE_URL            || process.env.VITE_SUPABASE_URL
const anon   = process.env.SUPABASE_ANON_KEY       || process.env.VITE_SUPABASE_ANON_KEY
const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseAnon = createClient(url, anon)

export const supabaseAdmin = svcKey
  ? createClient(url, svcKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null

export function requireAdmin(res) {
  if (!supabaseAdmin) {
    res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured on server.' })
    return false
  }
  return true
}
