import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AV_COLORS = ['av-y', 'av-r', 'av-b', 'av-g', 'av-p']
function avColor(name = '') {
  let h = 0; for (const c of name) h += c.charCodeAt(0)
  return AV_COLORS[h % AV_COLORS.length]
}
function initials(name = '') {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const TIER_STYLE = {
  platinum: { color: '#AFA9EC', bg: 'rgba(175,169,236,.15)' },
  gold:     { color: '#F5B800', bg: 'rgba(245,184,0,.15)'   },
  silver:   { color: '#A8A8A8', bg: 'rgba(168,168,168,.15)' },
  bronze:   { color: '#C0945A', bg: 'rgba(192,148,90,.15)'  },
}

function CustomerDetail({ customer, tripCounts }) {
  const [trips, setTrips]     = useState([])
  const [loyalty, setLoyalty] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!customer) return
    setLoading(true)
    setTrips([])
    setLoyalty(null)
    Promise.all([
      supabase
        .from('trips')
        .select('id, pickup_address, dropoff_address, status, fare_usd, requested_at, drivers(full_name)')
        .eq('customer_id', customer.id)
        .order('requested_at', { ascending: false })
        .limit(8),
      supabase
        .from('loyalty_accounts')
        .select('points_balance, tier, total_points_earned')
        .eq('customer_id', customer.id)
        .maybeSingle(),
    ]).then(([tripRes, loyaltyRes]) => {
      if (tripRes.data)    setTrips(tripRes.data)
      if (loyaltyRes.data) setLoyalty(loyaltyRes.data)
      setLoading(false)
    })
  }, [customer?.id])

  if (!customer) {
    return (
      <div className="profile-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, color: 'var(--text-ter)', fontSize: 13 }}>
        Select a customer to view details
      </div>
    )
  }

  const completed = trips.filter(t => t.status === 'completed')
  const spend     = completed.reduce((s, t) => s + Number(t.fare_usd || 0), 0)
  const tier      = loyalty?.tier
  const tierStyle = TIER_STYLE[tier] || {}
  const joinDate  = customer.created_at
    ? new Date(customer.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : '—'

  const STATUS_COLOR = { completed: '#5DCAA5', cancelled: '#F09595', on_trip: '#F5B800', pending: '#F5B800', dispatching: '#F5B800', accepted: '#85B7EB' }

  return (
    <div className="profile-card">
      <div className="profile-top">
        <div className={`av-lg ${avColor(customer.full_name)}`}>{initials(customer.full_name)}</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-pri)', marginBottom: 4 }}>{customer.full_name}</div>
          <div style={{ marginBottom: 6 }}>
            {tier ? (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, color: tierStyle.color, background: tierStyle.bg }}>
                {tier.toUpperCase()}
              </span>
            ) : (
              <span className="badge b-gray">No loyalty</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-ter)' }}>{customer.phone}</div>
          {customer.email && <div style={{ fontSize: 11, color: 'var(--text-ter)', marginTop: 2 }}>{customer.email}</div>}
        </div>
      </div>

      <div className="profile-stats" style={{ gap: '12px', margin: '20px 0' }}>
        <div className="pstat" style={{ padding: '14px' }}>
          <div className="pstat-val">{tripCounts[customer.id] || 0}</div>
          <div className="pstat-lbl">Total trips</div>
        </div>
        <div className="pstat" style={{ padding: '14px' }}>
          <div className="pstat-val">${spend.toFixed(0)}</div>
          <div className="pstat-lbl">Total spend</div>
        </div>
        <div className="pstat" style={{ background: 'rgba(245,184,0,.1)', padding: '14px' }}>
          <div className="pstat-val m-yellow">{loyalty?.points_balance?.toLocaleString() ?? '—'}</div>
          <div className="pstat-lbl" style={{ color: 'var(--yellow-dark)' }}>Points</div>
        </div>
      </div>

      {(customer.address || customer.notes) && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {customer.address && (
            <div style={{ fontSize: 12, color: 'var(--text-sec)', flex: 1 }}>
              <span style={{ fontSize: 10, color: 'var(--text-ter)', fontWeight: 700, marginRight: 6 }}>AREA</span>
              {customer.address}
            </div>
          )}
          {customer.notes && (
            <div style={{ fontSize: 12, color: 'var(--text-sec)', flex: 1 }}>
              <span style={{ fontSize: 10, color: 'var(--text-ter)', fontWeight: 700, marginRight: 6 }}>NOTE</span>
              {customer.notes}
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--text-ter)', marginBottom: 14 }}>
        <span style={{ fontWeight: 700, marginRight: 6 }}>JOINED</span>{joinDate}
      </div>

      <div className="section-label">Recent trips</div>
      {loading ? (
        <div style={{ fontSize: 12, color: 'var(--text-ter)', padding: '8px 0' }}>Loading…</div>
      ) : trips.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-ter)', padding: '8px 0' }}>No trips yet</div>
      ) : trips.map((t, i) => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < trips.length - 1 ? '1px solid var(--border)' : 'none' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-pri)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {(t.pickup_address || '—').split(',')[0]} → {(t.dropoff_address || '—').split(',')[0]}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-ter)', marginTop: 1 }}>
              {t.drivers?.full_name || 'No driver'} · {new Date(t.requested_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 10, flexShrink: 0, color: STATUS_COLOR[t.status] || 'var(--text-ter)' }}>
            {t.status === 'completed' ? `$${Number(t.fare_usd || 0).toFixed(0)}` : t.status.replace('_', ' ')}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function Customers() {
  const [customers, setCustomers]   = useState([])
  const [tripCounts, setTripCounts] = useState({})
  const [tiers, setTiers]           = useState({})
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState(null)
  const [search, setSearch]         = useState('')
  const [tierFilter, setTierFilter] = useState('All')
  const [sortBy, setSortBy]         = useState('Newest')

  useEffect(() => {
    async function load() {
      const [custsRes, tripsRes, loyaltyRes] = await Promise.all([
        supabase
          .from('customers')
          .select('id, full_name, phone, email, address, notes, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('trips')
          .select('customer_id')
          .neq('status', 'cancelled'),
        supabase
          .from('loyalty_accounts')
          .select('customer_id, tier, points_balance'),
      ])

      if (custsRes.data) {
        setCustomers(custsRes.data)
        if (custsRes.data.length > 0) setSelected(custsRes.data[0])
      }
      if (tripsRes.data) {
        const counts = {}
        tripsRes.data.forEach(t => { counts[t.customer_id] = (counts[t.customer_id] || 0) + 1 })
        setTripCounts(counts)
      }
      if (loyaltyRes.data) {
        const map = {}
        loyaltyRes.data.forEach(a => { map[a.customer_id] = { tier: a.tier, points: a.points_balance } })
        setTiers(map)
      }
      setLoading(false)
    }
    load()
  }, [])

  let filtered = customers.filter(c => {
    const q = search.toLowerCase()
    const matchQ = !q || (c.full_name || '').toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.email || '').toLowerCase().includes(q)
    const matchTier = tierFilter === 'All' || (tiers[c.id]?.tier || 'none') === tierFilter.toLowerCase()
    return matchQ && matchTier
  })

  if (sortBy === 'Most trips') {
    filtered = [...filtered].sort((a, b) => (tripCounts[b.id] || 0) - (tripCounts[a.id] || 0))
  } else if (sortBy === 'Most points') {
    filtered = [...filtered].sort((a, b) => (tiers[b.id]?.points || 0) - (tiers[a.id]?.points || 0))
  }

  return (
    <div>
      <div className="metrics" style={{ marginBottom: 18 }}>
        <div className="metric"><div className="m-label">Total customers</div><div className="m-val">{customers.length}</div></div>
        <div className="metric"><div className="m-label">With loyalty</div><div className="m-val m-yellow">{Object.keys(tiers).length}</div></div>
        <div className="metric"><div className="m-label">Gold+ members</div><div className="m-val m-up">{Object.values(tiers).filter(t => t.tier === 'gold' || t.tier === 'platinum').length}</div></div>
        <div className="metric"><div className="m-label">Active today</div><div className="m-val">{Object.values(tripCounts).filter(n => n > 0).length}</div></div>
      </div>

      <div className="search-row" style={{ marginBottom: 16 }}>
        <input
          placeholder="Search by name, phone or email…"
          style={{ flex: 1 }}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={tierFilter} onChange={e => setTierFilter(e.target.value)}>
          <option>All</option>
          <option>Platinum</option>
          <option>Gold</option>
          <option>Silver</option>
          <option>Bronze</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option>Newest</option>
          <option>Most trips</option>
          <option>Most points</option>
        </select>
      </div>

      <div className="grid-2 grid-2-3">
        <div className="table-wrap">
          <div className="table-head" style={{ gridTemplateColumns: '1fr 55px 65px' }}>
            Customer<span>Trips</span><span>Tier</span>
          </div>
          {loading ? (
            <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-ter)' }}>Loading…</div>
          ) : customers.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'var(--text-ter)' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>👤</div>
              No customers yet — click <strong style={{ color: 'var(--yellow)' }}>+ Add customer</strong> to get started.
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-ter)' }}>
              No customers match your filters.
              <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--yellow)', cursor: 'pointer' }} onClick={() => { setSearch(''); setTierFilter('All') }}>Clear filters</span>
            </div>
          ) : filtered.map(c => {
            const tierInfo = tiers[c.id]
            const tierStyle = TIER_STYLE[tierInfo?.tier] || null
            return (
              <div
                className="table-row"
                key={c.id}
                style={{
                  gridTemplateColumns: '1fr 55px 65px',
                  padding: '16px 20px',
                  background: selected?.id === c.id ? 'rgba(245,184,0,.08)' : undefined,
                  borderLeft: selected?.id === c.id ? '3px solid var(--yellow)' : '3px solid transparent',
                }}
                onClick={() => setSelected(c)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className={`av ${avColor(c.full_name)}`} style={{ width: 32, height: 32, fontSize: 11 }}>{initials(c.full_name)}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-pri)' }}>{c.full_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-ter)' }}>{c.phone}</div>
                  </div>
                </div>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{tripCounts[c.id] || 0}</span>
                {tierStyle ? (
                  <span style={{ fontSize: 9, fontWeight: 700, color: tierStyle.color, background: tierStyle.bg, padding: '2px 7px', borderRadius: 10 }}>
                    {tierInfo.tier.toUpperCase()}
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--text-ter)' }}>—</span>
                )}
              </div>
            )
          })}
        </div>

        <CustomerDetail customer={selected} tripCounts={tripCounts} />
      </div>
    </div>
  )
}
