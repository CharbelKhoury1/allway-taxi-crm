import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Staff() {
  const [staff, setStaff]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('All roles')

  useEffect(() => {
    async function fetchStaff() {
      // Trying to fetch from a 'staff' table. 
      // If it doesn't exist yet, we handle the empty state.
      const { data } = await supabase
        .from('staff')
        .select('*')
      if (data) setStaff(data)
      setLoading(false)
    }
    fetchStaff()
  }, [])

  const filteredList = staff.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q || s.full_name?.toLowerCase().includes(q) || s.role?.toLowerCase().includes(q)
    const matchRole   = roleFilter === 'All roles' || s.role === roleFilter
    return matchSearch && matchRole
  })

  return (
    <div>
      <div className="metrics">
        <div className="metric"><div className="m-label">Total staff</div><div className="m-val">{staff.length}</div><div className="m-sub">active records</div></div>
        <div className="metric"><div className="m-label">On shift now</div><div className="m-val m-up">0</div><div className="m-sub">waiting for input</div></div>
        <div className="metric"><div className="m-label">Open shifts</div><div className="m-val m-dn">0</div><div className="m-sub m-dn">all clear</div></div>
        <div className="metric"><div className="m-label">Avg performance</div><div className="m-val m-yellow">—</div><div className="m-sub">no data yet</div></div>
      </div>

      <div className="card" style={{minHeight: 400, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:40}}>
        <div style={{fontSize:48, marginBottom:16}}>👥</div>
        <div style={{fontSize:18, fontWeight:800, color:'var(--text-pri)', marginBottom:8}}>No staff members found</div>
        <p style={{fontSize:13, color:'var(--text-ter)', maxWidth:400, margin:'0 auto 24px', lineHeight:1.6}}>
          Your staff directory is currently empty. You can add dispatchers and supervisors directly via your Supabase dashboard in the 'staff' table.
        </p>
        <div style={{display:'flex', gap:10}}>
          <button className="btn" onClick={() => window.open('https://supabase.com', '_blank')}>Go to Supabase</button>
        </div>
      </div>
    </div>
  )
}

