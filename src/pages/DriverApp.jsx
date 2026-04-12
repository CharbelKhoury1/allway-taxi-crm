import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { acquireWakeLock } from '../lib/wakeLock'

const PING_INTERVAL  = 25_000   // heartbeat to Supabase (ms)
const STALE_LIMIT    = 45_000   // restart GPS if no update for this long (ms)

// ─── iOS-safe GPS hook ────────────────────────────────────────
function useGPS({ active, onPosition }) {
  const watchRef     = useRef(null)
  const lastUpdateAt = useRef(null)
  const staleTimer   = useRef(null)

  const startWatch = useCallback(() => {
    if (!('geolocation' in navigator)) return
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current)
    }
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        lastUpdateAt.current = Date.now()
        onPosition(pos.coords.latitude, pos.coords.longitude)
      },
      err => {
        if (err.code !== 1) setTimeout(startWatch, 3000)
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    )
  }, [onPosition])

  useEffect(() => {
    if (!active) return
    startWatch()
    function onVisibility() {
      if (document.visibilityState === 'visible') startWatch()
    }
    document.addEventListener('visibilitychange', onVisibility)
    staleTimer.current = setInterval(() => {
      if (lastUpdateAt.current && Date.now() - lastUpdateAt.current > STALE_LIMIT) {
        startWatch()
      }
    }, 20000)
    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current)
        watchRef.current = null
      }
      clearInterval(staleTimer.current)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [active, startWatch])
}

const SESSION_KEY = 'allway_driver_session'
function saveSession(driver) { localStorage.setItem(SESSION_KEY, JSON.stringify(driver)) }
function loadSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null } }
function clearSession() { localStorage.removeItem(SESSION_KEY) }

// ─── Login ────────────────────────────────────────────────────
function DriverLogin({ onLogin }) {
  const [phone, setPhone]     = useState('')
  const [pin, setPin]         = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const digits = phone.replace(/\D/g, '')
    const { data, error: err } = await supabase
      .from('drivers')
      .select('id, full_name, plate, car_model, status, online, total_trips, rating')
      .ilike('phone', `%${digits}`)
      .eq('pwa_pin', pin.trim())
      .single()
    setLoading(false)
    if (err || !data) { setError('Incorrect phone number or PIN.'); return }
    saveSession(data)
    onLogin(data)
  }

  return (
    <div style={g.screen}>
      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        body { overscroll-behavior: none; margin: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        .drv-input:focus { border-color: #F5B800 !important; box-shadow: 0 0 0 3px rgba(245,184,0,.15) !important; }
      `}</style>
      <div style={g.loginBg}>
        <div style={g.bgCircle1} />
        <div style={g.bgCircle2} />
      </div>
      <div style={g.loginWrap}>
        <div style={{animation:'fadeUp .4s ease both', animationDelay:'.05s'}}>
          <div style={g.loginLogoWrap}><div style={g.loginLogo}>A</div></div>
          <div style={g.loginBrand}>ALLWAY <span style={{color:'#F5B800'}}>TAXI</span></div>
          <div style={g.loginSub}>Driver Portal</div>
        </div>
        <div style={{...g.loginCard, animation:'fadeUp .4s ease both', animationDelay:'.15s'}}>
          <form onSubmit={handleLogin}>
            <div style={g.fieldWrap}>
              <div style={g.fieldIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.0 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/>
                </svg>
              </div>
              <input className="drv-input" style={g.fieldInput} type="tel" inputMode="numeric"
                placeholder="70111222" value={phone} onChange={e => setPhone(e.target.value)} required />
            </div>
            <div style={{...g.fieldWrap, marginTop:12}}>
              <div style={g.fieldIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </div>
              <input className="drv-input" style={g.fieldInput} type="password" inputMode="numeric"
                placeholder="PIN" maxLength={6} value={pin} onChange={e => setPin(e.target.value)} required />
            </div>
            {error && (
              <div style={g.errorBox}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{flexShrink:0}}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}
            <button style={{...g.btnYellow, marginTop:20, width:'100%'}} type="submit" disabled={loading}>
              {loading ? (
                <span style={{display:'flex', alignItems:'center', justifyContent:'center', gap:8}}>
                  <span style={{width:16, height:16, border:'2px solid rgba(0,0,0,.2)', borderTopColor:'#000', borderRadius:'50%', display:'inline-block', animation:'spin .7s linear infinite'}}/>
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>
        </div>
        <div style={{...g.iosHint, animation:'fadeUp .4s ease both', animationDelay:'.25s'}}>
          iPhone? Tap <strong style={{color:'rgba(255,255,255,.5)'}}>Share → Add to Home Screen</strong> for best experience
        </div>
      </div>
    </div>
  )
}

// ─── Trip request sheet ───────────────────────────────────────
function TripRequest({ trip, countdown, onAccept, onDecline }) {
  const pct = (countdown / 120) * 100
  return (
    <div style={g.overlay}>
      <div style={g.tripCard}>
        <div style={g.countdownBar}>
          <div style={{
            ...g.countdownFill, width: `${pct}%`,
            background: countdown > 40 ? '#F5B800' : countdown > 15 ? '#EF9F27' : '#F09595',
          }} />
        </div>
        <div style={g.tripBanner}>
          <span style={g.tripBannerDot} />
          NEW TRIP — {countdown}S TO RESPOND
        </div>
        <div style={g.tripBody}>
          <div style={g.routeRow}>
            <div style={g.dotGreen} />
            <div>
              <div style={g.routeLabel}>PICKUP</div>
              <div style={g.routeAddr}>{trip.pickup_address}</div>
            </div>
          </div>
          <div style={g.routeVline} />
          <div style={g.routeRow}>
            <div style={g.dotRed} />
            <div>
              <div style={g.routeLabel}>DROP-OFF</div>
              <div style={g.routeAddr}>{trip.dropoff_address}</div>
            </div>
          </div>
          <div style={g.metaRow}>
            {trip.distance_km && (
              <div style={g.metaItem}>
                <div style={g.metaLabel}>DISTANCE</div>
                <div style={g.metaVal}>{trip.distance_km} km</div>
              </div>
            )}
            {trip.fare_usd && (
              <div style={g.metaItem}>
                <div style={g.metaLabel}>FARE</div>
                <div style={{...g.metaVal, color:'#F5B800'}}>${trip.fare_usd}</div>
              </div>
            )}
            <div style={g.metaItem}>
              <div style={g.metaLabel}>CUSTOMER</div>
              <div style={g.metaVal}>{trip.customers?.full_name || '—'}</div>
            </div>
          </div>
        </div>
        <div style={g.tripBtns}>
          <button style={g.btnDecline} onClick={onDecline}>Decline</button>
          <button style={g.btnAccept}  onClick={onAccept}>Accept</button>
        </div>
      </div>
    </div>
  )
}

// ─── Active trip ──────────────────────────────────────────────
function ActiveTrip({ trip, onComplete }) {
  return (
    <div style={g.activeTripCard}>
      <div style={g.activeTripHeader}>
        <div style={g.pulsingDot} />
        <span style={{fontSize:11, fontWeight:800, color:'#F5B800', letterSpacing:.5}}>ACTIVE TRIP</span>
      </div>
      <div style={g.activeTripName}>{trip.customers?.full_name || 'Customer'}</div>
      {trip.customers?.phone && (
        <a href={`tel:${trip.customers.phone}`} style={g.activeTripPhone}>📞 {trip.customers.phone}</a>
      )}
      <div style={{margin:'12px 0'}}>
        <div style={g.routeRow}>
          <div style={g.dotGreen} />
          <div><div style={g.routeLabel}>PICKUP</div><div style={g.routeAddr}>{trip.pickup_address}</div></div>
        </div>
        <div style={g.routeVline} />
        <div style={g.routeRow}>
          <div style={g.dotRed} />
          <div><div style={g.routeLabel}>DROP-OFF</div><div style={g.routeAddr}>{trip.dropoff_address}</div></div>
        </div>
      </div>
      <div style={{display:'flex', gap:10}}>
        <button style={g.btnOutline}
          onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(trip.pickup_address)}`, '_blank')}>
          Open Maps
        </button>
        <button style={g.btnYellow} onClick={onComplete}>Complete Trip</button>
      </div>
    </div>
  )
}

// ─── Trips Tab ────────────────────────────────────────────────
function TripsTab({ driverId }) {
  const [trips, setTrips]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTrips() {
      setLoading(true)
      const { data } = await supabase
        .from('trips')
        .select('id, pickup_address, dropoff_address, status, fare_usd, distance_km, requested_at, completed_at, customers(full_name)')
        .eq('driver_id', driverId)
        .order('requested_at', { ascending: false })
        .limit(30)
      setTrips(data || [])
      setLoading(false)
    }
    fetchTrips()
  }, [driverId])

  const statusColor = s => s === 'completed' ? '#5DCAA5' : s === 'on_trip' || s === 'accepted' ? '#F5B800' : s === 'cancelled' ? '#F09595' : '#888'
  const statusLabel = s => s === 'completed' ? 'Completed' : s === 'on_trip' ? 'On Trip' : s === 'accepted' ? 'Accepted' : s === 'cancelled' ? 'Cancelled' : s

  function fmtDate(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  if (loading) return (
    <div style={{display:'flex', alignItems:'center', justifyContent:'center', padding:'60px 0', flexDirection:'column', gap:12}}>
      <div style={{width:28, height:28, border:'3px solid rgba(245,184,0,.2)', borderTopColor:'#F5B800', borderRadius:'50%', animation:'spin .7s linear infinite'}} />
      <div style={{fontSize:12, color:'rgba(255,255,255,.3)'}}>Loading trips…</div>
    </div>
  )

  if (!trips.length) return (
    <div style={{textAlign:'center', padding:'60px 20px'}}>
      <div style={{fontSize:40, marginBottom:12}}>🚖</div>
      <div style={{fontSize:15, fontWeight:700, color:'rgba(255,255,255,.6)', marginBottom:6}}>No trips yet</div>
      <div style={{fontSize:13, color:'rgba(255,255,255,.25)'}}>Your trip history will appear here once you start accepting rides.</div>
    </div>
  )

  const completed = trips.filter(t => t.status === 'completed')
  const totalEarned = completed.reduce((s, t) => s + Number(t.fare_usd || 0), 0)

  return (
    <div style={{padding:'20px 20px 8px'}}>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:20}}>
        {[
          { val: trips.length, label: 'Total', color: '#fff' },
          { val: completed.length, label: 'Done', color: '#5DCAA5' },
          { val: `$${totalEarned.toFixed(0)}`, label: 'Earned', color: '#F5B800' },
        ].map(s => (
          <div key={s.label} style={{background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:'14px 10px', textAlign:'center'}}>
            <div style={{fontSize:22, fontWeight:800, color:s.color}}>{s.val}</div>
            <div style={{fontSize:10, color:'rgba(255,255,255,.35)', marginTop:3}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{fontSize:11, fontWeight:700, color:'rgba(255,255,255,.3)', letterSpacing:.6, marginBottom:12}}>RECENT TRIPS</div>
      <div style={{display:'flex', flexDirection:'column', gap:10}}>
        {trips.map(trip => (
          <div key={trip.id} style={{background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:'14px 16px'}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
              <div style={{fontSize:12, fontWeight:700, color:'rgba(255,255,255,.5)'}}>{trip.customers?.full_name || 'Unknown'}</div>
              <div style={{display:'flex', alignItems:'center', gap:6}}>
                {trip.fare_usd && <div style={{fontSize:13, fontWeight:800, color:'#F5B800'}}>${trip.fare_usd}</div>}
                <div style={{fontSize:11, fontWeight:700, color:statusColor(trip.status), background:`${statusColor(trip.status)}18`, border:`1px solid ${statusColor(trip.status)}30`, borderRadius:6, padding:'2px 8px'}}>{statusLabel(trip.status)}</div>
              </div>
            </div>
            <div style={{display:'flex', alignItems:'flex-start', gap:10, marginBottom:8}}>
              <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:2, paddingTop:4}}>
                <div style={{width:7, height:7, borderRadius:'50%', background:'#5DCAA5'}} />
                <div style={{width:1, height:14, background:'rgba(255,255,255,.1)'}} />
                <div style={{width:7, height:7, borderRadius:'50%', background:'#F09595'}} />
              </div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:12, color:'rgba(255,255,255,.6)', marginBottom:10, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{trip.pickup_address}</div>
                <div style={{fontSize:12, color:'rgba(255,255,255,.6)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{trip.dropoff_address}</div>
              </div>
            </div>
            <div style={{display:'flex', gap:16, paddingTop:8, borderTop:'1px solid rgba(255,255,255,.06)'}}>
              {trip.distance_km && <div style={{fontSize:11, color:'rgba(255,255,255,.3)'}}>{trip.distance_km} km</div>}
              <div style={{fontSize:11, color:'rgba(255,255,255,.3)', marginLeft:'auto'}}>{fmtDate(trip.completed_at || trip.requested_at)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Account Tab ──────────────────────────────────────────────
function AccountTab({ driver, onLogout }) {
  const [pinForm, setPinForm]   = useState({ current: '', next: '', confirm: '' })
  const [pinMsg, setPinMsg]     = useState(null)
  const [pinLoading, setPinLoading] = useState(false)
  const [stats, setStats]       = useState(null)

  useEffect(() => {
    async function fetchStats() {
      const { data } = await supabase.from('trips').select('status, fare_usd, requested_at').eq('driver_id', driver.id)
      if (!data) return
      const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(today - 7 * 86400000), monthAgo = new Date(today - 30 * 86400000)
      const done = data.filter(t => t.status === 'completed')
      const earn = arr => arr.reduce((s, t) => s + Number(t.fare_usd || 0), 0)
      const total = data.length, declined = data.filter(t => t.status === 'cancelled').length
      setStats({
        todayTrips: done.filter(t => new Date(t.requested_at) >= today).length,
        todayEarned: earn(done.filter(t => new Date(t.requested_at) >= today)),
        weekTrips: done.filter(t => new Date(t.requested_at) >= weekAgo).length,
        weekEarned: earn(done.filter(t => new Date(t.requested_at) >= weekAgo)),
        monthTrips: done.filter(t => new Date(t.requested_at) >= monthAgo).length,
        monthEarned: earn(done.filter(t => new Date(t.requested_at) >= monthAgo)),
        totalTrips: done.length,
        acceptRate: total > 0 ? Math.round(((total - declined) / total) * 100) : 100,
      })
    }
    fetchStats()
  }, [driver.id])

  async function changePin(e) {
    e.preventDefault()
    if (pinForm.next !== pinForm.confirm) { setPinMsg({ type:'err', text:'New PINs do not match.' }); return }
    if (pinForm.next.length < 4) { setPinMsg({ type:'err', text:'PIN must be at least 4 digits.' }); return }
    setPinLoading(true)
    const { data: check } = await supabase.from('drivers').select('id').eq('id', driver.id).eq('pwa_pin', pinForm.current).single()
    if (!check) { setPinMsg({ type:'err', text:'Current PIN is incorrect.' }); setPinLoading(false); return }
    const { error } = await supabase.from('drivers').update({ pwa_pin: pinForm.next }).eq('id', driver.id)
    setPinLoading(false)
    if (error) { setPinMsg({ type:'err', text:'Failed to update. Try again.' }); return }
    setPinMsg({ type:'ok', text:'PIN updated successfully!' })
    setPinForm({ current:'', next:'', confirm:'' }); setTimeout(() => setPinMsg(null), 3000)
  }

  return (
    <div style={{padding:'20px 20px 8px'}}>
      <div style={{background:'linear-gradient(135deg, rgba(245,184,0,.12), rgba(93,202,165,.06))', border:'1px solid rgba(245,184,0,.2)', borderRadius:18, padding:'20px 18px', marginBottom:18, display:'flex', alignItems:'center', gap:16}}>
        <div style={{width:60, height:60, borderRadius:16, background:'linear-gradient(135deg,#F5B800,#e6a800)', color:'#000', fontSize:26, fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 16px rgba(245,184,0,.3)'}}>{driver.full_name?.[0]}</div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:18, fontWeight:800, marginBottom:2}}>{driver.full_name}</div>
          <div style={{fontSize:12, color:'rgba(255,255,255,.45)', marginBottom:8}}>{driver.car_model} · {driver.plate}</div>
          <div style={{display:'flex', gap:6}}>
            <div style={{fontSize:11, fontWeight:700, color:'#5DCAA5', background:'rgba(93,202,165,.12)', border:'1px solid rgba(93,202,165,.2)', borderRadius:6, padding:'3px 8px'}}>⭐ {driver.rating ?? '—'} Rating</div>
            <div style={{fontSize:11, fontWeight:700, color:'#F5B800', background:'rgba(245,184,0,.1)', border:'1px solid rgba(245,184,0,.2)', borderRadius:6, padding:'3px 8px'}}>{driver.total_trips ?? 0} trips</div>
          </div>
        </div>
      </div>
      <div style={{fontSize:11, fontWeight:700, color:'rgba(255,255,255,.3)', letterSpacing:.6, marginBottom:12}}>EARNINGS</div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:20}}>
        {[{l:'Today',k:'today'},{l:'7 days',k:'week'},{l:'30 days',k:'month'}].map(p => (
          <div key={p.l} style={{background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:14, padding:'14px 12px', textAlign:'center'}}>
            <div style={{fontSize:18, fontWeight:800, color:'#F5B800'}}>{stats ? `$${(stats[p.k+'Earned']||0).toFixed(0)}` : '—'}</div>
            <div style={{fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2}}>{p.l}</div>
            <div style={{fontSize:10, color:'rgba(255,255,255,.25)', marginTop:4}}>{stats ? `${stats[p.k+'Trips']||0} trips` : ''}</div>
          </div>
        ))}
      </div>
      <div style={{fontSize:11, fontWeight:700, color:'rgba(255,255,255,.3)', letterSpacing:.6, marginBottom:12}}>CHANGE PIN</div>
      <div style={{background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:16, padding:'18px 16px', marginBottom:20}}>
        <form onSubmit={changePin}>
          {[{k:'current',l:'Current PIN'},{k:'next',l:'New PIN'},{k:'confirm',l:'Confirm PIN'}].map(f => (
            <div key={f.k} style={{marginBottom: f.k !== 'confirm' ? 10 : 0}}>
              <div style={{fontSize:10, fontWeight:700, color:'rgba(255,255,255,.3)', letterSpacing:.5, marginBottom:5}}>{f.l}</div>
              <input style={{...g.fieldInput, paddingLeft:14, background:'rgba(255,255,255,.06)', borderColor:'rgba(255,255,255,.1)'}} className="drv-input" type="password" inputMode="numeric" placeholder={f.l} maxLength={6} value={pinForm[f.k]} onChange={ev => setPinForm(p => ({...p, [f.k]: ev.target.value}))} required />
            </div>
          ))}
          {pinMsg && <div style={{marginTop:12, padding:'10px 14px', borderRadius:10, fontSize:13, fontWeight:600, background: pinMsg.type === 'ok' ? 'rgba(93,202,165,.1)' : 'rgba(240,149,149,.08)', border: `1px solid ${pinMsg.type === 'ok' ? 'rgba(93,202,165,.25)' : 'rgba(240,149,149,.2)'}`, color: pinMsg.type === 'ok' ? '#5DCAA5' : '#F09595'}}>{pinMsg.text}</div>}
          <button style={{...g.btnYellow, marginTop:14, width:'100%'}} type="submit" disabled={pinLoading}>{pinLoading ? 'Updating…' : 'Update PIN'}</button>
        </form>
      </div>
      <button style={{...g.btnDecline, width:'100%', marginBottom:40}} onClick={onLogout}>Logout & Exit</button>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────
export default function DriverApp() {
  const [driver, setDriver]             = useState(() => loadSession())
  const [tab, setTab]                   = useState('home')
  const [online, setOnline]             = useState(false)
  const [gpsActive, setGpsActive]       = useState(false)
  const [coords, setCoords]             = useState(null)
  const [activeTrip, setActiveTrip]     = useState(null)
  const [pendingTrip, setPendingTrip]   = useState(null)
  const [countdown, setCountdown]       = useState(120)
  const [wakeLockMethod, setWakeLockMethod] = useState(null)
  const [todayStats, setTodayStats]     = useState({ trips: 0, earned: 0 })

  const wakeLockRef  = useRef(null)
  const pingTimer    = useRef(null)
  const cdTimer      = useRef(null)

  const handlePosition = useCallback((lat, lng) => {
    setCoords({ lat, lng }); setGpsActive(true)
    if (driver) pushLocation(driver.id, lat, lng)
  }, [driver])

  useGPS({ active: online, onPosition: handlePosition })

  useEffect(() => {
    if (!driver) return
    async function fetchToday() {
      const today = new Date(); today.setHours(0,0,0,0)
      const { data } = await supabase.from('trips').select('fare_usd').eq('driver_id', driver.id).eq('status', 'completed').gte('completed_at', today.toISOString())
      if (data) setTodayStats({ trips: data.length, earned: data.reduce((s,t) => s + Number(t.fare_usd||0), 0) })
    }
    fetchToday()
  }, [driver, activeTrip])

  const goOnline = useCallback(async () => {
    if (!driver) return
    const lock = await acquireWakeLock(); wakeLockRef.current = lock; setWakeLockMethod(lock.method)
    pingTimer.current = setInterval(() => { supabase.from('drivers').update({ last_seen: new Date().toISOString() }).eq('id', driver.id) }, PING_INTERVAL)
    await supabase.from('drivers').update({ online: true, status: 'available', last_seen: new Date().toISOString() }).eq('id', driver.id)
    supabase.channel(`driver-${driver.id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips', filter: `driver_id=eq.${driver.id}` }, payload => {
      const t = payload.new
      if (t.status === 'dispatching') { fetchTripDetails(t.id).then(full => { setPendingTrip(full); startCountdown() }) }
      if (t.status === 'accepted' || t.status === 'on_trip') { fetchTripDetails(t.id).then(full => { setActiveTrip(full); setPendingTrip(null); clearInterval(cdTimer.current) }) }
      if (t.status === 'completed' || t.status === 'cancelled') { setActiveTrip(null) }
    }).subscribe()
    setOnline(true)
  }, [driver])

  const goOffline = useCallback(async () => {
    clearInterval(pingTimer.current); clearInterval(cdTimer.current); wakeLockRef.current?.release(); supabase.removeAllChannels()
    if (driver) await supabase.from('drivers').update({ online: false, status: 'offline' }).eq('id', driver.id)
    setOnline(false); setGpsActive(false); setCoords(null); setActiveTrip(null); setPendingTrip(null)
  }, [driver])

  function startCountdown() {
    setCountdown(120); clearInterval(cdTimer.current)
    cdTimer.current = setInterval(() => {
      setCountdown(p => {
        if (p <= 1) { clearInterval(cdTimer.current); setPendingTrip(null); return 0 }
        return p - 1
      })
    }, 1000)
  }

  async function acceptTrip() {
    clearInterval(cdTimer.current)
    await supabase.from('trips').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', pendingTrip.id)
    await supabase.from('drivers').update({ status: 'on_trip' }).eq('id', driver.id); setActiveTrip(pendingTrip); setPendingTrip(null)
  }

  async function declineTrip() {
    clearInterval(cdTimer.current)
    await supabase.from('trips').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', pendingTrip.id)
    setPendingTrip(null)
  }

  async function completeTrip() {
    await supabase.from('trips').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', activeTrip.id)
    await supabase.from('drivers').update({ status: 'available' }).eq('id', driver.id); setActiveTrip(null)
  }

  if (!driver) return <DriverLogin onLogin={setDriver} />

  const TAB_H = 'calc(68px + env(safe-area-inset-bottom, 0px))'

  return (
    <div style={g.screen}>
      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; font-family: 'Inter', sans-serif; }
        body { background: #0D0D14; margin: 0; }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
      
      <div style={{flex:1, overflowY:'auto', paddingBottom: TAB_H}}>
        {tab === 'home' && (
          <div key="home" style={{animation:'slideUp .4s ease-out', padding:'28px 20px'}}>
             <div style={g.header}>
              <div style={g.headerLogo}>A</div>
              <div><div style={g.headerBrand}>ALLWAY <span style={{color:'#F5B800'}}>TAXI</span></div><div style={g.headerSub}>Control Center</div></div>
            </div>
            <div style={g.toggleWrap}>
              <button style={{...g.toggleBtn, background: online ? 'radial-gradient(circle at 40% 35%, #7EDFC0, #3DAE8A)' : 'radial-gradient(circle at 40% 35%, #3A3A4A, #25252F)',
                boxShadow: online ? '0 0 0 14px rgba(93,202,165,.12), 0 0 0 32px rgba(93,202,165,.06), 0 8px 32px rgba(0,0,0,.5)' : '0 0 0 14px rgba(255,255,255,.04), 0 8px 32px rgba(0,0,0,.4)',
                opacity: activeTrip ? .5 : 1}} onClick={online ? goOffline : goOnline} disabled={!!activeTrip}>
                <div style={g.toggleLabel}>{online ? 'ON' : 'OFF'}</div><div style={g.toggleSub}>{online ? 'ONLINE' : 'OFFLINE'}</div>
              </button>
              <div style={g.toggleHint}>{activeTrip ? 'Complete your trip first' : online ? 'Tap to go offline' : 'Tap to go online'}</div>
            </div>
            {online && (
              <div style={{...g.gpsPill, background: gpsActive ? 'rgba(245,184,0,.1)' : 'rgba(255,255,255,.05)', borderColor: gpsActive ? 'rgba(245,184,0,.25)' : 'rgba(255,255,255,.08)'}}>
                <div style={{...g.gpsDot, background: gpsActive ? '#F5B800' : '#555', animation: gpsActive ? 'pulse 2s infinite' : 'none'}} />
                <span style={{fontSize:13, fontWeight:600, color: gpsActive ? '#F5B800' : '#666'}}>{gpsActive ? 'GPS live — tracking' : 'Acquiring GPS…'}</span>
              </div>
            )}
            <div style={g.statsRow}>
              <div style={g.statCard}><div style={g.statVal}>{todayStats.trips}</div><div style={g.statLabel}>Trips today</div></div>
              <div style={g.statCard}><div style={{...g.statVal, color:'#F5B800'}}>${todayStats.earned}</div><div style={g.statLabel}>Earned</div></div>
              <div style={g.statCard}><div style={g.statVal}>{driver.rating}</div><div style={g.statLabel}>Rating</div></div>
            </div>
            <div style={g.driverCard}>
              <div style={g.driverAvatar}>{driver.full_name?.[0]}</div>
              <div style={{flex:1}}>
                <div style={g.driverName}>{driver.full_name}</div>
                <div style={g.driverSub}>{driver.car_model} · {driver.plate}</div>
              </div>
              <div style={{width:8,height:8,borderRadius:'50%',background:online?'#5DCAA5':'#444'}}/>
            </div>
            {activeTrip && <ActiveTrip trip={activeTrip} onComplete={completeTrip} />}
          </div>
        )}
        {tab === 'trips' && <TripsTab driverId={driver.id} />}
        {tab === 'account' && <AccountTab driver={driver} onLogout={() => { goOffline(); clearSession(); setDriver(null) }} />}
      </div>

      {/* Tab bar */}
      <div style={{position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, background:'rgba(13,13,20,0.95)', backdropFilter:'blur(12px)', borderTop:'1px solid rgba(255,255,255,0.08)', display:'flex', paddingBottom:'env(safe-area-inset-bottom, 0px)', zIndex:1000}}>
        {[
          { id:'home', l:'Home', icon:<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></> },
          { id:'trips', l:'Trips', icon:<><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></> },
          { id:'account', l:'Account', icon:<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></> }
        ].map(t => (
          <div key={t.id} onClick={() => setTab(t.id)} style={{flex:1, padding:'14px 0 10px', display:'flex', flexDirection:'column', alignItems:'center', gap:4, cursor:'pointer', color:tab===t.id?'#F5B800':'rgba(255,255,255,0.35)'}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
            <span style={{fontSize:10, fontWeight:700}}>{t.l}</span>
          </div>
        ))}
      </div>

      {pendingTrip && <TripRequest trip={pendingTrip} countdown={countdown} onAccept={acceptTrip} onDecline={declineTrip} />}
    </div>
  )
}

async function pushLocation(id, lat, lng) {
  const point = `POINT(${lng} ${lat})`
  await supabase.from('drivers').update({ location: point, last_seen: new Date().toISOString() }).eq('id', id)
}

async function fetchTripDetails(id) {
  const { data } = await supabase.from('trips').select('*, customers(full_name, phone)').eq('id', id).single()
  return data
}

const g = {
  screen: { minHeight:'100dvh', background:'#0D0D14', color:'#fff', display:'flex', flexDirection:'column', maxWidth:430, margin:'0 auto' },
  header: { display:'flex', alignItems:'center', gap:12, marginBottom:28 },
  headerLogo: { width:36, height:36, background:'#F5B800', color:'#000', fontSize:18, fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:10 },
  headerBrand: { fontSize:15, fontWeight:900, letterSpacing:.5 },
  headerSub: { fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:1 },
  toggleWrap: { display:'flex', flexDirection:'column', alignItems:'center', gap:14, marginBottom:32 },
  toggleBtn: { width:170, height:170, borderRadius:'50%', border:'none', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' },
  toggleLabel: { fontSize:42, fontWeight:900, color:'#fff' },
  toggleSub: { fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.7)', letterSpacing:2 },
  toggleHint: { fontSize:13, color:'rgba(255,255,255,0.3)' },
  gpsPill: { display:'flex', alignItems:'center', gap:9, padding:'12px 18px', borderRadius:50, border:'1px solid', marginBottom:28, alignSelf:'center' },
  gpsDot: { width:8, height:8, borderRadius:'50%' },
  statsRow: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:20 },
  statCard: { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'16px 8px', textAlign:'center' },
  statVal: { fontSize:22, fontWeight:900 },
  statLabel: { fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:4 },
  driverCard: { display:'flex', alignItems:'center', gap:14, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:18, padding:'16px 18px' },
  driverAvatar: { width:44, height:44, background:'#F5B800', color:'#000', fontSize:22, fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:12 },
  driverName: { fontSize:15, fontWeight:800 },
  driverSub: { fontSize:12, color:'rgba(255,255,255,0.4)', marginTop:2 },
  loginBg: { position:'absolute', inset:0, zIndex:-1, background:'#0F0F17', overflow:'hidden' },
  bgCircle1: { position:'absolute', top:'-10%', left:'-20%', width:'80%', height:'50%', background:'radial-gradient(circle, rgba(245,184,0,0.07), transparent 70%)' },
  bgCircle2: { position:'absolute', bottom:'-5%', right:'-10%', width:'70%', height:'40%', background:'radial-gradient(circle, rgba(93,202,165,0.05), transparent 70%)' },
  loginWrap: { flex:1, display:'flex', flexDirection:'column', alignItems:'center', padding:'60px 24px' },
  loginLogoWrap: { width:68, height:68, background:'#F5B800', borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', boxShadow:'0 8px 32px rgba(245,184,0,0.2)' },
  loginLogo: { fontSize:32, fontWeight:900, color:'#000' },
  loginBrand: { fontSize:24, fontWeight:900, letterSpacing:1, textAlign:'center' },
  loginSub: { fontSize:14, color:'rgba(255,255,255,0.3)', textAlign:'center', marginTop:4 },
  loginCard: { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:24, padding:'28px', width:'100%', marginTop:40 },
  fieldWrap: { position:'relative' },
  fieldIcon: { position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', display:'flex' },
  fieldInput: { width:'100%', padding:'14px 14px 14px 44px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, color:'#fff', fontSize:16, outline:'none' },
  errorBox: { marginTop:16, padding:'12px 14px', background:'rgba(240,149,149,0.1)', border:'1px solid rgba(240,149,149,0.2)', borderRadius:12, fontSize:13, color:'#F09595', display:'flex', alignItems:'center', gap:10 },
  btnYellow: { padding:'16px', background:'#F5B800', color:'#000', border:'none', borderRadius:14, fontSize:16, fontWeight:800 },
  btnDecline: { padding:'16px', background:'rgba(240,149,149,0.1)', border:'1px solid rgba(240,149,149,0.2)', borderRadius:14, color:'#F09595', fontSize:15, fontWeight:700 },
  btnOutline: { flex:1, padding:'16px', background:'transparent', border:'1px solid rgba(255,255,255,0.15)', borderRadius:14, color:'rgba(255,255,255,0.5)', fontSize:14, fontWeight:700 },
  activeTripCard: { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:18, padding:'20px', marginTop:20 },
  activeTripHeader: { display:'flex', alignItems:'center', gap:8, marginBottom:10 },
  activeTripName: { fontSize:18, fontWeight:800 },
  activeTripPhone: { fontSize:14, color:'#F5B800', textDecoration:'none', marginTop:4, display:'block' },
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(4px)', display:'flex', alignItems:'flex-end', zIndex:2000 },
  tripCard: { width:'100%', maxWidth:430, margin:'0 auto', background:'#1A1A24', borderRadius:'24px 24px 0 0', overflow:'hidden', animation:'slideUp 0.3s ease-out' },
  countdownBar: { height:5, background:'rgba(255,255,255,0.1)' },
  countdownFill: { height:'100%', transition:'width 1s linear' },
  tripBanner: { display:'flex', alignItems:'center', gap:8, padding:'14px 20px', background:'rgba(245,184,0,0.1)', fontSize:12, fontWeight:800, color:'#F5B800' },
  tripBannerDot: { width:8, height:8, borderRadius:'50%', background:'#F5B800', boxShadow:'0 0 10px #F5B800', animation:'pulse 1s infinite' },
  tripBody: { padding:'20px' },
  tripBtns: { display:'flex', gap:12, padding:'0 20px 24px' },
  routeRow: { display:'flex', gap:14 },
  routeVline: { width:2, height:18, background:'rgba(255,255,255,0.07)', marginLeft:4, margin:'2px 0' },
  dotGreen: { width:10, height:10, borderRadius:'50%', background:'#5DCAA5', marginTop:4 },
  dotRed: { width:10, height:10, borderRadius:'50%', background:'#F09595', marginTop:4 },
  routeLabel: { fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:.8, marginBottom:2 },
  routeAddr: { fontSize:14, fontWeight:700 },
  metaRow: { display:'flex', marginTop:20, paddingTop:20, borderTop:'1px solid rgba(255,255,255,0.07)' },
  metaItem: { flex:1, textAlign:'center' },
  metaLabel: { fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)' },
  metaVal: { fontSize:16, fontWeight:800, marginTop:2 },
}
