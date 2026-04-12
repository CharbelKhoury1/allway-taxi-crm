import { useState, useEffect } from 'react'
import LiveMap from '../components/LiveMap'

// Demo driver positions in Beirut (used until Supabase is wired up)
const DEMO_DRIVERS = [
  { id: '1', full_name: 'Karim M.',    plate: 'LB 1234', car_model: 'Toyota Camry',  status: 'available', location: { lat: 33.8938, lng: 35.5018 } },
  { id: '2', full_name: 'Fadi A.',     plate: 'LB 5678', car_model: 'Kia Sportage',  status: 'on_trip',   location: { lat: 33.8812, lng: 35.4733 } },
  { id: '3', full_name: 'Charbel K.',  plate: 'LB 9101', car_model: 'Hyundai Sonata',status: 'available', location: { lat: 33.9017, lng: 35.5156 } },
  { id: '4', full_name: 'Georges H.',  plate: 'LB 1121', car_model: 'Mercedes C200', status: 'on_trip',   location: { lat: 33.9143, lng: 35.5420 } },
  { id: '5', full_name: 'Joe N.',      plate: 'LB 3141', car_model: 'BMW 520',       status: 'on_trip',   location: { lat: 33.8684, lng: 35.5614 } },
]

const LOG_MESSAGES = [
  "Trip #842 assigned to Driver Karim",
  "Driver Fadi reached destination: Airport",
  "New order detected in Hamra district",
  "Driver Charbel is now Available",
  "Customer 'Sara R.' is waiting at Hamra",
  "Driver Joe is 2 mins from Gemmayzeh",
  "Traffic delay reported on Shore Road",
  "Automatic dispatcher balancing online..."
]

export default function Dashboard({ onNavigate }) {
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState({ trips: 7, online: 14, revenue: 840 })

  // Simulation: fluctuate metrics + activity log
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        setStats(s => ({
          ...s,
          trips: Math.max(5, s.trips + (Math.random() > 0.5 ? 1 : -1)),
          revenue: s.revenue + (Math.random() > 0.5 ? 12 : -8)
        }))
      }
      if (Math.random() > 0.7) {
        const msg = LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)]
        setLogs(prev => [msg, ...prev].slice(0, 5))
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="dash-container">
      <div className="metrics">
        <div className="metric anim-scale" style={{ animationDelay: '0.0s' }}>
          <div className="m-label">Active trips</div>
          <div className="m-val">{stats.trips}</div>
          <div className="m-sub">right now</div>
        </div>
        <div className="metric anim-scale" style={{ animationDelay: '0.1s' }}>
          <div className="m-label">Online drivers</div>
          <div className="m-val m-yellow">{stats.online}</div>
          <div className="m-sub m-up">+3 vs yesterday</div>
        </div>
        <div className="metric anim-scale" style={{ animationDelay: '0.2s' }}>
          <div className="m-label">Pending orders</div>
          <div className="m-val m-dn">2</div>
          <div className="m-sub m-dn">Needs dispatch</div>
        </div>
        <div className="metric anim-scale" style={{ animationDelay: '0.3s' }}>
          <div className="m-label">Revenue today</div>
          <div className="m-val">${stats.revenue}</div>
          <div className="m-sub m-up">+12% vs yesterday</div>
        </div>
      </div>

      <div className="grid-2-3 anim-fade" style={{ animationDelay: '0.4s', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 20, marginBottom: 20 }}>
        {/* LIVE MAPBOX MAP */}
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <div className="card-head" style={{ padding: '12px 16px' }}>
            <span className="card-title">Live Dispatch Map</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 4, background: 'rgba(93,202,165,.1)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#5DCAA5' }}></div>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#5DCAA5' }}>REAL-TIME</span>
            </div>
          </div>
          <LiveMap
            drivers={DEMO_DRIVERS}
            height="390px"
            onSelect={d => console.log('Driver selected:', d)}
          />
        </div>

        {/* LIVE ACTIVITY LOG */}
        <div className="card" style={{ height: 440, display: 'flex', flexDirection: 'column' }}>
          <div className="card-head">
            <span className="card-title">Live Activity</span>
          </div>
          <div style={{ flex: 1, padding: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {logs.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-ter)', textAlign: 'center', marginTop: 40 }}>Initializing feed...</div>}
              {logs.map((log, i) => (
                <div key={i} className="anim-fade" style={{ display: 'flex', gap: 8, padding: '8px 10px', background: 'var(--surface)', borderRadius: 8, borderLeft: '3px solid var(--yellow)' }}>
                  <div style={{ fontSize: 11, lineWeight: 1.4, color: 'var(--text-pri)' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-ter)', marginBottom: 2 }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                    {log}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: 12, borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-ter)', textAlign: 'center' }}>
            Connected to Dispatch Service 🟢
          </div>
        </div>
      </div>

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

      <div style={{ padding: '0 0 20px' }}></div>
    </div>
  )
}


