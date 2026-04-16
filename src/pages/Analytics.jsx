import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function todayStart() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d
}

export default function Analytics() {
  const [metrics, setMetrics]   = useState({ revenue: 0, avgMin: 0, cancelRate: 0 })
  const [zones, setZones]       = useState([])
  const [topDrivers, setTopDrivers] = useState([])
  const [weekly, setWeekly]     = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const sevenDaysAgo  = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const [allTripsRes, driversRes] = await Promise.all([
      supabase
        .from('trips')
        .select('id, status, fare_usd, pickup_address, driver_id, accepted_at, completed_at, requested_at, drivers(full_name)')
        .gte('requested_at', thirtyDaysAgo.toISOString()),
      supabase
        .from('drivers')
        .select('id, full_name'),
    ])

    const trips   = allTripsRes.data || []
    const drivers = driversRes.data  || []

    // ── Metrics ──────────────────────────────────────────────
    const today      = todayStart()
    const todayTrips = trips.filter(t => new Date(t.requested_at) >= today)
    const todayRev   = todayTrips.filter(t => t.status === 'completed').reduce((s, t) => s + Number(t.fare_usd || 0), 0)

    // Avg trip time (minutes) from accepted→completed
    const timed = trips.filter(t => t.status === 'completed' && t.accepted_at && t.completed_at)
    const avgMin = timed.length
      ? Math.round(timed.reduce((s, t) => s + (new Date(t.completed_at) - new Date(t.accepted_at)) / 60000, 0) / timed.length)
      : 0

    // Cancellation rate (last 7 days)
    const recentTrips    = trips.filter(t => new Date(t.requested_at) >= sevenDaysAgo)
    const cancelRate     = recentTrips.length ? ((recentTrips.filter(t => t.status === 'cancelled').length / recentTrips.length) * 100).toFixed(1) : 0

    setMetrics({ revenue: Math.round(todayRev), avgMin, cancelRate })

    // ── Top pickup zones ──────────────────────────────────────
    const zoneCounts = {}
    trips.forEach(t => {
      if (!t.pickup_address) return
      const zone = t.pickup_address.split(',')[0].trim()
      zoneCounts[zone] = (zoneCounts[zone] || 0) + 1
    })
    const sortedZones = Object.entries(zoneCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const maxZone = sortedZones[0]?.[1] || 1
    setZones(sortedZones.map(([name, count]) => ({ name, trips: count, pct: Math.round((count / maxZone) * 100) })))

    // ── Top drivers this month ────────────────────────────────
    const driverTrips = {}
    trips.filter(t => t.status === 'completed').forEach(t => {
      if (!t.driver_id) return
      driverTrips[t.driver_id] = (driverTrips[t.driver_id] || 0) + 1
    })
    const driverMap = {}
    drivers.forEach(d => { driverMap[d.id] = d.full_name })
    const sortedDrivers = Object.entries(driverTrips).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const AV_COLORS = ['av-y', 'av-g', 'av-b', 'av-p', 'av-r']
    setTopDrivers(sortedDrivers.map(([id, count], i) => ({
      rank: i + 1,
      name: driverMap[id] || 'Unknown',
      count,
      cls:  AV_COLORS[i] || 'av-y',
      init: (driverMap[id] || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      gold: i < 3,
    })))

    // ── Last 7 days revenue by day ────────────────────────────
    const dayRevenue = {}
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
      dayRevenue[d.toDateString()] = { label: i === 0 ? 'Today' : DAYS[d.getDay()], rev: 0 }
    }
    trips.filter(t => t.status === 'completed' && t.completed_at).forEach(t => {
      const d = new Date(t.completed_at); d.setHours(0, 0, 0, 0)
      const key = d.toDateString()
      if (dayRevenue[key]) dayRevenue[key].rev += Number(t.fare_usd || 0)
    })
    const weekData = Object.values(dayRevenue)
    const maxRev = Math.max(...weekData.map(d => d.rev), 1)
    const totalWeekRev = weekData.reduce((s, d) => s + d.rev, 0)
    setWeekly({ bars: weekData.map(d => ({ l: d.label, h: Math.round((d.rev / maxRev) * 100), p: d.rev >= maxRev * 0.8 })), total: Math.round(totalWeekRev) })

    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-ter)', fontSize: 13 }}>
        Loading analytics…
      </div>
    )
  }

  return (
    <div>
      <div className="metrics">
        <div className="metric">
          <div className="m-label">Revenue today</div>
          <div className="m-val">${metrics.revenue}</div>
          <div className="m-sub">completed trips</div>
        </div>
        <div className="metric">
          <div className="m-label">Avg trip time</div>
          <div className="m-val">{metrics.avgMin > 0 ? `${metrics.avgMin} min` : '—'}</div>
          <div className="m-sub">accepted → complete</div>
        </div>
        <div className="metric">
          <div className="m-label">Cancellation rate</div>
          <div className="m-val">{metrics.cancelRate}%</div>
          <div className="m-sub">last 7 days</div>
        </div>
        <div className="metric">
          <div className="m-label">Revenue this week</div>
          <div className="m-val">${weekly.total || 0}</div>
          <div className="m-sub">last 7 days</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Top pickup zones */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">Top pickup zones</span>
            <span className="card-meta">Last 30 days</span>
          </div>
          <div style={{ padding: '14px 16px' }}>
            {zones.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-ter)', textAlign: 'center', padding: '16px 0' }}>No data yet</div>
            ) : zones.map((z, i) => (
              <div className="zone-row" key={z.name}>
                <div className="zone-top">
                  <span>{z.name}</span>
                  <span className="zone-val">{z.trips} trips</span>
                </div>
                <div className="prog-bar">
                  <div className="prog-fill" style={{ width: `${z.pct}%`, background: i >= 3 ? `rgba(245,184,0,${0.25 + i * 0.05})` : undefined }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top drivers */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">Top drivers this month</span>
          </div>
          <div style={{ padding: '4px 0' }}>
            {topDrivers.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-ter)', textAlign: 'center', padding: '24px 0' }}>No data yet</div>
            ) : topDrivers.map(d => (
              <div className="row" key={d.name}>
                <span style={{ fontSize: 12, fontWeight: 800, color: d.gold ? 'var(--yellow)' : 'var(--text-ter)', width: 20, flexShrink: 0 }}>{d.rank}</span>
                <div className={`av ${d.cls}`}>{d.init}</div>
                <div className="row-info"><div className="row-name">{d.name}</div></div>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-pri)' }}>{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="card">
        <div className="card-head">
          <span className="card-title">Revenue — last 7 days</span>
          <span className="card-meta">Total: ${weekly.total || 0}</span>
        </div>
        <div className="chart-wrap">
          <div className="bars" style={{ height: 80 }}>
            {(weekly.bars || []).map(b => (
              <div className="bar-col" key={b.l}>
                <div className={`bar-fill${b.p ? ' peak' : ''}`} style={{ height: `${b.h || 2}%` }} />
                <div className="bar-lbl">{b.l}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-ter)' }}>
            Based on completed trips · Updated live
          </div>
        </div>
      </div>
    </div>
  )
}
