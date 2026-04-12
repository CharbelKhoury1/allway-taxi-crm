import { useState } from 'react'
import { CUSTOMERS, CUSTOMER_LIST } from '../data/customers'

const LOC_SVG = {
  Home: (
    <>
      <path d="M2 8.5L8 2l6 6.5"/>
      <path d="M4 7v6h3v-3h2v3h3V7"/>
    </>
  ),
  Work: (
    <>
      <rect x="2" y="6" width="12" height="8" rx="1"/>
      <path d="M5 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
      <line x1="8" y1="10" x2="8" y2="10"/>
    </>
  ),
  Gym: (
    <>
      <circle cx="4" cy="8" r="1.5"/>
      <circle cx="12" cy="8" r="1.5"/>
      <line x1="5.5" y1="8" x2="10.5" y2="8" strokeWidth="2.5"/>
    </>
  ),
  Airport: (
    <path d="M2 11l2-6 4 2 4-4 1 1-3 5 2 1-1 2-3-2-1 3-2-1 1-3z"/>
  ),
  School: (
    <>
      <rect x="2" y="6" width="12" height="8" rx="1"/>
      <path d="M5 6V5a3 3 0 016 0v1"/>
      <line x1="8" y1="9" x2="8" y2="11"/>
    </>
  ),
  Hospital: (
    <>
      <rect x="2" y="2" width="12" height="12" rx="1.5"/>
      <line x1="8" y1="5" x2="8" y2="11"/>
      <line x1="5" y1="8" x2="11" y2="8"/>
    </>
  ),
  default: (
    <>
      <circle cx="8" cy="7" r="3"/>
      <path d="M8 14s-5-4.5-5-7a5 5 0 0110 0c0 2.5-5 7-5 7z"/>
    </>
  ),
}

const LOC_COLORS = {
  Home:     { bg: 'rgba(93,202,165,.15)',  color: '#5DCAA5' },
  Work:     { bg: 'rgba(85,138,221,.15)',  color: '#85B7EB' },
  Gym:      { bg: 'rgba(245,184,0,.15)',   color: '#F5B800' },
  Airport:  { bg: 'rgba(175,169,236,.15)', color: '#AFA9EC' },
  School:   { bg: 'rgba(239,159,39,.15)',  color: '#EF9F27' },
  Hospital: { bg: 'rgba(240,149,149,.15)', color: '#F09595' },
  default:  { bg: 'var(--surface2)',       color: 'var(--text-ter)' },
}

function LocIcon({ name }) {
  const { bg, color } = LOC_COLORS[name] || LOC_COLORS.default
  const svg = LOC_SVG[name] || LOC_SVG.default
  return (
    <div className="loc-icon" style={{background:bg}}>
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {svg}
      </svg>
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
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('All customers')

  const filtered = CUSTOMER_LIST.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.phone.includes(q)
    const matchFilter =
      filter === 'All customers' ||
      (filter === 'VIP'     && c.badgeText === 'VIP') ||
      (filter === 'Blocked' && c.badgeText === 'Blocked')
    return matchSearch && matchFilter
  })

  return (
    <div>
      <div className="search-row">
        <input
          placeholder="Search by name or phone..."
          style={{flex:1}}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option>All customers</option>
          <option>VIP</option>
          <option>Blocked</option>
        </select>
      </div>
      <div className="grid-2 grid-2-3">
        <div className="table-wrap">
          <div className="table-head" style={{gridTemplateColumns:'1fr 55px 65px'}}>Customer<span>Trips</span><span>Status</span></div>
          {filtered.length === 0 ? (
            <div style={{padding:'20px 16px',textAlign:'center',fontSize:13,color:'var(--text-ter)'}}>
              No customers match your search.
            </div>
          ) : filtered.map(c => (
            <div
              className="table-row"
              key={c.id}
              style={{
                gridTemplateColumns:'1fr 55px 65px',
                background: selected === c.id ? 'rgba(245,184,0,.08)' : undefined,
                borderLeft: selected === c.id ? '3px solid var(--yellow)' : '3px solid transparent',
              }}
              onClick={() => setSelected(c.id)}
            >
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
