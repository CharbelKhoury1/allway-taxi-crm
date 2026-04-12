import { useState } from 'react'
import { STAFF_LIST, STAFF_DETAIL } from '../data/staff'

function StaffDetail({ id }) {
  const d = STAFF_DETAIL[id]
  if (!d) return null
  return (
    <div className="profile-card">
      <div className="profile-top">
        <div className={`av-lg ${d.cls}`}>{d.init}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:16,fontWeight:800,color:'var(--text-pri)',marginBottom:4}}>{d.name}</div>
          <div style={{marginBottom:6,display:'flex',gap:6,flexWrap:'wrap'}}>
            <span className={`badge ${d.roleBadge}`}>{d.role}</span>
            <span className={`badge ${d.statusBadge}`}>{d.status}</span>
          </div>
          <div style={{fontSize:12,color:'var(--text-ter)'}}>{d.contact}</div>
        </div>
      </div>
      <div className="profile-stats">
        <div className="pstat"><div className="pstat-val">{d.orders}</div><div className="pstat-lbl">Orders handled</div></div>
        <div className="pstat"><div className="pstat-val">{d.rating}</div><div className="pstat-lbl">Avg rating</div></div>
        <div className="pstat" style={{background:'rgba(245,184,0,.1)'}}>
          <div className="pstat-val m-yellow">{d.perf}</div>
          <div className="pstat-lbl" style={{color:'#7A5C00'}}>Performance</div>
        </div>
      </div>
      <div className="section-label">Current shift</div>
      <div style={{background:'var(--surface)',borderRadius:8,padding:'10px 12px',marginBottom:16,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
        <div><div style={{fontSize:10,color:'var(--text-ter)',marginBottom:3}}>CLOCK IN</div><div style={{fontSize:13,fontWeight:700}}>{d.clockIn}</div></div>
        <div><div style={{fontSize:10,color:'var(--text-ter)',marginBottom:3}}>CLOCK OUT</div><div style={{fontSize:13,fontWeight:700}}>{d.clockOut}</div></div>
        <div><div style={{fontSize:10,color:'var(--text-ter)',marginBottom:3}}>HOURS</div><div style={{fontSize:13,fontWeight:700,color:'var(--yellow)'}}>{d.hours}</div></div>
      </div>
      <div className="section-label">Permissions</div>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {d.perms.map(([label, badge, text], i) => (
          <div key={label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 0',borderBottom: i < d.perms.length - 1 ? '1px solid var(--border)' : 'none'}}>
            <span style={{fontSize:13,color:'var(--text-sec)'}}>{label}</span>
            <span className={`badge ${badge}`}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const SCHEDULE = [
  { init:'NJ', cls:'av-y', name:'Nour Jamil',      role:'Dispatcher', roleBadge:'b-blue',   clockIn:'8:00 AM',  clockOut:'4:00 PM',  hours:'6h 14m',  status:'Active',    badge:'b-green' },
  { init:'RK', cls:'av-g', name:'Rami Karam',       role:'Dispatcher', roleBadge:'b-blue',   clockIn:'9:00 AM',  clockOut:'5:00 PM',  hours:'5h 14m',  status:'Active',    badge:'b-green' },
  { init:'ZA', cls:'av-p', name:'Ziad Abi Khalil',  role:'Supervisor', roleBadge:'b-yellow', clockIn:'7:00 AM',  clockOut:'3:00 PM',  hours:'7h 14m',  status:'Active',    badge:'b-green' },
  { init:'HM', cls:'av-b', name:'Hiba Mrad',        role:'Support',    roleBadge:'b-green',  clockIn:'10:00 AM', clockOut:'6:00 PM',  hours:'4h 14m',  status:'On break',  badge:'b-amber' },
  { init:'PG', cls:'av-r', name:'Pierre Gemayel',   role:'Dispatcher', roleBadge:'b-blue',   clockIn:'2:00 PM',  clockOut:'10:00 PM', hours:'—',       status:'Upcoming',  badge:'b-gray' },
  { init:'—',  cls:'av-x', name:'Unassigned',       role:'Dispatcher', roleBadge:'b-blue',   clockIn:'6:00 PM',  clockOut:'12:00 AM', hours:'—',       status:'No cover',  badge:'b-red' },
]

const PERF = [
  { name:'Nour Jamil',      pct:94, color:'#5DCAA5' },
  { name:'Ziad Abi Khalil', pct:91, color:'#5DCAA5' },
  { name:'Rami Karam',      pct:88, color:undefined },
  { name:'Hiba Mrad',       pct:82, color:undefined, bg:'rgba(245,184,0,.4)' },
  { name:'Pierre Gemayel',  pct:74, color:'#F09595', bg:'rgba(240,149,149,.5)' },
]

const ACTIVITY = [
  { cls:'av-sm av-y', init:'NJ', name:'Nour assigned driver to #1291', sub:'Karim Mansour → Ahmad Khalil · 2:13 PM' },
  { cls:'av-sm av-g', init:'RK', name:'Rami cancelled order #1286',    sub:'Customer request · 1:09 PM' },
  { cls:'av-sm av-p', init:'ZA', name:'Ziad updated promo WKND20',     sub:'Extended expiry by 7 days · 11:45 AM' },
  { cls:'av-sm av-b', init:'HM', name:'Hiba replied to Sara Rizk',     sub:'WhatsApp escalation resolved · 10:22 AM' },
  { cls:'av-sm av-y', init:'NJ', name:'Nour clocked in',               sub:'8:00 AM · on time' },
]

const COL = '1fr 90px 100px 100px 80px 80px'

export default function Staff() {
  const [selected, setSelected] = useState('nour')

  return (
    <div>
      <div className="metrics">
        <div className="metric"><div className="m-label">Total staff</div><div className="m-val">11</div><div className="m-sub">across all roles</div></div>
        <div className="metric"><div className="m-label">On shift now</div><div className="m-val m-up">6</div><div className="m-sub">of 8 scheduled</div></div>
        <div className="metric"><div className="m-label">Open shifts</div><div className="m-val m-dn">2</div><div className="m-sub m-dn">need coverage</div></div>
        <div className="metric"><div className="m-label">Avg performance</div><div className="m-val m-yellow">87%</div><div className="m-sub m-up">+4% vs last month</div></div>
      </div>

      <div className="grid-2" style={{marginBottom:14}}>
        <div className="card">
          <div className="card-head"><span className="card-title">Staff members</span><span className="card-meta">11 total</span></div>
          <div className="table-head" style={{gridTemplateColumns:'1fr 90px 80px'}}>Member<span>Role</span><span>Status</span></div>
          {STAFF_LIST.map(s => (
            <div key={s.id} className="table-row" style={{gridTemplateColumns:'1fr 90px 80px'}} onClick={() => setSelected(s.id)}>
              <div style={{display:'flex',alignItems:'center',gap:9}}>
                <div className={`av ${s.cls}`}>{s.init}</div>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--text-pri)'}}>{s.name}</div>
                  <div style={{fontSize:11,color:'var(--text-ter)'}}>{s.phone}</div>
                </div>
              </div>
              <span className={`badge ${s.roleBadge}`}>{s.role}</span>
              <span className={`badge ${s.statusBadge}`}>{s.status}</span>
            </div>
          ))}
        </div>
        <StaffDetail id={selected} />
      </div>

      <div className="card" style={{marginBottom:14}}>
        <div className="card-head"><span className="card-title">Today's shift schedule</span><span className="card-meta">Sun 12 Apr</span></div>
        <div className="table-head" style={{gridTemplateColumns:COL}}>Staff member<span>Role</span><span>Clock in</span><span>Clock out</span><span>Hours</span><span>Status</span></div>
        {SCHEDULE.map(s => (
          <div key={s.name} className="table-row" style={{gridTemplateColumns:COL}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}><div className={`av av-sm ${s.cls}`}>{s.init}</div><span style={{fontSize:13,fontWeight:600}}>{s.name}</span></div>
            <span className={`badge ${s.roleBadge}`}>{s.role}</span>
            <span style={{fontSize:12,color:'var(--text-sec)'}}>{s.clockIn}</span>
            <span style={{fontSize:12,color:'var(--text-sec)'}}>{s.clockOut}</span>
            <span style={{fontSize:13,fontWeight:700,color: s.hours==='—' ? 'var(--text-ter)' : 'var(--yellow)'}}>{s.hours}</span>
            <span className={`badge ${s.badge}`}>{s.status}</span>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head"><span className="card-title">Performance this month</span></div>
          <div style={{padding:'14px 16px'}}>
            {PERF.map(p => (
              <div className="zone-row" key={p.name}>
                <div className="zone-top"><span>{p.name}</span><span className="zone-val" style={{color:p.color}}>{p.pct}%</span></div>
                <div className="prog-bar"><div className="prog-fill" style={{width:`${p.pct}%`, background:p.bg}}></div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><span className="card-title">Recent activity log</span><span className="card-meta">Today</span></div>
          {ACTIVITY.map(a => (
            <div key={a.sub} className="row">
              <div className={`av ${a.cls}`}>{a.init}</div>
              <div className="row-info"><div className="row-name">{a.name}</div><div className="row-sub">{a.sub}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
