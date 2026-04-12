export default function Dashboard({ onNavigate }) {
  return (
    <div>
      <div className="metrics">
        <div className="metric"><div className="m-label">Active trips</div><div className="m-val">7</div><div className="m-sub">right now</div></div>
        <div className="metric"><div className="m-label">Online drivers</div><div className="m-val m-yellow">14</div><div className="m-sub m-up">+3 vs yesterday</div></div>
        <div className="metric"><div className="m-label">Pending orders</div><div className="m-val m-dn">3</div><div className="m-sub m-dn">2 need driver</div></div>
        <div className="metric"><div className="m-label">Revenue today</div><div className="m-val">$840</div><div className="m-sub m-up">+12% vs yesterday</div></div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head"><span className="card-title">Live driver map</span><span className="card-meta">Updates every 5s</span></div>
          <div className="map-box">
            <div className="map-road" style={{top:'38%',left:0,right:0,height:10}}></div>
            <div className="map-road" style={{top:'64%',left:0,right:0,height:7}}></div>
            <div className="map-road" style={{left:'24%',top:0,bottom:0,width:8}}></div>
            <div className="map-road" style={{left:'55%',top:0,bottom:0,width:6}}></div>
            <div className="map-road" style={{left:'79%',top:0,bottom:0,width:5}}></div>
            <div className="map-blk" style={{top:'8%',left:'4%',width:'17%',height:'25%'}}></div>
            <div className="map-blk" style={{top:'8%',left:'30%',width:'21%',height:'18%'}}></div>
            <div className="map-blk" style={{top:'8%',left:'61%',width:'15%',height:'22%'}}></div>
            <div className="map-blk" style={{top:'49%',left:'4%',width:'15%',height:'22%'}}></div>
            <div className="map-blk" style={{top:'49%',left:'30%',width:'20%',height:'22%'}}></div>
            <div className="map-blk" style={{top:'49%',left:'61%',width:'15%',height:'22%'}}></div>
            <div className="map-drv" style={{background:'#5DCAA5',top:'20%',left:'41%'}}></div>
            <div className="map-drv" style={{background:'#5DCAA5',top:'54%',left:'67%'}}></div>
            <div className="map-drv" style={{background:'#5DCAA5',top:'14%',left:'71%'}}></div>
            <div className="map-drv" style={{background:'#EF9F27',top:'34%',left:'15%'}}></div>
            <div className="map-drv" style={{background:'#EF9F27',top:'59%',left:'45%'}}></div>
            <div className="map-drv" style={{background:'#888780',top:'73%',left:'81%'}}></div>
            <div className="map-pickup map-pulse" style={{top:'29%',left:'58%'}}></div>
            <div className="map-pickup map-pulse" style={{top:'68%',left:'28%',animationDelay:'.8s'}}></div>
            <div className="map-legend">
              <div className="ml"><div className="ml-dot" style={{background:'#5DCAA5'}}></div>Available</div>
              <div className="ml"><div className="ml-dot" style={{background:'#EF9F27'}}></div>On trip</div>
              <div className="ml"><div className="ml-dot" style={{background:'var(--yellow)'}}></div>Pickup</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-title">Active &amp; pending orders</span>
            <span className="card-link" onClick={() => onNavigate('orders')}>View all</span>
          </div>
          {[
            { cls:'av-y', init:'AK', name:'Ahmad Khalil', route:'Hamra → Verdun',           badge:'b-amber', status:'Dispatching' },
            { cls:'av-r', init:'SR', name:'Sara Rizk',    route:'Achrafieh → Airport',       badge:'b-red',   status:'No driver' },
            { cls:'av-b', init:'MH', name:'Maya Haddad',  route:'Jounieh → Downtown',        badge:'b-blue',  status:'Assigned' },
            { cls:'av-g', init:'JN', name:'Joe Nasr',     route:'Mar Mikhael → Dbayeh',      badge:'b-green', status:'In progress' },
            { cls:'av-p', init:'LF', name:'Lara Farah',   route:'Zalka → Gemmayzeh',         badge:'b-green', status:'In progress' },
          ].map(o => (
            <div className="row" key={o.name}>
              <div className={`av ${o.cls}`}>{o.init}</div>
              <div className="row-info"><div className="row-name">{o.name}</div><div className="row-sub">{o.route}</div></div>
              <span className={`badge ${o.badge}`}>{o.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head"><span className="card-title">Driver status</span><span className="card-meta">22 total</span></div>
          {[
            { dot:'dot-g', name:'Karim Mansour',  sub:'Toyota Camry · 4.9★',    badge:'b-green', status:'Available' },
            { dot:'dot-a', name:'Fadi Abi Nasr',  sub:'Honda Accord · 4.7★',    badge:'b-amber', status:'On trip' },
            { dot:'dot-g', name:'Charbel Khoury', sub:'Kia Sportage · 4.8★',    badge:'b-green', status:'Available' },
            { dot:'dot-x', name:'Tony Gemayel',   sub:'Hyundai Elantra · 4.5★', badge:'b-gray',  status:'Offline' },
            { dot:'dot-a', name:'Georges Hanna',  sub:'Nissan Sentra · 4.6★',   badge:'b-amber', status:'On trip' },
          ].map(d => (
            <div className="row" key={d.name}>
              <div className={`dot ${d.dot}`}></div>
              <div className="row-info"><div className="row-name">{d.name}</div><div className="row-sub">{d.sub}</div></div>
              <span className={`badge ${d.badge}`}>{d.status}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-head"><span className="card-title">Trips per hour</span><span className="card-meta">Today</span></div>
          <div className="chart-wrap">
            <div className="bars">
              {[{h:25,l:'7a'},{h:38,l:'8'},{h:53,l:'9'},{h:65,l:'10'},{h:88,l:'11',p:true},{h:100,l:'12',p:true},{h:84,l:'1p',p:true},{h:68,l:'2'},{h:49,l:'3'},{h:38,l:'4'},{h:59,l:'5'},{h:94,l:'6',p:true}].map(b => (
                <div className="bar-col" key={b.l}>
                  <div className={`bar-fill${b.p?' peak':''}`} style={{height:`${b.h}%`}}></div>
                  <div className="bar-lbl">{b.l}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:11,color:'var(--text-ter)'}}>Peak hours: 12pm–1pm and 6–8pm evening rush</div>
          </div>
        </div>
      </div>
    </div>
  )
}
