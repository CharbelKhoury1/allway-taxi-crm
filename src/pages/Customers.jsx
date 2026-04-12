import { useState } from 'react'
import { CUSTOMERS, CUSTOMER_LIST, LOC_ICONS } from '../data/customers'

function LocIcon({ name }) {
  const ic = LOC_ICONS[name] || LOC_ICONS.default
  return (
    <div className="loc-icon" style={{background:ic.bg}}>
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke={ic.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        dangerouslySetInnerHTML={{__html: ic.svg}} />
    </div>
  )
}

function CustomerDetail({ id }) {
  const d = CUSTOMERS[id]
  if (!d) return null
  return (
    <div className="profile-card">
      <div className="profile-top">
        <div className={`av-lg ${d.cls}`}>{d.init}</div>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:'var(--text-pri)',marginBottom:4}}>{d.name}</div>
          <div style={{marginBottom:6}}><span className={`badge ${d.badge}`}>{d.badgeText}</span></div>
          <div style={{fontSize:12,color:'var(--text-ter)'}}>{d.phone} · {d.lang}</div>
        </div>
      </div>
      <div className="profile-stats">
        <div className="pstat"><div className="pstat-val">{d.trips}</div><div className="pstat-lbl">Total trips</div></div>
        <div className="pstat"><div className="pstat-val">{d.spend}</div><div className="pstat-lbl">Total spend</div></div>
        <div className="pstat" style={{background:'rgba(245,184,0,.1)'}}>
          <div className="pstat-val m-yellow">{d.rating}</div>
          <div className="pstat-lbl" style={{color:'var(--yellow-dark)'}}>Avg rating</div>
        </div>
      </div>
      <div className="section-label">Saved locations ({d.locs.length})</div>
      {d.locs.map(([label, addr, uses, badge]) => (
        <div className="loc-row" key={label}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <LocIcon name={label} />
            <div><div className="loc-name">{label}</div><div className="loc-addr">{addr}</div></div>
          </div>
          <span className={`badge ${badge}`}>{uses} uses</span>
        </div>
      ))}
    </div>
  )
}

export default function Customers() {
  const [selected, setSelected] = useState('ahmad')

  return (
    <div>
      <div className="search-row">
        <input placeholder="Search by name or phone..." style={{flex:1}} />
        <select><option>All customers</option><option>VIP</option><option>Blocked</option></select>
      </div>
      <div className="grid-2 grid-2-3">
        <div className="table-wrap">
          <div className="table-head" style={{gridTemplateColumns:'1fr 55px 65px'}}>Customer<span>Trips</span><span>Status</span></div>
          {CUSTOMER_LIST.map(c => (
            <div className="table-row" key={c.id} style={{gridTemplateColumns:'1fr 55px 65px'}} onClick={() => setSelected(c.id)}>
              <div style={{display:'flex',alignItems:'center',gap:9}}>
                <div className={`av ${c.cls}`}>{c.init}</div>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--text-pri)'}}>{c.name}</div>
                  <div style={{fontSize:11,color:'var(--text-ter)'}}>{c.phone}</div>
                </div>
              </div>
              <span style={{fontSize:14,fontWeight:700}}>{c.trips}</span>
              <span className={`badge ${c.badge}`}>{c.badgeText}</span>
            </div>
          ))}
        </div>
        <CustomerDetail id={selected} />
      </div>
    </div>
  )
}
