import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Analytics() {
  const [stats, setStats]        = useState({ revenue: 0, cancelRate: 0, avgTime: 0, totalTrips: 0 })
  const [zones, setZones]        = useState([])
  const [topDrivers, setDrivers] = useState([])
  const [weekly, setWeekly]      = useState([])
  const [loading, setLoading]    = useState(true)

  useEffect(() => {
    async function fetchAnalytics() {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      sevenDaysAgo.setHours(0, 0, 0, 0)

      const [todayRes, weekRes, driversRes] = await Promise.all([
        supabase
          .from('trips')
          .select('pickup_address, status, fare_usd, duration_min')
          .gte('requested_at', todayStart.toISOString()),

        supabase
          .from('trips')
          .select('fare_usd, status, requested_at')
          .gte('requested_at', sevenDaysAgo.toISOString()),

        supabase
          .from('drivers')
          .select('id, full_name, total_trips, rating')
          .order('total_trips', { ascending: false })
          .limit(5),
      ])

      // ── Today stats ───────────────────────────────────────────────────────
      if (todayRes.data) {
        const t       = todayRes.data
        const revenue = t.reduce((s, r) => s + (r.fare_usd || 0), 0)
        const cancels = t.filter(r => r.status === 'cancelled').length
        const durs    = t.filter(r => r.duration_min).map(r => r.duration_min)
        const avgTime = durs.length ? Math.round(durs.reduce((s, d) => s + d, 0) / durs.length) : 0

        setStats({ revenue: revenue.toFixed(2), cancelRate: t.length ? Math.round((cancels / t.length) * 100) : 0, avgTime, totalTrips: t.length })

        const zoneMap = {}
        t.forEach(r => {
          if (!r.pickup_address) return
          const z = r.pickup_address.split(',')[0].trim()
          zoneMap[z] = (zoneMap[z] || 0) + 1
        })
        setZones(
          Object.entries(zoneMap)
            .map(([name, count]) => ({ name, trips: count, pct: Math.min(100, (count / (t.length || 1)) * 400) }))
            .sort((a, b) => b.trips - a.trips)
            .slice(0, 5)
        )
      }

      // ── Weekly revenue chart ──────────────────────────────────────────────
      if (weekRes.data) {
        const dayRevenue = {}
        for (let i = 6; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          dayRevenue[d.toISOString().slice(0, 10)] = 0
        }
        weekRes.data.forEach(r => {
          if (r.status === 'completed' && r.fare_usd) {
            const key = new Date(r.requested_at).toISOString().slice(0, 10)
            if (key in dayRevenue) dayRevenue[key] += Number(r.fare_usd)
          }
        })

        const entries = Object.entries(dayRevenue)
        const maxRev  = Math.max(...entries.map(([, v]) => v), 1)
        const today   = new Date().toISOString().slice(0, 10)

        setWeekly(
          entries.map(([date, rev]) => ({
            l:    DAY_LABELS[new Date(date).getUTCDay()],
            h:    Math.round((rev / maxRev) * 100) || 4,
            rev:  rev.toFixed(2),
            peak: date === today,
          }))
        )
      }

      if (driversRes.data) setDrivers(driversRes.data)
      setLoading(false)
    }

    fetchAnalytics()
  }, [])

  return (
    <div>
      <div className="metrics">
        <div className="metric">
          <div className="m-label">Revenue today</div>
          <div className="m-val">${stats.revenue}</div>
          <div className="m-sub m-up">{stats.totalTrips} trips</div>
        </div>
        <div className="metric">
          <div className="m-label">Avg trip time</div>
          <div className="m-val">{stats.avgTime ? `${stats.avgTime} min` : '—'}</div>
          <div className="m-sub">from completed trips</div>
        </div>
        <div className="metric">
          <div className="m-label">Cancellation rate</div>
          <div className="m-val">{stats.cancelRate}%</div>
          <div className="m-sub">of total requests today</div>
        </div>
        <div className="metric">
          <div className="m-label">Active drivers</div>
          <div className="m-val m-up">{topDrivers.length}</div>
          <div className="m-sub">in system</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <span className="card-title">Top pickup zones</span>
            <span className="card-meta">Today</span>
          </div>
          <div style={{ padding: '14px 16px', minHeight: 200 }}>
            {loading
              ? <div style={{ textAlign: 'center', color: 'var(--text-ter)' }}>Loading...</div>
              : zones.length === 0
              ? <div style={{ textAlign: 'center', color: 'var(--text-ter)', paddingTop: 40 }}>No trips recorded today</div>
              : zones.map(z => (
                <div className="zone-row" key={z.name}>
                  <div className="zone-top"><span>{z.name}</span><span className="zone-val">{z.trips} trips</span></div>
                  <div className="prog-bar"><div className="prog-fill" style={{ width: `${z.pct}%` }}></div></div>
                </div>
              ))
            }
          </div>
        </div>

        <div className="card">
          <div className="card-head"><span className="card-title">Top drivers this week</span></div>
          <div style={{ padding: '4px 0', minHeight: 200 }}>
            {loading
              ? <div style={{ textAlign: 'center', color: 'var(--text-ter)' }}>Loading...</div>
              : topDrivers.length === 0
              ? <div style={{ textAlign: 'center', color: 'var(--text-ter)', paddingTop: 40 }}>No driver data</div>
              : topDrivers.map((d, i) => (
                <div className="row" key={d.id}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: i < 3 ? 'var(--yellow)' : 'var(--text-ter)', width: 20, flexShrink: 0 }}>{i + 1}</span>
                  <div className="av av-y">{d.full_name[0]}</div>
                  <div className="row-info">
                    <div className="row-name">{d.full_name}</div>
                    <div className="row-sub">★ {d.rating ?? '—'}</div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-pri)' }}>{d.total_trips || 0} trips</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="card-title">Revenue — trailing 7 days</span>
          <span className="card-meta">Completed trips only</span>
        </div>
        <div className="chart-wrap">
          {loading
            ? <div style={{ textAlign: 'center', color: 'var(--text-ter)', padding: 20 }}>Loading...</div>
            : (
              <div className="bars" style={{ height: 80 }}>
                {weekly.map(b => (
                  <div className="bar-col" key={b.l} title={`$${b.rev}`}>
                    <div className={`bar-fill${b.peak ? ' peak' : ''}`} style={{ height: `${b.h}%` }}></div>
                    <div className="bar-lbl">{b.l}</div>
                  </div>
                ))}
              </div>
            )
          }
          {!loading && weekly.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-ter)', marginTop: 12 }}>
              7-day total: ${weekly.reduce((s, b) => s + Number(b.rev), 0).toFixed(2)} · Hover bars to see daily totals
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
