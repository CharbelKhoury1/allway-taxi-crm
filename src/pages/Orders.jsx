const ORDERS = [
  { id:'#1291', cls:'av-y', init:'AK', name:'Ahmad K.', route:'Hamra → Verdun',        driver:'Karim M.', time:'2:14 PM', badge:'b-green', status:'Completed'   },
  { id:'#1290', cls:'av-r', init:'SR', name:'Sara R.',  route:'Achrafieh → Airport',   driver:'—',        time:'2:08 PM', badge:'b-red',   status:'No driver'   },
  { id:'#1289', cls:'av-b', init:'MH', name:'Maya H.',  route:'Jounieh → Downtown',    driver:'Fadi A.',  time:'1:55 PM', badge:'b-green', status:'Completed'   },
  { id:'#1288', cls:'av-g', init:'JN', name:'Joe N.',   route:'Mar Mikhael → Dbayeh',  driver:'Rami S.',  time:'1:40 PM', badge:'b-green', status:'In progress' },
  { id:'#1287', cls:'av-p', init:'LF', name:'Lara F.',  route:'Zalka → Gemmayzeh',     driver:'Tony G.',  time:'1:28 PM', badge:'b-green', status:'Completed'   },
  { id:'#1286', cls:'av-y', init:'BN', name:'Bassem N.',route:'Verdun → Hamra',        driver:'—',        time:'1:10 PM', badge:'b-gray',  status:'Cancelled'   },
]

const COL = '50px 1fr 1fr 90px 75px 95px'

export default function Orders() {
  return (
    <div>
      <div className="search-row">
        <input placeholder="Search customer or address..." style={{flex:1}} />
        <select><option>All statuses</option><option>Pending</option><option>In progress</option><option>Completed</option><option>Cancelled</option></select>
        <select><option>Today</option><option>This week</option><option>This month</option></select>
        <button className="btn">Export CSV</button>
      </div>
      <div className="metrics metrics-4b" style={{marginBottom:18}}>
        <div className="metric"><div className="m-label">Total today</div><div className="m-val">42</div></div>
        <div className="metric"><div className="m-label">Completed</div><div className="m-val m-up">36</div></div>
        <div className="metric"><div className="m-label">Cancelled</div><div className="m-val m-dn">4</div></div>
        <div className="metric"><div className="m-label">No driver</div><div className="m-val m-yellow">2</div></div>
      </div>
      <div className="table-wrap">
        <div className="table-head" style={{gridTemplateColumns:COL}}>#<span>Customer</span><span>Route</span><span>Driver</span><span>Time</span><span>Status</span></div>
        {ORDERS.map(o => (
          <div className="table-row" key={o.id} style={{gridTemplateColumns:COL}}>
            <span style={{fontSize:11,color:'var(--text-ter)'}}>{o.id}</span>
            <div style={{display:'flex',alignItems:'center',gap:8}}><div className={`av av-sm ${o.cls}`}>{o.init}</div><span style={{fontSize:13,fontWeight:600}}>{o.name}</span></div>
            <span style={{fontSize:12,color:'var(--text-ter)'}}>{o.route}</span>
            <span style={{fontSize:12,color:'var(--text-sec)'}}>{o.driver}</span>
            <span style={{fontSize:11,color:'var(--text-ter)'}}>{o.time}</span>
            <span className={`badge ${o.badge}`}>{o.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
