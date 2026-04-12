import { useState } from 'react'

const ALL_ORDERS = [
  { id:'#1291', cls:'av-y', init:'AK', name:'Ahmad K.', route:'Hamra → Verdun',       driver:'Karim M.', time:'2:14 PM', badge:'b-green', status:'Completed'   },
  { id:'#1290', cls:'av-r', init:'SR', name:'Sara R.',  route:'Achrafieh → Airport',  driver:'—',        time:'2:08 PM', badge:'b-red',   status:'No driver'   },
  { id:'#1289', cls:'av-b', init:'MH', name:'Maya H.',  route:'Jounieh → Downtown',   driver:'Fadi A.',  time:'1:55 PM', badge:'b-green', status:'Completed'   },
  { id:'#1288', cls:'av-g', init:'JN', name:'Joe N.',   route:'Mar Mikhael → Dbayeh', driver:'Rami S.',  time:'1:40 PM', badge:'b-green', status:'In progress' },
  { id:'#1287', cls:'av-p', init:'LF', name:'Lara F.',  route:'Zalka → Gemmayzeh',    driver:'Tony G.',  time:'1:28 PM', badge:'b-green', status:'Completed'   },
  { id:'#1286', cls:'av-y', init:'BN', name:'Bassem N.',route:'Verdun → Hamra',       driver:'—',        time:'1:10 PM', badge:'b-gray',  status:'Cancelled'   },
]

const COL = '50px 1fr 1fr 90px 75px 95px'

function exportCSV(orders) {
  const header = ['ID', 'Customer', 'Route', 'Driver', 'Time', 'Status']
  const rows = orders.map(o => [o.id, o.name, o.route, o.driver, o.time, o.status])
  const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wallway-orders-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Orders() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All statuses')
  const [period, setPeriod] = useState('Today')
  const [selected, setSelected] = useState(null)

  const filtered = ALL_ORDERS.filter(o => {
    const q = search.toLowerCase()
    const matchSearch = !q || o.name.toLowerCase().includes(q) || o.route.toLowerCase().includes(q) || o.id.includes(q) || o.driver.toLowerCase().includes(q)
    const matchStatus = status === 'All statuses' || o.status === status
    return matchSearch && matchStatus
  })

  return (
    <div>
      <div className="search-row">
        <input
          placeholder="Search by customer, route, driver or order ID..."
          style={{ flex:1 }}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option>All statuses</option>
          <option>In progress</option>
          <option>Completed</option>
          <option>Cancelled</option>
          <option>No driver</option>
        </select>
        <select value={period} onChange={e => setPeriod(e.target.value)}>
          <option>Today</option>
          <option>This week</option>
          <option>This month</option>
        </select>
        <button className="btn" onClick={() => exportCSV(filtered)}>Export CSV</button>
      </div>

      <div className="metrics metrics-4b" style={{ marginBottom:18 }}>
        <div className="metric"><div className="m-label">Total today</div><div className="m-val">42</div></div>
        <div className="metric"><div className="m-label">Completed</div><div className="m-val m-up">36</div></div>
        <div className="metric"><div className="m-label">Cancelled</div><div className="m-val m-dn">4</div></div>
        <div className="metric"><div className="m-label">No driver</div><div className="m-val m-yellow">2</div></div>
      </div>

      <div className="table-wrap">
        <div className="table-head" style={{ gridTemplateColumns:COL }}>
          #<span>Customer</span><span>Route</span><span>Driver</span><span>Time</span><span>Status</span>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding:'24px 16px', textAlign:'center', fontSize:13, color:'var(--text-ter)' }}>
            <div style={{fontSize:24,marginBottom:8}}>🔍</div>
            No orders match your search.
            <span
              style={{display:'block',marginTop:6,fontSize:12,color:'var(--yellow)',cursor:'pointer'}}
              onClick={() => { setSearch(''); setStatus('All statuses') }}
            >
              Clear filters
            </span>
          </div>
        ) : filtered.map(o => (
          <div
            className="table-row"
            key={o.id}
            style={{
              gridTemplateColumns:COL,
              background: selected === o.id ? 'rgba(245,184,0,.06)' : undefined,
              borderLeft: selected === o.id ? '3px solid var(--yellow)' : '3px solid transparent',
            }}
            onClick={() => setSelected(selected === o.id ? null : o.id)}
          >
            <span style={{ fontSize:11, color:'var(--text-ter)' }}>{o.id}</span>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div className={`av av-sm ${o.cls}`}>{o.init}</div>
              <span style={{ fontSize:13, fontWeight:600 }}>{o.name}</span>
            </div>
            <span style={{ fontSize:12, color:'var(--text-ter)' }}>{o.route}</span>
            <span style={{ fontSize:12, color:'var(--text-sec)' }}>{o.driver}</span>
            <span style={{ fontSize:11, color:'var(--text-ter)' }}>{o.time}</span>
            <span className={`badge ${o.badge}`}>{o.status}</span>
          </div>
        ))}
      </div>

      {/* Result count */}
      {filtered.length > 0 && (
        <div style={{marginTop:10,fontSize:11,color:'var(--text-ter)',textAlign:'right'}}>
          Showing {filtered.length} of {ALL_ORDERS.length} orders
          {(search || status !== 'All statuses') && (
            <span
              style={{marginLeft:8,color:'var(--yellow)',cursor:'pointer'}}
              onClick={() => { setSearch(''); setStatus('All statuses') }}
            >
              Clear filters
            </span>
          )}
        </div>
      )}
    </div>
  )
}
