import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { acquireWakeLock } from '../lib/wakeLock'

// How often to push GPS position to Supabase (ms)
const PING_INTERVAL = 30_000

// ─── Login screen ────────────────────────────────────────────
function DriverLogin({ onLogin }) {
  const [phone, setPhone] = useState('')
  const [pin, setPin]     = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: err } = await supabase
      .from('drivers')
      .select('id, full_name, plate, car_model, status, online')
      .eq('phone', phone.trim())
      .eq('pwa_pin', pin.trim())
      .single()

    setLoading(false)

    if (err || !data) {
      setError('Phone number or PIN is incorrect.')
      return
    }

    onLogin(data)
  }

  return (
    <div style={styles.screen}>
      <div style={styles.loginBox}>
        <div style={styles.logoMark}>A</div>
        <div style={styles.logoName}>ALLWAY <span style={{color:'var(--yellow)'}}>TAXI</span></div>
        <div style={styles.logoSub}>Driver App</div>

        <form onSubmit={handleLogin} style={{width:'100%'}}>
          <div style={styles.fieldLabel}>Phone number</div>
          <input
            style={styles.input}
            type="tel"
            placeholder="+961 70 000 000"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
          />
          <div style={styles.fieldLabel}>PIN</div>
          <input
            style={styles.input}
            type="password"
            inputMode="numeric"
            placeholder="4-digit PIN"
            maxLength={6}
            value={pin}
            onChange={e => setPin(e.target.value)}
            required
          />
          {error && <div style={styles.errorMsg}>{error}</div>}
          <button style={styles.btnPrimary} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Active trip card ────────────────────────────────────────
function TripCard({ trip, onComplete }) {
  function openMaps() {
    const q = encodeURIComponent(trip.pickup_address)
    window.open(`https://maps.google.com/?q=${q}`, '_blank')
  }

  return (
    <div style={styles.tripCard}>
      <div style={styles.tripHeader}>
        <span style={{...styles.dot, background:'#F5B800'}}></span>
        <span style={{fontSize:13,fontWeight:700,color:'var(--yellow)'}}>Active Trip</span>
      </div>
      <div style={styles.tripCustomer}>{trip.customers?.full_name || 'Customer'}</div>
      <div style={styles.tripPhone}>{trip.customers?.phone || ''}</div>

      <div style={styles.tripRoute}>
        <div style={styles.routeRow}>
          <span style={styles.routeDot('green')}></span>
          <span style={styles.routeText}>{trip.pickup_address}</span>
        </div>
        <div style={styles.routeLine}></div>
        <div style={styles.routeRow}>
          <span style={styles.routeDot('red')}></span>
          <span style={styles.routeText}>{trip.dropoff_address}</span>
        </div>
      </div>

      <div style={styles.tripActions}>
        <button style={styles.btnOutline} onClick={openMaps}>Open Maps</button>
        <button style={styles.btnPrimary} onClick={onComplete}>Complete Trip</button>
      </div>
    </div>
  )
}

// ─── Trip request popup ──────────────────────────────────────
function TripRequest({ trip, onAccept, onDecline, countdown }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.requestCard}>
        <div style={styles.requestHeader}>
          <span style={{fontSize:20}}>🚕</span>
          <span style={{fontSize:15,fontWeight:800,color:'var(--text-pri)'}}>New Trip Request</span>
          <span style={styles.countdown}>{countdown}s</span>
        </div>

        <div style={styles.requestInfo}>
          <div style={styles.requestRow}>
            <span style={styles.requestLabel}>Customer</span>
            <span style={styles.requestVal}>{trip.customers?.full_name || '—'}</span>
          </div>
          <div style={styles.requestRow}>
            <span style={styles.requestLabel}>Pickup</span>
            <span style={styles.requestVal}>{trip.pickup_address}</span>
          </div>
          <div style={styles.requestRow}>
            <span style={styles.requestLabel}>Drop-off</span>
            <span style={styles.requestVal}>{trip.dropoff_address}</span>
          </div>
          {trip.distance_km && (
            <div style={styles.requestRow}>
              <span style={styles.requestLabel}>Distance</span>
              <span style={styles.requestVal}>{trip.distance_km} km</span>
            </div>
          )}
        </div>

        <div style={styles.requestBtns}>
          <button style={styles.btnDecline} onClick={onDecline}>Decline</button>
          <button style={styles.btnAccept} onClick={onAccept}>Accept</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Driver App ─────────────────────────────────────────
export default function DriverApp() {
  const [driver, setDriver]           = useState(null)
  const [online, setOnline]           = useState(false)
  const [activeTrip, setActiveTrip]   = useState(null)
  const [pendingTrip, setPendingTrip] = useState(null)
  const [countdown, setCountdown]     = useState(120)
  const [wakeLockMethod, setWakeLockMethod] = useState(null)
  const [coords, setCoords]           = useState(null)

  const wakeLockRef    = useRef(null)
  const watchIdRef     = useRef(null)
  const pingTimerRef   = useRef(null)
  const countdownRef   = useRef(null)

  // ── Go Online ──────────────────────────────────────────────
  const goOnline = useCallback(async () => {
    if (!driver) return

    // 1. Acquire wake lock (3-layer iOS/Android fallback)
    const lock = await acquireWakeLock()
    wakeLockRef.current = lock
    setWakeLockMethod(lock.method)

    // 2. Start GPS watch
    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords
          setCoords({ lat, lng })
          pushLocation(driver.id, lat, lng)
        },
        (err) => console.warn('Geolocation error:', err.message),
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
      )
    }

    // 3. Periodic ping so stale-driver check knows we're alive
    pingTimerRef.current = setInterval(() => {
      supabase.from('drivers')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', driver.id)
    }, PING_INTERVAL)

    // 4. Mark online in DB
    await supabase.from('drivers')
      .update({ online: true, status: 'available', last_seen: new Date().toISOString() })
      .eq('id', driver.id)

    // 5. Subscribe to new trips assigned to this driver
    supabase
      .channel(`driver-trips-${driver.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'trips',
        filter: `driver_id=eq.${driver.id}`,
      }, (payload) => {
        const trip = payload.new
        if (trip.status === 'dispatching') {
          // Fetch full trip with customer name
          fetchTripDetails(trip.id).then(setPendingTrip)
          startCountdown()
        }
        if (trip.status === 'on_trip') {
          fetchTripDetails(trip.id).then(setActiveTrip)
          setPendingTrip(null)
        }
        if (trip.status === 'completed' || trip.status === 'cancelled') {
          setActiveTrip(null)
        }
      })
      .subscribe()

    setOnline(true)
  }, [driver])

  // ── Go Offline ─────────────────────────────────────────────
  const goOffline = useCallback(async () => {
    navigator.geolocation.clearWatch(watchIdRef.current)
    clearInterval(pingTimerRef.current)
    clearInterval(countdownRef.current)
    wakeLockRef.current?.release()

    supabase.removeAllChannels()

    await supabase.from('drivers')
      .update({ online: false, status: 'offline' })
      .eq('id', driver.id)

    setOnline(false)
    setActiveTrip(null)
    setPendingTrip(null)
  }, [driver])

  // ── Accept / Decline ───────────────────────────────────────
  async function acceptTrip() {
    clearInterval(countdownRef.current)
    await supabase.from('trips')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', pendingTrip.id)
    await supabase.from('drivers')
      .update({ status: 'on_trip' })
      .eq('id', driver.id)
    setActiveTrip(pendingTrip)
    setPendingTrip(null)
  }

  async function declineTrip() {
    clearInterval(countdownRef.current)
    await supabase.from('trip_dispatch_log')
      .insert({ trip_id: pendingTrip.id, driver_id: driver.id, action: 'declined' })
    setPendingTrip(null)
  }

  async function completeTrip() {
    await supabase.from('trips')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', activeTrip.id)
    await supabase.from('drivers')
      .update({ status: 'available' })
      .eq('id', driver.id)
    setActiveTrip(null)
  }

  // ── Countdown for trip request ─────────────────────────────
  function startCountdown() {
    setCountdown(120)
    clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current)
          // Auto-decline on timeout
          setPendingTrip(t => {
            if (t) {
              supabase.from('trip_dispatch_log')
                .insert({ trip_id: t.id, driver_id: driver.id, action: 'timeout' })
              return null
            }
            return t
          })
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (online) goOffline()
    }
  }, [])

  if (!driver) return <DriverLogin onLogin={setDriver} />

  return (
    <div style={styles.screen}>
      {/* Wake lock warning banner for iOS < 16.4 */}
      {online && wakeLockMethod === 'none' && (
        <div style={styles.warnBanner}>
          Keep this screen on while driving to stay online
        </div>
      )}

      <div style={styles.driverCard}>
        {/* Driver header */}
        <div style={styles.driverHeader}>
          <div style={styles.driverAv}>{driver.full_name?.[0] || 'D'}</div>
          <div>
            <div style={styles.driverName}>{driver.full_name}</div>
            <div style={styles.driverSub}>{driver.car_model} · {driver.plate}</div>
          </div>
          <div style={{...styles.statusDot, background: online ? '#5DCAA5' : '#666'}}></div>
        </div>

        {/* GPS coords (debug / trust indicator) */}
        {coords && (
          <div style={styles.gpsRow}>
            <span style={styles.gpsDot}></span>
            <span style={styles.gpsText}>
              GPS active · {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </span>
          </div>
        )}

        {/* Active trip */}
        {activeTrip && (
          <TripCard trip={activeTrip} onComplete={completeTrip} />
        )}

        {/* Idle state */}
        {!activeTrip && online && (
          <div style={styles.idleMsg}>
            <div style={{fontSize:32,marginBottom:8}}>🟢</div>
            <div style={styles.idleText}>You're online</div>
            <div style={styles.idleSub}>Waiting for a trip request...</div>
          </div>
        )}

        {!online && (
          <div style={styles.idleMsg}>
            <div style={{fontSize:32,marginBottom:8}}>⚫</div>
            <div style={styles.idleText}>You're offline</div>
            <div style={styles.idleSub}>Go online to receive trips</div>
          </div>
        )}

        {/* Online / Offline toggle */}
        <button
          style={online ? styles.btnOffline : styles.btnOnline}
          onClick={online ? goOffline : goOnline}
          disabled={!!activeTrip}
        >
          {online ? 'Go Offline' : 'Go Online'}
        </button>

        <button
          style={styles.btnLogout}
          onClick={() => { goOffline(); setDriver(null) }}
        >
          Log out
        </button>
      </div>

      {/* Trip request popup */}
      {pendingTrip && (
        <TripRequest
          trip={pendingTrip}
          countdown={countdown}
          onAccept={acceptTrip}
          onDecline={declineTrip}
        />
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────
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

// ─── Inline styles (self-contained, no CSS dependency) ────────
const styles = {
  screen: {
    minHeight: '100vh',
    background: 'var(--dark, #0F1117)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 16px',
    fontFamily: 'var(--font, Inter, sans-serif)',
  },
  loginBox: {
    background: 'var(--surface, #1A1D27)',
    border: '1px solid var(--border, rgba(255,255,255,.07))',
    borderRadius: 16,
    padding: '32px 24px',
    width: '100%',
    maxWidth: 360,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  logoMark: {
    width: 48, height: 48, borderRadius: 14,
    background: 'var(--yellow, #F5B800)',
    color: '#000', fontSize: 24, fontWeight: 900,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  logoName: { fontSize: 18, fontWeight: 900, color: 'var(--text-pri, #fff)', letterSpacing: 1 },
  logoSub:  { fontSize: 12, color: 'var(--text-ter, #666)', marginBottom: 16 },
  fieldLabel: { width: '100%', fontSize: 11, fontWeight: 700, color: 'var(--text-ter, #666)', marginBottom: 4, marginTop: 8, textTransform: 'uppercase', letterSpacing: .5 },
  input: {
    width: '100%', padding: '10px 12px',
    background: 'var(--dark3, #22263A)',
    border: '1px solid var(--border, rgba(255,255,255,.07))',
    borderRadius: 8, color: 'var(--text-pri, #fff)',
    fontSize: 14, fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box',
  },
  errorMsg: { color: '#F09595', fontSize: 12, marginTop: 6, width: '100%' },
  btnPrimary: {
    width: '100%', marginTop: 16, padding: '12px',
    background: 'var(--yellow, #F5B800)', color: '#000',
    border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  btnOffline: {
    width: '100%', marginTop: 12, padding: '12px',
    background: 'rgba(240,149,149,.15)', color: '#F09595',
    border: '1px solid rgba(240,149,149,.25)', borderRadius: 10,
    fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  },
  btnOnline: {
    width: '100%', marginTop: 12, padding: '12px',
    background: 'rgba(93,202,165,.15)', color: '#5DCAA5',
    border: '1px solid rgba(93,202,165,.25)', borderRadius: 10,
    fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  },
  btnLogout: {
    width: '100%', marginTop: 8, padding: '10px',
    background: 'transparent', color: 'var(--text-ter, #666)',
    border: '1px solid var(--border, rgba(255,255,255,.07))', borderRadius: 10,
    fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
  },
  btnOutline: {
    flex: 1, padding: '10px',
    background: 'transparent', color: 'var(--text-sec, #aaa)',
    border: '1px solid var(--border, rgba(255,255,255,.07))', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },
  driverCard: {
    background: 'var(--surface, #1A1D27)',
    border: '1px solid var(--border, rgba(255,255,255,.07))',
    borderRadius: 16, padding: '20px',
    width: '100%', maxWidth: 400,
  },
  driverHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
  driverAv: {
    width: 44, height: 44, borderRadius: 12,
    background: 'var(--yellow, #F5B800)', color: '#000',
    fontSize: 18, fontWeight: 900, display: 'flex',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  driverName: { fontSize: 15, fontWeight: 700, color: 'var(--text-pri, #fff)' },
  driverSub:  { fontSize: 12, color: 'var(--text-ter, #666)' },
  statusDot:  { width: 10, height: 10, borderRadius: '50%', marginLeft: 'auto' },
  gpsRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 },
  gpsDot: { width: 7, height: 7, borderRadius: '50%', background: '#5DCAA5', flexShrink: 0 },
  gpsText: { fontSize: 10, color: 'var(--text-ter, #666)', fontFamily: 'monospace' },
  idleMsg: { textAlign: 'center', padding: '28px 0' },
  idleText: { fontSize: 16, fontWeight: 700, color: 'var(--text-pri, #fff)' },
  idleSub:  { fontSize: 13, color: 'var(--text-ter, #666)', marginTop: 4 },
  warnBanner: {
    width: '100%', maxWidth: 400,
    background: 'rgba(239,159,39,.15)', color: '#EF9F27',
    border: '1px solid rgba(239,159,39,.25)',
    borderRadius: 10, padding: '10px 14px',
    fontSize: 13, fontWeight: 600, textAlign: 'center', marginBottom: 12,
  },
  tripCard: {
    background: 'var(--dark3, #22263A)',
    borderRadius: 12, padding: '14px', marginBottom: 12,
  },
  tripHeader: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 },
  tripCustomer: { fontSize: 15, fontWeight: 700, color: 'var(--text-pri, #fff)' },
  tripPhone:    { fontSize: 12, color: 'var(--text-ter, #666)', marginBottom: 10 },
  tripRoute: { marginBottom: 12 },
  tripActions: { display: 'flex', gap: 8 },
  routeRow: { display: 'flex', alignItems: 'center', gap: 8 },
  routeDot: (c) => ({
    width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
    background: c === 'green' ? '#5DCAA5' : '#F09595',
  }),
  routeText: { fontSize: 12, color: 'var(--text-sec, #aaa)' },
  routeLine: { width: 1, height: 14, background: 'var(--border, rgba(255,255,255,.07))', marginLeft: 4, marginBottom: 2 },
  dot: { width: 8, height: 8, borderRadius: '50%', display: 'inline-block', marginRight: 4 },
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,.75)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    zIndex: 1000, padding: '0 16px 32px',
  },
  requestCard: {
    background: 'var(--surface, #1A1D27)',
    borderRadius: 20, padding: '24px',
    width: '100%', maxWidth: 420,
    border: '1px solid var(--border, rgba(255,255,255,.07))',
  },
  requestHeader: {
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
  },
  countdown: {
    marginLeft: 'auto', fontSize: 13, fontWeight: 800,
    color: 'var(--yellow, #F5B800)',
    background: 'rgba(245,184,0,.1)', padding: '3px 10px', borderRadius: 20,
  },
  requestInfo: { marginBottom: 16 },
  requestRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '7px 0', borderBottom: '1px solid var(--border, rgba(255,255,255,.05))' },
  requestLabel: { fontSize: 11, color: 'var(--text-ter, #666)', fontWeight: 700, textTransform: 'uppercase', flexShrink: 0, marginRight: 12 },
  requestVal:   { fontSize: 13, color: 'var(--text-pri, #fff)', fontWeight: 600, textAlign: 'right' },
  requestBtns: { display: 'flex', gap: 10, marginTop: 4 },
  btnDecline: {
    flex: 1, padding: '13px',
    background: 'rgba(240,149,149,.1)', color: '#F09595',
    border: '1px solid rgba(240,149,149,.2)', borderRadius: 12,
    fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  },
  btnAccept: {
    flex: 2, padding: '13px',
    background: 'var(--yellow, #F5B800)', color: '#000',
    border: 'none', borderRadius: 12,
    fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  },
}
