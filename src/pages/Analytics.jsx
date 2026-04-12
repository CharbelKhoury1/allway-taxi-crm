export default function Analytics() {
  const zones = [
    { name:'Hamra',      trips:14, pct:93 },
    { name:'Achrafieh',  trips:11, pct:73 },
    { name:'Verdun',     trips:9,  pct:60 },
    { name:'Jounieh',    trips:6,  pct:40, dim:true },
    { name:'Downtown',   trips:5,  pct:33, faint:true },
  ]
  const topDrivers = [
    { rank:1, cls:'av-y', init:'KM', name:'Karim Mansour',  count:47, gold:true },
    { rank:2, cls:'av-g', init:'CK', name:'Charbel Khoury', count:41, gold:true },
    { rank:3, cls:'av-b', init:'FA', name:'Fadi Abi Nasr',  count:38, gold:true },
    { rank:4, cls:'av-p', init:'GH', name:'Georges Hanna',  count:32, gold:false },
    { rank:5, cls:'av-x', init:'TG', name:'Tony Gemayel',   count:24, gold:false },
  ]
  const weekly = [
    {h:60,l:'Mon'},{h:72,l:'Tue'},{h:51,l:'Wed'},{h:88,l:'Thu',p:true},{h:100,l:'Fri',p:true},{h:96,l:'Sat',p:true},{h:67,l:'Sun'},
  ]

  return (
    <div>
      <div className="metrics">
        <div className="metric"><div className="m-label">Revenue today</div><div className="m-val">$840</div><div className="m-sub m-up">+12% vs yesterday</div></div>
        <div className="metric"><div className="m-label">Avg trip time</div><div className="m-val">18 min</div><div className="m-sub">city average</div></div>
        <div className="metric"><div className="m-label">Cancellation rate</div><div className="m-val">4.2%</div><div className="m-sub m-up">down from 6.1%</div></div>
        <div className="metric"><div className="m-label">Driver accept time</div><div className="m-val">38 sec</div><div className="m-sub m-up">avg response</div></div>
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-head"><span className="card-title">Top pickup zones</span><span className="card-meta">Today</span></div>
          <div style={{padding:'14px 16px'}}>
            {zones.map(z => (
              <div className="zone-row" key={z.name}>
                <div className="zone-top"><span>{z.name}</span><span className="zone-val">{z.trips} trips</span></div>
                <div className="prog-bar"><div className="prog-fill" style={{width:`${z.pct}%`, background: z.faint ? 'rgba(245,184,0,.25)' : z.dim ? 'rgba(245,184,0,.4)' : undefined}}></div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><span className="card-title">Top drivers this week</span></div>
          <div style={{padding:'4px 0'}}>
            {topDrivers.map(d => (
              <div className="row" key={d.name}>
                <span style={{fontSize:12,fontWeight:800,color:d.gold?'var(--yellow)':'var(--text-ter)',width:20,flexShrink:0}}>{d.rank}</span>
                <div className={`av ${d.cls}`}>{d.init}</div>
                <div className="row-info"><div className="row-name">{d.name}</div></div>
                <span style={{fontSize:14,fontWeight:800,color:'var(--text-pri)'}}>{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><span className="card-title">Revenue — last 7 days</span><span className="card-meta">Total: $5,240</span></div>
        <div className="chart-wrap">
          <div className="bars" style={{height:80}}>
            {weekly.map(b => (
              <div className="bar-col" key={b.l}>
                <div className={`bar-fill${b.p?' peak':''}`} style={{height:`${b.h}%`}}></div>
                <div className="bar-lbl">{b.l}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:11,color:'var(--text-ter)'}}>Thu–Sat consistently highest · Consider surge pricing on weekends</div>
        </div>
      </div>
    </div>
  )
}
