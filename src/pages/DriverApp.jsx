import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { acquireWakeLock } from '../lib/wakeLock'

const PING_INTERVAL = 30_000

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
    const { data, error: err } = await supabase
      .from('drivers')
      .select('id, full_name, plate, car_model, status, online, total_trips, rating')
      .eq('phone', phone.trim())
      .eq('pwa_pin', pin.trim())
      .single()
    setLoading(false)
    if (err || !data) { setError('Incorrect phone number or PIN.'); return }
    onLogin(data)
  }

  return (
    <div style={s.screen}>
      <div style={s.loginWrap}>
        <div style={s.loginLogo}>A</div>
        <div style={s.loginBrand}>ALLWAY <span style={{color:'#F5B800'}}>TAXI</span></div>
        <div style={s.loginSub}>Driver App</div>

        <form onSubmit={handleLogin} style={{width:'100%',marginTop:28}}>
          <div style={s.label}>Phone number</div>
          <input style={s.input} type="tel" placeholder="+961 70 000 000"
            value={phone} onChange={e=>setPhone(e.target.value)} required />

          <div style={{...s.label,marginTop:14}}>PIN</div>
          <input style={s.input} type="password" inputMode="numeric"
            placeholder="4-digit PIN" maxLength={6}
            value={pin} onChange={e=>setPin(e.target.value)} required />

          {error && <div style={s.errorBox}>{error}</div>}

          <button style={s.btnYellow} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Trip request overlay ─────────────────────────────────────
function TripRequest({ trip, countdown, onAccept, onDecline }) {
  const pct = (countdown / 120) * 100

  return (
    <div style={s.tripOverlay}>
      <div style={s.tripCard}>
        {/* Countdown bar */}
        <div style={s.countdownBar}>
          <div style={{...s.countdownFill, width:`${pct}%`,
            background: countdown > 40 ? '#F5B800' : countdown > 15 ? '#EF9F27' : '#F09595'}} />
        </div>

        <div style={s.tripBanner}>
          <span style={s.tripBannerDot} />
          NEW TRIP — {countdown}S TO RESPOND
        </div>

        <div style={s.tripBody}>
          <div style={s.tripRow}>
            <div style={s.tripDotGreen} />
            <div>
              <div style={s.tripLabel}>PICKUP</div>
              <div style={s.tripAddr}>{trip.pickup_address}</div>
            </div>
          </div>
          <div style={s.tripVLine} />
          <div style={s.tripRow}>
            <div style={s.tripDotRed} />
            <div>
              <div style={s.tripLabel}>DROP-OFF</div>
              <div style={s.tripAddr}>{trip.dropoff_address}</div>
            </div>
          </div>

          <div style={s.tripMeta}>
            {trip.distance_km && (
              <div style={s.tripMetaItem}>
                <div style={s.tripMetaLabel}>DISTANCE</div>
                <div style={s.tripMetaVal}>{trip.distance_km} km</div>
              </div>
            )}
            {trip.fare_usd && (
              <div style={s.tripMetaItem}>
                <div style={s.tripMetaLabel}>FARE</div>
                <div style={{...s.tripMetaVal,color:'#F5B800'}}>${trip.fare_usd}</div>
              </div>
            )}
            <div style={s.tripMetaItem}>
              <div style={s.tripMetaLabel}>CUSTOMER</div>
              <div style={s.tripMetaVal}>{trip.customers?.full_name || '—'}</div>
            </div>
          </div>
        </div>

        <div style={s.tripBtns}>
          <button style={s.btnDecline} onClick={onDecline}>Decline</button>
          <button style={s.btnAccept} onClick={onAccept}>Accept</button>
        </div>
      </div>
    </div>
  )
}

// ─── Active trip view ─────────────────────────────────────────
function ActiveTrip({ trip, onComplete }) {
  function openMaps() {
    const q = encodeURIComponent(trip.pickup_address)
    window.open(`https://maps.google.com/?q=${q}`, '_blank')
  }
  return (
    <div style={s.activeTripCard}>
      <div style={s.activeTripHeader}>
        <div style={s.activeTripPulse} />
        <span style={{fontSize:11,fontWeight:800,color:'#F5B800',letterSpacing:.5}}>ACTIVE TRIP</span>
      </div>

      <div style={s.activeTripCustomer}>{trip.customers?.full_name || 'Customer'}</div>
      {trip.customers?.phone && (
        <a href={`tel:${trip.customers.phone}`} style={s.activeTripPhone}>
          📞 {trip.customers.phone}
        </a>
      )}

      <div style={{margin:'14px 0'}}>
        <div style={s.tripRow}>
          <div style={s.tripDotGreen} />
          <div>
            <div style={s.tripLabel}>PICKUP</div>
            <div style={s.tripAddr}>{trip.pickup_address}</div>
          </div>
        </div>
        <div style={s.tripVLine} />
        <div style={s.tripRow}>
          <div style={s.tripDotRed} />
          <div>
            <div style={s.tripLabel}>DROP-OFF</div>
            <div style={s.tripAddr}>{trip.dropoff_address}</div>
          </div>
        </div>
      </div>

      <div style={{display:'flex',gap:10,marginTop:4}}>
        <button style={s.btnOutline} onClick={openMaps}>Open Maps</button>
        <button style={s.btnYellow} onClick={onComplete}>Complete Trip</button>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────
export default function DriverApp() {
  const [driver, setDriver]         = useState(null)
  const [online, setOnline]         = useState(false)
  const [activeTrip, setActiveTrip] = useState(null)
  const [pendingTrip, setPendingTrip] = useState(null)
  const [countdown, setCountdown]   = useState(120)
  const [coords, setCoords]         = useState(null)
  const [wakeLockMethod, setWakeLockMethod] = useState(null)
  const [todayTrips, setTodayTrips] = useState(0)
  const [todayEarned, setTodayEarned] = useState(0)

  const wakeLockRef   = useRef(null)
  const watchIdRef    = useRef(null)
  const pingTimerRef  = useRef(null)
  const cdRef         = useRef(null)

  const goOnline = useCallback(async () => {
    if (!driver) return

    const lock = await acquireWakeLock()
    wakeLockRef.current = lock
    setWakeLockMethod(lock.method)

    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        pos => {
          const { latitude: lat, longitude: lng } = pos.coords
          setCoords({ lat, lng })
          pushLocation(driver.id, lat, lng)
        },
        err => console.warn('GPS error:', err.message),
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
      )
    }

    pingTimerRef.current = setInterval(() => {
      supabase.from('drivers')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', driver.id)
    }, PING_INTERVAL)

    await supabase.from('drivers')
      .update({ online: true, status: 'available', last_seen: new Date().toISOString() })
      .eq('id', driver.id)

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
          fetchTripDetails(t.id).then(full => { setActiveTrip(full); setPendingTrip(null) })
        }
        if (t.status === 'completed' || t.status === 'cancelled') {
          setActiveTrip(null)
          setTodayTrips(n => n + (t.status === 'completed' ? 1 : 0))
          setTodayEarned(n => n + (t.status === 'completed' && t.fare_usd ? Number(t.fare_usd) : 0))
        }
      })
      .subscribe()

    setOnline(true)
  }, [driver])

  const goOffline = useCallback(async () => {
    navigator.geolocation.clearWatch(watchIdRef.current)
    clearInterval(pingTimerRef.current)
    clearInterval(cdRef.current)
    wakeLockRef.current?.release()
    supabase.removeAllChannels()
    await supabase.from('drivers')
      .update({ online: false, status: 'offline' })
      .eq('id', driver.id)
    setOnline(false)
    setActiveTrip(null)
    setPendingTrip(null)
    setCoords(null)
  }, [driver])

  function startCountdown() {
    setCountdown(120)
    clearInterval(cdRef.current)
    cdRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(cdRef.current)
          setPendingTrip(t => {
            if (t) {
              supabase.from('trip_dispatch_log')
                .insert({ trip_id: t.id, driver_id: driver.id, action: 'timeout' })
            }
            return null
          })
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function acceptTrip() {
    clearInterval(cdRef.current)
    await supabase.from('trips')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', pendingTrip.id)
    await supabase.from('drivers').update({ status: 'on_trip' }).eq('id', driver.id)
    setActiveTrip(pendingTrip)
    setPendingTrip(null)
  }

  async function declineTrip() {
    clearInterval(cdRef.current)
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

  useEffect(() => { return () => { if (online) goOffline() } }, [])

  if (!driver) return <DriverLogin onLogin={setDriver} />

  return (
    <div style={s.screen}>
      {/* Warn if wake lock unsupported */}
      {online && wakeLockMethod === 'none' && (
        <div style={s.warnBar}>Keep screen on while driving to stay online</div>
      )}

      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLogo}>A</div>
        <div>
          <div style={s.headerBrand}>ALLWAY <span style={{color:'#F5B800'}}>TAXI</span></div>
          <div style={s.headerSub}>Driver app</div>
        </div>
        <button style={s.logoutBtn} onClick={() => { goOffline(); setDriver(null) }}>
          Exit
        </button>
      </div>

      <div style={s.body}>
        {/* Big toggle */}
        <div style={s.toggleWrap}>
          <button
            style={{
              ...s.toggleBtn,
              background: online
                ? 'radial-gradient(circle at 40% 35%, #7EDFC0, #3DAE8A)'
                : 'radial-gradient(circle at 40% 35%, #3A3A4A, #25252F)',
              boxShadow: online
                ? '0 0 0 12px rgba(93,202,165,.12), 0 0 0 28px rgba(93,202,165,.06), 0 8px 32px rgba(0,0,0,.5)'
                : '0 0 0 12px rgba(255,255,255,.04), 0 8px 32px rgba(0,0,0,.4)',
            }}
            onClick={online ? goOffline : goOnline}
            disabled={!!activeTrip}
          >
            <div style={{...s.toggleInner, opacity: activeTrip ? .5 : 1}}>
              <div style={s.toggleLabel}>{online ? 'ON' : 'OFF'}</div>
              <div style={s.toggleSub}>{online ? 'ONLINE' : 'OFFLINE'}</div>
            </div>
          </button>
          <div style={s.toggleHint}>
            {activeTrip ? 'Complete your trip first' : online ? 'Tap to go offline' : 'Tap to go online'}
          </div>
        </div>

        {/* GPS status */}
        {online && (
          <div style={{...s.gpsPill, background: coords ? 'rgba(245,184,0,.12)' : 'rgba(255,255,255,.05)', borderColor: coords ? 'rgba(245,184,0,.25)' : 'rgba(255,255,255,.08)'}}>
            <div style={{...s.gpsDot, background: coords ? '#F5B800' : '#666'}} />
            <span style={{fontSize:12,fontWeight:600,color: coords ? '#F5B800' : 'var(--text-ter,#666)'}}>
              {coords ? 'GPS active — sending location' : 'Acquiring GPS signal…'}
            </span>
          </div>
        )}

        {/* Stats */}
        <div style={s.statsRow}>
          <div style={s.statCard}>
            <div style={s.statVal}>{todayTrips}</div>
            <div style={s.statLabel}>Trips{'\n'}today</div>
          </div>
          <div style={s.statCard}>
            <div style={{...s.statVal, color:'#F5B800'}}>${todayEarned.toFixed(0)}</div>
            <div style={s.statLabel}>Earned</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statVal}>{driver.rating ?? '—'}</div>
            <div style={s.statLabel}>⭐ Rating</div>
          </div>
        </div>

        {/* Driver info */}
        <div style={s.driverInfo}>
          <div style={s.driverAvatar}>{driver.full_name?.[0] ?? 'D'}</div>
          <div>
            <div style={s.driverName}>{driver.full_name}</div>
            <div style={s.driverSub}>{driver.car_model} · {driver.plate}</div>
          </div>
        </div>

        {/* Active trip */}
        {activeTrip && <ActiveTrip trip={activeTrip} onComplete={completeTrip} />}
      </div>

      {/* Trip request */}
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
      location: point, last_seen: new Date().toISOString(),
    }).eq('id', driverId),
    supabase.from('driver_location_history').insert({ driver_id: driverId, location: point }),
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
const s = {
  screen: {
    minHeight: '100vh',
    background: '#0D0D14',
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: 430,
    margin: '0 auto',
  },
  // Login
  loginWrap: {
    flex: 1, display:'flex', flexDirection:'column',
    alignItems:'center', padding:'48px 28px',
  },
  loginLogo: {
    width:56, height:56, borderRadius:16,
    background:'#F5B800', color:'#000',
    fontSize:28, fontWeight:900,
    display:'flex', alignItems:'center', justifyContent:'center',
    marginBottom:12,
  },
  loginBrand: { fontSize:20, fontWeight:900, letterSpacing:1 },
  loginSub:   { fontSize:12, color:'rgba(255,255,255,.4)', marginBottom:4 },
  label: { fontSize:11, fontWeight:700, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:.5, marginBottom:6 },
  input: {
    width:'100%', padding:'12px 14px',
    background:'rgba(255,255,255,.06)',
    border:'1px solid rgba(255,255,255,.1)',
    borderRadius:10, color:'#fff',
    fontSize:14, fontFamily:'inherit',
    outline:'none', boxSizing:'border-box',
  },
  errorBox: {
    marginTop:10, padding:'10px 14px',
    background:'rgba(240,149,149,.1)',
    border:'1px solid rgba(240,149,149,.2)',
    borderRadius:8, fontSize:13, color:'#F09595',
  },
  // Header
  header: {
    display:'flex', alignItems:'center', gap:12,
    padding:'18px 20px 14px',
    borderBottom:'1px solid rgba(255,255,255,.06)',
  },
  headerLogo: {
    width:34, height:34, borderRadius:9,
    background:'#F5B800', color:'#000',
    fontSize:16, fontWeight:900,
    display:'flex', alignItems:'center', justifyContent:'center',
  },
  headerBrand: { fontSize:13, fontWeight:900, letterSpacing:.5 },
  headerSub:   { fontSize:10, color:'rgba(255,255,255,.35)' },
  logoutBtn: {
    marginLeft:'auto', padding:'6px 14px',
    background:'rgba(255,255,255,.06)',
    border:'1px solid rgba(255,255,255,.1)',
    borderRadius:8, color:'rgba(255,255,255,.5)',
    fontSize:12, cursor:'pointer', fontFamily:'inherit',
  },
  body: { flex:1, padding:'28px 20px 32px', display:'flex', flexDirection:'column', gap:20 },
  // Toggle
  toggleWrap: { display:'flex', flexDirection:'column', alignItems:'center', gap:16 },
  toggleBtn: {
    width:160, height:160, borderRadius:'50%',
    border:'none', cursor:'pointer',
    transition:'all .35s ease',
    display:'flex', alignItems:'center', justifyContent:'center',
  },
  toggleInner: { textAlign:'center' },
  toggleLabel: { fontSize:36, fontWeight:900, color:'#fff', lineHeight:1 },
  toggleSub:   { fontSize:12, fontWeight:700, color:'rgba(255,255,255,.7)', letterSpacing:2, marginTop:4 },
  toggleHint:  { fontSize:12, color:'rgba(255,255,255,.35)', textAlign:'center' },
  // GPS pill
  gpsPill: {
    display:'flex', alignItems:'center', gap:8,
    padding:'10px 16px', borderRadius:10,
    border:'1px solid',
  },
  gpsDot: { width:8, height:8, borderRadius:'50%', flexShrink:0 },
  // Stats
  statsRow: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 },
  statCard: {
    background:'rgba(255,255,255,.05)',
    border:'1px solid rgba(255,255,255,.08)',
    borderRadius:12, padding:'14px 10px',
    textAlign:'center',
  },
  statVal:   { fontSize:22, fontWeight:800, color:'#fff' },
  statLabel: { fontSize:10, color:'rgba(255,255,255,.4)', marginTop:4, whiteSpace:'pre-line', lineHeight:1.4 },
  // Driver info
  driverInfo: {
    display:'flex', alignItems:'center', gap:12,
    background:'rgba(255,255,255,.04)',
    border:'1px solid rgba(255,255,255,.07)',
    borderRadius:12, padding:'12px 14px',
  },
  driverAvatar: {
    width:40, height:40, borderRadius:10,
    background:'#F5B800', color:'#000',
    fontSize:18, fontWeight:900,
    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
  },
  driverName: { fontSize:14, fontWeight:700 },
  driverSub:  { fontSize:11, color:'rgba(255,255,255,.4)', marginTop:2 },
  // Buttons
  btnYellow: {
    flex:1, width:'100%', padding:'13px',
    background:'#F5B800', color:'#000',
    border:'none', borderRadius:12,
    fontSize:14, fontWeight:700,
    cursor:'pointer', fontFamily:'inherit',
  },
  btnOutline: {
    flex:1, padding:'13px',
    background:'transparent',
    border:'1px solid rgba(255,255,255,.15)',
    borderRadius:12, color:'rgba(255,255,255,.6)',
    fontSize:13, fontWeight:600,
    cursor:'pointer', fontFamily:'inherit',
  },
  btnDecline: {
    flex:1, padding:'14px',
    background:'rgba(240,149,149,.1)',
    border:'1px solid rgba(240,149,149,.2)',
    borderRadius:12, color:'#F09595',
    fontSize:14, fontWeight:700,
    cursor:'pointer', fontFamily:'inherit',
  },
  btnAccept: {
    flex:2, padding:'14px',
    background:'#F5B800', color:'#000',
    border:'none', borderRadius:12,
    fontSize:14, fontWeight:700,
    cursor:'pointer', fontFamily:'inherit',
  },
  // Active trip
  activeTripCard: {
    background:'rgba(255,255,255,.05)',
    border:'1px solid rgba(255,255,255,.1)',
    borderRadius:14, padding:'16px',
  },
  activeTripHeader: { display:'flex', alignItems:'center', gap:8, marginBottom:10 },
  activeTripPulse: {
    width:8, height:8, borderRadius:'50%', background:'#5DCAA5',
    boxShadow:'0 0 0 3px rgba(93,202,165,.25)',
  },
  activeTripCustomer: { fontSize:16, fontWeight:800, marginBottom:2 },
  activeTripPhone: { fontSize:12, color:'#F5B800', textDecoration:'none', display:'block', marginBottom:4 },
  // Trip request overlay
  tripOverlay: {
    position:'fixed', inset:0,
    background:'rgba(0,0,0,.8)',
    display:'flex', alignItems:'flex-end',
    padding:'0 0 24px', zIndex:100,
  },
  tripCard: {
    width:'100%', maxWidth:430, margin:'0 auto',
    background:'#1A1A24',
    border:'1px solid rgba(255,255,255,.1)',
    borderRadius:'20px 20px 16px 16px',
    overflow:'hidden',
  },
  countdownBar: { height:4, background:'rgba(255,255,255,.08)', width:'100%' },
  countdownFill: { height:'100%', transition:'width 1s linear, background .5s' },
  tripBanner: {
    display:'flex', alignItems:'center', gap:8,
    padding:'12px 18px',
    background:'rgba(245,184,0,.1)',
    fontSize:11, fontWeight:800,
    color:'#F5B800', letterSpacing:.8,
    borderBottom:'1px solid rgba(245,184,0,.15)',
  },
  tripBannerDot: {
    width:7, height:7, borderRadius:'50%',
    background:'#F5B800',
    boxShadow:'0 0 6px #F5B800',
    flexShrink:0,
  },
  tripBody: { padding:'16px 18px' },
  tripRow:  { display:'flex', alignItems:'flex-start', gap:12 },
  tripVLine: { width:1, height:14, background:'rgba(255,255,255,.1)', marginLeft:5, marginBottom:2 },
  tripDotGreen: { width:10, height:10, borderRadius:'50%', background:'#5DCAA5', marginTop:3, flexShrink:0 },
  tripDotRed:   { width:10, height:10, borderRadius:'50%', background:'#F09595', marginTop:3, flexShrink:0 },
  tripLabel: { fontSize:9, fontWeight:700, color:'rgba(255,255,255,.35)', letterSpacing:.6, marginBottom:2 },
  tripAddr:  { fontSize:13, fontWeight:600, color:'#fff' },
  tripMeta:  { display:'flex', gap:0, marginTop:14, paddingTop:14, borderTop:'1px solid rgba(255,255,255,.07)' },
  tripMetaItem: { flex:1, textAlign:'center' },
  tripMetaLabel: { fontSize:9, fontWeight:700, color:'rgba(255,255,255,.35)', letterSpacing:.6, marginBottom:3 },
  tripMetaVal:   { fontSize:14, fontWeight:800 },
  tripBtns: { display:'flex', gap:10, padding:'0 18px 18px' },
  // Warn banner
  warnBar: {
    background:'rgba(239,159,39,.15)', color:'#EF9F27',
    border:'1px solid rgba(239,159,39,.2)',
    fontSize:12, fontWeight:600,
    textAlign:'center', padding:'10px',
  },
}
