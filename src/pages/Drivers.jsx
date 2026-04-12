import { useState } from 'react'
import { DRIVERS } from '../data/drivers'

export default function Drivers() {
  const [drivers, setDrivers] = useState(DRIVERS)
  const [search, setSearch]   = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selected, setSelected] = useState(null)

  function toggle(id, checked) {
    setDrivers(prev => prev.map(d => {
      if (d.id !== id) return d
      if (!checked && d.status === 'On trip') {
        alert('This driver is currently on a trip and cannot be set offline.')
        return d
      }
      return checked
        ? { ...d, online: true,  status: 'Available', statusBadge: 'b-green', dotCls: 'dot-g' }
        : { ...d, online: false, status: 'Offline',   statusBadge: 'b-gray',  dotCls: 'dot-x' }
    }))
  }

  const online  = drivers.filter(d => d.online && d.status !== 'On trip').length
  const onTrip  = drivers.filter(d => d.status === 'On trip').length
  const offline = drivers.filter(d => !d.online).length

  const filtered = drivers.filter(d => {
    const q = search.toLowerCase()
    const matchSearch = !q || d.name.toLowerCase().includes(q) || d.car.toLowerCase().includes(q) || d.plate.toLowerCase().includes(q)
    const matchStatus =
      statusFilter === 'All'       ||
      (statusFilter === 'Available' && d.status === 'Available') ||
      (statusFilter === 'On trip'   && d.status === 'On trip')   ||
      (statusFilter === 'Offline'   && d.status === 'Offline')
    return matchSearch && matchStatus
  })

  const COL = '1fr 110px 90px 70px 90px 80px'

  return (
    <div>
      <div className="metrics metrics-3" style={{marginBottom:18}}>
        <div className="metric"><div className="m-label">Online now</div><div className="m-val m-up">{online}</div></div>
        <div className="metric"><div className="m-label">On a trip</div><div className="m-val m-yellow">{onTrip}</div></div>
        <div className="metric"><div className="m-label">Offline</div><div className="m-val" style={{color:'var(--text-ter)'}}>{offline}</div></div>
      </div>

      {/* Search + filter bar */}
      <div className="search-row" style={{marginBottom:14}}>
        <input
          placeholder="Search by name, car or plate..."
          style={{flex:1}}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option>All</option>
          <option>Available</option>
          <option>On trip</option>
          <option>Offline</option>
        </select>
      </div>

      <div className="table-wrap">
        <div className="table-head" style={{gridTemplateColumns:COL}}>
          Driver<span>Car</span><span>Trips today</span><span>Rating</span><span>Online</span><span>Status</span>
        </div>
        {filtered.length === 0 ? (
          <div style={{padding:'24px 16px',textAlign:'center',fontSize:13,color:'var(--text-ter)'}}>
            <div style={{fontSize:22,marginBottom:8}}>🔍</div>
            No drivers match your search.
            <span
              style={{display:'block',marginTop:6,fontSize:12,color:'var(--yellow)',cursor:'pointer'}}
              onClick={() => { setSearch(''); setStatusFilter('All') }}
            >
              Clear filters
            </span>
          </div>
        ) : filtered.map(d => (
          <div
            className="table-row"
            key={d.id}
            style={{
              gridTemplateColumns: COL,
              background: selected === d.id ? 'rgba(245,184,0,.06)' : undefined,
              borderLeft: selected === d.id ? '3px solid var(--yellow)' : '3px solid transparent',
            }}
            onClick={() => setSelected(selected === d.id ? null : d.id)}
          >
            <div style={{display:'flex',alignItems:'center',gap:9}}>
              <div className={`dot ${d.dotCls}`} style={{marginRight:3}}></div>
              <div className={`av ${d.cls}`}>{d.init}</div>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:'var(--text-pri)'}}>{d.name}</div>
                <div style={{fontSize:11,color:'var(--text-ter)'}}>{d.plate}</div>
              </div>
            </div>
            <span style={{fontSize:12,color:'var(--text-sec)'}}>{d.car}</span>
            <span style={{fontSize:15,fontWeight:800}}>{d.trips}</span>
            <span style={{fontSize:13,fontWeight:700,color:'var(--yellow)'}}>{d.rating}★</span>
            <label className="toggle" onClick={e => e.stopPropagation()}>
              <input type="checkbox" checked={d.online} onChange={e => toggle(d.id, e.target.checked)} />
              <span className="toggle-track"></span>
            </label>
            <span className={`badge ${d.statusBadge}`}>{d.status}</span>
          </div>
        ))}
      </div>

      {filtered.length > 0 && (
        <div style={{marginTop:10,fontSize:11,color:'var(--text-ter)',textAlign:'right'}}>
          Showing {filtered.length} of {drivers.length} drivers
          {(search || statusFilter !== 'All') && (
            <span
              style={{marginLeft:8,color:'var(--yellow)',cursor:'pointer'}}
              onClick={() => { setSearch(''); setStatusFilter('All') }}
            >
              Clear filters
            </span>
          )}
        </div>
      )}
    </div>
  )
}
