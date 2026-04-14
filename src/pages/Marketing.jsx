import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CAMPAIGNS = [
  { icon:'chat',  iconBg:'rgba(245,184,0,.15)',  iconColor:'#F5B800', name:'Weekend Rush Promo',    sub:'WhatsApp · Active · Ends Sun', badge:'b-green', status:'Live'      },
  { icon:'doc',   iconBg:'rgba(85,138,221,.15)', iconColor:'#85B7EB', name:'Airport Re-engagement', sub:'SMS · Active · Ongoing',         badge:'b-green', status:'Live'      },
]

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
  const [promos, setPromos] = useState([])
  const [loading, setLoading] = useState(true)
  const [promoFilter, setPromoFilter] = useState('All')
  const [expandedCampaign, setExpandedCampaign] = useState(null)

  useEffect(() => {
    async function fetchPromos() {
      const { data } = await supabase
        .from('promos')
        .select('*')
        .order('id')
      if (data) setPromos(data)
      setLoading(false)
    }
    fetchPromos()
  }, [])

  const filteredPromos = promos.filter(p => {
    const status = (p.expiry && new Date(p.expiry) < new Date()) ? 'Expired' : p.status === 'active' ? 'Active' : 'Inactive'
    if (promoFilter === 'All') return true
    return status === promoFilter
  })

  return (
    <div>
      <div className="metrics">
        <div className="metric"><div className="m-label">Active promos</div><div className="m-val m-yellow">{promos.filter(p=>p.status==='active').length}</div><div className="m-sub">available to users</div></div>
        <div className="metric"><div className="m-label">Campaigns sent</div><div className="m-val">2,140</div><div className="m-sub m-up">+12% vs last month</div></div>
        <div className="metric"><div className="m-label">Promo conversion</div><div className="m-val">8.4%</div><div className="m-sub m-up">above industry avg</div></div>
        <div className="metric"><div className="m-label">Revenue lift</div><div className="m-val">$840</div><div className="m-sub m-up">+14% attribution</div></div>
      </div>

      <div className="grid-2" style={{marginBottom:14}}>
        <div className="card">
          <div className="card-head">
            <span className="card-title">Live campaigns</span>
          </div>
          {CAMPAIGNS.map(c => (
            <div key={c.name}>
              <div
                className="row"
                style={{ background: expandedCampaign === c.name ? 'var(--surface2)' : undefined }}
                onClick={() => setExpandedCampaign(expandedCampaign === c.name ? null : c.name)}
              >
                <CampaignIcon icon={c.icon} bg={c.iconBg} color={c.iconColor} />
                <div className="row-info"><div className="row-name">{c.name}</div><div className="row-sub">{c.sub}</div></div>
                <span className={`badge ${c.badge}`}>{c.status}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-title">Promo codes</span>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <select
                value={promoFilter}
                onChange={e => setPromoFilter(e.target.value)}
                style={{fontSize:11,padding:'3px 8px',background:'var(--dark4)',border:'1px solid var(--border)',borderRadius:6,color:'var(--text-sec)',fontFamily:'var(--font)',outline:'none'}}
              >
                <option>All</option>
                <option>Active</option>
                <option>Inactive</option>
                <option>Expired</option>
              </select>
            </div>
          </div>
          <div className="table-head" style={{gridTemplateColumns:PCOL,fontSize:9}}>Code<span>Discount</span><span>Type</span><span>Status</span></div>
          {loading ? (
            <div style={{padding:20, textAlign:'center'}}>Loading...</div>
          ) : filteredPromos.length === 0 ? (
            <div style={{padding:'16px',textAlign:'center',fontSize:12,color:'var(--text-ter)'}}>No active codes found.</div>
          ) : filteredPromos.map(p => {
              const isExpired = p.expiry && new Date(p.expiry) < new Date()
              const status = isExpired ? 'Expired' : p.status === 'active' ? 'Active' : 'Inactive'
              const badge  = isExpired ? 'b-gray' : p.status === 'active' ? 'b-green' : 'b-amber'
              return (
                <div key={p.code} className="table-row" style={{gridTemplateColumns:PCOL}}>
                  <span style={{fontSize:12,fontWeight:800,color: isExpired ? 'var(--text-ter)' : 'var(--yellow)',fontFamily:'monospace'}}>{p.code}</span>
                  <span style={{fontSize:12,color:'var(--text-sec)'}}>{p.discount_value}{p.discount_type === 'percent' ? '%' : '$'} off</span>
                  <span style={{fontSize:11,color:'var(--text-ter)', textTransform:'capitalize'}}>{p.discount_type}</span>
                  <span className={`badge ${badge}`}>{status}</span>
                </div>
              )
            }
          )}
        </div>
      </div>
    </div>
  )
}

