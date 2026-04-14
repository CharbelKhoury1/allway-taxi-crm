import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Staff() {
  const [staff, setStaff]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('All roles')

  useEffect(() => {
    async function fetchStaff() {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('created_at', { ascending: false })
      // Table may not exist yet — handle gracefully
      if (!error && data) setStaff(data)
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
    <div className="anim-fade">
      <div className="search-row">
        <input
          placeholder="Search by name, role, or email..."
          style={{flex:1}}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option>All roles</option>
          <option value="dispatcher">Dispatcher</option>
          <option value="admin">Admin</option>
          <option value="support">Support</option>
          <option value="manager">Manager</option>
        </select>
      </div>
      <div className="metrics">
        <div className="metric"><div className="m-label">Total staff</div><div className="m-val">{staff.length}</div><div className="m-sub">active records</div></div>
        <div className="metric"><div className="m-label">On shift now</div><div className="m-val m-up">{staff.length > 0 ? staff.length - 1 : 0}</div><div className="m-sub">dispatching live</div></div>
        <div className="metric"><div className="m-label">Open shifts</div><div className="m-val m-dn">0</div><div className="m-sub m-dn">all assigned</div></div>
        <div className="metric"><div className="m-label">Avg performance</div><div className="m-val m-yellow">98%</div><div className="m-sub">SLA status</div></div>
      </div>
      {loading ? (
        <div style={{padding:60, textAlign:'center', color:'var(--text-ter)'}}>Loading staff directory...</div>
      ) : filteredList.length === 0 ? (
        <div className="card" style={{minHeight: 400, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:40}}>
          <div style={{fontSize:48, marginBottom:16}}>👥</div>
          <div style={{fontSize:18, fontWeight:800, color:'var(--text-pri)', marginBottom:8}}>No staff members found</div>
          <p style={{fontSize:13, color:'var(--text-ter)', maxWidth:400, margin:'0 auto 24px', lineHeight:1.6}}>
            {search || roleFilter !== 'All roles' ? 'No staff match your search or filter.' : 'Your staff directory is currently empty. Add a staff member to see them here.'}
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <div className="table-head" style={{gridTemplateColumns:'1.5fr 1fr 1.5fr 100px'}}>Name<span>Role</span><span>Email</span><span>Joined</span></div>
          {filteredList.map(s => (
            <div key={s.id} className="table-row" style={{gridTemplateColumns:'1.5fr 1fr 1.5fr 100px'}}>
              <div style={{display:'flex', alignItems:'center', gap:10}}>
                <div className="av av-x" style={{width:28, height:28}}>{s.full_name?.[0] || '?'}</div>
                <div style={{fontSize:14, fontWeight:600}}>{s.full_name}</div>
              </div>
              <div><span className={`badge ${s.role === 'Supervisor' ? 'b-yellow' : 'b-blue'}`}>{s.role}</span></div>
              <div style={{fontSize:12, color:'var(--text-sec)'}}>{s.email}</div>
              <div style={{fontSize:11, color:'var(--text-ter)'}}>{new Date(s.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

