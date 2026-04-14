import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const TIERS_DEF = [
  { name:'Bronze',   color:'#C0945A', bg:'rgba(192,148,90,.15)',  border:'rgba(192,148,90,.2)',  min: 0 },
  { name:'Silver',   color:'#A8A8A8', bg:'rgba(168,168,168,.15)', border:'rgba(168,168,168,.2)', min: 5 },
  { name:'Gold',     color:'#F5B800', bg:'rgba(245,184,0,.15)',   border:'rgba(245,184,0,.2)',   min: 15 },
  { name:'Platinum', color:'#AFA9EC', bg:'rgba(175,169,236,.15)', border:'rgba(175,169,236,.2)', min: 30 },
]

const RCOL = '1fr 1fr 100px 80px 90px'

export default function Loyalty() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLoyalty() {
      const { data } = await supabase
        .from('customers')
        .select('id, full_name, phone, total_trips, created_at')
        .order('total_trips', { ascending: false })
        .limit(10)
      if (data) setMembers(data)
      setLoading(false)
    }
    fetchLoyalty()
  }, [])

  function getTier(trips) {
    return TIERS_DEF.slice().reverse().find(t => trips >= t.min) || TIERS_DEF[0]
  }

  return (
    <div>
      <div className="metrics">
        <div className="metric"><div className="m-label">Active members</div><div className="m-val m-yellow">{members.length}</div><div className="m-sub">tracked by CRM</div></div>
        <div className="metric"><div className="m-label">Total trips recorded</div><div className="m-val">{members.reduce((s,m)=>s+(m.total_trips||0), 0)}</div><div className="m-sub">customer history</div></div>
        <div className="metric"><div className="m-label">Gold+ members</div><div className="m-val">{members.filter(m=> (m.total_trips||0) >= 15).length}</div><div className="m-sub m-up">high value</div></div>
        <div className="metric"><div className="m-label">Avg retention</div><div className="m-val">94%</div><div className="m-sub m-up">+2% this month</div></div>
      </div>

      <div className="grid-2" style={{marginBottom:14}}>
        <div className="card">
          <div className="card-head"><span className="card-title">Tier thresholds</span></div>
          <div style={{padding:'20px 16px', display:'flex', flexDirection:'column', gap:12}}>
            {TIERS_DEF.map(t => (
              <div className="zone-row" key={t.name}>
                <div className="zone-top">
                  <span style={{display:'flex',alignItems:'center',gap:7}}>
                    <span style={{width:10,height:10,borderRadius:'50%',background:t.color,display:'inline-block'}}></span>
                    {t.name}
                  </span>
                  <span className="zone-val">{t.min}+ trips</span>
                </div>
                <div className="prog-bar"><div className="prog-fill" style={{width:`${Math.min(100, (t.min/30)*100)}%`,background:t.color}}></div></div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><span className="card-title">Top loyalty members</span><span className="card-meta">by trip count</span></div>
          <div style={{padding:'4px 0'}}>
            {loading ? (
              <div style={{padding:20, textAlign:'center'}}>Loading...</div>
            ) : members.length === 0 ? (
              <div style={{padding:16, textAlign:'center', color:'var(--text-ter)' }}>No member data yet</div>
            ) : members.map((m, i) => {
              const tier = getTier(m.total_trips || 0)
              return (
                <div key={m.id} className="row">
                  <span style={{fontSize:12,fontWeight:800,color: i < 3 ? 'var(--yellow)' : 'var(--text-ter)',width:20,flexShrink:0}}>{i+1}</span>
                  <div className="av av-y">{m.full_name[0]}</div>
                  <div className="row-info">
                    <div className="row-name">{m.full_name}</div>
                    <div className="row-sub">{m.total_trips || 0} trips · joined {new Date(m.created_at).toLocaleDateString()}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:14,fontWeight:800,color:'var(--text-pri)'}}>{(m.total_trips||0) * 100} pts</div>
                    <span style={{fontSize:9,fontWeight:700,color:tier.color,background:tier.bg,padding:'2px 7px',borderRadius:10, textTransform:'uppercase'}}>{tier.name}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

