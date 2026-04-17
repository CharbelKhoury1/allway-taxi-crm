import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

const STATUS_BADGE = {
  completed:   'b-green',
  on_trip:     'b-blue',
  accepted:    'b-blue',
  pending:     'b-amber',
  dispatching: 'b-amber',
  cancelled:   'b-gray',
}

const STATUS_LABEL = {
  completed:   'Completed',
  on_trip:     'In progress',
  accepted:    'Assigned',
  pending:     'Pending',
  dispatching: 'Dispatching',
  cancelled:   'Cancelled',
}

const CANCELLABLE = ['pending', 'dispatching', 'accepted']

const AV_COLORS = ['av-y', 'av-r', 'av-b', 'av-g', 'av-p']
function avColor(name = '') {
  let h = 0; for (const c of name) h += c.charCodeAt(0)
  return AV_COLORS[h % AV_COLORS.length]
}
function initials(name = '') {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}
function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function exportCSV(orders) {
  const header = ['ID', 'Customer', 'Pickup', 'Dropoff', 'Driver', 'Time', 'Status', 'Fare']
  const rows = orders.map(o => [o.id, o.customerName, o.pickup, o.dropoff, o.driverName, o.time, o.statusLabel, o.fare ? `$${o.fare}` : '—'])
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `allway-orders-${new Date().toISOString().slice(0, 10)}.csv`
  a.click(); URL.revokeObjectURL(url)
}

const COL = '55px 1fr 1fr 90px 60px 70px 95px'

export default function Orders() {
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('All statuses')
  const [period, setPeriod]       = useState('Today')
  const [selected, setSelected]   = useState(null)
  const [cancelling, setCancelling] = useState(null)
  const [stats, setStats]         = useState({ total: 0, completed: 0, cancelled: 0, pending: 0 })

  useEffect(() => {
    fetchOrders()

    // Real-time: refresh list whenever any trip changes
    const channel = supabase
      .channel('crm-trips-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, fetchOrders)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [period]) // eslint-disable-line

  async function fetchOrders() {
    setLoading(true)
    const now = new Date()
    let from = null
    if (period === 'Today') {
      const d = new Date(now); d.setHours(0, 0, 0, 0); from = d.toISOString()
    } else if (period === 'This week') {
      const d = new Date(now); d.setDate(now.getDate() - 7); from = d.toISOString()
    } else if (period === 'This month') {
      const d = new Date(now); d.setDate(now.getDate() - 30); from = d.toISOString()
    } else if (period === 'All time') {
      from = null
    }

    let q = supabase
      .from('trips')
      .select('id, status, fare_usd, pickup_address, dropoff_address, requested_at, customers(full_name, phone), drivers(full_name)')
      .order('requested_at', { ascending: false })
    if (from) q = q.gte('requested_at', from)

    const { data, error } = await q
    if (!error && data) {
      const mapped = data.map(t => ({
        id:           t.id,
        customerName: t.customers?.full_name || '—',
        customerPhone:t.customers?.phone     || '—',
        driverName:   t.drivers?.full_name   || 'Unassigned',
        pickup:  t.pickup_address  || '—',
        dropoff: t.dropoff_address || '—',
        time:    fmtTime(t.requested_at),
        status:  t.status,
        statusLabel: STATUS_LABEL[t.status] || t.status,
        badge: STATUS_BADGE[t.status] || 'b-gray',
        fare: t.fare_usd,
        avCls: avColor(t.customers?.full_name || ''),
        init:  initials(t.customers?.full_name || ''),
      }))
      setOrders(mapped)
      setStats({
        total:     mapped.length,
        completed: mapped.filter(o => o.status === 'completed').length,
        cancelled: mapped.filter(o => o.status === 'cancelled').length,
        pending:   mapped.filter(o => ['pending', 'dispatching'].includes(o.status)).length,
      })
    }
    setLoading(false)
  }

  async function cancelOrder(tripId) {
    setCancelling(tripId)
    const { error } = await supabase
      .from('trips')
      .update({ status: 'cancelled' })
      .eq('id', tripId)
    if (!error) {
      toast.success('Order cancelled')
      setSelected(null)
      fetchOrders()
    } else {
      toast.error(error.message)
    }
    setCancelling(null)
  }

  const filtered = orders.filter(o => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      o.customerName.toLowerCase().includes(q) ||
      o.pickup.toLowerCase().includes(q) ||
      o.dropoff.toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q) ||
      o.driverName.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'All statuses' || o.statusLabel === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div>
      <div className="search-row">
        <input
          placeholder="Search by customer, route, driver or order ID..."
          style={{ flex: 1 }}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={statusFilter} onChange={e => setStatus(e.target.value)}>
          <option>All statuses</option>
          <option>In progress</option>
          <option>Completed</option>
          <option>Cancelled</option>
          <option>Pending</option>
        </select>
        <select value={period} onChange={e => setPeriod(e.target.value)}>
          <option>Today</option>
          <option>This week</option>
          <option>This month</option>
          <option>All time</option>
        </select>
        <button className="btn" onClick={() => exportCSV(filtered)}>Export CSV</button>
      </div>

      <div className="metrics metrics-4b" style={{ marginBottom: 18 }}>
        <div className="metric"><div className="m-label">Total</div><div className="m-val">{stats.total}</div></div>
        <div className="metric"><div className="m-label">Completed</div><div className="m-val m-up">{stats.completed}</div></div>
        <div className="metric"><div className="m-label">Cancelled</div><div className="m-val m-dn">{stats.cancelled}</div></div>
        <div className="metric"><div className="m-label">Pending</div><div className="m-val m-yellow">{stats.pending}</div></div>
      </div>

      <div className="table-wrap">
        <div className="table-head" style={{ gridTemplateColumns: COL }}>
          #<span>Customer</span><span>Route</span><span>Driver</span><span>Time</span><span>Fare</span><span>Status</span>
        </div>

        {loading ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-ter)', fontSize: 13 }}>Loading orders…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-ter)' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
            No orders match your search.
            <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--yellow)', cursor: 'pointer' }} onClick={() => { setSearch(''); setStatus('All statuses'); setPeriod('Today') }}>
              Clear filters
            </span>
          </div>
        ) : filtered.map(o => (
          <div key={o.id}>
            {/* Main row */}
            <div
              className="table-row"
              style={{
                gridTemplateColumns: COL,
                background: selected === o.id ? 'rgba(245,184,0,.06)' : undefined,
                borderLeft: selected === o.id ? '3px solid var(--yellow)' : '3px solid transparent',
                cursor: 'pointer',
              }}
              onClick={() => setSelected(selected === o.id ? null : o.id)}
            >
              <span style={{ fontSize: 10, color: 'var(--text-ter)', fontFamily: 'monospace' }}>{o.id.slice(0, 5)}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className={`av av-sm ${o.avCls}`}>{o.init}</div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{o.customerName}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-ter)' }}>{o.pickup.split(',')[0]} → {o.dropoff.split(',')[0]}</span>
              <span style={{ fontSize: 12, color: 'var(--text-sec)' }}>{o.driverName}</span>
              <span style={{ fontSize: 11, color: 'var(--text-ter)' }}>{o.time}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: o.fare ? 'var(--yellow)' : 'var(--text-ter)' }}>
                {o.fare ? `$${Number(o.fare).toFixed(0)}` : '—'}
              </span>
              <span className={`badge ${o.badge}`}>{o.statusLabel}</span>
            </div>

            {/* Expandable detail panel */}
            {selected === o.id && (
              <div style={{
                padding: '12px 20px 14px',
                background: 'rgba(245,184,0,.03)',
                borderBottom: '1px solid var(--border)',
                borderLeft: '3px solid var(--yellow)',
                display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start',
              }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-ter)', fontWeight: 700, marginBottom: 3 }}>PICKUP</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-pri)' }}>{o.pickup}</div>
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-ter)', fontWeight: 700, marginBottom: 3 }}>DROPOFF</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-pri)' }}>{o.dropoff}</div>
                </div>
                <div style={{ minWidth: 100 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-ter)', fontWeight: 700, marginBottom: 3 }}>CUSTOMER</div>
                  <div style={{ fontSize: 12, color: 'var(--text-sec)' }}>{o.customerPhone}</div>
                </div>
                <div style={{ minWidth: 80 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-ter)', fontWeight: 700, marginBottom: 3 }}>FARE</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--yellow)' }}>{o.fare ? `$${Number(o.fare).toFixed(2)}` : '—'}</div>
                </div>
                {CANCELLABLE.includes(o.status) && (
                  <button
                    disabled={cancelling === o.id}
                    onClick={e => { e.stopPropagation(); cancelOrder(o.id) }}
                    style={{
                      alignSelf: 'center',
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: '1px solid rgba(240,149,149,.35)',
                      background: 'rgba(240,149,149,.07)',
                      color: '#F09595',
                      cursor: cancelling === o.id ? 'not-allowed' : 'pointer',
                      fontSize: 12,
                      fontWeight: 700,
                      opacity: cancelling === o.id ? 0.6 : 1,
                      fontFamily: 'var(--font)',
                    }}
                  >
                    {cancelling === o.id ? 'Cancelling…' : 'Cancel order'}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-ter)', textAlign: 'right' }}>
          Showing {filtered.length} of {orders.length} orders
          {(search || statusFilter !== 'All statuses' || period !== 'Today') && (
            <span style={{ marginLeft: 8, color: 'var(--yellow)', cursor: 'pointer' }} onClick={() => { setSearch(''); setStatus('All statuses'); setPeriod('Today') }}>
              Clear filters
            </span>
          )}
        </div>
      )}
    </div>
  )
}
