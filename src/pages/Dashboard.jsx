import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import LiveMap from '../components/LiveMap'

export default function Dashboard({ onNavigate }) {
  const [drivers, setDrivers]   = useState([])
  const [stats, setStats]       = useState({ trips: 0, online: 0, pending: 0, revenue: 0 })
  const [logs, setLogs]         = useState([])
  const [selected, setSelected] = useState(null)

  // ── Live driver locations ──────────────────────────────────────
  useEffect(() => {
    // Initial fetch: all online drivers that have sent a location
    async function fetchDrivers() {
      const { data } = await supabase
        .from('drivers')
        .select('id, full_name, plate, car_model, status, online, lat, lng, last_seen')
        .eq('online', true)
      if (data) {
        setDrivers(toMapDrivers(data))
      }
    }
    fetchDrivers()

    // Real-time: any UPDATE on drivers table → refresh the map pin
    const channel = supabase
      .channel('crm-drivers-live')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'drivers' },
        ({ new: d }) => {
          const isLive = d.online && d.lat != null && d.lng != null
          if (isLive) {
            // Driver online with location → add or update marker immediately
            const mapped = toMapDriver(d)
            setDrivers(prev => {
              const exists = prev.some(x => x.id === d.id)
              return exists
                ? prev.map(x => x.id === d.id ? mapped : x)
                : [...prev, mapped]
            })
            pushLog(`Driver ${d.full_name} — ${d.status.replace('_', ' ')} · ${d.lat?.toFixed(4)}°N`)
          } else if (d.online === false || d.lat == null || d.lng == null) {
            // Driver went offline or location was cleared → remove marker
            setDrivers(prev => prev.filter(x => x.id !== d.id))
            if (d.online === false) pushLog(`Driver ${d.full_name} went offline`)
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  // ── Live stats (trips + revenue) ───────────────────────────────
  useEffect(() => {
    async function fetchStats() {
      const [tripsRes, pendingRes, revenueRes] = await Promise.all([
        supabase.from('trips').select('id', { count: 'exact', head: true }).in('status', ['on_trip', 'accepted']),
        supabase.from('trips').select('id', { count: 'exact', head: true }).in('status', ['pending', 'dispatching']),
        supabase.from('trips').select('fare_usd').eq('status', 'completed').gte('completed_at', todayISO()),
      ])
      const revenue = (revenueRes.data || []).reduce((s, t) => s + Number(t.fare_usd || 0), 0)
      setStats(s => ({
        ...s,
        trips: tripsRes.count ?? 0,
        pending: pendingRes.count ?? 0,
        revenue: Math.round(revenue),
      }))
    }
    fetchStats()
    // Refresh stats every 30 s
    const id = setInterval(fetchStats, 30000)
    return () => clearInterval(id)
  }, [])

  // Keep online count in sync with map drivers
  useEffect(() => {
    setStats(s => ({ ...s, online: drivers.length }))
  }, [drivers])

  // ── Helpers ───────────────────────────────────────────────────
  function pushLog(msg) {
    setLogs(prev => [{ msg, time: new Date() }, ...prev].slice(0, 8))
  }

  return (
    <div className="dash-container">
      {/* ── Metrics ── */}
      <div className="metrics">
        <div className="metric anim-scale" style={{ animationDelay: '0.0s' }}>
          <div className="m-label">Active trips</div>
          <div className="m-val">{stats.trips}</div>
          <div className="m-sub">right now</div>
        </div>
        <div className="metric anim-scale" style={{ animationDelay: '0.1s' }}>
          <div className="m-label">Online drivers</div>
          <div className="m-val m-yellow">{stats.online}</div>
          <div className="m-sub">{stats.online > 0 ? 'live on map' : 'none active'}</div>
        </div>
        <div className="metric anim-scale" style={{ animationDelay: '0.2s' }}>
          <div className="m-label">Pending orders</div>
          <div className="m-val m-dn">{stats.pending}</div>
          <div className="m-sub m-dn">{stats.pending > 0 ? 'Needs dispatch' : 'All clear'}</div>
        </div>
        <div className="metric anim-scale" style={{ animationDelay: '0.3s' }}>
          <div className="m-label">Revenue today</div>
          <div className="m-val">${stats.revenue}</div>
          <div className="m-sub">completed trips</div>
        </div>
      </div>

      {/* ── Map + Activity ── */}
      <div className="grid-2-3 anim-fade" style={{ animationDelay: '0.4s', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 20, marginBottom: 20 }}>
        {/* Live Map */}
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <div className="card-head" style={{ padding: '12px 16px' }}>
            <span className="card-title">Live Dispatch Map</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 4, background: 'rgba(93,202,165,.1)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#5DCAA5', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#5DCAA5' }}>REAL-TIME</span>
            </div>
          </div>
          <LiveMap
            drivers={drivers}
            height="390px"
            onSelect={d => { setSelected(d); pushLog(`Selected: ${d.full_name} · ${d.status}`) }}
          />
          {/* Selected driver panel */}
          {selected && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: selected.status === 'available' ? 'rgba(93,202,165,.15)' : 'rgba(245,184,0,.12)', border: `1px solid ${selected.status === 'available' ? 'rgba(93,202,165,.3)' : 'rgba(245,184,0,.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: selected.status === 'available' ? '#5DCAA5' : '#F5B800', flexShrink: 0 }}>
                {(selected.full_name || '?')[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{selected.full_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-ter)' }}>{selected.car_model} · {selected.plate}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: selected.status === 'available' ? 'rgba(93,202,165,.12)' : 'rgba(245,184,0,.1)', color: selected.status === 'available' ? '#5DCAA5' : '#F5B800', border: `1px solid ${selected.status === 'available' ? 'rgba(93,202,165,.25)' : 'rgba(245,184,0,.2)'}` }}>
                {selected.status.replace('_', ' ')}
              </span>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-ter)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
          )}
        </div>

        {/* Live Activity Log */}
        <div className="card" style={{ height: selected ? 490 : 440, display: 'flex', flexDirection: 'column' }}>
          <div className="card-head">
            <span className="card-title">Live Activity</span>
            {logs.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(245,184,0,.1)', color: '#F5B800' }}>{logs.length}</span>}
          </div>
          <div style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
            {logs.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text-ter)', textAlign: 'center', marginTop: 40 }}>
                Waiting for driver activity…
                <div style={{ marginTop: 8, fontSize: 10, opacity: 0.6 }}>Driver locations will appear here when they go online</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {logs.map((entry, i) => (
                  <div key={i} className="anim-fade" style={{ display: 'flex', gap: 8, padding: '8px 10px', background: 'var(--surface)', borderRadius: 8, borderLeft: '3px solid var(--yellow)' }}>
                    <div style={{ fontSize: 11, lineHeight: 1.4, color: 'var(--text-pri)' }}>
                      <div style={{ fontSize: 9, color: 'var(--text-ter)', marginBottom: 2 }}>
                        {entry.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                      {entry.msg}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ padding: 12, borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-ter)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#5DCAA5', animation: 'pulse 2s infinite' }} />
            Supabase Realtime connected
          </div>
        </div>
      </div>

      {/* ── Orders + Chart ── */}
      <div className="grid-2">
        <div className="card anim-fade" style={{ animationDelay: '0.5s' }}>
          <div className="card-head">
            <span className="card-title">Active &amp; pending orders</span>
            <span className="card-link" onClick={() => onNavigate('orders')}>View all →</span>
          </div>
          {[
            { cls:'av-y', init:'AK', name:'Ahmad Khalil', route:'Hamra → Verdun',           badge:'b-amber', status:'Dispatching' },
            { cls:'av-r', init:'SR', name:'Sara Rizk',    route:'Achrafieh → Airport',       badge:'b-red',   status:'No driver'  },
            { cls:'av-b', init:'MH', name:'Maya Haddad',  route:'Jounieh → Downtown',        badge:'b-blue',  status:'Assigned'   },
            { cls:'av-g', init:'JN', name:'Joe Nasr',     route:'Mar Mikhael → Dbayeh',      badge:'b-green', status:'In progress'},
            { cls:'av-p', init:'LF', name:'Lara Farah',   route:'Zalka → Gemmayzeh',         badge:'b-green', status:'In progress'},
          ].map(o => (
            <div className="row" key={o.name} onClick={() => onNavigate('orders')}>
              <div className={`av ${o.cls}`}>{o.init}</div>
              <div className="row-info"><div className="row-name">{o.name}</div><div className="row-sub">{o.route}</div></div>
              <span className={`badge ${o.badge}`}>{o.status}</span>
            </div>
          ))}
        </div>

        <div className="card anim-fade" style={{ animationDelay: '0.6s' }}>
          <div className="card-head"><span className="card-title">Trips per hour</span><span className="card-meta">Today</span></div>
          <div className="chart-wrap">
            <div className="bars">
              {[{h:25,l:'7a'},{h:38,l:'8'},{h:53,l:'9'},{h:65,l:'10'},{h:88,l:'11',p:true},{h:100,l:'12',p:true},{h:84,l:'1p',p:true},{h:68,l:'2'},{h:49,l:'3'},{h:38,l:'4'},{h:59,l:'5'},{h:94,l:'6',p:true}].map((b, i) => (
                <div className="bar-col" key={b.l}>
                  <div className={`bar-fill${b.p?' peak':''}`} style={{height:`${b.h}%`, transitionDelay: `${i * 50}ms`}}></div>
                  <div className="bar-lbl">{b.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 0 20px' }} />
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────
function toMapDriver(d) {
  return {
    ...d,
    location: d.lat && d.lng ? { lat: Number(d.lat), lng: Number(d.lng) } : null,
  }
}
function toMapDrivers(arr) {
  return arr.map(toMapDriver).filter(d => d.location)
}
function todayISO() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
