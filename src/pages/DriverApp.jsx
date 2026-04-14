import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { acquireWakeLock } from '../lib/wakeLock'

const PING_INTERVAL = 25_000
const STALE_LIMIT   = 45_000

// ─── GPS hook ────────────────────────────────────────────────
function useGPS({ active, onPosition, onError }) {
  const watchRef     = useRef(null)
  const lastUpdateAt = useRef(null)
  const staleTimer   = useRef(null)

  const startWatch = useCallback(() => {
    if (!('geolocation' in navigator)) {
      onError?.('not_supported')
      return
    }
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    watchRef.current = navigator.geolocation.watchPosition(
      pos => { lastUpdateAt.current = Date.now(); onError?.(null); onPosition(pos.coords.latitude, pos.coords.longitude) },
      err => {
        if (err.code === 1) {
          onError?.('permission_denied')
        } else {
          onError?.('unavailable')
          setTimeout(startWatch, 3000)
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    )
  }, [onPosition, onError])

  useEffect(() => {
    if (!active) return
    startWatch()
    const onVis = () => { if (document.visibilityState === 'visible') startWatch() }
    document.addEventListener('visibilitychange', onVis)
    staleTimer.current = setInterval(() => {
      if (lastUpdateAt.current && Date.now() - lastUpdateAt.current > STALE_LIMIT) startWatch()
    }, 20000)
    return () => {
      if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null }
      clearInterval(staleTimer.current)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [active, startWatch])
}

// ─── Session ─────────────────────────────────────────────────
const SESSION_KEY = 'allway_driver_session'
const saveSession  = (d, wasOnline = false) => localStorage.setItem(SESSION_KEY, JSON.stringify({ ...d, _wasOnline: wasOnline }))
const loadSession  = () => { try { const s = JSON.parse(localStorage.getItem(SESSION_KEY)); if (!s) return null; const { _wasOnline, ...d } = s; return d } catch { return null } }
const loadWasOnline = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY))?._wasOnline ?? false } catch { return false } }
const clearSession = () => localStorage.removeItem(SESSION_KEY)

// ─── Shift timer hook ─────────────────────────────────────────
function useShiftTimer(running) {
  const [seconds, setSeconds] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (running) {
      const tick = () => {
        const start = localStorage.getItem('shift_start_at')
        if (start) {
          setSeconds(Math.floor((Date.now() - parseInt(start)) / 1000))
        }
      }
      tick()
      timerRef.current = setInterval(tick, 1000)
      return () => clearInterval(timerRef.current)
    } else {
      setSeconds(0)
    }
  }, [running])

  const h = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

// ─── Mini bar chart ───────────────────────────────────────────
function WeeklyEarningsChart({ driverId }) {
  const [bars, setBars] = useState([])

  useEffect(() => {
    async function load() {
      const days = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0)
        days.push(d)
      }
      const since = days[0].toISOString()
      const { data } = await supabase.from('trips').select('fare_usd, completed_at').eq('driver_id', driverId).eq('status', 'completed').gte('completed_at', since)
      const result = days.map(day => {
        const label = day.toLocaleDateString('en-US', { weekday: 'short' })[0]
        const earned = (data || []).filter(t => {
          const d2 = new Date(t.completed_at); d2.setHours(0,0,0,0); return d2.getTime() === day.getTime()
        }).reduce((s, t) => s + Number(t.fare_usd || 0), 0)
        const isToday = new Date().toDateString() === day.toDateString()
        return { label, earned, isToday }
      })
      setBars(result)
    }
    load()
  }, [driverId])

  const max = Math.max(...bars.map(b => b.earned), 1)
  return (
    <div style={{ padding: '0 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6, height: 80 }}>
        {bars.map((bar, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{
              width: '100%', minHeight: 4,
              height: `${(bar.earned / max) * 64}px`,
              background: bar.isToday
                ? 'linear-gradient(180deg, #F5B800, #e6a800)'
                : bar.earned > 0 ? 'rgba(245,184,0,.3)' : 'rgba(255,255,255,.07)',
              borderRadius: 4,
              transition: 'height .6s cubic-bezier(.34,1.56,.64,1)',
              boxShadow: bar.isToday ? '0 4px 12px rgba(245,184,0,.3)' : 'none',
            }} />
            <span style={{ fontSize: 9, color: bar.isToday ? '#F5B800' : 'rgba(255,255,255,.3)', fontWeight: bar.isToday ? 800 : 600 }}>{bar.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Shift Card ──────────────────────────────────────────────
function ShiftCard({ online, gpsActive, gpsError, onToggle, disabled, shiftTime }) {
  const [burst, setBurst] = useState(false)
  const [uiSpinning, setUiSpinning] = useState(false)
  const acquiring = online && !gpsActive
  const state = acquiring ? 'acquiring' : online ? 'online' : 'offline'

  const stateColor = state === 'online' ? '#5DCAA5' : state === 'acquiring' ? '#F5B800' : 'rgba(255,255,255,0.22)'
  const stateLabel = state === 'online' ? 'On Shift' : state === 'acquiring' ? 'Locating…' : 'Offline'

  function handleToggle() {
    if (disabled) return
    setBurst(true); setUiSpinning(true)
    setTimeout(() => setBurst(false), 500)
    setTimeout(() => setUiSpinning(false), 800)
    onToggle()
  }

  return (
    <div style={{
      margin: '0 20px',
      borderRadius: 24,
      background: state === 'online'
        ? 'linear-gradient(145deg, rgba(18,38,28,0.92), rgba(10,22,16,0.95))'
        : 'rgba(255,255,255,0.03)',
      border: `1px solid ${state === 'online' ? 'rgba(93,202,165,0.15)' : state === 'acquiring' ? 'rgba(245,184,0,0.15)' : 'rgba(255,255,255,0.06)'}`,
      padding: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      boxShadow: state === 'online' ? '0 8px 32px rgba(93,202,165,0.08)' : 'none',
    }}>

      {/* Left: status info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Status row */}
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', flexShrink:0, background:stateColor, boxShadow:state!=='offline'?`0 0 8px ${stateColor}`:'none', animation:state!=='offline'?'pulse 2s infinite':'none' }}/>
          <span style={{ fontSize:11, fontWeight:800, letterSpacing:1.5, textTransform:'uppercase', color:stateColor }}>{stateLabel}</span>
        </div>

        {/* State-specific content */}
        {state === 'offline' && (
          <div style={{ fontSize:15, fontWeight:700, color:'rgba(255,255,255,0.5)' }}>Tap to start your shift</div>
        )}
        {state === 'acquiring' && (
          <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.35)' }}>Getting your location…</div>
        )}
        {state === 'online' && (
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.45)', marginBottom:2 }}>
              {gpsError === 'permission_denied' ? '⚠ Location permission denied'
               : gpsError ? '⚠ GPS signal unavailable'
               : gpsActive ? 'GPS live · tracking on' : 'Acquiring GPS…'}
            </div>
            <div style={{ fontSize:20, fontWeight:900, fontFamily:'monospace', color:'rgba(255,255,255,0.85)', letterSpacing:1.5, marginTop:2 }}>{shiftTime}</div>
          </div>
        )}
      </div>

      {/* Right: circular power button */}
      <div style={{ position:'relative' }}>
        <button
          onClick={handleToggle}
          disabled={disabled}
          className="action-btn"
          style={{
            flexShrink: 0,
            width: 64, height: 64,
            borderRadius: '50%',
            border: disabled ? '2px solid rgba(255,255,255,0.06)'
              : state === 'online' ? '2px solid rgba(93,202,165,0.4)'
              : '2px solid rgba(245,184,0,0.6)',
            background: disabled ? 'rgba(255,255,255,0.04)'
              : state === 'online' ? 'rgba(18,38,28,0.95)'
              : state === 'acquiring' ? 'rgba(245,184,0,0.07)'
              : 'linear-gradient(145deg, #F5B800, #d99e00)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: !online && !disabled
              ? '0 0 0 7px rgba(245,184,0,0.08), 0 8px 32px rgba(245,184,0,0.35)'
              : state === 'online' ? '0 0 0 8px rgba(93,202,165,0.06), 0 0 20px rgba(93,202,165,0.2)' : 'none',
            animation: state === 'online' ? 'lucidBreath 3s ease-in-out infinite' : state === 'offline' && !disabled ? 'ctaBreath 3s ease-in-out infinite' : 'none',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'visible',
            transform: 'scale(1)',
          }}
        >
          {/* Burst ring on click */}
          {burst && (
            <div style={{ position:'absolute', inset:-4, borderRadius:'50%', border:`2px solid ${state==='online'?'rgba(93,202,165,0.75)':'rgba(245,184,0,0.75)'}`, animation:'cardBurst 0.5s ease-out forwards', pointerEvents:'none' }}/>
          )}
          {uiSpinning || state === 'acquiring' ? (
            <div style={{ width:22, height:22, border:'2.5px solid rgba(245,184,0,0.15)', borderTopColor:'#F5B800', borderRadius:'50%', animation:'lucidSpin .8s linear infinite', display:'block' }}/>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke={disabled ? 'rgba(255,255,255,0.15)' : state === 'online' ? '#5DCAA5' : '#111'}
              strokeWidth="2.5" strokeLinecap="round"
            >
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
              <line x1="12" y1="2" x2="12" y2="12"/>
            </svg>
          )}
        </button>
      </div>

      {disabled && (
        <div style={{ position:'absolute', bottom:-22, left:0, right:0, textAlign:'center', fontSize:10, color:'rgba(255,255,255,0.25)', fontWeight:600 }}>
          Complete trip first
        </div>
      )}
    </div>
  )
}

// ─── Login ────────────────────────────────────────────────────
function DriverLogin({ onLogin }) {
  const [phone, setPhone]     = useState('')
  const [pin, setPin]         = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault(); setError(''); setLoading(true)
    const digits = phone.replace(/\D/g, '')
    const { data, error: err } = await supabase
      .from('drivers')
      .select('id, full_name, plate, car_model, status, online, total_trips, rating')
      .ilike('phone', `%${digits}`).eq('pwa_pin', pin.trim()).single()
    setLoading(false)
    if (err || !data) { setError('Incorrect phone number or PIN.'); return }
    saveSession(data); onLogin(data)
  }

  return (
    <div style={g.screen}>
      <style>{`
        @keyframes btnBreath {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.02); filter: brightness(1.1); }
        }
        @keyframes radarSweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.35 } }
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes cardBurst { 0%{transform:scale(0.92);opacity:1} 100%{transform:scale(1.18);opacity:0} }
        @keyframes ctaBreath { 0%,100%{box-shadow:0 4px 24px rgba(245,184,0,0.3)} 50%{box-shadow:0 4px 36px rgba(245,184,0,0.55)} }
        @keyframes neonGlow { 0%,100%{opacity:.4;filter:blur(20px)} 50%{opacity:.85;filter:blur(38px)} }
        @keyframes barFill { from { width:0% } to { width:100% } }
        * { -webkit-tap-highlight-color:transparent; box-sizing:border-box; }
        body { overscroll-behavior:none; margin:0; background:#0D0D14; }
        .drv-input:focus { border-color:#F5B800!important; box-shadow:0 0 0 3px rgba(245,184,0,.15)!important; outline:none; }
        .tab-item:active { opacity:.7; transform:scale(.95); }
        .action-btn:active { transform:scale(.95); opacity:.8; }
      `}</style>
      <div style={g.loginBg}>
        <div style={g.bgCircle1}/>
        <div style={g.bgCircle2}/>
        <div style={{ position:'absolute', bottom:'30%', left:'50%', transform:'translateX(-50%)', width:280, height:280, background:'radial-gradient(circle, rgba(93,202,165,0.04), transparent 70%)', borderRadius:'50%' }}/>
      </div>
      <div style={g.loginWrap}>
        <div style={{ animation:'fadeUp .5s ease both', animationDelay:'.05s', textAlign:'center' }}>
          <div style={{ position:'relative', width:100, height:92, margin:'0 auto 22px', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {/* Glow halo behind logo */}
            <div style={{ position:'absolute', inset:-18, borderRadius:'50%', background:'radial-gradient(circle, rgba(245,184,0,0.22) 0%, transparent 70%)', animation:'neonGlow 3s ease-in-out infinite', pointerEvents:'none' }}/>
            <img src="/allway-logo.svg" alt="Allway" style={{ width:90, height:82, position:'relative', filter:'drop-shadow(0 6px 20px rgba(245,184,0,0.5))' }}/>
          </div>
          <div style={g.loginBrand}>ALLWAY <span style={{ color:'#F5B800' }}>TAXI</span></div>
          <div style={g.loginSub}>Driver Portal</div>
        </div>
        <div style={{ ...g.loginCard, animation:'fadeUp .5s ease both', animationDelay:'.12s' }}>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.3)', letterSpacing:.6, marginBottom:6 }}>PHONE NUMBER</div>
              <div style={g.fieldWrap}>
                <div style={g.fieldIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeLinecap="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.0 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/>
                  </svg>
                </div>
                <input className="drv-input" style={g.fieldInput} type="tel" inputMode="numeric" placeholder="70111222" value={phone} onChange={e => setPhone(e.target.value)} required/>
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.3)', letterSpacing:.6, marginBottom:6 }}>PIN CODE</div>
              <div style={g.fieldWrap}>
                <div style={g.fieldIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                </div>
                <input className="drv-input" style={g.fieldInput} type="password" inputMode="numeric" placeholder="••••" maxLength={6} value={pin} onChange={e => setPin(e.target.value)} required/>
              </div>
            </div>
            {error && (
              <div style={g.errorBox}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink:0 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}
            <button style={{ ...g.btnYellow, marginTop:18, width:'100%' }} type="submit" disabled={loading}>
              {loading ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <span style={{ width:16, height:16, border:'2px solid rgba(0,0,0,.2)', borderTopColor:'#000', borderRadius:'50%', display:'inline-block', animation:'spin .7s linear infinite' }}/>Signing in…
              </span> : 'Sign In →'}
            </button>
          </form>
        </div>
        <div style={{ ...g.iosHint, animation:'fadeUp .5s ease both', animationDelay:'.22s' }}>
          iPhone? Tap <strong style={{ color:'rgba(255,255,255,.45)' }}>Share → Add to Home Screen</strong>
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
          <div style={{ ...g.countdownFill, width:`${pct}%`, background: countdown>40?'#F5B800':countdown>15?'#EF9F27':'#F09595', transition:'width .9s linear, background .3s' }}/>
        </div>
        {/* Header row: logo + label + countdown */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 10px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <img src="/allway-logo.svg" alt="" style={{ width:22, height:20, filter:'drop-shadow(0 2px 6px rgba(245,184,0,0.5))' }}/>
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
              <span style={g.tripBannerDot}/>
              <span style={{ fontSize:11, fontWeight:800, color:'#F5B800', letterSpacing:1.5, textTransform:'uppercase' }}>New Trip Request</span>
            </div>
          </div>
          <div style={{ background: countdown>40?'rgba(245,184,0,0.12)':countdown>15?'rgba(239,159,39,0.15)':'rgba(240,149,149,0.15)', border:`1px solid ${countdown>40?'rgba(245,184,0,0.3)':countdown>15?'rgba(239,159,39,0.35)':'rgba(240,149,149,0.35)'}`, borderRadius:20, padding:'4px 12px', fontSize:13, fontWeight:900, color:countdown>40?'#F5B800':countdown>15?'#EF9F27':'#F09595', fontVariantNumeric:'tabular-nums', minWidth:52, textAlign:'center' }}>
            {countdown}s
          </div>
        </div>
        <div style={g.tripBody}>
          <div style={g.routeRow}><div style={g.dotGreen}/><div><div style={g.routeLabel}>PICKUP</div><div style={g.routeAddr}>{trip.pickup_address}</div></div></div>
          <div style={g.routeVline}/>
          <div style={g.routeRow}><div style={g.dotRed}/><div><div style={g.routeLabel}>DROP-OFF</div><div style={g.routeAddr}>{trip.dropoff_address}</div></div></div>
          <div style={g.metaRow}>
            {trip.distance_km && <div style={g.metaItem}><div style={g.metaLabel}>DISTANCE</div><div style={g.metaVal}>{trip.distance_km} km</div></div>}
            {trip.fare_usd   && <div style={g.metaItem}><div style={g.metaLabel}>FARE</div><div style={{ ...g.metaVal, color:'#F5B800' }}>${trip.fare_usd}</div></div>}
            <div style={g.metaItem}><div style={g.metaLabel}>CUSTOMER</div><div style={g.metaVal}>{trip.customers?.full_name||'—'}</div></div>
          </div>
        </div>
        <div style={g.tripBtns}>
          <button style={g.btnDecline} onClick={onDecline}>Decline</button>
          <button style={{ ...g.btnYellow, flex:1, borderRadius:14 }} onClick={onAccept}>✓ Accept</button>
        </div>
      </div>
    </div>
  )
}

// ─── Active trip card ─────────────────────────────────────────
function ActiveTrip({ trip, onComplete }) {
  return (
    <div style={{ background:'linear-gradient(135deg, rgba(93,202,165,.1), rgba(93,202,165,.04))', border:'1px solid rgba(93,202,165,.25)', borderRadius:20, padding:20, marginTop:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#5DCAA5', animation:'pulse 1.5s infinite', boxShadow:'0 0 8px #5DCAA5' }}/>
        <span style={{ fontSize:11, fontWeight:800, color:'#5DCAA5', letterSpacing:.8 }}>ACTIVE TRIP IN PROGRESS</span>
      </div>
      <div style={{ fontSize:18, fontWeight:800, marginBottom:4 }}>{trip.customers?.full_name||'Customer'}</div>
      {trip.customers?.phone && <a href={`tel:${trip.customers.phone}`} style={{ fontSize:13, color:'#F5B800', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6, marginBottom:14, background:'rgba(245,184,0,.08)', border:'1px solid rgba(245,184,0,.2)', borderRadius:8, padding:'6px 12px' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.0 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/></svg>
        {trip.customers.phone}
      </a>}
      <div style={{ marginBottom:14 }}>
        <div style={g.routeRow}><div style={g.dotGreen}/><div><div style={g.routeLabel}>PICKUP</div><div style={g.routeAddr}>{trip.pickup_address}</div></div></div>
        <div style={g.routeVline}/>
        <div style={g.routeRow}><div style={g.dotRed}/><div><div style={g.routeLabel}>DROP-OFF</div><div style={g.routeAddr}>{trip.dropoff_address}</div></div></div>
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <button className="action-btn" style={{ flex:1, padding:'14px 0', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', borderRadius:14, color:'rgba(255,255,255,.6)', fontSize:13, fontWeight:700, cursor:'pointer' }}
          onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(trip.pickup_address)}`,'_blank')}>
          🗺 Open Maps
        </button>
        <button className="action-btn" style={{ flex:1.5, padding:'14px 0', background:'linear-gradient(135deg,#5DCAA5,#3DAE8A)', border:'none', borderRadius:14, color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer' }}
          onClick={onComplete}>
          ✓ Complete Trip
        </button>
      </div>
    </div>
  )
}

// ─── Home Tab ─────────────────────────────────────────────────
function HomeTab({ driver, online, gpsActive, gpsError, onToggle, activeTrip, onComplete, todayStats, weekStats, shiftTime, coords, requestedTrips, onAccept, onRefresh }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = (driver?.full_name || 'Driver').split(' ')[0]

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* ── Header ─────────────────────────────── */}
      <div style={{ padding:'16px 20px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.25)', fontWeight:700, letterSpacing:.8, textTransform:'uppercase' }}>{greeting}</div>
          <div style={{ fontSize:24, fontWeight:900, marginTop:1 }}>{firstName}</div>
        </div>
        <div/> {/* Empty right side to maintain flex layout if needed, or just remove */}
      </div>

      {/* ── Status Hero ────────────────────────── */}
      <div style={{ marginBottom:28 }}>
        <ShiftCard
          online={online} gpsActive={gpsActive} gpsError={gpsError}
          onToggle={onToggle} disabled={!!activeTrip}
          shiftTime={shiftTime} coords={coords}
        />
      </div>

      {/* ── Available Requests ────────── */}
      {online && !activeTrip && requestedTrips?.length > 0 && (
        <div style={{ padding:'0 20px', marginBottom:20 }}>
           <div style={{ fontSize:11, fontWeight:700, color:'#F5B800', letterSpacing:.7, marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
             <div style={{ width:6, height:6, borderRadius:'50%', background:'#F5B800', animation:'pulse 1s infinite' }}/>
             AVAILABLE REQUESTS ({requestedTrips.length})
           </div>
           <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
             {requestedTrips.map(trip => (
                <div key={trip.id} style={{ background:'linear-gradient(135deg, rgba(245,184,0,0.07), rgba(245,184,0,0.02))', border:'1px solid rgba(245,184,0,0.22)', borderTop:'2px solid rgba(245,184,0,0.4)', borderRadius:18, padding:16, animation:'slideUp .3s ease-out', boxShadow:'0 4px 24px rgba(245,184,0,0.08)' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:14 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                             <div style={{ fontSize:10, fontWeight:800, color:'rgba(255,255,255,.2)', letterSpacing:.5, marginBottom:4 }}>PICKUP</div>
                             <div style={{ fontSize:13, fontWeight:700, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{trip.pickup_address}</div>
                             <div style={{ fontSize:10, color:'rgba(255,255,255,.2)', marginTop:10, fontWeight:800 }}>DROP-OFF</div>
                             <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,.6)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:2 }}>{trip.dropoff_address||'—'}</div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                             <div style={{ fontSize:18, fontWeight:900, color:'#F5B800' }}>${trip.fare_usd||'—'}</div>
                             <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:2, fontWeight:700 }}>{trip.distance_km||'—'} km</div>
                        </div>
                    </div>
                    <button 
                      onClick={() => onAccept(trip)}
                      className="action-btn"
                      style={{ width:'100%', padding:'14px', background:'linear-gradient(135deg,#F5B800,#e6a800)', border:'none', borderRadius:14, color:'#000', fontSize:13, fontWeight:900, cursor:'pointer' }}
                    >
                      ✓ Accept Trip
                    </button>
                </div>
             ))}
           </div>
        </div>
      )}

      {online && !activeTrip && (!requestedTrips || requestedTrips.length === 0) && (
        <div style={{ padding:'0 20px', marginBottom:20 }}>
          <div style={{ background:'linear-gradient(135deg, rgba(93,202,165,0.07), rgba(93,202,165,0.02))', border:'1px solid rgba(93,202,165,0.18)', borderRadius:20, padding:'26px 20px 22px', textAlign:'center', position:'relative', overflow:'hidden' }}>
            {/* Radar sweep animation */}
            <div style={{ position:'relative', width:88, height:88, margin:'0 auto 14px' }}>
              <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'1px solid rgba(93,202,165,0.25)' }}/>
              <div style={{ position:'absolute', inset:14, borderRadius:'50%', border:'1px solid rgba(93,202,165,0.18)' }}/>
              <div style={{ position:'absolute', inset:28, borderRadius:'50%', border:'1px solid rgba(93,202,165,0.12)' }}/>
              {/* Rotating sweep */}
              <div style={{ position:'absolute', top:'50%', left:'50%', width:'100%', height:'100%', borderRadius:'50%', background:'conic-gradient(from 0deg, transparent 70%, rgba(93,202,165,0.4) 100%)', animation:'radarSweep 2.8s linear infinite', transformOrigin:'center' }}/>
              {/* Blip dots */}
              <div style={{ position:'absolute', top:'22%', left:'58%', width:4, height:4, borderRadius:'50%', background:'#5DCAA5', boxShadow:'0 0 8px #5DCAA5', animation:'pulse 2s infinite 0.4s' }}/>
              <div style={{ position:'absolute', top:'60%', left:'25%', width:3, height:3, borderRadius:'50%', background:'rgba(93,202,165,0.6)', animation:'pulse 2s infinite 1.1s' }}/>
              {/* Center */}
              <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:7, height:7, borderRadius:'50%', background:'#5DCAA5', boxShadow:'0 0 14px #5DCAA5' }}/>
            </div>
            <div style={{ fontSize:13, fontWeight:800, color:'rgba(255,255,255,.6)', letterSpacing:.3 }}>Scanning for trips…</div>
            <div style={{ fontSize:11, color:'rgba(93,202,165,0.45)', marginTop:5, fontWeight:600 }}>Live matching in your area</div>
            <div onClick={onRefresh} style={{ position:'absolute', top:12, right:12, padding:8, cursor:'pointer', opacity:.5 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5DCAA5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            </div>
          </div>
        </div>
      )}

      {/* ── Active trip ─────────────── */}
      {activeTrip && (
        <div style={{ padding:'0 20px', marginBottom:20 }}>
          <ActiveTrip trip={activeTrip} onComplete={onComplete}/>
        </div>
      )}

      {/* Spacer */}
      <div style={{ height:12 }}/>

      {/* ── Weekly earnings chart ────── */}
      <div style={{ margin:'0 20px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:18, overflow:'hidden' }}>
        <div style={{ padding:'16px 20px 10px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.25)', letterSpacing:.8, textTransform:'uppercase' }}>This Week</div>
            <div style={{ fontSize:22, fontWeight:900, color:'#F5B800', marginTop:3 }}>${weekStats.earned.toFixed(0)}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.35)', fontWeight:600 }}>{weekStats.trips} trips</div>
          </div>
        </div>
        <WeeklyEarningsChart driverId={driver.id}/>
      </div>

      {/* ── Quick links ─────────────── */}
      <div style={{ padding:'18px 20px 0' }}>
        <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.25)', letterSpacing:.8, marginBottom:10, textTransform:'uppercase' }}>Quick Actions</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[
            { label:'Call Support', sub:'24/7 helpline', icon:'📞', href:'tel:+96171234567', color:'rgba(93,202,165,.12)', border:'rgba(93,202,165,.2)' },
            { label:'Report Issue', sub:'Submit a ticket', icon:'🚨', href:'mailto:support@allwaytaxi.com', color:'rgba(240,149,149,.08)', border:'rgba(240,149,149,.2)' },
          ].map(q => (
            <a key={q.label} href={q.href} className="action-btn" style={{ background:q.color, border:`1px solid ${q.border}`, borderRadius:16, padding:'16px', textDecoration:'none', display:'block', cursor:'pointer' }}>
              <div style={{ fontSize:22, marginBottom:8 }}>{q.icon}</div>
              <div style={{ fontSize:13, fontWeight:800, color:'#fff', marginBottom:2 }}>{q.label}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.35)' }}>{q.sub}</div>
            </a>
          ))}
        </div>
      </div>

      {/* ── Shift Status ─────────────── */}
      <div style={{ padding:'18px 20px 0' }}>
        <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.25)', letterSpacing:.8, marginBottom:10, textTransform:'uppercase' }}>Shift Status</div>
        <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:18, padding:'16px' }}>
          {[
            { label:'Connection', val:'Supabase Realtime', status:'ok' },
            { label:'GPS Signal', val: gpsError === 'permission_denied' ? 'Permission denied' : gpsError === 'unavailable' ? 'Signal unavailable' : gpsActive ? 'Active & transmitting' : online ? 'Acquiring…' : 'Standby', status: gpsError ? 'err' : gpsActive ? 'ok' : online ? 'warn' : 'off' },
            { label:'Wake Lock', val: online ? 'Screen protected' : 'Inactive', status: online ? 'ok' : 'off' },
          ].map((item, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding: i>0 ? '12px 0 0' : '0', borderTop: i>0 ? '1px solid rgba(255,255,255,.06)' : 'none', marginTop: i>0 ? 12 : 0 }}>
              <span style={{ fontSize:12, color:'rgba(255,255,255,.4)', fontWeight:600 }}>{item.label}</span>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background: item.status==='ok'?'#5DCAA5':item.status==='warn'?'#F5B800':item.status==='err'?'#F09595':'rgba(255,255,255,.2)', animation: item.status==='ok'?'pulse 2s infinite':'none' }}/>
                <span style={{ fontSize:11, color: item.status==='ok'?'#5DCAA5':item.status==='warn'?'#F5B800':item.status==='err'?'#F09595':'rgba(255,255,255,.3)', fontWeight:700 }}>{item.val}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom spacer */}
      <div style={{ height:32 }}/>
    </div>
  )
}

// ─── Trips Tab ────────────────────────────────────────────────
function TripsTab({ driverId }) {
  const [trips, setTrips]     = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')

  useEffect(() => {
    async function fetchTrips() {
      setLoading(true)
      const { data } = await supabase.from('trips')
        .select('id, pickup_address, dropoff_address, status, fare_usd, distance_km, requested_at, completed_at, customers(full_name)')
        .eq('driver_id', driverId).order('requested_at', { ascending:false }).limit(40)
      setTrips(data||[]); setLoading(false)
    }
    fetchTrips()
  }, [driverId])

  const statusColor = s => s==='completed'?'#5DCAA5':s==='on_trip'||s==='accepted'||s==='dispatching'||s==='pending'?'#F5B800':s==='cancelled'?'#F09595':'#888'
  const statusLabel = s => s==='completed'?'Done':s==='on_trip'?'On Trip':s==='accepted'?'Accepted':s==='pending'?'New Request':s==='dispatching'?'Dispatching':s==='cancelled'?'Cancelled':s

  function fmtDate(iso) {
    if (!iso) return ''
    const d = new Date(iso), now = new Date(), diff = now - d
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`
    return d.toLocaleDateString('en-GB', { day:'numeric', month:'short' })
  }

  const filtered = filter === 'all' ? trips
    : filter === 'awaiting' ? trips.filter(t => ['dispatching','accepted','on_trip','pending'].includes(t.status))
    : trips.filter(t => t.status === filter)
  const completed = trips.filter(t => t.status==='completed')
  const awaiting  = trips.filter(t => t.status==='dispatching' || t.status==='pending' || t.status==='accepted')
  const totalEarned = completed.reduce((s,t) => s + Number(t.fare_usd||0), 0)

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'80px 0', flexDirection:'column', gap:14 }}>
      <div style={{ width:32, height:32, border:'3px solid rgba(245,184,0,.2)', borderTopColor:'#F5B800', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
      <div style={{ fontSize:13, color:'rgba(255,255,255,.3)' }}>Loading trips…</div>
    </div>
  )

  return (
    <div style={{ padding:'16px 20px 28px' }}>
      {/* Page title */}
      <div style={{ marginBottom:18 }}>
        <div style={{ fontSize:20, fontWeight:900, letterSpacing:.1 }}>Trip History</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.3)', marginTop:2, fontWeight:600 }}>All your assigned trips</div>
      </div>
      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:20 }}>
        {[
          { val:trips.length, label:'Total', color:'#fff' },
          { val:awaiting.length, label:'Awaiting', color:'#F5B800' },
          { val:`$${totalEarned.toFixed(0)}`, label:'Earned', color:'#5DCAA5' },
        ].map(s => (
          <div key={s.label} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:'14px 10px', textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.val}</div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,.3)', marginTop:3, fontWeight:700, letterSpacing:.3 }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div style={{ display:'flex', gap:8, marginBottom:16, overflowX:'auto', paddingBottom:4 }}>
        {['all','awaiting','completed','cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ flexShrink:0, padding:'7px 16px', borderRadius:50, border:`1px solid ${filter===f ? '#F5B800' : 'rgba(255,255,255,.1)'}`, background: filter===f ? 'rgba(245,184,0,.12)' : 'transparent', color: filter===f ? '#F5B800' : 'rgba(255,255,255,.4)', fontSize:12, fontWeight:700, cursor:'pointer' }}>
            {f === 'all' ? 'All' : f === 'awaiting' ? 'Awaiting' : f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>

      {!filtered.length && (
        <div style={{ textAlign:'center', padding:'40px 0' }}>
          <div style={{ fontSize:36, marginBottom:10 }}>🚖</div>
          <div style={{ fontSize:14, color:'rgba(255,255,255,.4)' }}>No {filter !== 'all' ? filter : ''} trips found.</div>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {filtered.map(trip => (
          <div key={trip.id} style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:16, padding:'14px 16px', animation:'slideUp .3s ease-out' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:'rgba(255,255,255,.06)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>
                  {trip.status==='completed'?'✓':trip.status==='cancelled'?'✕':'●'}
                </div>
                <div style={{ fontSize:13, fontWeight:700 }}>{trip.customers?.full_name||'Unknown'}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                {trip.fare_usd && <span style={{ fontSize:14, fontWeight:900, color:'#F5B800' }}>${trip.fare_usd}</span>}
                <span style={{ fontSize:10, fontWeight:800, color:statusColor(trip.status), background:`${statusColor(trip.status)}15`, border:`1px solid ${statusColor(trip.status)}25`, borderRadius:6, padding:'2px 7px' }}>{statusLabel(trip.status)}</span>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:8 }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, paddingTop:3, flexShrink:0 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'#5DCAA5' }}/>
                <div style={{ width:1, height:12, background:'rgba(255,255,255,.1)' }}/>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'#F09595' }}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.5)', marginBottom:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{trip.pickup_address}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.5)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{trip.dropoff_address}</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:12, paddingTop:8, borderTop:'1px solid rgba(255,255,255,.05)' }}>
              {trip.distance_km && <span style={{ fontSize:11, color:'rgba(255,255,255,.25)', fontWeight:600 }}>📍 {trip.distance_km} km</span>}
              <span style={{ fontSize:11, color:'rgba(255,255,255,.2)', marginLeft:'auto' }}>{fmtDate(trip.completed_at||trip.requested_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Account Tab ──────────────────────────────────────────────
function AccountTab({ driver, onLogout }) {
  const [pinForm, setPinForm]   = useState({ current:'', next:'', confirm:'' })
  const [pinMsg, setPinMsg]     = useState(null)
  const [pinLoading, setPinLoading] = useState(false)
  const [stats, setStats]       = useState(null)
  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const { data } = await supabase.from('trips').select('status, fare_usd, requested_at').eq('driver_id', driver.id)
      if (!data) return
      const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(today - 7*86400000), monthAgo = new Date(today - 30*86400000)
      const done = data.filter(t => t.status==='completed')
      const earn = arr => arr.reduce((s,t) => s+Number(t.fare_usd||0), 0)
      const total = data.length, declined = data.filter(t => t.status==='cancelled').length
      setStats({
        todayTrips:  done.filter(t => new Date(t.requested_at)>=today).length,
        todayEarned: earn(done.filter(t => new Date(t.requested_at)>=today)),
        weekTrips:   done.filter(t => new Date(t.requested_at)>=weekAgo).length,
        weekEarned:  earn(done.filter(t => new Date(t.requested_at)>=weekAgo)),
        monthTrips:  done.filter(t => new Date(t.requested_at)>=monthAgo).length,
        monthEarned: earn(done.filter(t => new Date(t.requested_at)>=monthAgo)),
        totalTrips:  done.length,
        acceptRate:  total>0 ? Math.round(((total-declined)/total)*100) : 100,
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
    setPinMsg({ type:'ok', text:'PIN updated!' }); setPinForm({ current:'', next:'', confirm:'' })
    setTimeout(() => setPinMsg(null), 3000)
  }

  return (
    <div style={{ padding:'16px 20px 36px' }}>
      {/* Page title */}
      <div style={{ marginBottom:18 }}>
        <div style={{ fontSize:20, fontWeight:900, letterSpacing:.1 }}>My Account</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.3)', marginTop:2, fontWeight:600 }}>Profile, stats & settings</div>
      </div>
      {/* Profile hero */}
      <div style={{ background:'linear-gradient(135deg, rgba(245,184,0,.1), rgba(245,184,0,.03))', border:'1px solid rgba(245,184,0,.18)', borderRadius:22, padding:'22px 18px', marginBottom:20, position:'relative', overflow:'hidden' }}>
        {/* Decorative logo watermark */}
        <div style={{ position:'absolute', top:-10, right:-10, opacity:0.06, pointerEvents:'none' }}>
          <img src="/allway-logo.svg" alt="" style={{ width:100, height:90 }}/>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:16 }}>
          <div style={{ width:64, height:64, borderRadius:18, background:'linear-gradient(135deg,#F5B800,#e6a800)', color:'#000', fontSize:28, fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 6px 24px rgba(245,184,0,.35)' }}>{driver.full_name?.[0]}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:19, fontWeight:900, marginBottom:2 }}>{driver.full_name}</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginBottom:8 }}>{driver.car_model} · 🚗 {driver.plate}</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#5DCAA5', background:'rgba(93,202,165,.12)', border:'1px solid rgba(93,202,165,.25)', borderRadius:6, padding:'3px 9px' }}>⭐ {driver.rating??'—'}</div>
              <div style={{ fontSize:11, fontWeight:700, color:'#F5B800', background:'rgba(245,184,0,.1)', border:'1px solid rgba(245,184,0,.2)', borderRadius:6, padding:'3px 9px' }}>{driver.total_trips??0} trips total</div>
              {stats && <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.5)', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:6, padding:'3px 9px' }}>{stats.acceptRate}% accept</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Earnings breakdown */}
      <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.28)', letterSpacing:.6, marginBottom:10 }}>EARNINGS BREAKDOWN</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:20 }}>
        {[{l:'Today',k:'today'},{l:'7 Days',k:'week'},{l:'30 Days',k:'month'}].map(p => (
          <div key={p.l} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:'14px 10px', textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:900, color:'#F5B800' }}>{stats?`$${(stats[p.k+'Earned']||0).toFixed(0)}`:'—'}</div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,.3)', marginTop:2, fontWeight:700 }}>{p.l.toUpperCase()}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.2)', marginTop:4 }}>{stats?`${stats[p.k+'Trips']||0} trips`:''}</div>
          </div>
        ))}
      </div>

      {/* Vehicle info */}
      <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:16, padding:'16px', marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.28)', letterSpacing:.6, marginBottom:12 }}>VEHICLE DETAILS</div>
        {[['Car Model', driver.car_model||'—'],['Plate', driver.plate||'—'],['All-time Trips', driver.total_trips??0],['Star Rating', `${driver.rating??'—'} / 5.0`]].map(([k,v], i) => (
          <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding: i>0 ? '10px 0 0' : '0', borderTop: i>0 ? '1px solid rgba(255,255,255,.05)' : 'none', marginTop: i>0 ? 10 : 0 }}>
            <span style={{ fontSize:12, color:'rgba(255,255,255,.35)' }}>{k}</span>
            <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Change PIN — collapsible */}
      <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:16, marginBottom:20, overflow:'hidden' }}>
        <button onClick={() => setCollapsed(c => !c)} style={{ width:'100%', padding:'16px', background:'transparent', border:'none', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}>
          <span style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.5)' }}>🔑 Change PIN</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2.5" strokeLinecap="round" style={{ transform:collapsed?'rotate(0deg)':'rotate(180deg)', transition:'transform .3s ease' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        {!collapsed && (
          <div style={{ padding:'0 16px 16px', animation:'slideUp .25s ease-out' }}>
            <form onSubmit={changePin}>
              {[{k:'current',l:'Current PIN'},{k:'next',l:'New PIN'},{k:'confirm',l:'Confirm New PIN'}].map((f) => (
                <div key={f.k} style={{ marginBottom:10 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.3)', letterSpacing:.5, marginBottom:5 }}>{f.l}</div>
                  <input style={{ ...g.fieldInput, paddingLeft:14, background:'rgba(255,255,255,.06)', borderColor:'rgba(255,255,255,.1)' }} className="drv-input" type="password" inputMode="numeric" placeholder="••••••" maxLength={6} value={pinForm[f.k]} onChange={ev => setPinForm(p => ({...p, [f.k]: ev.target.value}))} required/>
                </div>
              ))}
              {pinMsg && <div style={{ marginBottom:10, padding:'10px 14px', borderRadius:10, fontSize:13, fontWeight:600, background:pinMsg.type==='ok'?'rgba(93,202,165,.1)':'rgba(240,149,149,.08)', border:`1px solid ${pinMsg.type==='ok'?'rgba(93,202,165,.25)':'rgba(240,149,149,.2)'}`, color:pinMsg.type==='ok'?'#5DCAA5':'#F09595' }}>{pinMsg.text}</div>}
              <button style={{ ...g.btnYellow, width:'100%' }} type="submit" disabled={pinLoading}>{pinLoading ? 'Updating…' : 'Update PIN'}</button>
            </form>
          </div>
        )}
      </div>

      {/* Extra bottom padding so this button clears the fixed tab bar */}
      <div style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
        <button
          style={{ ...g.btnDecline, width:'100%', minHeight:52, touchAction:'manipulation', WebkitTapHighlightColor:'transparent' }}
          onClick={onLogout}
        >
          Logout &amp; End Session
        </button>
      </div>
    </div>
  )
}

// ─── Splash Screen ──────────────────────────────────────────
function Splash() {
  return (
    <div style={{ position:'fixed', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#0D0D14', zIndex:10000 }}>
      <div style={{ textAlign:'center', animation:'pulse 2s ease-in-out infinite' }}>
        <img src="/allway-logo.svg" alt="Allway" style={{ width:80, height:72, marginBottom:28, filter:'drop-shadow(0 4px 20px rgba(245,184,0,0.5))' }}/>
        <div style={{ width:120, height:3, background: 'rgba(255,255,255,0.06)', borderRadius:10, overflow:'hidden', position:'relative', margin:'0 auto' }}>
          <div style={{ position:'absolute', top:0, left:0, height:'100%', width:'0%', background:'linear-gradient(90deg, #F5B800, #e6a800)', borderRadius:10, animation:'barFill 1.5s ease-in-out forwards' }}/>
        </div>
        <div style={{ fontSize:10, fontWeight:800, color:'rgba(93,202,165,0.4)', letterSpacing:2, marginTop:18, textTransform:'uppercase' }}>Secure Protocol Active</div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────
export default function DriverApp() {
  const [isInitializing, setIsInitializing] = useState(true)
  const [driver, setDriver]         = useState(() => loadSession())
  const [tab, setTab]               = useState('home')
  const [online, setOnline]         = useState(false)
  const [gpsActive, setGpsActive]   = useState(false)
  const [gpsError, setGpsError]     = useState(null)   // null | 'permission_denied' | 'unavailable' | 'not_supported'
  const [coords, setCoords]         = useState(null)
  const [activeTrip, setActiveTrip] = useState(null)
  const [pendingTrip, setPendingTrip] = useState(null)
  const [countdown, setCountdown]   = useState(120)
  const [todayStats, setTodayStats] = useState({ trips:0, earned:0 })
  const [weekStats, setWeekStats]   = useState({ trips:0, earned:0 })
  const [requestedTrips, setRequestedTrips] = useState([])

  const wakeLockRef    = useRef(null)
  const pingTimer      = useRef(null)
  const cdTimer        = useRef(null)
  const tripChannelRef    = useRef(null)   // trip-updates for trips assigned to THIS driver
  const pendingChannelRef = useRef(null)   // broadcast channel: new pending trips (no driver yet)
  const pollTimerRef      = useRef(null)   // interval handle for pending-trip polling
  const shownTripIdRef    = useRef(null)   // trip ID currently in the popup (avoids re-triggering)
  // Ref-based flag so handlePosition can check online state synchronously,
  // avoiding a race where the GPS watch fires one last time after goOffline()
  // sets setOnline(false) but before React has re-rendered and cleaned up the watch.
  const onlineRef   = useRef(false)

  useEffect(() => {
    // Artificial 1.5s delay for premium splash loader
    const timer = setTimeout(() => setIsInitializing(false), 1500)
    return () => clearTimeout(timer)
  }, [])

  const shiftTime   = useShiftTimer(online)

  const handlePosition = useCallback((lat, lng) => {
    if (!onlineRef.current) return   // driver went offline — discard stale GPS callback
    setCoords({ lat, lng }); setGpsActive(true); setGpsError(null)
    if (driver) pushLocation(driver.id, lat, lng)
  }, [driver])

  const handleGpsError = useCallback((err) => {
    if (!onlineRef.current) return
    setGpsError(err)
    if (err) setGpsActive(false)
  }, [])

  useGPS({ active: online, onPosition: handlePosition, onError: handleGpsError })

  // Fetch today + week stats
  useEffect(() => {
    if (!driver) return
    async function fetchStats() {
      const today = new Date(); today.setHours(0,0,0,0)
      const weekAgo = new Date(today - 7*86400000)
      const { data } = await supabase.from('trips').select('fare_usd, completed_at').eq('driver_id', driver.id).eq('status', 'completed').gte('completed_at', weekAgo.toISOString())
      if (!data) return
      const todayData = data.filter(t => new Date(t.completed_at) >= today)
      setTodayStats({ trips:todayData.length, earned:todayData.reduce((s,t) => s+Number(t.fare_usd||0), 0) })
      setWeekStats({ trips:data.length, earned:data.reduce((s,t) => s+Number(t.fare_usd||0), 0) })
    }
    fetchStats()
  }, [driver, activeTrip])

  // Refresh profile from Supabase to ensure data (plate, car, name) is current
  useEffect(() => {
    if (!driver?.id) return
    supabase.from('drivers').select('*').eq('id', driver.id).single()
      .then(({ data }) => {
        if (data) {
          setDriver(prev => ({ ...prev, ...data }))
          saveSession(data, online)
        }
      })
  }, [online]) // Re-sync every time they toggle status

  // Polling backup for requested trips (mobile networks can drop websocket)
  useEffect(() => {
    if (!online || activeTrip) return
    const poll = () => {
       supabase.from('trips').select('*, customers(full_name)')
         .or(`status.eq.requested,and(status.eq.dispatching,driver_id.eq.${driver.id})`)
         .then(({ data }) => setRequestedTrips(data || []))
    }
    const id = setInterval(poll, 15000)
    return () => clearInterval(id)
  }, [online, activeTrip])

  const goOnline = useCallback(async () => {
    if (!driver) return

    // ① Start GPS + flip UI to ONLINE immediately — don't gate on async calls.
    //   This matters most on refresh: acquireWakeLock() is blocked by iOS until
    //   a user gesture, so calling setOnline AFTER it would leave GPS never starting.
    if (!localStorage.getItem('shift_start_at')) {
      localStorage.setItem('shift_start_at', Date.now().toString())
    }

    // Initial fetch of unassigned requested trips + direct dispatches for this driver
    supabase.from('trips').select('*, customers(full_name)')
      .or(`status.eq.requested,and(status.eq.dispatching,driver_id.eq.${driver.id})`)
      .then(({ data }) => {
        console.log('📡 INITIAL JOBS FETCHED:', data?.length || 0)
        setRequestedTrips(data || [])
      })

    onlineRef.current = true
    saveSession(driver, true)
    setOnline(true)

    // ② Wake lock — best-effort.  Requires a real tap, so on auto-resume after
    //   refresh it falls back to 'none' gracefully without blocking anything.
    acquireWakeLock().then(lock => { wakeLockRef.current = lock }).catch(() => {})

    // ③ Heartbeat ping
    clearInterval(pingTimer.current)
    pingTimer.current = setInterval(() => {
      supabase.from('drivers').update({ last_seen: new Date().toISOString() }).eq('id', driver.id)
    }, PING_INTERVAL)

    // ④ Immediately grab a fast initial position (accepts cached up to 60 s old)
    //   so the driver pin appears on the dashboard map right away, before the
    //   high-accuracy watchPosition fires its first fix.
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          if (!onlineRef.current) return
          const { latitude: lat, longitude: lng } = pos.coords
          setCoords({ lat, lng }); setGpsActive(true)
          pushLocation(driver.id, lat, lng)
        },
        () => {},  // silent — watchPosition will provide the first real fix
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: 5_000 }
      )
    }

    // ⑤ Supabase: mark available + subscribe to trip updates (non-blocking).
    //   Only remove/re-create the trip channel, NOT all channels, so the
    //   persistent self-monitor subscription (set up in the useEffect below) survives.
    supabase.from('drivers')
      .update({ online: true, status: 'available', last_seen: new Date().toISOString() })
      .eq('id', driver.id)
      .then(() => {
        if (tripChannelRef.current) supabase.removeChannel(tripChannelRef.current)
        tripChannelRef.current = supabase.channel(`driver-trips-${driver.id}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trips', filter: `driver_id=eq.${driver.id}` }, payload => {
            const t = payload.new
            if (t.status === 'dispatching') fetchTripDetails(t.id).then(full => { setPendingTrip(full); startCountdown() })
          })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips', filter: `driver_id=eq.${driver.id}` }, payload => {
            const t = payload.new
            if (t.status === 'dispatching') fetchTripDetails(t.id).then(full => { setPendingTrip(full); startCountdown() })
            if (t.status === 'accepted' || t.status === 'on_trip') fetchTripDetails(t.id).then(full => { setActiveTrip(full); setPendingTrip(null); clearInterval(cdTimer.current) })
            if (t.status === 'completed' || t.status === 'cancelled') setActiveTrip(null)
          })
          .subscribe()

        // ── Broadcast channel: new trips with no driver assigned yet ──────
        // Fires for every INSERT on trips where status='pending' (AI agent bookings).
        // All online available drivers see this popup; first to accept claims it.
        if (pendingChannelRef.current) supabase.removeChannel(pendingChannelRef.current)
        pendingChannelRef.current = supabase.channel('pending-trips-broadcast')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trips' }, payload => {
            // New trip is either pending (broadcast) or dispatching (direct to me)
            const isMatch = payload.new.status === 'pending' || (payload.new.status === 'dispatching' && payload.new.driver_id === driver.id)
            if (!isMatch || !onlineRef.current) return

            console.log('🔔 NEW JOB ALERT:', payload.new.id)
            fetchTripDetails(payload.new.id).then(full => {
              if (full) {
                // If direct dispatch, show the popup. If general, just add to list.
                if (full.driver_id === driver.id) {
                   setPendingTrip(full); startCountdown()
                }
                setRequestedTrips(prev => [full, ...prev.filter(x => x.id !== full.id)])
              }
            })
          })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips' }, payload => {
            console.log('🔄 TRIP UPDATE:', payload.new.status, payload.new.driver_id)
            // Should it be in my list? (Requested OR Dispatched to me)
            const isMine = payload.new.status === 'requested' || (payload.new.status === 'dispatching' && payload.new.driver_id === driver.id)
            
            if (!isMine) {
              setRequestedTrips(prev => prev.filter(t => t.id !== payload.new.id))
            } else {
              fetchTripDetails(payload.new.id).then(full => {
                if (full) {
                   setRequestedTrips(prev => [full, ...prev.filter(x => x.id !== full.id)])
                   // If it was just dispatched to me via update, show popup
                   if (payload.new.status === 'dispatching' && payload.new.driver_id === driver.id) {
                      setPendingTrip(full); startCountdown()
                   }
                }
              })
            }
          })
          .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'trips' }, payload => {
            setRequestedTrips(prev => prev.filter(t => t.id !== payload.old.id))
          })
          .subscribe()
      })
      .catch(() => {})  // Stay "online" locally even if Supabase is unreachable
  }, [driver])

  const goOffline = useCallback(() => {
    // Synchronously block handlePosition from pushing any more GPS updates
    onlineRef.current = false
    clearInterval(pingTimer.current)
    clearInterval(cdTimer.current)
    wakeLockRef.current?.release()
    // Only remove the trip channel — the self-monitor channel must stay alive
    // so admin online/offline toggles continue to be received.
    if (tripChannelRef.current)    { supabase.removeChannel(tripChannelRef.current);    tripChannelRef.current    = null }
    if (pendingChannelRef.current) { supabase.removeChannel(pendingChannelRef.current); pendingChannelRef.current = null }
    localStorage.removeItem('shift_start_at')
    saveSession(driver, false)   // refresh should stay offline
    // Flip UI immediately
    setOnline(false); setGpsActive(false); setGpsError(null); setCoords(null); setActiveTrip(null); setPendingTrip(null)
    // Mark offline in Supabase. Coordinates are intentionally preserved so that
    // when the driver comes back online (manually or via admin toggle) their last
    // known position is immediately available and they reappear on the map.
    // Marker removal on the dashboard is driven by online:false, not by null coords.
    if (driver) supabase.from('drivers').update({
      online: false,
      status: 'offline',
    }).eq('id', driver.id).catch(() => {})
  }, [driver])

  // Auto-resume GPS if driver was online before a refresh
  useEffect(() => {
    if (driver && loadWasOnline()) {
      goOnline()
    }
  }, [goOnline]) // goOnline is stable (useCallback), so this runs effectively once

  // ── Self-monitor: react to admin-triggered online/offline changes ──
  // When the admin toggles this driver's status from the Drivers page, the
  // DriverApp detects the DB change here and automatically starts/stops GPS.
  // Uses a dedicated channel that is never torn down by goOnline/goOffline so
  // remote toggles are received regardless of the driver's current shift state.
  useEffect(() => {
    if (!driver) return
    const ch = supabase
      .channel(`driver-self-${driver.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'drivers', filter: `id=eq.${driver.id}` },
        payload => {
          const { online: newOnline, ...profileFields } = payload.new
          // Keep driver profile (rating, total_trips, name, plate, etc.) live from DB
          setDriver(prev => prev ? { ...prev, ...profileFields, online: newOnline } : prev)
          // Guard against our own updates triggering a loop — onlineRef is already
          // flipped synchronously in goOnline/goOffline before the DB write.
          if (newOnline === true  && !onlineRef.current) goOnline()
          if (newOnline === false &&  onlineRef.current) goOffline()
        }
      )
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [driver, goOnline, goOffline])

  function startCountdown() {
    setCountdown(120); clearInterval(cdTimer.current)
    cdTimer.current = setInterval(() => {
      setCountdown(p => { if (p<=1) { clearInterval(cdTimer.current); setPendingTrip(null); return 0 } return p-1 })
    }, 1000)
  }

  async function acceptTrip(explicitTrip) {
    const target = explicitTrip || pendingTrip
    if (!target) return
    
    clearInterval(cdTimer.current)
    const isBroadcast = !target.driver_id  // trip came in with no driver assigned yet

    if (isBroadcast) {
      // Atomic claim: only succeed if another driver hasn't already grabbed it
      const { data, error } = await supabase.from('trips')
        .update({ driver_id: driver.id, status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', target.id)
        .is('driver_id', null)   // guard: only claim if still unclaimed
        .select('id')
        .single()

      if (error || !data) {
        // Race lost — another driver claimed it first; silently dismiss
        if (explicitTrip) {
           setRequestedTrips(prev => prev.filter(t => t.id !== explicitTrip.id))
        } else {
           setPendingTrip(null)
        }
        return
      }
    } else {
      // Trip was explicitly dispatched to this driver (driver_id already set)
      await supabase.from('trips').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', target.id)
    }

    await supabase.from('drivers').update({ status: 'on_trip' }).eq('id', driver.id)
    setActiveTrip({ ...target, driver_id: driver.id })
    setPendingTrip(null)
    setRequestedTrips(prev => prev.filter(t => t.id !== target.id))
  }

  async function declineTrip() {
    clearInterval(cdTimer.current)
    // If this trip was specifically dispatched to us, return it to the unassigned queue
    // so another driver or the CRM can re-assign it.
    // For broadcast trips (driver_id is null), just dismiss locally — the trip
    // stays pending and other online drivers can still accept it.
    if (pendingTrip.driver_id === driver.id) {
      await supabase.from('trips').update({ driver_id: null, status: 'pending' }).eq('id', pendingTrip.id)
      await supabase.from('drivers').update({ status: 'available' }).eq('id', driver.id)
    }
    setPendingTrip(null)
  }

  async function completeTrip() {
    await supabase.from('trips').update({ status:'completed', completed_at:new Date().toISOString() }).eq('id', activeTrip.id)
    await supabase.from('drivers').update({ status:'available' }).eq('id', driver.id)
    setActiveTrip(null)
  }

  // Set dark theme-color in standalone PWA so the status bar background
  // is #0D0D14 instead of the default yellow from index.html
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    const prev = meta?.getAttribute('content')
    meta?.setAttribute('content', '#0D0D14')
    return () => { if (prev) meta?.setAttribute('content', prev) }
  }, [])

  if (isInitializing) return <Splash/>
  if (!driver) return <DriverLogin onLogin={setDriver}/>

  const TABS = [
    {
      id:'home', l:'Home',
      icon:<>
        <path d="M3 12L12 4l9 8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5 10v9a1 1 0 001 1h4v-4h4v4h4a1 1 0 001-1v-9" strokeLinecap="round" strokeLinejoin="round"/>
      </>
    },
    {
      id:'trips', l:'Trips',
      icon:<>
        <circle cx="12" cy="12" r="9"/>
        <polyline points="12 7 12 12 15.5 14" strokeLinecap="round" strokeLinejoin="round"/>
      </>
    },
    {
      id:'account', l:'Account',
      icon:<>
        <circle cx="12" cy="7.5" r="3.5"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round"/>
      </>
    },
  ]

  return (
    /* Outer shell: owns the FULL physical screen edge-to-edge */
    <div style={{ position:'fixed', inset:0, background:'#0D0D14' }}>
      <style>{`
        * { -webkit-tap-highlight-color:transparent; box-sizing:border-box; font-family:'Inter',system-ui,sans-serif; }
        html, body { margin:0; padding:0; background:#0D0D14; overscroll-behavior:none; }
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes lucidSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ringSpinAcquiring { to { transform: rotate(360deg) } }
        @keyframes acquirePulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.18);opacity:.75} }
        @keyframes ripple { 0% { transform:scale(.8); opacity:0 } 5% { opacity:1 } 100% { transform:scale(2.4); opacity:0 } }
        @keyframes neonGlow { 0%,100% { opacity:.4; filter:blur(20px) } 50% { opacity:.8; filter:blur(35px) } }
        @keyframes lucidBreath {
          0%,100% { transform:scale(1.05); filter:brightness(1) }
          50% { transform:scale(1.09); filter:brightness(1.15) }
        }
        @keyframes cardBurst { 0%{transform:scale(0.92);opacity:1} 100%{transform:scale(1.18);opacity:0} }
        @keyframes ctaBreath { 0%,100%{box-shadow:0 4px 24px rgba(245,184,0,0.3)} 50%{box-shadow:0 4px 36px rgba(245,184,0,0.55)} }
        @keyframes floatA { 0%,100%{transform:translateY(0) translateX(0);opacity:0.5} 50%{transform:translateY(-14px) translateX(5px);opacity:1} }
        @keyframes floatB { 0%,100%{transform:translateY(0) translateX(0);opacity:0.3} 50%{transform:translateY(-10px) translateX(-7px);opacity:0.85} }
        @keyframes radarSweep { from { transform: translate(-50%,-50%) rotate(0deg); } to { transform: translate(-50%,-50%) rotate(360deg); } }
        .drv-input:focus { border-color:#F5B800!important; box-shadow:0 0 0 3px rgba(245,184,0,.15)!important; outline:none; }
        .tab-item { transition: all .2s ease; }
        .tab-item:active { transform:scale(.9); opacity:.7; }
        .action-btn { transition: all .2s ease; }
        .action-btn:active { transform:scale(.96); opacity:.8; }
        /* Safe-area: tab bar background bleeds into home indicator zone */
        .drv-tabbar {
          flex-shrink: 0;
          background: rgba(10,10,18,0.97);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          backdrop-filter: blur(20px) saturate(180%);
          border-top: 1px solid rgba(255,255,255,0.07);
          display: flex;
          /* paddingBottom fills the home-indicator zone in standalone PWA */
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>

      {/* Inner container: constrained to 430px, full shell height */}
      <div style={g.screen}>
        {/* ── Branded App Bar ─────────────────────────────────────── */}
        <div style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'calc(env(safe-area-inset-top, 0px) + 10px) 18px 9px', background:'rgba(13,13,20,0.96)', borderBottom:'1px solid rgba(255,255,255,0.06)', WebkitBackdropFilter:'blur(16px)', backdropFilter:'blur(16px)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <img src="/allway-logo.svg" alt="Allway" style={{ width:26, height:24, filter:'drop-shadow(0 2px 8px rgba(245,184,0,0.4))' }}/>
            <span style={{ fontSize:13, fontWeight:900, letterSpacing:.4, color:'#fff' }}>ALLWAY <span style={{ color:'#F5B800' }}>TAXI</span></span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, background: online ? 'rgba(93,202,165,0.1)' : 'rgba(255,255,255,0.04)', border:`1px solid ${online ? 'rgba(93,202,165,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:online?'#5DCAA5':'rgba(255,255,255,0.25)', boxShadow:online?'0 0 7px #5DCAA5':'none', animation:online?'pulse 2s infinite':'none' }}/>
              <span style={{ fontSize:10, fontWeight:800, letterSpacing:.5, color:online?'#5DCAA5':'rgba(255,255,255,0.3)' }}>{online ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', WebkitOverflowScrolling:'touch', minHeight:0 }}>
          {tab === 'home' && (
            <div style={{ animation:'slideUp .35s ease-out' }}>
              <HomeTab
                driver={driver} online={online} gpsActive={gpsActive} gpsError={gpsError}
                onToggle={online ? goOffline : goOnline}
                activeTrip={activeTrip} onComplete={completeTrip}
                todayStats={todayStats} weekStats={weekStats}
                shiftTime={shiftTime} coords={coords}
                requestedTrips={requestedTrips} onAccept={acceptTrip}
                onRefresh={() => {
                   supabase.from('trips').select('*, customers(full_name)')
                    .or(`status.eq.pending,and(status.eq.dispatching,driver_id.eq.${driver.id})`)
                    .then(({ data }) => setRequestedTrips(data || []))
                }}
              />
            </div>
          )}
          {tab === 'trips'   && <div style={{ animation:'slideUp .35s ease-out' }}><TripsTab driverId={driver.id}/></div>}
          {tab === 'account' && (
            <div style={{ animation:'slideUp .35s ease-out' }}>
              <AccountTab driver={driver} onLogout={() => {
                try { goOffline() } catch (_) {}
                clearSession()
                setDriver(null)
              }}/>
            </div>
          )}
        </div>

        {/* Tab bar — CSS class handles safe-area-inset-bottom padding */}
        <div className="drv-tabbar">
          {TABS.map(t => (
            <div key={t.id} className="tab-item" onClick={() => setTab(t.id)} style={{ flex:1, padding:'10px 0 8px', display:'flex', flexDirection:'column', alignItems:'center', gap:3, cursor:'pointer', color:tab===t.id?'#F5B800':'rgba(255,255,255,.28)', position:'relative' }}>
              {/* Active top accent bar */}
              {tab === t.id && <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:32, height:2.5, background:'linear-gradient(90deg,#e6a800,#F5B800)', borderRadius:'0 0 3px 3px' }}/>}
              {/* Active pill bg */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'6px 14px 4px', borderRadius:12, background:tab===t.id?'rgba(245,184,0,0.08)':'transparent', transition:'background .2s ease' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={tab===t.id?2.8:2.2} strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
                <span style={{ fontSize:10, fontWeight:tab===t.id?800:600, letterSpacing:.1 }}>{t.l}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {pendingTrip && (
        <TripRequest trip={pendingTrip} countdown={countdown} onAccept={acceptTrip} onDecline={declineTrip}/>
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────
async function pushLocation(id, lat, lng) {
  // Write both the PostGIS geometry AND plain lat/lng columns so the admin map can read them.
  // Include online:true so the realtime payload always carries the online flag alongside
  // coordinates — the dashboard's subscription checks d.online && d.lat && d.lng.
  await supabase.from('drivers').update({
    location: `POINT(${lng} ${lat})`,
    lat,
    lng,
    online: true,
    last_seen: new Date().toISOString()
  }).eq('id', id)
}
async function fetchTripDetails(id) {
  const { data } = await supabase.from('trips').select('*, customers(full_name, phone)').eq('id', id).single()
  return data
}

// ─── Styles ───────────────────────────────────────────────────
const g = {
  screen: { height:'100%', width:'100%', maxWidth:430, margin:'0 auto', background:'#0D0D14', color:'#fff', display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' },
  loginBg: { position:'absolute', inset:0, zIndex:-1, background:'#0D0D14', overflow:'hidden' },
  bgCircle1: { position:'absolute', top:'-15%', left:'-25%', width:'80%', height:'55%', background:'radial-gradient(circle, rgba(245,184,0,0.08) 0%, transparent 70%)' },
  bgCircle2: { position:'absolute', bottom:'-10%', right:'-15%', width:'70%', height:'45%', background:'radial-gradient(circle, rgba(93,202,165,0.06) 0%, transparent 70%)' },
  loginWrap: { flex:1, display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 24px 40px', minHeight:'100%' },
  loginLogoWrap: { width:72, height:72, background:'linear-gradient(135deg,#F5B800,#e6a800)', borderRadius:22, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', boxShadow:'0 10px 40px rgba(245,184,0,.25)' },
  loginLogo: { fontSize:34, fontWeight:900, color:'#000' },
  loginBrand: { fontSize:26, fontWeight:900, letterSpacing:1, textAlign:'center' },
  loginSub: { fontSize:14, color:'rgba(255,255,255,.28)', textAlign:'center', marginTop:4, marginBottom:0 },
  loginCard: { background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.08)', borderRadius:24, padding:'28px', width:'100%', marginTop:36 },
  fieldWrap: { position:'relative' },
  fieldIcon: { position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', display:'flex', alignItems:'center' },
  fieldInput: { width:'100%', padding:'14px 14px 14px 44px', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:14, color:'#fff', fontSize:16, outline:'none', transition:'border-color .2s, box-shadow .2s' },
  errorBox: { marginTop:14, padding:'12px 14px', background:'rgba(240,149,149,.08)', border:'1px solid rgba(240,149,149,.2)', borderRadius:12, fontSize:13, color:'#F09595', display:'flex', alignItems:'center', gap:10 },
  iosHint: { marginTop:28, fontSize:12, color:'rgba(255,255,255,.2)', textAlign:'center', lineHeight:1.5 },
  btnYellow: { padding:'16px', background:'linear-gradient(135deg,#F5B800,#e6a800)', color:'#000', border:'none', borderRadius:14, fontSize:16, fontWeight:800, cursor:'pointer', transition:'transform .2s, opacity .2s' },
  btnDecline: { padding:'14px', background:'rgba(240,149,149,.08)', border:'1px solid rgba(240,149,149,.2)', borderRadius:14, color:'#F09595', fontSize:14, fontWeight:700, cursor:'pointer' },
  btnOutline: { flex:1, padding:'14px', background:'transparent', border:'1px solid rgba(255,255,255,.12)', borderRadius:14, color:'rgba(255,255,255,.45)', fontSize:13, fontWeight:700, cursor:'pointer' },
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,.88)', backdropFilter:'blur(5px)', display:'flex', alignItems:'flex-end', zIndex:2000 },
  tripCard: { width:'100%', maxWidth:430, margin:'0 auto', background:'#16161F', borderRadius:'24px 24px 0 0', overflow:'hidden', animation:'slideUp .3s ease-out' },
  countdownBar: { height:4, background:'rgba(255,255,255,.08)' },
  countdownFill: { height:'100%', transition:'width 1s linear' },
  tripBanner: { display:'flex', alignItems:'center', gap:10, padding:'14px 20px', background:'rgba(245,184,0,.08)', fontSize:12, fontWeight:800, color:'#F5B800', borderBottom:'1px solid rgba(245,184,0,.1)' },
  tripBannerDot: { width:8, height:8, borderRadius:'50%', background:'#F5B800', boxShadow:'0 0 10px #F5B800', animation:'pulse 1s infinite', flexShrink:0 },
  tripBody: { padding:'20px' },
  tripBtns: { display:'flex', gap:12, padding:'0 20px 28px' },
  routeRow: { display:'flex', gap:14, alignItems:'flex-start' },
  routeVline: { width:1, height:16, background:'rgba(255,255,255,.1)', marginLeft:5, margin:'3px 0 3px 5px' },
  dotGreen: { width:10, height:10, borderRadius:'50%', background:'#5DCAA5', marginTop:4, flexShrink:0 },
  dotRed: { width:10, height:10, borderRadius:'50%', background:'#F09595', marginTop:4, flexShrink:0 },
  routeLabel: { fontSize:9, fontWeight:800, color:'rgba(255,255,255,.28)', letterSpacing:1, marginBottom:3 },
  routeAddr: { fontSize:14, fontWeight:700, lineHeight:1.3 },
  metaRow: { display:'flex', marginTop:18, paddingTop:18, borderTop:'1px solid rgba(255,255,255,.07)' },
  metaItem: { flex:1, textAlign:'center' },
  metaLabel: { fontSize:9, fontWeight:800, color:'rgba(255,255,255,.3)', letterSpacing:.8 },
  metaVal: { fontSize:17, fontWeight:900, marginTop:3 },
}
