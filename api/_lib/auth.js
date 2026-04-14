/**
 * Shared API key guard for all agent-facing endpoints.
 *
 * Every request from the WhatsApp AI agent must include:
 *   Header:  x-api-key: <AGENT_API_SECRET>
 *
 * Set AGENT_API_SECRET in Vercel → Settings → Environment Variables.
 * Use the same value inside your agent platform as the secret.
 */

export function requireApiKey(req, res) {
  const configured = process.env.AGENT_API_SECRET
  if (!configured) {
    res.status(500).json({ error: 'AGENT_API_SECRET not configured on server.' })
    return false
  }
  const provided = req.headers['x-api-key']
  if (!provided || provided !== configured) {
    res.status(401).json({ error: 'Invalid or missing x-api-key header.' })
    return false
  }
  return true
}

/** Standard CORS + OPTIONS pre-flight for all endpoints. */
export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key')
}
