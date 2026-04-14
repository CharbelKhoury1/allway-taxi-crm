/**
 * /track/:tripId — Public customer-facing live tracking page.
 *
 * No auth required. Uses the Supabase anon key (RLS allows reads).
 * Renders a full-screen Mapbox map with:
 *   - Animated taxi marker (driver's live position)
 *   - Pickup pin (green)
 *   - Drop-off pin (red)
 * Bottom sheet shows driver info, distance to pickup, and ETA.
 *
 * Realtime updates come directly from Supabase subscriptions — no polling needed.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { supabase } from '../lib/supabase'
import { haversineKm, formatDistance, etaMinutes } from '../lib/distance'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  pending:     { label: 'Finding your driver…',     color: '#F5B800', icon: '🔍' },
  dispatching: { label: 'Connecting with driver…',  color: '#F5B800', icon: '📡' },
  accepted:    { label: 'Driver is on the way',      color: '#5DCAA5', icon: '🚕' },
  on_trip:     { label: 'Trip in progress',          color: '#5DCAA5', icon: '🛣️'  },
  completed:   { label: 'You have arrived!',         color: '#5DCAA5', icon: '✅'  },
  cancelled:   { label: 'Trip was cancelled',        color: '#F09595', icon: '✕'   },
  no_driver:   { label: 'No driver available',       color: '#F09595', icon: '✕'   },
}

// Beirut centre fallback
const BEIRUT = [35.5018, 33.8938]
const STALE_MS = 2 * 60 * 1000  // 2 min — same as dashboard

// ── Marker animation helper (same as LiveMap) ─────────────────────────────────
function animateMarker(marker, from, to, duration = 900) {
  const start = performance.now()
  const [fromLng, fromLat] = from
  const [toLng, toLat] = to
  if (fromLng === toLng && fromLat === toLat) return
  function step(now) {
    const t = Math.min((now - start) / duration, 1)
    const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    marker.setLngLat([fromLng + (toLng - fromLng) * e, fromLat + (toLat - fromLat) * e])
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

// ── SVG taxi icon for the driver marker ──────────────────────────────────────
function makeTaxiEl() {
  const el = document.createElement('div')
  el.style.cssText = `
    width: 48px; height: 48px;
    background: #F5B800;
    border-radius: 50%;
    border: 3px solid rgba(255,255,255,.9);
    display: flex; align-items: center; justify-content: center;
    font-size: 22px;
    box-shadow: 0 4px 16px rgba(245,184,0,.5), 0 0 0 6px rgba(245,184,0,.15);
    cursor: default;
    user-select: none;
  `
  el.textContent = '🚕'
  el.title = 'Your driver'
  return el
}

function makePinEl(color, emoji) {
  const el = document.createElement('div')
  el.style.cssText = `
    width: 36px; height: 36px;
    background: ${color};
    border-radius: 50%;
    border: 3px solid rgba(255,255,255,.85);
    display: flex; align-items: center; justify-content: center;
    font-size: 16px;
    box-shadow: 0 3px 12px rgba(0,0,0,.4);
    cursor: default;
    user-select: none;
  `
  el.textContent = emoji
  return el
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TripTracking({ tripId }) {
  const mapRef       = useRef(null)
  const containerRef = useRef(null)
  const taxiRef      = useRef(null)   // { marker, lngLat }
  const pickupRef    = useRef(null)
  const dropoffRef   = useRef(null)
  const lngLatRef    = useRef(null)   // current driver lngLat for animation from

  const [mapReady, setMapReady]   = useState(false)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [trip, setTrip]           = useState(null)
  const [driver, setDriver]       = useState(null)
  const [distance, setDistance]   = useState(null)
  const [eta, setEta]             = useState(null)

  // ── Recalculate distance whenever driver moves ────────────────────────────
  const recalcDistance = useCallback((driverData, tripData) => {
    if (
      !driverData?.lat || !driverData?.lng ||
      !tripData?.pickup_lat || !tripData?.pickup_lng ||
      !['accepted', 'dispatching'].includes(tripData?.status)
    ) {
      setDistance(null); setEta(null)
      return
    }
    const km = haversineKm(
      Number(driverData.lat), Number(driverData.lng),
      Number(tripData.pickup_lat), Number(tripData.pickup_lng)
    )
    setDistance(km)
    setEta(etaMinutes(km))
  }, [])

  // ── Initial data fetch ────────────────────────────────────────────────────
  useEffect(() => {
    if (!tripId) { setError('No trip ID provided.'); setLoading(false); return }

    async function fetchData() {
      setLoading(true)

      // Trip
      const { data: tripData, error: tripErr } = await supabase
        .from('trips')
        .select(`
          id, status,
          pickup_address,  pickup_lat,  pickup_lng,
          dropoff_address, dropoff_lat, dropoff_lng,
          fare_usd, distance_km,
          driver_id,
          customers ( full_name )
        `)
        .eq('id', tripId)
        .single()

      if (tripErr || !tripData) {
        setError('Trip not found. The link may have expired.')
        setLoading(false)
        return
      }

      setTrip(tripData)

      // Driver
      let driverData = null
      if (tripData.driver_id) {
        const { data: drv } = await supabase
          .from('drivers')
          .select('id, full_name, plate, car_model, rating, lat, lng, last_seen, online')
          .eq('id', tripData.driver_id)
          .single()

        if (drv && drv.lat && drv.lng) {
          // Only show driver if location is fresh
          const isStale = drv.last_seen
            ? (Date.now() - new Date(drv.last_seen).getTime()) > STALE_MS
            : true
          if (!isStale) {
            driverData = drv
            setDriver(drv)
          }
        }
      }

      recalcDistance(driverData, tripData)
      setLoading(false)
    }

    fetchData()
  }, [tripId, recalcDistance])

  // ── Supabase realtime: driver location ────────────────────────────────────
  useEffect(() => {
    if (!trip?.driver_id) return

    const ch = supabase
      .channel(`tracking-driver-${trip.driver_id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'drivers', filter: `id=eq.${trip.driver_id}` },
        ({ new: drv }) => {
          if (!drv.lat || !drv.lng) return
          const isStale = drv.last_seen
            ? (Date.now() - new Date(drv.last_seen).getTime()) > STALE_MS
            : true
          if (isStale) return

          const updated = {
            id: drv.id, full_name: drv.full_name, plate: drv.plate,
            car_model: drv.car_model, rating: drv.rating,
            lat: Number(drv.lat), lng: Number(drv.lng),
            last_seen: drv.last_seen, online: drv.online,
          }
          setDriver(updated)
          recalcDistance(updated, trip)
        }
      )
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [trip, recalcDistance])

  // ── Supabase realtime: trip status ────────────────────────────────────────
  useEffect(() => {
    if (!tripId) return

    const ch = supabase
      .channel(`tracking-trip-${tripId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
        ({ new: t }) => {
          setTrip(prev => ({ ...prev, ...t }))
          recalcDistance(driver, t)
        }
      )
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [tripId, driver, recalcDistance])

  // ── Map initialisation ────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !mapboxgl.accessToken || !containerRef.current) return

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: BEIRUT,
      zoom: 13,
      attributionControl: false,
    })
    mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current.on('load', () => setMapReady(true))

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  // ── Place / move taxi marker when driver position changes ─────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    if (!driver?.lat || !driver?.lng) return

    const to = [Number(driver.lng), Number(driver.lat)]

    if (taxiRef.current) {
      // Animate to new position
      animateMarker(taxiRef.current.marker, taxiRef.current.lngLat, to)
      taxiRef.current.lngLat = to
    } else {
      // First placement — drop the marker and fly there
      const el = makeTaxiEl()
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(to)
        .addTo(mapRef.current)
      taxiRef.current = { marker, lngLat: to }

      mapRef.current.flyTo({ center: to, zoom: 14, speed: 1.2 })
    }
    lngLatRef.current = to
  }, [driver, mapReady])

  // ── Place pickup + dropoff pins once trip data arrives ────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !trip) return

    if (trip.pickup_lat && trip.pickup_lng && !pickupRef.current) {
      const coord = [Number(trip.pickup_lng), Number(trip.pickup_lat)]
      const el = makePinEl('#5DCAA5', '📍')
      el.title = 'Pickup: ' + trip.pickup_address
      pickupRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat(coord)
        .setPopup(new mapboxgl.Popup({ offset: 20, closeButton: false })
          .setHTML(`<div style="font-family:Inter,sans-serif;font-size:12px;color:#fff;font-weight:600">📍 Pickup<br/><span style="color:#aaa;font-weight:400">${trip.pickup_address}</span></div>`))
        .addTo(mapRef.current)
    }

    if (trip.dropoff_lat && trip.dropoff_lng && !dropoffRef.current) {
      const coord = [Number(trip.dropoff_lng), Number(trip.dropoff_lat)]
      const el = makePinEl('#F09595', '🏁')
      el.title = 'Drop-off: ' + trip.dropoff_address
      dropoffRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat(coord)
        .setPopup(new mapboxgl.Popup({ offset: 20, closeButton: false })
          .setHTML(`<div style="font-family:Inter,sans-serif;font-size:12px;color:#fff;font-weight:600">🏁 Drop-off<br/><span style="color:#aaa;font-weight:400">${trip.dropoff_address}</span></div>`))
        .addTo(mapRef.current)

      // If no driver yet, centre on pickup
      if (!driver && trip.pickup_lat && trip.pickup_lng) {
        mapRef.current.flyTo({
          center: [Number(trip.pickup_lng), Number(trip.pickup_lat)],
          zoom: 14, speed: 1,
        })
      }
    }
  }, [trip, mapReady, driver])

  // ── Derived UI values ─────────────────────────────────────────────────────
  const statusCfg  = STATUS[trip?.status] ?? STATUS.pending
  const isFinal    = ['completed', 'cancelled', 'no_driver'].includes(trip?.status)
  const driverName = driver?.full_name ?? '—'
  const initials   = driverName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return <Splash label="Loading your trip…"/>
  if (error)   return <Splash label={error} isError/>

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0D0D14', fontFamily: 'Inter, system-ui, sans-serif', color: '#fff' }}>
      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html, body { margin: 0; padding: 0; overscroll-behavior: none; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes spin  { to { transform: rotate(360deg) } }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
      `}</style>

      {/* ── Map canvas — full screen ──────────────────────────────── */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}/>

      {/* ── Top bar: Allway Taxi branding + status badge ─────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: 'env(safe-area-inset-top, 16px) 16px 16px',
        background: 'linear-gradient(to bottom, rgba(13,13,20,.92) 0%, transparent 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        animation: 'fadeIn .4s ease',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#F5B800,#e6a800)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#000', flexShrink: 0 }}>A</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: .5 }}>ALLWAY <span style={{ color: '#F5B800' }}>TAXI</span></div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 600 }}>Live Tracking</div>
          </div>
        </div>

        {/* Status badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 50,
          background: `${statusCfg.color}18`,
          border: `1px solid ${statusCfg.color}40`,
        }}>
          {!isFinal && (
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusCfg.color, animation: 'pulse 1.8s infinite', boxShadow: `0 0 6px ${statusCfg.color}` }}/>
          )}
          <span style={{ fontSize: 11, fontWeight: 800, color: statusCfg.color }}>{statusCfg.label}</span>
        </div>
      </div>

      {/* ── Bottom sheet ─────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'rgba(13,13,20,.96)',
        backdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,.08)',
        borderRadius: '24px 24px 0 0',
        paddingBottom: 'env(safe-area-inset-bottom, 20px)',
        animation: 'slideUp .4s ease',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 4, background: 'rgba(255,255,255,.12)' }}/>
        </div>

        {/* ── Distance + ETA row (only shown when driver approaching) ── */}
        {distance != null && eta != null && !isFinal && (
          <div style={{ display: 'flex', gap: 12, padding: '8px 20px 16px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            <div style={{ flex: 1, background: 'rgba(93,202,165,.08)', border: '1px solid rgba(93,202,165,.2)', borderRadius: 16, padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: .6, marginBottom: 4 }}>DISTANCE</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#5DCAA5' }}>{formatDistance(distance)}</div>
              <div style={{ fontSize: 10, color: 'rgba(93,202,165,.6)', marginTop: 2 }}>to pickup</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(245,184,0,.08)', border: '1px solid rgba(245,184,0,.2)', borderRadius: 16, padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: .6, marginBottom: 4 }}>ETA</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#F5B800' }}>{eta} min</div>
              <div style={{ fontSize: 10, color: 'rgba(245,184,0,.6)', marginTop: 2 }}>estimated</div>
            </div>
          </div>
        )}

        {/* Completed / cancelled message */}
        {isFinal && (
          <div style={{ margin: '8px 20px 12px', padding: '14px', background: `${statusCfg.color}10`, border: `1px solid ${statusCfg.color}30`, borderRadius: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{statusCfg.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: statusCfg.color }}>{statusCfg.label}</div>
            {trip?.fare_usd && trip.status === 'completed' && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>Fare: ${Number(trip.fare_usd).toFixed(2)}</div>
            )}
          </div>
        )}

        {/* ── Driver card ──────────────────────────────────────────── */}
        {driver ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px' }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#F5B800,#e6a800)', color: '#000', fontSize: 22, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 16px rgba(245,184,0,.3)' }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{driver.full_name}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>{driver.car_model} · <strong style={{ color: '#F5B800' }}>{driver.plate}</strong></div>
            </div>
            {driver.rating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(245,184,0,.1)', border: '1px solid rgba(245,184,0,.2)', borderRadius: 10, padding: '6px 10px', flexShrink: 0 }}>
                <span style={{ fontSize: 12 }}>⭐</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: '#F5B800' }}>{Number(driver.rating).toFixed(1)}</span>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px' }}>
            <div style={{ width: 10, height: 10, border: '2px solid rgba(245,184,0,.3)', borderTopColor: '#F5B800', borderRadius: '50%', animation: 'spin .8s linear infinite', flexShrink: 0 }}/>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', fontWeight: 600 }}>
              {['completed','cancelled','no_driver'].includes(trip?.status) ? 'No driver assigned' : 'Waiting for driver…'}
            </span>
          </div>
        )}

        {/* ── Route addresses ──────────────────────────────────────── */}
        <div style={{ margin: '0 20px 20px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 16, padding: '14px 16px' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#5DCAA5', marginTop: 4, flexShrink: 0 }}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,.28)', letterSpacing: 1, marginBottom: 2 }}>PICKUP</div>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{trip?.pickup_address ?? '—'}</div>
            </div>
          </div>
          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,.1)', marginLeft: 4, marginBottom: 10 }}/>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F09595', marginTop: 4, flexShrink: 0 }}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,.28)', letterSpacing: 1, marginBottom: 2 }}>DROP-OFF</div>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{trip?.dropoff_address ?? '—'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Full-screen splash (loading / error) ──────────────────────────────────────
function Splash({ label, isError = false }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0D0D14', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, fontFamily: 'Inter, system-ui, sans-serif', color: '#fff', padding: 32 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#F5B800,#e6a800)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: '#000' }}>A</div>
      {isError ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#F09595' }}>Trip not found</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', lineHeight: 1.5 }}>{label}</div>
        </div>
      ) : (
        <>
          <div style={{ width: 28, height: 28, border: '3px solid rgba(245,184,0,.2)', borderTopColor: '#F5B800', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', fontWeight: 600 }}>{label}</div>
        </>
      )}
    </div>
  )
}
