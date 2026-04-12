const TIERS = [
  { name:'Bronze',   color:'#C0945A', bg:'rgba(192,148,90,.15)',  border:'rgba(192,148,90,.2)',  range:'0–999 pts',    count:164, pct:52 },
  { name:'Silver',   color:'#A8A8A8', bg:'rgba(168,168,168,.15)', border:'rgba(168,168,168,.2)', range:'1k–4,999 pts', count:87,  pct:27 },
  { name:'Gold',     color:'#F5B800', bg:'rgba(245,184,0,.15)',   border:'rgba(245,184,0,.2)',   range:'5k–9,999 pts', count:40,  pct:13 },
  { name:'Platinum', color:'#AFA9EC', bg:'rgba(175,169,236,.15)', border:'rgba(175,169,236,.2)', range:'10k+ pts',     count:27,  pct:8  },
]

const TOP_MEMBERS = [
  { rank:1, cls:'av-y', init:'AK', name:'Ahmad Khalil', sub:'34 trips · joined Jan 2024', pts:'12,480', tier:'PLATINUM', tierColor:'#AFA9EC', tierBg:'rgba(175,169,236,.15)', gold:true },
  { rank:2, cls:'av-p', init:'LF', name:'Lara Farah',   sub:'21 trips · joined Mar 2024', pts:'8,910',  tier:'GOLD',     tierColor:'var(--yellow)', tierBg:'rgba(245,184,0,.15)', gold:true },
  { rank:3, cls:'av-b', init:'MH', name:'Maya Haddad',  sub:'8 trips · joined May 2024',  pts:'3,240',  tier:'SILVER',   tierColor:'#A8A8A8', tierBg:'rgba(168,168,168,.15)', gold:true },
  { rank:4, cls:'av-g', init:'SR', name:'Sara Rizk',    sub:'12 trips · joined Jun 2024', pts:'1,560',  tier:'SILVER',   tierColor:'#A8A8A8', tierBg:'rgba(168,168,168,.15)', gold:false },
  { rank:5, cls:'av-y', init:'JN', name:'Joe Nasr',     sub:'5 trips · joined Aug 2024',  pts:'620',    tier:'BRONZE',   tierColor:'#C0945A', tierBg:'rgba(192,148,90,.15)',  gold:false },
]

const REDEMPTIONS = [
  { cls:'av-sm av-y', init:'AK', name:'Ahmad Khalil', reward:'Free airport ride',    pts:'2,000', date:'Apr 10', badge:'b-green', status:'Redeemed' },
  { cls:'av-sm av-p', init:'LF', name:'Lara Farah',   reward:'$5 ride credit',       pts:'500',   date:'Apr 9',  badge:'b-green', status:'Redeemed' },
  { cls:'av-sm av-b', init:'MH', name:'Maya Haddad',  reward:'20% discount voucher', pts:'750',   date:'Apr 7',  badge:'b-amber', status:'Pending' },
  { cls:'av-sm av-y', init:'AK', name:'Ahmad Khalil', reward:'Priority dispatch',    pts:'300',   date:'Apr 3',  badge:'b-green', status:'Redeemed' },
  { cls:'av-sm av-g', init:'SR', name:'Sara Rizk',    reward:'$5 ride credit',       pts:'500',   date:'Apr 1',  badge:'b-red',   status:'Expired' },
]

const RCOL = '1fr 1fr 100px 80px 90px'

export default function Loyalty() {
  return (
    <div>
      <div className="metrics">
        <div className="metric"><div className="m-label">Points issued (month)</div><div className="m-val m-yellow">84,200</div><div className="m-sub m-up">+22% vs last month</div></div>
        <div className="metric"><div className="m-label">Active members</div><div className="m-val">318</div><div className="m-sub">enrolled in program</div></div>
        <div className="metric"><div className="m-label">Redemptions (month)</div><div className="m-val">43</div><div className="m-sub m-up">$215 in rewards</div></div>
        <div className="metric"><div className="m-label">Gold+ members</div><div className="m-val">27</div><div className="m-sub m-up">+5 this month</div></div>
      </div>

      <div className="grid-2" style={{marginBottom:14}}>
        <div className="card">
          <div className="card-head"><span className="card-title">Tier breakdown</span><span className="card-meta">318 members</span></div>
          <div style={{padding:'14px 16px'}}>
            {TIERS.map(t => (
              <div className="zone-row" key={t.name}>
                <div className="zone-top">
                  <span style={{display:'flex',alignItems:'center',gap:7}}>
                    <span style={{width:10,height:10,borderRadius:'50%',background:t.color,display:'inline-block'}}></span>
                    {t.name}
                  </span>
                  <span className="zone-val">{t.count} members</span>
                </div>
                <div className="prog-bar"><div className="prog-fill" style={{width:`${t.pct}%`,background:t.color}}></div></div>
              </div>
            ))}
          </div>
          <div style={{padding:'0 16px 14px'}}>
            <div className="section-label" style={{marginBottom:8}}>Tier thresholds</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
              {TIERS.map(t => (
                <div key={t.name} style={{textAlign:'center',padding:8,background:t.bg,borderRadius:8,border:`1px solid ${t.border}`}}>
                  <div style={{fontSize:11,fontWeight:800,color:t.color}}>{t.name}</div>
                  <div style={{fontSize:10,color:'var(--text-ter)',marginTop:2}}>{t.range}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><span className="card-title">Top loyalty members</span><span className="card-meta">by points balance</span></div>
          <div style={{padding:'4px 0'}}>
            {TOP_MEMBERS.map(m => (
              <div key={m.name+m.rank} className="row">
                <span style={{fontSize:12,fontWeight:800,color:m.gold?'var(--yellow)':'var(--text-ter)',width:20,flexShrink:0}}>{m.rank}</span>
                <div className={`av ${m.cls}`}>{m.init}</div>
                <div className="row-info"><div className="row-name">{m.name}</div><div className="row-sub">{m.sub}</div></div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:14,fontWeight:800,color:'var(--text-pri)'}}>{m.pts}</div>
                  <span style={{fontSize:9,fontWeight:700,color:m.tierColor,background:m.tierBg,padding:'2px 7px',borderRadius:10}}>{m.tier}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><span className="card-title">Recent redemptions</span><span className="card-meta">This month</span></div>
        <div className="table-head" style={{gridTemplateColumns:RCOL}}>Customer<span>Reward redeemed</span><span>Points used</span><span>Date</span><span>Status</span></div>
        {REDEMPTIONS.map((r, i) => (
          <div key={i} className="table-row" style={{gridTemplateColumns:RCOL}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}><div className={`av ${r.cls}`}>{r.init}</div><span style={{fontSize:13,fontWeight:600}}>{r.name}</span></div>
            <span style={{fontSize:12,color:'var(--text-sec)'}}>{r.reward}</span>
            <span style={{fontSize:13,fontWeight:700,color:'var(--yellow)'}}>{r.pts}</span>
            <span style={{fontSize:11,color:'var(--text-ter)'}}>{r.date}</span>
            <span className={`badge ${r.badge}`}>{r.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
