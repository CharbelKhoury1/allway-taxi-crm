import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

const ROLE_BADGE = {
  admin:      'b-yellow',
  manager:    'b-yellow',
  dispatcher: 'b-blue',
  support:    'b-green',
}

const AV_COLORS = ['av-y', 'av-r', 'av-b', 'av-g', 'av-p']
function avColor(name = '') {
  let h = 0; for (const c of name) h += c.charCodeAt(0)
  return AV_COLORS[h % AV_COLORS.length]
}
function initials(name = '') {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function StaffDetail({ staff }) {
  if (!staff) {
    return (
      <div className="profile-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, color: 'var(--text-ter)', fontSize: 13 }}>
        Select a staff member to view details
      </div>
    )
  }

  const joined = staff.created_at
    ? new Date(staff.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  const ROLE_PERMS = {
    admin:      [['View orders', 'b-green', 'Allowed'], ['Assign drivers', 'b-green', 'Allowed'], ['Cancel orders', 'b-green', 'Allowed'], ['Manage staff', 'b-green', 'Allowed'], ['View analytics', 'b-green', 'Allowed']],
    manager:    [['View orders', 'b-green', 'Allowed'], ['Assign drivers', 'b-green', 'Allowed'], ['Cancel orders', 'b-green', 'Allowed'], ['Manage staff', 'b-amber', 'Limited'], ['View analytics', 'b-green', 'Allowed']],
    dispatcher: [['View orders', 'b-green', 'Allowed'], ['Assign drivers', 'b-green', 'Allowed'], ['Cancel orders', 'b-amber', 'Limited'], ['Manage staff', 'b-red', 'Denied'], ['View analytics', 'b-amber', 'Limited']],
    support:    [['View orders', 'b-green', 'Allowed'], ['Assign drivers', 'b-red', 'Denied'], ['Cancel orders', 'b-red', 'Denied'], ['Manage staff', 'b-red', 'Denied'], ['View analytics', 'b-amber', 'Limited']],
  }
  const perms = ROLE_PERMS[staff.role] || ROLE_PERMS.dispatcher

  return (
    <div className="profile-card">
      <div className="profile-top">
        <div className={`av-lg ${avColor(staff.full_name)}`}>{initials(staff.full_name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-pri)', marginBottom: 4 }}>{staff.full_name}</div>
          <div style={{ marginBottom: 6 }}>
            <span className={`badge ${ROLE_BADGE[staff.role] || 'b-gray'}`} style={{ textTransform: 'capitalize' }}>
              {staff.role}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-ter)' }}>{staff.email}</div>
        </div>
      </div>

      <div style={{ marginTop: 20, marginBottom: 16 }}>
        <div className="section-label">Account details</div>
        <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-ter)', marginBottom: 3 }}>ROLE</div>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'capitalize' }}>{staff.role}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-ter)', marginBottom: 3 }}>JOINED</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{joined}</div>
          </div>
        </div>
      </div>

      <div className="section-label">Access permissions</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {perms.map(([label, badge, text], i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < perms.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <span style={{ fontSize: 13, color: 'var(--text-sec)' }}>{label}</span>
            <span className={`badge ${badge}`}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Staff() {
  const [staff, setStaff]           = useState([])
  const [selected, setSelected]     = useState(null)
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [roleFilter, setRoleFilter] = useState('All roles')
  const [removing, setRemoving]     = useState(null)

  useEffect(() => {
    fetchStaff()

    const channel = supabase
      .channel('crm-staff-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, fetchStaff)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchStaff() {
    const { data, error } = await supabase
      .from('staff')
      .select('id, full_name, role, email, created_at')
      .order('created_at', { ascending: false })
    if (!error && data) {
      setStaff(data)
      // Auto-select first staff member if nothing selected yet
      setSelected(prev => prev ?? (data.length > 0 ? data[0] : null))
    }
    setLoading(false)
  }

  async function removeStaff(member, e) {
    e.stopPropagation()
    if (!window.confirm(`Remove ${member.full_name} from the team?`)) return
    setRemoving(member.id)
    const { error } = await supabase.from('staff').delete().eq('id', member.id)
    if (!error) {
      toast.success('Staff member removed')
      setStaff(prev => {
        const next = prev.filter(s => s.id !== member.id)
        if (selected?.id === member.id) setSelected(next[0] || null)
        return next
      })
    } else {
      toast.error(error.message)
    }
    setRemoving(null)
  }

  const filtered = staff.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q || s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.role?.toLowerCase().includes(q)
    const matchRole   = roleFilter === 'All roles' || s.role === roleFilter
    return matchSearch && matchRole
  })

  const selectedStaff = staff.find(s => s.id === selected?.id) || null

  return (
    <div>
      {/* ── Metrics ── */}
      <div className="metrics" style={{ marginBottom: 18 }}>
        <div className="metric">
          <div className="m-label">Total staff</div>
          <div className="m-val">{staff.length}</div>
          <div className="m-sub">registered members</div>
        </div>
        <div className="metric">
          <div className="m-label">Dispatchers</div>
          <div className="m-val m-up">{staff.filter(s => s.role === 'dispatcher').length}</div>
          <div className="m-sub">active role</div>
        </div>
        <div className="metric">
          <div className="m-label">Admins / Managers</div>
          <div className="m-val m-yellow">{staff.filter(s => s.role === 'admin' || s.role === 'manager').length}</div>
          <div className="m-sub">elevated access</div>
        </div>
        <div className="metric">
          <div className="m-label">Support</div>
          <div className="m-val">{staff.filter(s => s.role === 'support').length}</div>
          <div className="m-sub">customer support</div>
        </div>
      </div>

      <div className="grid-2">
        {/* ── Staff list ── */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">Team members</span>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              style={{ fontSize: 11, padding: '3px 8px', background: 'var(--dark4)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-sec)', fontFamily: 'var(--font)', outline: 'none' }}
            >
              <option>All roles</option>
              <option value="dispatcher">Dispatcher</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="support">Support</option>
            </select>
          </div>

          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
            <input
              placeholder="Search by name, email or role…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-pri)', fontFamily: 'var(--font)', outline: 'none' }}
            />
          </div>

          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: 12, color: 'var(--text-ter)' }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'var(--text-ter)' }}>
              {staff.length === 0
                ? <><div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>No staff yet — click <strong style={{ color: 'var(--yellow)' }}>+ Add staff</strong> to add team members.</>
                : 'No staff match your search.'}
            </div>
          ) : filtered.map(s => (
            <div
              key={s.id}
              className="table-row"
              style={{
                gridTemplateColumns: '1fr 90px 70px',
                padding: '16px 20px',
                background: selectedStaff?.id === s.id ? 'rgba(245,184,0,.08)' : undefined,
                borderLeft: selectedStaff?.id === s.id ? '3px solid var(--yellow)' : '3px solid transparent',
                cursor: 'pointer',
              }}
              onClick={() => setSelected(s)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className={`av ${avColor(s.full_name)}`} style={{ width: 32, height: 32, fontSize: 11 }}>{initials(s.full_name)}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-pri)' }}>{s.full_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-ter)' }}>{s.email}</div>
                </div>
              </div>
              <span className={`badge ${ROLE_BADGE[s.role] || 'b-gray'}`} style={{ padding: '4px 10px', fontSize: '10px', textTransform: 'capitalize' }}>
                {s.role}
              </span>
              <button
                disabled={removing === s.id}
                onClick={e => removeStaff(s, e)}
                style={{
                  background: 'none',
                  border: '1px solid rgba(240,149,149,.3)',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: 11,
                  color: '#F09595',
                  cursor: removing === s.id ? 'not-allowed' : 'pointer',
                  opacity: removing === s.id ? 0.5 : 1,
                  fontFamily: 'var(--font)',
                }}
              >
                {removing === s.id ? '…' : 'Remove'}
              </button>
            </div>
          ))}
        </div>

        {/* ── Detail panel ── */}
        <StaffDetail staff={selectedStaff} />
      </div>
    </div>
  )
}
