import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'

function formatPhone(p) {
  if (!p) return '—'
  const d = p.replace(/\D/g, '') // strip non-digits
  
  // Lebanese numbers are usually 8 digits (e.g. 70123456 or 03123456)
  // Or 11 digits if they include the country code (96170123456)
  let last8 = d.slice(-8)
  if (last8.length < 8) return p // fallback for weird numbers

  const part1 = last8.slice(0, 2)    // XX
  const part2 = last8.slice(2, 5)    // XXX
  const part3 = last8.slice(5)       // XXX
  
  return `+961 ${part1} ${part2} ${part3}`
}

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

function CustomerDetail({ customer, onRefresh }) {
  if (!customer) return (
    <div style={{ padding: 40, textAlign:'center', color:'var(--text-ter)' }}>Select a customer to view details</div>
  )
  const d = customer
  const badge = d.status === 'vip' ? 'b-yellow' : d.status === 'blocked' ? 'b-red' : 'b-gray'

  async function setStatus(newStatus) {
    const { error } = await supabase.from('customers').update({ status: newStatus }).eq('id', d.id)
    if (!error) { toast.success(`Customer ${newStatus === 'blocked' ? 'blocked' : newStatus === 'vip' ? 'promoted to VIP' : 'status updated'}`); onRefresh() }
    else toast.error(error.message)
  }

  return (
    <div className="profile-card">
      <div className="profile-top">
        <div className={`av-lg av-y`}>{d.full_name[0]}</div>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:'var(--text-pri)',marginBottom:4}}>{d.full_name}</div>
          <div style={{marginBottom:6}}><span className={`badge ${badge}`}>{d.status}</span></div>
          <div style={{fontSize:12,color:'var(--text-ter)'}}>{formatPhone(d.phone)}</div>
        </div>
      </div>
      <div className="profile-stats" style={{ gap: '12px', margin: '20px 0' }}>
        <div className="pstat" style={{ padding: '14px' }}><div className="pstat-val">{d.total_trips || 0}</div><div className="pstat-lbl">Total trips</div></div>
        <div className="pstat" style={{ padding: '14px' }}><div className="pstat-val">${d.total_spend || 0}</div><div className="pstat-lbl">Total spend</div></div>
        <div className="pstat" style={{background:'rgba(245,184,0,.1)', padding: '14px'}}>
          <div className="pstat-val m-yellow">{d.rating || '—'}</div>
          <div className="pstat-lbl" style={{color:'var(--yellow-dark)'}}>Avg rating</div>
        </div>
      </div>
      <div className="section-label">Account details</div>
      <div style={{ background:'var(--surface)', padding:16, borderRadius:12, marginBottom:16 }}>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, textTransform:'uppercase', color:'var(--text-ter)', fontWeight:700, letterSpacing:'.03em', marginBottom:4 }}>Email address</div>
          <div style={{ fontSize:13, color:'var(--text-pri)' }}>{d.email || '—'}</div>
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, textTransform:'uppercase', color:'var(--text-ter)', fontWeight:700, letterSpacing:'.03em', marginBottom:4 }}>Primary address</div>
          <div style={{ fontSize:13, color:'var(--text-pri)', lineHeight:1.4 }}>{d.address || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize:10, textTransform:'uppercase', color:'var(--text-ter)', fontWeight:700, letterSpacing:'.03em', marginBottom:4 }}>Dispatcher Notes</div>
          <div style={{ fontSize:13, color:'var(--yellow)', fontStyle: d.notes ? 'normal' : 'italic' }}>{d.notes || 'No special instructions recorded'}</div>
        </div>
      </div>
      
      <div style={{ fontSize:10, color:'var(--text-ter)', marginBottom:16, textAlign:'center' }}>
        Registered: {new Date(d.created_at).toLocaleDateString()}
      </div>

      <div style={{display:'flex', gap:8}}>
        <button
          className="btn"
          style={{flex:1, fontSize:12, color: d.status === 'blocked' ? 'var(--green)' : 'var(--red)', borderColor: d.status === 'blocked' ? 'rgba(93,202,165,.3)' : 'rgba(240,100,100,.3)'}}
          onClick={() => setStatus(d.status === 'blocked' ? 'active' : 'blocked')}
        >
          {d.status === 'blocked' ? 'Unblock' : 'Block'}
        </button>
        <button
          className="btn"
          style={{flex:1, fontSize:12, color:'var(--yellow)', borderColor:'rgba(245,184,0,.3)'}}
          onClick={() => setStatus(d.status === 'vip' ? 'active' : 'vip')}
        >
          {d.status === 'vip' ? 'Remove VIP' : '★ Make VIP'}
        </button>
      </div>
    </div>
  )
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [selectedId, setSelected] = useState(null)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState('All customers')

  async function fetchCustomers() {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('full_name')
    if (data) {
      setCustomers(data)
      if (data.length > 0) setSelected(id => id ?? data[0].id)
    }
    setLoading(false)
  }

  useEffect(() => { fetchCustomers() }, [])

  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.full_name.toLowerCase().includes(q) || c.phone.includes(q)
    const matchFilter =
      filter === 'All customers' ||
      (filter === 'VIP'     && c.status === 'vip') ||
      (filter === 'Blocked' && c.status === 'blocked')
    return matchSearch && matchFilter
  })

  const selectedCustomer = customers.find(c => c.id === selectedId)

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
          {loading ? (
            <div style={{padding:40, textAlign:'center'}}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{padding:'20px 16px',textAlign:'center',fontSize:13,color:'var(--text-ter)'}}>
              No customers match your search.
            </div>
          ) : filtered.map(c => {
              const badge = c.status === 'vip' ? 'b-yellow' : c.status === 'blocked' ? 'b-red' : 'b-gray'
              return (
                <div
                  className="table-row"
                  key={c.id}
                  style={{
                    gridTemplateColumns:'1fr 55px 65px',
                    padding: '16px 20px',
                    background: selectedId === c.id ? 'rgba(245,184,0,.08)' : undefined,
                    borderLeft: selectedId === c.id ? '3px solid var(--yellow)' : '3px solid transparent',
                  }}
                  onClick={() => setSelected(c.id)}
                >
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div className="av av-y" style={{width:32,height:32,fontSize:11}}>{c.full_name[0]}</div>
                    <div>
                      <div style={{fontSize:14,fontWeight:600,color:'var(--text-pri)'}}>{c.full_name}</div>
                      <div style={{fontSize:12,color:'var(--text-ter)'}}>{formatPhone(c.phone)}</div>
                    </div>
                  </div>
                  <span style={{fontSize:15,fontWeight:700}}>{c.total_trips || 0}</span>
                  <span className={`badge ${badge}`} style={{padding:'4px 10px',fontSize:'10px', textTransform:'uppercase'}}>{c.status}</span>
                </div>
              )
            }
          )}
        </div>
        <CustomerDetail customer={selectedCustomer} onRefresh={fetchCustomers} />
      </div>
    </div>
  )
}

