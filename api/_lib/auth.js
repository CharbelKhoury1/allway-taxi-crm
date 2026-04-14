/**
 * Shared Bearer token guard for all agent-facing endpoints.
 *
 * Every request from the WhatsApp AI agent must include:
 *   Header:  Authorization: Bearer <AGENT_API_SECRET>
 *
 * Set AGENT_API_SECRET in Vercel → Settings → Environment Variables.
 * Use the same value inside Convocore as the Bearer token.
 */

export function requireApiKey(req, res) {
  const configured = process.env.AGENT_API_SECRET
  if (!configured) {
    res.status(500).json({ error: 'AGENT_API_SECRET not configured on server.' })
    return false
  }

  const authHeader = req.headers['authorization']
  const provided = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

  if (!provided || provided !== configured) {
    res.status(401).json({ error: 'Unauthorized. Include header: Authorization: Bearer <token>' })
    return false
  }
  return true
}

/** Standard CORS + OPTIONS pre-flight for all endpoints. */
export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

