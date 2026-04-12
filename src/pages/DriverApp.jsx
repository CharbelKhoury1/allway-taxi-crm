import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { acquireWakeLock } from '../lib/wakeLock'

const PING_INTERVAL  = 25_000   // heartbeat to Supabase (ms)
const STALE_LIMIT    = 45_000   // restart GPS if no update for this long (ms)

// ─── iOS-safe GPS hook ────────────────────────────────────────
// Handles: initial watch, visibility-change restart, stale-position restart.
// maximumAge:0 forces a fresh fix every time (critical on iOS).
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
        // PERMISSION_DENIED(1) — no point retrying
        if (err.code !== 1) setTimeout(startWatch, 3000)
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    )
  }, [onPosition])

  useEffect(() => {
    if (!active) return

    startWatch()

    // iOS drops geolocation when user switches apps or locks screen.
    // On return to foreground, restart the watch immediately.
    function onVisibility() {
      if (document.visibilityState === 'visible') startWatch()
    }
    document.addEventListener('visibilitychange', onVisibility)

    // Safety net: if the last position is >45 s old while we're supposedly
    // watching, something silently died — restart the watch.
    staleTimer.current = setInterval(() => {
      if (lastUpdateAt.current && Date.now() - lastUpdateAt.current > STALE_LIMIT) {
        console.info('[GPS] Stale — restarting watchPosition')
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

function saveSession(driver) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(driver))
}
function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null }
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

// ─── Login ────────────────────────────────────────────────────
function DriverLogin({ onLogin }) {
  const [phone, setPhone]     = useState('')
  const [pin, setPin]         = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [pinFocused, setPinFocused] = useState(false)

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
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(16px) }
          to   { opacity:1; transform:translateY(0) }
        }
        .drv-input:focus { border-color: #F5B800 !important; box-shadow: 0 0 0 3px rgba(245,184,0,.15) !important; }
      `}</style>

      {/* Background decoration */}
      <div style={g.loginBg}>
        <div style={g.bgCircle1} />
        <div style={g.bgCircle2} />
      </div>

      <div style={g.loginWrap}>
        {/* Logo */}
        <div style={{animation:'fadeUp .4s ease both', animationDelay:'.05s'}}>
          <div style={g.loginLogoWrap}>
            <div style={g.loginLogo}>A</div>
          </div>
          <div style={g.loginBrand}>ALLWAY <span style={{color:'#F5B800'}}>TAXI</span></div>
          <div style={g.loginSub}>Driver Portal</div>
        </div>

        {/* Card */}
        <div style={{...g.loginCard, animation:'fadeUp .4s ease both', animationDelay:'.15s'}}>
          <form onSubmit={handleLogin}>
            {/* Phone */}
            <div style={g.fieldWrap}>
              <div style={g.fieldIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.0 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/>
                </svg>
              </div>
              <input
                className="drv-input"
                style={g.fieldInput}
                type="tel"
                inputMode="numeric"
                placeholder="70111222"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
              />
            </div>

            {/* PIN */}
            <div style={{...g.fieldWrap, marginTop:12}}>
              <div style={g.fieldIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </div>
              <input
                className="drv-input"
                style={g.fieldInput}
                type="password"
                inputMode="numeric"
                placeholder="PIN"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value)}
                required
              />
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

        {/* iOS hint */}
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
            ...g.countdownFill,
            width: `${pct}%`,
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
        <span style={{fontSize:11, fontWeight:800, color:'#F5B800', letterSpacing:.5}}>
          ACTIVE TRIP
        </span>
      </div>
      <div style={g.activeTripName}>{trip.customers?.full_name || 'Customer'}</div>
      {trip.customers?.phone && (
        <a href={`tel:${trip.customers.phone}`} style={g.activeTripPhone}>
          📞 {trip.customers.phone}
        </a>
      )}
      <div style={{margin:'12px 0'}}>
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

// ─── Main ─────────────────────────────────────────────────────
export default function DriverApp() {
  // Restore session from localStorage on page load/refresh
  const [driver, setDriver]             = useState(() => loadSession())
  const [online, setOnline]             = useState(false)
  const [gpsActive, setGpsActive]       = useState(false)
  const [coords, setCoords]             = useState(null)
  const [activeTrip, setActiveTrip]     = useState(null)
  const [pendingTrip, setPendingTrip]   = useState(null)
  const [countdown, setCountdown]       = useState(120)
  const [wakeLockMethod, setWakeLockMethod] = useState(null)
  const [todayTrips, setTodayTrips]     = useState(0)
  const [todayEarned, setTodayEarned]   = useState(0)

  const wakeLockRef  = useRef(null)
  const pingTimer    = useRef(null)
  const cdTimer      = useRef(null)

  // ── GPS hook (iOS-safe) ──────────────────────────────────
  const handlePosition = useCallback((lat, lng) => {
    setCoords({ lat, lng })
    setGpsActive(true)
    if (driver) pushLocation(driver.id, lat, lng)
  }, [driver])

  useGPS({ active: online, onPosition: handlePosition })

  // ── Go Online ────────────────────────────────────────────
  const goOnline = useCallback(async () => {
    if (!driver) return

    // Wake lock — must be called inside a user-gesture (this tap IS a gesture)
    const lock = await acquireWakeLock()
    wakeLockRef.current = lock
    setWakeLockMethod(lock.method)

    // Heartbeat ping so auto-offline function knows we're alive
    pingTimer.current = setInterval(() => {
      supabase.from('drivers')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', driver.id)
    }, PING_INTERVAL)

    await supabase.from('drivers').update({
      online: true, status: 'available',
      last_seen: new Date().toISOString(),
    }).eq('id', driver.id)

    // Subscribe to trips assigned to this driver
    supabase
      .channel(`driver-${driver.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'trips',
        filter: `driver_id=eq.${driver.id}`,
      }, payload => {
        const t = payload.new
        if (t.status === 'dispatching') {
          fetchTripDetails(t.id).then(full => { setPendingTrip(full); startCountdown() })
        }
        if (t.status === 'accepted' || t.status === 'on_trip') {
          fetchTripDetails(t.id).then(full => {
            setActiveTrip(full); setPendingTrip(null); clearInterval(cdTimer.current)
          })
        }
        if (t.status === 'completed' || t.status === 'cancelled') {
          setActiveTrip(null)
          if (t.status === 'completed') {
            setTodayTrips(n => n + 1)
            if (t.fare_usd) setTodayEarned(n => n + Number(t.fare_usd))
          }
        }
      })
      .subscribe()

    setOnline(true)
  }, [driver])

  // ── Go Offline ───────────────────────────────────────────
  const goOffline = useCallback(async () => {
    clearInterval(pingTimer.current)
    clearInterval(cdTimer.current)
    wakeLockRef.current?.release()
    supabase.removeAllChannels()
    if (driver) {
      await supabase.from('drivers')
        .update({ online: false, status: 'offline' })
        .eq('id', driver.id)
    }
    setOnline(false)
    setGpsActive(false)
    setCoords(null)
    setActiveTrip(null)
    setPendingTrip(null)
  }, [driver])

  function startCountdown() {
    setCountdown(120)
    clearInterval(cdTimer.current)
    cdTimer.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(cdTimer.current)
          setPendingTrip(t => {
            if (t) supabase.from('trip_dispatch_log')
              .insert({ trip_id: t.id, driver_id: driver.id, action: 'timeout' })
            return null
          })
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function acceptTrip() {
    clearInterval(cdTimer.current)
    await supabase.from('trips')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', pendingTrip.id)
    await supabase.from('drivers').update({ status: 'on_trip' }).eq('id', driver.id)
    setActiveTrip(pendingTrip)
    setPendingTrip(null)
  }

  async function declineTrip() {
    clearInterval(cdTimer.current)
    await supabase.from('trip_dispatch_log')
      .insert({ trip_id: pendingTrip.id, driver_id: driver.id, action: 'declined' })
    setPendingTrip(null)
  }

  async function completeTrip() {
    await supabase.from('trips')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', activeTrip.id)
    await supabase.from('drivers').update({ status: 'available' }).eq('id', driver.id)
    setTodayTrips(n => n + 1)
    if (activeTrip.fare_usd) setTodayEarned(n => n + Number(activeTrip.fare_usd))
    setActiveTrip(null)
  }

  // Cleanup on unmount
  useEffect(() => () => { if (online) goOffline() }, [])

  if (!driver) return <DriverLogin onLogin={setDriver} />

  return (
    <>
      {/* Global mobile resets — injected once */}
      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        body { overscroll-behavior: none; touch-action: pan-y; }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }
        @keyframes slideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }
      `}</style>

      <div style={g.screen}>
        {/* iOS warning banner */}
        {online && wakeLockMethod === 'none' && (
          <div style={g.warnBar}>Keep screen on while driving to stay online</div>
        )}

        {/* Header */}
        <div style={g.header}>
          <div style={g.headerLogo}>A</div>
          <div>
            <div style={g.headerBrand}>ALLWAY <span style={{color:'#F5B800'}}>TAXI</span></div>
            <div style={g.headerSub}>Driver app</div>
          </div>
          <button style={g.logoutBtn} onClick={() => { goOffline(); clearSession(); setDriver(null) }}>Exit</button>
        </div>

        {/* Body */}
        <div style={g.body}>

          {/* Big toggle */}
          <div style={g.toggleWrap}>
            <button
              style={{
                ...g.toggleBtn,
                background: online
                  ? 'radial-gradient(circle at 40% 35%, #7EDFC0, #3DAE8A)'
                  : 'radial-gradient(circle at 40% 35%, #3A3A4A, #25252F)',
                boxShadow: online
                  ? '0 0 0 14px rgba(93,202,165,.12), 0 0 0 32px rgba(93,202,165,.06), 0 8px 32px rgba(0,0,0,.5)'
                  : '0 0 0 14px rgba(255,255,255,.04), 0 8px 32px rgba(0,0,0,.4)',
                opacity: activeTrip ? .5 : 1,
              }}
              onClick={online ? goOffline : goOnline}
              disabled={!!activeTrip}
            >
              <div style={g.toggleLabel}>{online ? 'ON' : 'OFF'}</div>
              <div style={g.toggleSub}>{online ? 'ONLINE' : 'OFFLINE'}</div>
            </button>
            <div style={g.toggleHint}>
              {activeTrip
                ? 'Complete your trip first'
                : online ? 'Tap to go offline' : 'Tap to go online'}
            </div>
          </div>

          {/* GPS pill */}
          {online && (
            <div style={{
              ...g.gpsPill,
              background: gpsActive ? 'rgba(245,184,0,.1)' : 'rgba(255,255,255,.05)',
              borderColor: gpsActive ? 'rgba(245,184,0,.25)' : 'rgba(255,255,255,.08)',
            }}>
              <div style={{
                ...g.gpsDot,
                background: gpsActive ? '#F5B800' : '#555',
                animation: gpsActive ? 'pulse 2s infinite' : 'none',
              }} />
              <span style={{fontSize:13, fontWeight:600, color: gpsActive ? '#F5B800' : '#666'}}>
                {gpsActive ? 'GPS active — sending location' : 'Acquiring GPS signal…'}
              </span>
            </div>
          )}

          {/* Stats */}
          <div style={g.statsRow}>
            <div style={g.statCard}>
              <div style={g.statVal}>{todayTrips}</div>
              <div style={g.statLabel}>Trips{'\n'}today</div>
            </div>
            <div style={g.statCard}>
              <div style={{...g.statVal, color:'#F5B800'}}>${todayEarned.toFixed(0)}</div>
              <div style={g.statLabel}>Earned</div>
            </div>
            <div style={g.statCard}>
              <div style={g.statVal}>{driver.rating ?? '—'}</div>
              <div style={g.statLabel}>⭐ Rating</div>
            </div>
          </div>

          {/* Driver card */}
          <div style={g.driverCard}>
            <div style={g.driverAvatar}>{driver.full_name?.[0] ?? 'D'}</div>
            <div>
              <div style={g.driverName}>{driver.full_name}</div>
              <div style={g.driverSub}>{driver.car_model} · {driver.plate}</div>
            </div>
            <div style={{
              marginLeft:'auto', width:10, height:10, borderRadius:'50%',
              background: online ? '#5DCAA5' : '#444',
              boxShadow: online ? '0 0 0 3px rgba(93,202,165,.2)' : 'none',
            }} />
          </div>

          {/* Active trip */}
          {activeTrip && <ActiveTrip trip={activeTrip} onComplete={completeTrip} />}
        </div>

        {/* Trip request sheet */}
        {pendingTrip && (
          <TripRequest
            trip={pendingTrip}
            countdown={countdown}
            onAccept={acceptTrip}
            onDecline={declineTrip}
          />
        )}
      </div>
    </>
  )
}

// ─── Supabase helpers ─────────────────────────────────────────
async function pushLocation(driverId, lat, lng) {
  const point = `POINT(${lng} ${lat})`
  await Promise.all([
    supabase.from('drivers').update({
      location: point,
      last_seen: new Date().toISOString(),
    }).eq('id', driverId),
    supabase.from('driver_location_history').insert({
      driver_id: driverId,
      location: point,
    }),
  ])
}

async function fetchTripDetails(tripId) {
  const { data } = await supabase
    .from('trips')
    .select('*, customers(full_name, phone)')
    .eq('id', tripId)
    .single()
  return data
}

// ─── Styles ───────────────────────────────────────────────────
// All sizes use px or env() for safe areas.
// Inputs are 16px to prevent iOS zoom-on-focus.
// Buttons are min 48px tall (Apple/Google touch target guidelines).
const g = {
  screen: {
    minHeight: '100dvh',                           // dvh = respects iOS keyboard
    paddingTop: 'env(safe-area-inset-top, 0px)',   // iPhone notch
    paddingBottom: 'env(safe-area-inset-bottom, 16px)', // home indicator
    background: '#0D0D14',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: 430,
    margin: '0 auto',
    WebkitFontSmoothing: 'antialiased',
  },
  // ── Login ──
  loginBg: {
    position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none',
  },
  bgCircle1: {
    position: 'absolute', width: 420, height: 420, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(245,184,0,.12) 0%, transparent 70%)',
    top: -120, right: -100,
  },
  bgCircle2: {
    position: 'absolute', width: 360, height: 360, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(93,202,165,.08) 0%, transparent 70%)',
    bottom: -80, left: -80,
  },
  loginWrap: {
    flex: 1, position: 'relative', zIndex: 1,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '40px 24px 40px',
    gap: 24,
  },
  loginLogoWrap: {
    display: 'flex', justifyContent: 'center', marginBottom: 14,
  },
  loginLogo: {
    width: 68, height: 68, borderRadius: 20,
    background: 'linear-gradient(135deg, #F5B800, #e6a800)',
    color: '#000', fontSize: 34, fontWeight: 900,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 8px 32px rgba(245,184,0,.35)',
  },
  loginBrand: {
    fontSize: 24, fontWeight: 900, letterSpacing: 1.5,
    textAlign: 'center', marginBottom: 4,
  },
  loginSub: {
    fontSize: 13, color: 'rgba(255,255,255,.3)',
    textAlign: 'center', letterSpacing: .3,
  },
  loginCard: {
    width: '100%', maxWidth: 360,
    background: 'rgba(255,255,255,.05)',
    border: '1px solid rgba(255,255,255,.09)',
    borderRadius: 20,
    padding: '28px 24px',
    backdropFilter: 'blur(12px)',
  },
  fieldWrap: {
    position: 'relative', display: 'flex', alignItems: 'center',
  },
  fieldIcon: {
    position: 'absolute', left: 14, zIndex: 1, pointerEvents: 'none',
    display: 'flex', alignItems: 'center',
  },
  fieldInput: {
    width: '100%', padding: '14px 14px 14px 44px',
    background: 'rgba(255,255,255,.07)',
    border: '1.5px solid rgba(255,255,255,.1)',
    borderRadius: 12, color: '#fff',
    fontSize: 16,
    fontFamily: 'inherit',
    outline: 'none',
    WebkitAppearance: 'none',
    transition: 'border-color .2s, box-shadow .2s',
  },
  iosHint: {
    fontSize: 11, color: 'rgba(255,255,255,.2)',
    textAlign: 'center', lineHeight: 1.6, maxWidth: 280,
  },
  // kept for other uses
  label: {
    fontSize: 11, fontWeight: 700,
    color: 'rgba(255,255,255,.4)',
    textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6,
  },
  input: {
    width: '100%', padding: '13px 14px',
    background: 'rgba(255,255,255,.07)',
    border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 12, color: '#fff',
    fontSize: 16,
    fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
    WebkitAppearance: 'none',
  },
  errorBox: {
    marginTop: 12, padding: '11px 14px',
    background: 'rgba(240,149,149,.08)',
    border: '1px solid rgba(240,149,149,.2)',
    borderRadius: 10, fontSize: 13, color: '#F09595',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  // ── Header ──
  header: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '16px 20px 14px',
    borderBottom: '1px solid rgba(255,255,255,.06)',
  },
  headerLogo: {
    width: 34, height: 34, borderRadius: 9,
    background: '#F5B800', color: '#000',
    fontSize: 16, fontWeight: 900,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  headerBrand: { fontSize: 13, fontWeight: 900, letterSpacing: .5 },
  headerSub:   { fontSize: 10, color: 'rgba(255,255,255,.3)' },
  logoutBtn: {
    marginLeft: 'auto', padding: '8px 16px',
    background: 'rgba(255,255,255,.05)',
    border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 8, color: 'rgba(255,255,255,.4)',
    fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
    minHeight: 36,
    touchAction: 'manipulation',
  },
  // ── Body ──
  body: {
    flex: 1, padding: '28px 20px',
    display: 'flex', flexDirection: 'column', gap: 18,
  },
  // ── Toggle ──
  toggleWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 },
  toggleBtn: {
    width: 164, height: 164, borderRadius: '50%',
    border: 'none', cursor: 'pointer',
    transition: 'all .35s ease',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 4, touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
  },
  toggleLabel: { fontSize: 38, fontWeight: 900, color: '#fff', lineHeight: 1 },
  toggleSub:   { fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.7)', letterSpacing: 2 },
  toggleHint:  { fontSize: 12, color: 'rgba(255,255,255,.3)', textAlign: 'center' },
  // ── GPS pill ──
  gpsPill: {
    display: 'flex', alignItems: 'center', gap: 9,
    padding: '11px 16px', borderRadius: 12,
    border: '1px solid',
  },
  gpsDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  // ── Stats ──
  statsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 },
  statCard: {
    background: 'rgba(255,255,255,.05)',
    border: '1px solid rgba(255,255,255,.08)',
    borderRadius: 14, padding: '16px 10px', textAlign: 'center',
  },
  statVal:   { fontSize: 24, fontWeight: 800 },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,.35)', marginTop: 4, whiteSpace: 'pre-line', lineHeight: 1.4 },
  // ── Driver card ──
  driverCard: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'rgba(255,255,255,.04)',
    border: '1px solid rgba(255,255,255,.07)',
    borderRadius: 14, padding: '14px 16px',
  },
  driverAvatar: {
    width: 42, height: 42, borderRadius: 11,
    background: '#F5B800', color: '#000',
    fontSize: 20, fontWeight: 900, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  driverName: { fontSize: 14, fontWeight: 700 },
  driverSub:  { fontSize: 11, color: 'rgba(255,255,255,.35)', marginTop: 2 },
  // ── Warn bar ──
  warnBar: {
    background: 'rgba(239,159,39,.15)', color: '#EF9F27',
    borderBottom: '1px solid rgba(239,159,39,.2)',
    fontSize: 12, fontWeight: 600, textAlign: 'center', padding: '10px 16px',
  },
  // ── Active trip ──
  activeTripCard: {
    background: 'rgba(255,255,255,.05)',
    border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 14, padding: '16px',
  },
  activeTripHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  pulsingDot: {
    width: 8, height: 8, borderRadius: '50%', background: '#5DCAA5',
    boxShadow: '0 0 0 3px rgba(93,202,165,.25)',
    animation: 'pulse 2s infinite',
  },
  activeTripName:  { fontSize: 17, fontWeight: 800 },
  activeTripPhone: { fontSize: 13, color: '#F5B800', textDecoration: 'none', display: 'block', marginBottom: 4 },
  // ── Route rows ──
  routeRow:   { display: 'flex', alignItems: 'flex-start', gap: 12 },
  routeVline: { width: 1, height: 14, background: 'rgba(255,255,255,.1)', marginLeft: 4, marginBottom: 2 },
  dotGreen:   { width: 10, height: 10, borderRadius: '50%', background: '#5DCAA5', marginTop: 3, flexShrink: 0 },
  dotRed:     { width: 10, height: 10, borderRadius: '50%', background: '#F09595', marginTop: 3, flexShrink: 0 },
  routeLabel: { fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: .6, marginBottom: 2 },
  routeAddr:  { fontSize: 13, fontWeight: 600 },
  // ── Meta row ──
  metaRow:  { display: 'flex', marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.07)' },
  metaItem: { flex: 1, textAlign: 'center' },
  metaLabel: { fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: .6, marginBottom: 3 },
  metaVal:   { fontSize: 14, fontWeight: 800 },
  // ── Trip request overlay ──
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,.8)',
    display: 'flex', alignItems: 'flex-end',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',  // home indicator
    zIndex: 100,
  },
  tripCard: {
    width: '100%', maxWidth: 430, margin: '0 auto',
    background: '#1A1A24',
    border: '1px solid rgba(255,255,255,.1)',
    borderRadius: '20px 20px 0 0',
    overflow: 'hidden',
    animation: 'slideUp .25s ease',
  },
  countdownBar:  { height: 4, background: 'rgba(255,255,255,.08)' },
  countdownFill: { height: '100%', transition: 'width 1s linear, background .5s' },
  tripBanner: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '13px 18px',
    background: 'rgba(245,184,0,.1)',
    fontSize: 11, fontWeight: 800, color: '#F5B800', letterSpacing: .8,
    borderBottom: '1px solid rgba(245,184,0,.15)',
  },
  tripBannerDot: {
    width: 7, height: 7, borderRadius: '50%',
    background: '#F5B800', boxShadow: '0 0 6px #F5B800', flexShrink: 0,
    animation: 'pulse 1s infinite',
  },
  tripBody: { padding: '16px 18px' },
  tripBtns: {
    display: 'flex', gap: 10, padding: '4px 18px 20px',
  },
  // ── Buttons (min 48px height for touch targets) ──
  btnYellow: {
    flex: 1, padding: '14px',
    background: '#F5B800', color: '#000',
    border: 'none', borderRadius: 12,
    fontSize: 15, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    minHeight: 48, touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
  },
  btnOutline: {
    flex: 1, padding: '14px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,.15)',
    borderRadius: 12, color: 'rgba(255,255,255,.5)',
    fontSize: 14, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    minHeight: 48, touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
  },
  btnDecline: {
    flex: 1, padding: '14px',
    background: 'rgba(240,149,149,.1)',
    border: '1px solid rgba(240,149,149,.2)',
    borderRadius: 12, color: '#F09595',
    fontSize: 15, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    minHeight: 48, touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
  },
  btnAccept: {
    flex: 2, padding: '14px',
    background: '#F5B800', color: '#000',
    border: 'none', borderRadius: 12,
    fontSize: 15, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    minHeight: 48, touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
  },
}
