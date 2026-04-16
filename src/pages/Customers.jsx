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

function CustomerDetail({ customer }) {
  const [trips, setTrips]     = useState([])
  const [loyalty, setLoyalty] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!customer) return
    setLoading(true)
    Promise.all([
      supabase
        .from('trips')
        .select('id, pickup_address, dropoff_address, status, fare_usd, requested_at, drivers(full_name)')
        .eq('customer_id', customer.id)
        .order('requested_at', { ascending: false })
        .limit(5),
      supabase
        .from('loyalty_accounts')
        .select('points, tier, lifetime_points')
        .eq('customer_id', customer.id)
        .maybeSingle(),
    ]).then(([tripRes, loyaltyRes]) => {
      if (tripRes.data)   setTrips(tripRes.data)
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

  const spend     = trips.filter(t => t.status === 'completed').reduce((s, t) => s + Number(t.fare_usd || 0), 0)
  const completed = trips.filter(t => t.status === 'completed').length
  const tier      = loyalty?.tier
  const tierStyle = TIER_STYLE[tier] || {}
  const joinDate  = customer.created_at ? new Date(customer.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—'

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
          <div className="pstat-val">{completed}</div>
          <div className="pstat-lbl">Trips</div>
        </div>
        <div className="pstat" style={{ padding: '14px' }}>
          <div className="pstat-val">${spend.toFixed(0)}</div>
          <div className="pstat-lbl">Spend</div>
        </div>
        <div className="pstat" style={{ background: 'rgba(245,184,0,.1)', padding: '14px' }}>
          <div className="pstat-val m-yellow">{loyalty?.points?.toLocaleString() || '—'}</div>
          <div className="pstat-lbl" style={{ color: 'var(--yellow-dark)' }}>Points</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {customer.address && (
          <div style={{ fontSize: 12, color: 'var(--text-sec)', flex: 1 }}>
            <span style={{ fontSize: 10, color: 'var(--text-ter)', fontWeight: 700, marginRight: 6 }}>AREA</span>
            {customer.address}
          </div>
        )}
        <div style={{ fontSize: 12, color: 'var(--text-sec)' }}>
          <span style={{ fontSize: 10, color: 'var(--text-ter)', fontWeight: 700, marginRight: 6 }}>JOINED</span>
          {joinDate}
        </div>
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
              {t.pickup_address} → {t.dropoff_address}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-ter)', marginTop: 1 }}>
              {t.drivers?.full_name || '—'} · {new Date(t.requested_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 10, flexShrink: 0, color: t.status === 'completed' ? '#5DCAA5' : t.status === 'cancelled' ? '#F09595' : '#F5B800' }}>
            {t.status === 'completed' ? `$${t.fare_usd}` : t.status}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [tripCounts, setTripCounts] = useState({})
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState(null)
  const [search, setSearch]         = useState('')

  useEffect(() => {
    async function load() {
      const [custsRes, tripsRes] = await Promise.all([
        supabase.from('customers').select('id, full_name, phone, email, address, created_at').order('created_at', { ascending: false }),
        supabase.from('trips').select('customer_id').eq('status', 'completed'),
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
      setLoading(false)
    }
    load()
  }, [])

  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    return !q || c.full_name.toLowerCase().includes(q) || c.phone.includes(q)
  })

  return (
    <div>
      <div className="search-row">
        <input
          placeholder="Search by name or phone..."
          style={{ flex: 1 }}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid-2 grid-2-3">
        <div className="table-wrap">
          <div className="table-head" style={{ gridTemplateColumns: '1fr 55px' }}>
            Customer<span>Trips</span>
          </div>
          {loading ? (
            <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-ter)' }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-ter)' }}>No customers match your search.</div>
          ) : filtered.map(c => (
            <div
              className="table-row"
              key={c.id}
              style={{
                gridTemplateColumns: '1fr 55px',
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
            </div>
          ))}
        </div>

        <CustomerDetail customer={selected} />
      </div>
    </div>
  )
}
