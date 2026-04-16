import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const TIER_DEFS = [
  { name: 'Platinum', color: '#AFA9EC', bg: 'rgba(175,169,236,.15)', border: 'rgba(175,169,236,.2)', range: '10k+ pts'     },
  { name: 'Gold',     color: '#F5B800', bg: 'rgba(245,184,0,.15)',   border: 'rgba(245,184,0,.2)',   range: '5k–9,999 pts' },
  { name: 'Silver',   color: '#A8A8A8', bg: 'rgba(168,168,168,.15)', border: 'rgba(168,168,168,.2)', range: '1k–4,999 pts' },
  { name: 'Bronze',   color: '#C0945A', bg: 'rgba(192,148,90,.15)',  border: 'rgba(192,148,90,.2)',  range: '0–999 pts'    },
]

const TIER_STYLE = {
  platinum: { color: '#AFA9EC', bg: 'rgba(175,169,236,.15)' },
  gold:     { color: '#F5B800', bg: 'rgba(245,184,0,.15)'   },
  silver:   { color: '#A8A8A8', bg: 'rgba(168,168,168,.15)' },
  bronze:   { color: '#C0945A', bg: 'rgba(192,148,90,.15)'  },
}

const AV_COLORS = ['av-y', 'av-r', 'av-b', 'av-g', 'av-p']
function avColor(name = '') {
  let h = 0; for (const c of name) h += c.charCodeAt(0)
  return AV_COLORS[h % AV_COLORS.length]
}
function initials(name = '') {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const RCOL = '1fr 100px 80px 90px'

export default function Loyalty() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [metrics, setMetrics]   = useState({ totalPts: 0, members: 0, goldPlus: 0 })
  const [tierCounts, setTierCounts] = useState([])
  const [topMembers, setTopMembers] = useState([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('loyalty_accounts')
        .select('id, customer_id, points, tier, lifetime_points, customers(full_name, created_at)')
        .order('points', { ascending: false })

      if (data) {
        setAccounts(data)

        // Metrics
        const totalPts = data.reduce((s, a) => s + (a.points || 0), 0)
        const goldPlus = data.filter(a => a.tier === 'gold' || a.tier === 'platinum').length
        setMetrics({ totalPts, members: data.length, goldPlus })

        // Tier counts
        const counts = {}
        data.forEach(a => { counts[a.tier] = (counts[a.tier] || 0) + 1 })
        const total = data.length || 1
        setTierCounts(TIER_DEFS.map(t => ({
          ...t,
          count: counts[t.name.toLowerCase()] || 0,
          pct:   Math.round(((counts[t.name.toLowerCase()] || 0) / total) * 100),
        })))

        // Top members
        setTopMembers(data.slice(0, 5).map((a, i) => ({
          rank:  i + 1,
          name:  a.customers?.full_name || 'Unknown',
          pts:   a.points?.toLocaleString() || '0',
          tier:  a.tier,
          joinDate: a.customers?.created_at ? new Date(a.customers.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—',
          cls:   avColor(a.customers?.full_name || ''),
          init:  initials(a.customers?.full_name || ''),
          gold:  i < 3,
          ...(TIER_STYLE[a.tier] || {}),
        })))
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-ter)', fontSize: 13 }}>Loading loyalty data…</div>
  }

  return (
    <div>
      <div className="metrics">
        <div className="metric">
          <div className="m-label">Total points issued</div>
          <div className="m-val m-yellow">{metrics.totalPts.toLocaleString()}</div>
          <div className="m-sub">lifetime balance</div>
        </div>
        <div className="metric">
          <div className="m-label">Active members</div>
          <div className="m-val">{metrics.members}</div>
          <div className="m-sub">enrolled in program</div>
        </div>
        <div className="metric">
          <div className="m-label">Gold+ members</div>
          <div className="m-val m-up">{metrics.goldPlus}</div>
          <div className="m-sub">gold &amp; platinum</div>
        </div>
        <div className="metric">
          <div className="m-label">Avg points</div>
          <div className="m-val">{metrics.members ? Math.round(metrics.totalPts / metrics.members).toLocaleString() : 0}</div>
          <div className="m-sub">per member</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 14 }}>
        {/* Tier breakdown */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">Tier breakdown</span>
            <span className="card-meta">{metrics.members} members</span>
          </div>
          <div style={{ padding: '14px 16px' }}>
            {tierCounts.map(t => (
              <div className="zone-row" key={t.name}>
                <div className="zone-top">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, display: 'inline-block' }} />
                    {t.name}
                  </span>
                  <span className="zone-val">{t.count} member{t.count !== 1 ? 's' : ''}</span>
                </div>
                <div className="prog-bar">
                  <div className="prog-fill" style={{ width: `${t.pct}%`, background: t.color }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '0 16px 14px' }}>
            <div className="section-label" style={{ marginBottom: 8 }}>Tier thresholds</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {TIER_DEFS.map(t => (
                <div key={t.name} style={{ textAlign: 'center', padding: 8, background: t.bg, borderRadius: 8, border: `1px solid ${t.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: t.color }}>{t.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-ter)', marginTop: 2 }}>{t.range}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top members */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">Top loyalty members</span>
            <span className="card-meta">by points balance</span>
          </div>
          <div style={{ padding: '4px 0' }}>
            {topMembers.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: 'var(--text-ter)' }}>No members yet</div>
            ) : topMembers.map(m => (
              <div key={m.rank} className="row">
                <span style={{ fontSize: 12, fontWeight: 800, color: m.gold ? 'var(--yellow)' : 'var(--text-ter)', width: 20, flexShrink: 0 }}>{m.rank}</span>
                <div className={`av ${m.cls}`}>{m.init}</div>
                <div className="row-info">
                  <div className="row-name">{m.name}</div>
                  <div className="row-sub">joined {m.joinDate}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-pri)' }}>{m.pts}</div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: m.color, background: m.bg, padding: '2px 7px', borderRadius: 10 }}>
                    {m.tier?.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full member list */}
      <div className="card">
        <div className="card-head">
          <span className="card-title">All members</span>
          <span className="card-meta">{accounts.length} total</span>
        </div>
        <div className="table-head" style={{ gridTemplateColumns: RCOL }}>
          Customer<span>Points</span><span>Tier</span><span>Lifetime pts</span>
        </div>
        {accounts.map(a => {
          const name  = a.customers?.full_name || 'Unknown'
          const ts    = TIER_STYLE[a.tier] || {}
          return (
            <div key={a.id} className="table-row" style={{ gridTemplateColumns: RCOL }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className={`av av-sm ${avColor(name)}`}>{initials(name)}</div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{name}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--yellow)' }}>{a.points?.toLocaleString()}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: ts.color, background: ts.bg, padding: '2px 7px', borderRadius: 10 }}>
                {a.tier?.toUpperCase()}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-sec)' }}>{a.lifetime_points?.toLocaleString()}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
