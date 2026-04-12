const CAMPAIGNS = [
  { icon:'chat',  iconBg:'rgba(245,184,0,.15)',  iconColor:'#F5B800', name:'Weekend Rush Promo',    sub:'WhatsApp · 1,240 sent · Ends Sun', badge:'b-green', status:'Live' },
  { icon:'doc',   iconBg:'rgba(85,138,221,.15)', iconColor:'#85B7EB', name:'Airport Re-engagement', sub:'SMS · 860 sent · Ongoing',         badge:'b-green', status:'Live' },
  { icon:'chart', iconBg:'rgba(93,202,165,.15)', iconColor:'#5DCAA5', name:'New Customer Welcome',  sub:'WhatsApp · Starts Mon 9am',        badge:'b-blue',  status:'Scheduled' },
  { icon:'clock', iconBg:'rgba(239,159,39,.15)', iconColor:'#EF9F27', name:'Ramadan Offer Blast',   sub:'WhatsApp · 2,100 sent · Ended',    badge:'b-gray',  status:'Ended' },
]

const PROMOS = [
  { code:'WKND20',  desc:'20% off any ride',    uses:48,  badge:'b-green', status:'Active' },
  { code:'FIRST5',  desc:'$5 off first ride',   uses:112, badge:'b-green', status:'Active' },
  { code:'AIRPORT', desc:'15% airport rides',   uses:23,  badge:'b-amber', status:'Paused' },
  { code:'RAMADAN', desc:'25% all rides',        uses:331, badge:'b-gray',  status:'Expired' },
  { code:'VIP10',   desc:'10% VIP customers',   uses:67,  badge:'b-green', status:'Active' },
]

const PERF_TABLE = [
  { name:'Weekend Rush Promo',    channel:'WhatsApp', audience:'All customers', sent:'1,240', conv:'178 (14.4%)', revenue:'$534',  badge:'b-green', scheduled:false },
  { name:'Airport Re-engagement', channel:'SMS',      audience:'Lapsed 30d+',  sent:'860',   conv:'74 (8.6%)',   revenue:'$296',  badge:'b-blue',  scheduled:false },
  { name:'Ramadan Offer Blast',   channel:'WhatsApp', audience:'All customers', sent:'2,100', conv:'441 (21%)',   revenue:'$1,764',badge:'b-green', scheduled:false },
  { name:'New Customer Welcome',  channel:'WhatsApp', audience:'New signups',   sent:'—',     conv:'—',           revenue:'',      badge:'b-green', scheduled:true },
]

const COL1 = '1fr 80px 80px 90px 90px 80px'
const PCOL = '90px 1fr 60px 70px'

function CampaignIcon({ icon, bg, color }) {
  const paths = {
    chat:  <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H5l-3 2V3z"/>,
    doc:   <><rect x="2" y="2" width="12" height="12" rx="1.5"/><line x1="5" y1="6" x2="11" y2="6"/><line x1="5" y1="9" x2="9" y2="9"/></>,
    chart: <polyline points="2,12 6,7 9,10 14,4"/>,
    clock: <><circle cx="8" cy="8" r="6"/><line x1="8" y1="5" x2="8" y2="8"/><line x1="8" y1="11" x2="8" y2="11"/></>,
  }
  return (
    <div style={{width:34,height:34,borderRadius:8,background:bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5">{paths[icon]}</svg>
    </div>
  )
}

export default function Marketing() {
  return (
    <div>
      <div className="metrics">
        <div className="metric"><div className="m-label">Active campaigns</div><div className="m-val m-yellow">3</div><div className="m-sub">2 scheduled</div></div>
        <div className="metric"><div className="m-label">Sent this month</div><div className="m-val">2,840</div><div className="m-sub m-up">+18% vs last month</div></div>
        <div className="metric"><div className="m-label">Conversion rate</div><div className="m-val">11.4%</div><div className="m-sub m-up">up from 8.9%</div></div>
        <div className="metric"><div className="m-label">Revenue from promos</div><div className="m-val">$1,230</div><div className="m-sub m-up">+24% vs last month</div></div>
      </div>

      <div className="grid-2" style={{marginBottom:14}}>
        <div className="card">
          <div className="card-head"><span className="card-title">Active campaigns</span><span className="card-link">View all</span></div>
          {CAMPAIGNS.map(c => (
            <div key={c.name} className="row">
              <CampaignIcon icon={c.icon} bg={c.iconBg} color={c.iconColor} />
              <div className="row-info"><div className="row-name">{c.name}</div><div className="row-sub">{c.sub}</div></div>
              <span className={`badge ${c.badge}`}>{c.status}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-head"><span className="card-title">Promo codes</span><span className="card-link">Manage</span></div>
          <div className="table-head" style={{gridTemplateColumns:PCOL,fontSize:9}}>Code<span>Discount</span><span>Uses</span><span>Status</span></div>
          {PROMOS.map(p => (
            <div key={p.code} className="table-row" style={{gridTemplateColumns:PCOL}}>
              <span style={{fontSize:12,fontWeight:800,color: p.status==='Expired'||p.status==='Paused' ? 'var(--text-ter)' : 'var(--yellow)',fontFamily:'monospace'}}>{p.code}</span>
              <span style={{fontSize:12,color:'var(--text-sec)'}}>{p.desc}</span>
              <span style={{fontSize:13,fontWeight:700}}>{p.uses}</span>
              <span className={`badge ${p.badge}`}>{p.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><span className="card-title">Campaign performance</span><span className="card-meta">Last 30 days</span></div>
        <div className="table-head" style={{gridTemplateColumns:COL1}}>Campaign<span>Channel</span><span>Audience</span><span>Sent</span><span>Conversions</span><span>Revenue</span></div>
        {PERF_TABLE.map(p => (
          <div key={p.name} className="table-row" style={{gridTemplateColumns:COL1}}>
            <span style={{fontSize:13,fontWeight:600}}>{p.name}</span>
            <span className={`badge ${p.badge}`} style={{width:'fit-content'}}>{p.channel}</span>
            <span style={{fontSize:12,color:'var(--text-sec)'}}>{p.audience}</span>
            <span style={{fontSize:13,fontWeight:700,color: p.sent==='—' ? 'var(--text-ter)' : undefined}}>{p.sent}</span>
            {p.scheduled
              ? <span className="badge b-blue">Scheduled</span>
              : <span style={{fontSize:13,fontWeight:700,color:'#5DCAA5'}}>{p.conv}</span>
            }
            <span style={{fontSize:13,fontWeight:700,color: !p.revenue ? 'var(--text-ter)' : undefined}}>{p.revenue || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
