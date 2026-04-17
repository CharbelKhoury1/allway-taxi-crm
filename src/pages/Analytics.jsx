import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function todayStart() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d
}

export default function Analytics() {
  const [metrics, setMetrics]   = useState({ revenue: 0, avgMin: 0, cancelRate: 0, trips: 0 })
  const [zones, setZones]       = useState([])
  const [topDrivers, setTopDrivers] = useState([])
  const [weekly, setWeekly]     = useState([])
  const [drivers, setDrivers]   = useState([])
  const [loading, setLoading]   = useState(true)
  
  // Filters
  const [timeRange, setTimeRange] = useState('Last 30 Days')
  const [driverFilter, setDriverFilter] = useState('All Drivers')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate]   = useState('')

  useEffect(() => { loadAll() }, [timeRange, driverFilter, startDate, endDate])

  // Listen for the "Export report" button in the topbar
  useEffect(() => {
    function handleExport() {
      const lines = [
        ['Allway Taxi — Analytics Report', '', '', ''],
        ['Generated', new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), '', ''],
        ['', '', '', ''],
        ['DAILY METRICS', '', '', ''],
        ['Time Range', timeRange, '', ''],
        ['Driver Filter', driverFilter === 'All Drivers' ? 'All' : drivers.find(d => d.id === driverFilter)?.full_name || 'Unknown', '', ''],
        ['Total Revenue', `$${metrics.revenue.toLocaleString()}`, '', ''],
        ['Total Trips', metrics.trips, '', ''],
        ['Avg trip time', metrics.avgMin > 0 ? `${metrics.avgMin} min` : '—', '', ''],
        ['Cancellation rate', `${metrics.cancelRate}%`, '', ''],
        ['', '', '', ''],
        ['REVENUE TREND', '', '', ''],
        ['Label', 'Revenue', '', ''],
        ...(weekly.bars || []).map(b => [b.l, `$${b.rev ?? 0}`, '', '']),
        ['', '', '', ''],
        ['TOP PICKUP ZONES', '', '', ''],
        ['Zone', 'Trips', '', ''],
        ...(zones || []).map(z => [z.name, z.trips, '', '']),
        ['', '', '', ''],
        ['TOP DRIVERS', '', '', ''],
        ['Rank', 'Driver', 'Completed Trips', ''],
        ...(topDrivers || []).map(d => [d.rank, d.name, d.count, '']),
      ]
      const csv = lines.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `allway-analytics-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
    window.addEventListener('export-analytics', handleExport)
    return () => window.removeEventListener('export-analytics', handleExport)
  }, [metrics, weekly, zones, topDrivers, timeRange, driverFilter, drivers])

  async function loadAll() {
    setLoading(true)
    let from = null
    let to   = null
    const now = new Date()

    if (timeRange === 'Today') {
      const d = new Date(); d.setHours(0,0,0,0); from = d.toISOString()
    } else if (timeRange === 'Last 7 Days') {
      const d = new Date(); d.setDate(now.getDate() - 7); from = d.toISOString()
    } else if (timeRange === 'Last 30 Days') {
      const d = new Date(); d.setDate(now.getDate() - 30); from = d.toISOString()
    } else if (timeRange === 'Custom' && startDate) {
      from = new Date(startDate).toISOString()
      if (endDate) {
        const ed = new Date(endDate); ed.setHours(23,59,59,999); to = ed.toISOString()
      }
    }

    let query = supabase
      .from('trips')
      .select('id, status, fare_usd, pickup_address, driver_id, accepted_at, completed_at, requested_at, drivers(full_name)')
    
    if (from) query = query.gte('requested_at', from)
    if (to)   query = query.lte('requested_at', to)
    if (driverFilter !== 'All Drivers') query = query.eq('driver_id', driverFilter)

    const [tripsRes, driversRes] = await Promise.all([
      query.order('requested_at', { ascending: false }),
      supabase.from('drivers').select('id, full_name').order('full_name'),
    ])

    const trips = tripsRes.data || []
    const drvs  = driversRes.data || []
    setDrivers(drvs)

    // ── Metrics ──────────────────────────────────────────────
    const completed = trips.filter(t => t.status === 'completed')
    const revenue   = completed.reduce((s, t) => s + Number(t.fare_usd || 0), 0)
    
    const timed = completed.filter(t => t.accepted_at && t.completed_at)
    const avgMin = timed.length
      ? Math.round(timed.reduce((s, t) => s + (new Date(t.completed_at) - new Date(t.accepted_at)) / 60000, 0) / timed.length)
      : 0

    const cancelRate = trips.length 
      ? ((trips.filter(t => t.status === 'cancelled').length / trips.length) * 100).toFixed(1) 
      : 0

    setMetrics({ revenue: Math.round(revenue), avgMin, cancelRate, trips: trips.length })

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

    // ── Top drivers ────────────────────────────────
    const driverTrips = {}
    completed.forEach(t => {
      if (!t.driver_id) return
      driverTrips[t.driver_id] = (driverTrips[t.driver_id] || 0) + 1
    })
    const driverMap = {}
    drvs.forEach(d => { driverMap[d.id] = d.full_name })
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

    // ── Weekly Chart (last 7 data points) ────────────────────────────
    // If range is large, show by week, if small show by day
    const dayRevenue = {}
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    // Group by day
    completed.filter(t => t.completed_at).forEach(t => {
      const d = new Date(t.completed_at); d.setHours(0, 0, 0, 0)
      const key = d.toDateString()
      if (!dayRevenue[key]) dayRevenue[key] = { label: DAYS[d.getDay()], rev: 0, rawDate: d }
      dayRevenue[key].rev += Number(t.fare_usd || 0)
    })
    
    const sortedDays = Object.values(dayRevenue).sort((a, b) => a.rawDate - b.rawDate).slice(-7)
    const maxRev = Math.max(...sortedDays.map(d => d.rev), 1)
    setWeekly({ 
      bars: sortedDays.map(d => ({ l: d.label, h: Math.round((d.rev / maxRev) * 100), p: d.rev >= maxRev * 0.8, rev: Math.round(d.rev) })), 
      total: Math.round(revenue) 
    })

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
      <div className="search-row" style={{ marginBottom: 18, background: 'var(--surface)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-ter)', marginLeft: 2 }}>TIME RANGE</span>
            <select 
              value={timeRange} 
              onChange={e => setTimeRange(e.target.value)}
              style={{ padding: '6px 12px', fontSize: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-pri)', outline: 'none' }}
            >
              <option>Today</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>All Time</option>
              <option>Custom</option>
            </select>
          </div>

          {timeRange === 'Custom' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-ter)', marginLeft: 2 }}>START DATE</span>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  style={{ padding: '5px 10px', fontSize: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-pri)', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-ter)', marginLeft: 2 }}>END DATE</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  style={{ padding: '5px 10px', fontSize: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-pri)', outline: 'none' }}
                />
              </div>
            </>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-ter)', marginLeft: 2 }}>DRIVER</span>
            <select 
              value={driverFilter} 
              onChange={e => setDriverFilter(e.target.value)}
              style={{ padding: '6px 12px', fontSize: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-pri)', outline: 'none', minWidth: 140 }}
            >
              <option>All Drivers</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.full_name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-end' }}>
             {loading && <div style={{ fontSize: 11, color: 'var(--text-ter)', fontStyle: 'italic' }}>Refreshing…</div>}
             <button 
               className="btn" 
               onClick={() => { setTimeRange('Last 30 Days'); setDriverFilter('All Drivers'); setStartDate(''); setEndDate(''); }}
               style={{ fontSize: 11, padding: '6px 12px' }}
             >
               Reset
             </button>
          </div>
        </div>
      </div>

      <div className="metrics">
        <div className="metric">
          <div className="m-label">Total revenue</div>
          <div className="m-val">${metrics.revenue.toLocaleString()}</div>
          <div className="m-sub">for selected period</div>
        </div>
        <div className="metric">
          <div className="m-label">Total trips</div>
          <div className="m-val">{metrics.trips}</div>
          <div className="m-sub">{timeRange}</div>
        </div>
        <div className="metric">
          <div className="m-label">Avg trip time</div>
          <div className="m-val">{metrics.avgMin > 0 ? `${metrics.avgMin} min` : '—'}</div>
          <div className="m-sub">efficiency</div>
        </div>
        <div className="metric">
          <div className="m-label">Cancellation rate</div>
          <div className="m-val m-dn">{metrics.cancelRate}%</div>
          <div className="m-sub">orders cancelled</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Top pickup zones */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">Top pickup zones</span>
            <span className="card-meta">{timeRange}</span>
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
            <span className="card-title">Top drivers</span>
            <span className="card-meta">{timeRange}</span>
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
          <span className="card-title">Revenue trend</span>
          <span className="card-meta">Showing last {weekly.bars?.length || 0} data points</span>
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
