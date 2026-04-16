import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const COL1 = '1fr 80px 80px 90px 80px'
const PCOL = '100px 1fr 60px 70px'

function CampaignIcon({ type, status }) {
  const icons = {
    whatsapp: <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H5l-3 2V3z"/>,
    sms:      <><rect x="2" y="2" width="12" height="12" rx="1.5"/><line x1="5" y1="6" x2="11" y2="6"/><line x1="5" y1="9" x2="9" y2="9"/></>,
  }
  const colors = {
    active:    { bg: 'rgba(93,202,165,.15)',   color: '#5DCAA5' },
    scheduled: { bg: 'rgba(85,138,221,.15)',   color: '#85B7EB' },
    ended:     { bg: 'rgba(168,168,168,.15)',  color: '#A8A8A8' },
  }
  const { bg, color } = colors[status] || colors.ended
  return (
    <div style={{ width: 34, height: 34, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5">
        {icons[type] || icons.sms}
      </svg>
    </div>
  )
}

function statusBadge(s) {
  if (s === 'active')    return 'b-green'
  if (s === 'scheduled') return 'b-blue'
  if (s === 'paused')    return 'b-amber'
  return 'b-gray'
}

export default function Marketing() {
  const [campaigns, setCampaigns] = useState([])
  const [promos, setPromos]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [promoFilter, setPromoFilter] = useState('All')
  const [expandedCamp, setExpanded]   = useState(null)
  const [metrics, setMetrics]     = useState({ active: 0, sent: 0, activeCodes: 0 })

  useEffect(() => {
    async function load() {
      const [campsRes, promosRes] = await Promise.all([
        supabase.from('campaigns').select('id, name, type, status, sent_count, created_at').order('created_at', { ascending: false }),
        supabase.from('promo_codes').select('id, code, discount_pct, max_uses, uses_count, expires_at, active').order('uses_count', { ascending: false }),
      ])
      if (campsRes.data)  setCampaigns(campsRes.data)
      if (promosRes.data) setPromos(promosRes.data)

      const camps  = campsRes.data  || []
      const promos = promosRes.data || []

      setMetrics({
        active:      camps.filter(c => c.status === 'active').length,
        sent:        camps.reduce((s, c) => s + (c.sent_count || 0), 0),
        activeCodes: promos.filter(p => p.active).length,
      })
      setLoading(false)
    }
    load()
  }, [])

  const filteredPromos = promoFilter === 'All'
    ? promos
    : promos.filter(p => {
        if (promoFilter === 'Active')  return p.active && new Date(p.expires_at) > new Date()
        if (promoFilter === 'Expired') return !p.active || new Date(p.expires_at) < new Date()
        return true
      })

  function campSub(c) {
    const channel = c.type === 'whatsapp' ? 'WhatsApp' : 'SMS'
    const sent    = c.sent_count > 0 ? `${c.sent_count.toLocaleString()} sent` : 'Not started'
    const ends    = c.status === 'active' ? '· Ongoing' : c.status === 'scheduled' ? '· Scheduled' : '· Ended'
    return `${channel} · ${sent} ${ends}`
  }

  if (loading) {
    return <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-ter)', fontSize: 13 }}>Loading…</div>
  }

  return (
    <div>
      <div className="metrics">
        <div className="metric">
          <div className="m-label">Active campaigns</div>
          <div className="m-val m-yellow">{metrics.active}</div>
          <div className="m-sub">{campaigns.filter(c => c.status === 'scheduled').length} scheduled</div>
        </div>
        <div className="metric">
          <div className="m-label">Messages sent</div>
          <div className="m-val">{metrics.sent.toLocaleString()}</div>
          <div className="m-sub">across all campaigns</div>
        </div>
        <div className="metric">
          <div className="m-label">Active promo codes</div>
          <div className="m-val">{metrics.activeCodes}</div>
          <div className="m-sub">currently valid</div>
        </div>
        <div className="metric">
          <div className="m-label">Total campaigns</div>
          <div className="m-val">{campaigns.length}</div>
          <div className="m-sub">all time</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 14 }}>
        {/* Campaigns */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">Campaigns</span>
          </div>
          {campaigns.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: 'var(--text-ter)' }}>No campaigns yet</div>
          ) : campaigns.map(c => (
            <div key={c.id}>
              <div
                className="row"
                style={{ background: expandedCamp === c.id ? 'var(--surface2)' : undefined, cursor: 'pointer' }}
                onClick={() => setExpanded(expandedCamp === c.id ? null : c.id)}
              >
                <CampaignIcon type={c.type} status={c.status} />
                <div className="row-info">
                  <div className="row-name">{c.name}</div>
                  <div className="row-sub">{campSub(c)}</div>
                </div>
                <span className={`badge ${statusBadge(c.status)}`} style={{ textTransform: 'capitalize' }}>{c.status}</span>
              </div>
              {expandedCamp === c.id && (
                <div style={{ padding: '10px 16px 12px', background: 'rgba(245,184,0,.04)', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-sec)', marginBottom: 8 }}>Campaign details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-ter)', marginBottom: 3 }}>STATUS</div>
                      <span className={`badge ${statusBadge(c.status)}`} style={{ textTransform: 'capitalize' }}>{c.status}</span>
                    </div>
                    <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-ter)', marginBottom: 3 }}>CHANNEL</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-pri)', textTransform: 'capitalize' }}>{c.type}</div>
                    </div>
                    <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-ter)', marginBottom: 3 }}>SENT</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-pri)' }}>{c.sent_count?.toLocaleString() || 0}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Promo codes */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">Promo codes</span>
            <select
              value={promoFilter}
              onChange={e => setPromoFilter(e.target.value)}
              style={{ fontSize: 11, padding: '3px 8px', background: 'var(--dark4)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-sec)', fontFamily: 'var(--font)', outline: 'none' }}
            >
              <option>All</option>
              <option>Active</option>
              <option>Expired</option>
            </select>
          </div>
          <div className="table-head" style={{ gridTemplateColumns: PCOL, fontSize: 9 }}>
            Code<span>Discount</span><span>Uses</span><span>Status</span>
          </div>
          {filteredPromos.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'var(--text-ter)' }}>No codes match filter.</div>
          ) : filteredPromos.map(p => {
            const expired = !p.active || new Date(p.expires_at) < new Date()
            const badge   = expired ? 'b-gray' : p.uses_count >= p.max_uses * 0.9 ? 'b-amber' : 'b-green'
            const label   = expired ? 'Expired' : p.uses_count >= p.max_uses * 0.9 ? 'Almost full' : 'Active'
            return (
              <div key={p.id} className="table-row" style={{ gridTemplateColumns: PCOL }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: expired ? 'var(--text-ter)' : 'var(--yellow)', fontFamily: 'monospace' }}>{p.code}</span>
                <span style={{ fontSize: 12, color: 'var(--text-sec)' }}>{p.discount_pct}% off</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{p.uses_count}</span>
                <span className={`badge ${badge}`}>{label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Campaign performance */}
      <div className="card">
        <div className="card-head">
          <span className="card-title">Campaign performance</span>
          <span className="card-meta">All campaigns</span>
        </div>
        <div className="table-head" style={{ gridTemplateColumns: COL1 }}>
          Campaign<span>Channel</span><span>Status</span><span>Sent</span><span>Uses</span>
        </div>
        {campaigns.map(c => {
          const relatedPromo = promos.find(p => c.name.toLowerCase().includes(p.code.toLowerCase().slice(0, 4)))
          return (
            <div key={c.id} className="table-row" style={{ gridTemplateColumns: COL1 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
              <span className="b-blue badge" style={{ width: 'fit-content', textTransform: 'capitalize' }}>{c.type}</span>
              <span className={`badge ${statusBadge(c.status)}`} style={{ textTransform: 'capitalize' }}>{c.status}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: c.sent_count ? undefined : 'var(--text-ter)' }}>{c.sent_count?.toLocaleString() || '—'}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#5DCAA5' }}>{relatedPromo ? relatedPromo.uses_count : '—'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
