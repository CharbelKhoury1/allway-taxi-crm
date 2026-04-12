import { useState } from 'react'
import { DRIVERS } from '../data/drivers'

export default function Drivers() {
  const [drivers, setDrivers] = useState(DRIVERS)

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

  const COL = '1fr 110px 90px 70px 90px 80px'

  return (
    <div>
      <div className="metrics metrics-3" style={{marginBottom:18}}>
        <div className="metric"><div className="m-label">Online now</div><div className="m-val m-up">{online}</div></div>
        <div className="metric"><div className="m-label">On a trip</div><div className="m-val m-yellow">{onTrip}</div></div>
        <div className="metric"><div className="m-label">Offline</div><div className="m-val" style={{color:'var(--text-ter)'}}>{offline}</div></div>
      </div>
      <div className="table-wrap">
        <div className="table-head" style={{gridTemplateColumns:COL}}>Driver<span>Car</span><span>Trips today</span><span>Rating</span><span>Online</span><span>Status</span></div>
        {drivers.map(d => (
          <div className="table-row" key={d.id} style={{gridTemplateColumns:COL}}>
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
    </div>
  )
}
