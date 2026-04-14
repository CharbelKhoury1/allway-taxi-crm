import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const COL = '50px 1fr 1fr 90px 75px 95px'

function exportCSV(orders) {
  const header = ['ID', 'Customer', 'Route', 'Driver', 'Time', 'Status']
  const rows = orders.map(o => [o.id.slice(0,5), o.customers?.full_name, `${o.pickup_address} → ${o.dropoff_address}`, o.drivers?.full_name || '—', new Date(o.requested_at).toLocaleTimeString(), o.status])
  const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `allway-orders-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Orders() {
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('All statuses')
  const [period, setPeriod]   = useState('Today')
  const [selected, setSelected] = useState(null)
  const [stats, setStats]     = useState({ total:0, completed:0, cancelled:0, no_driver:0 })

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const today = new Date()
      today.setHours(0,0,0,0)
      
      let query = supabase
        .from('trips')
        .select('id, status, requested_at, pickup_address, dropoff_address, fare_usd, customers(full_name), drivers(full_name)')
        .order('requested_at', { ascending: false })

      if (period === 'Today') query = query.gte('requested_at', today.toISOString())
      
      const { data } = await query
      if (data) {
        setOrders(data)
        setStats({
          total: data.length,
          completed: data.filter(r => r.status === 'completed').length,
          cancelled: data.filter(r => r.status === 'cancelled').length,
          no_driver: data.filter(r => r.status === 'no_driver').length
        })
      }
      setLoading(false)
    }
    fetchData()
  }, [period])

  const filtered = orders.filter(o => {
    const q = search.toLowerCase()
    const name = o.customers?.full_name?.toLowerCase() || ''
    const route = `${o.pickup_address} ${o.dropoff_address}`.toLowerCase()
    const matchSearch = !q || name.includes(q) || route.includes(q) || o.id.includes(q)
    
    const uiStatus = o.status === 'completed' ? 'Completed' : 
                     o.status === 'cancelled' ? 'Cancelled' :
                     o.status === 'no_driver' ? 'No driver' : 'In progress'
                     
    const matchStatus = status === 'All statuses' || uiStatus === status
    return matchSearch && matchStatus
  })

  return (
    <div>
      <div className="search-row">
        <input
          placeholder="Search by customer, route, or order ID..."
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
          <option>All time</option>
        </select>
        <button className="btn" onClick={() => exportCSV(filtered)}>Export CSV</button>
      </div>

      <div className="metrics metrics-4b" style={{ marginBottom:18 }}>
        <div className="metric"><div className="m-label">Total trips</div><div className="m-val">{stats.total}</div></div>
        <div className="metric"><div className="m-label">Completed</div><div className="m-val m-up">{stats.completed}</div></div>
        <div className="metric"><div className="m-label">Cancelled</div><div className="m-val m-dn">{stats.cancelled}</div></div>
        <div className="metric"><div className="m-label">No driver</div><div className="m-val m-yellow">{stats.no_driver}</div></div>
      </div>

      <div className="table-wrap">
        <div className="table-head" style={{ gridTemplateColumns:COL }}>
          #<span>Customer</span><span>Route</span><span>Driver</span><span>Time</span><span>Status</span>
        </div>
        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--text-ter)' }}>Loading trips...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:'24px 16px', textAlign:'center', fontSize:13, color:'var(--text-ter)' }}>
            <div style={{fontSize:24,marginBottom:8}}>🔍</div>
            No orders match your search.
          </div>
        ) : filtered.map(o => {
          const uiStatus = o.status === 'completed' ? 'Completed' : 
                           o.status === 'cancelled' ? 'Cancelled' :
                           o.status === 'no_driver' ? 'No driver' : 'In progress'
          const badge = o.status === 'completed' ? 'b-green' :
                        o.status === 'cancelled' ? 'b-red' :
                        o.status === 'no_driver' ? 'b-yellow' : 'b-amber'

          return (
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
              <span style={{ fontSize:10, color:'var(--text-ter)' }}>{o.id.slice(0,5)}</span>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div className="av av-y av-sm">{(o.customers?.full_name || '?')[0]}</div>
                <span style={{ fontSize:13, fontWeight:600 }}>{o.customers?.full_name || 'Customer'}</span>
              </div>
              <span style={{ fontSize:11, color:'var(--text-ter)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {o.pickup_address.split(',')[0]} → {o.dropoff_address.split(',')[0]}
              </span>
              <span style={{ fontSize:12, color:'var(--text-sec)' }}>{o.drivers?.full_name || '—'}</span>
              <span style={{ fontSize:11, color:'var(--text-ter)' }}>{new Date(o.requested_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
              <span className={`badge ${badge}`}>{uiStatus}</span>
            </div>
          )
        })}
      </div>


      {/* Result count */}
      {filtered.length > 0 && (
        <div style={{marginTop:10,fontSize:11,color:'var(--text-ter)',textAlign:'right'}}>
          Showing {filtered.length} of {orders.length} orders
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
