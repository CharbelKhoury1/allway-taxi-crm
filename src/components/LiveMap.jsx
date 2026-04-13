import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

// Beirut centre
const BEIRUT = [35.5018, 33.8938]

// Status → marker colour
const STATUS_COLOR = {
  available: '#5DCAA5',   // green
  on_trip:   '#F5B800',   // yellow
  offline:   '#4A4A5A',   // grey
}

/**
 * LiveMap
 *
 * Props:
 *   drivers  — array of { id, full_name, plate, status, location: { lat, lng } }
 *   onSelect — called with driver object when a marker is clicked
 *   height   — css height string (default '320px')
 */
export default function LiveMap({ drivers = [], onSelect, height = '320px' }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const markersRef   = useRef({})   // id → { marker, el }
  const [ready, setReady] = useState(false)

  // ── Initialise map once ──────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !mapboxgl.accessToken) return

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: BEIRUT,
      zoom: 12,
      attributionControl: false,
    })

    mapRef.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      'top-right'
    )

    mapRef.current.on('load', () => setReady(true))

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  // ── Sync driver markers whenever `drivers` or `ready` changes ──
  useEffect(() => {
    if (!ready || !mapRef.current) return

    const map = mapRef.current
    const incoming = new Set(drivers.map(d => d.id))

    // Remove markers for drivers no longer in list
    Object.keys(markersRef.current).forEach(id => {
      if (!incoming.has(id)) {
        markersRef.current[id].marker.remove()
        delete markersRef.current[id]
      }
    })

    // Add or update markers
    drivers.forEach(driver => {
      if (!driver.location?.lng || !driver.location?.lat) return

      const color = STATUS_COLOR[driver.status] || STATUS_COLOR.offline

      if (markersRef.current[driver.id]) {
        // Update position + colour
        const { marker, el } = markersRef.current[driver.id]
        marker.setLngLat([driver.location.lng, driver.location.lat])
        el.style.background = color
        el.title = tooltipText(driver)
      } else {
        // Create new marker element
        const el = document.createElement('div')
        el.style.cssText = `
          width: 36px; height: 36px;
          border-radius: 50%;
          background: ${color};
          border: 3px solid rgba(255,255,255,.25);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 800;
          color: #000;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,.5);
          transition: transform .15s;
          font-family: Inter, sans-serif;
        `
        el.textContent = initials(driver.full_name)
        el.title = tooltipText(driver)

        el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.15)' })
        el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })
        el.addEventListener('click', () => onSelect?.(driver))

        const popup = new mapboxgl.Popup({ offset: 20, closeButton: false })
          .setHTML(popupHTML(driver))

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([driver.location.lng, driver.location.lat])
          .setPopup(popup)
          .addTo(map)

        markersRef.current[driver.id] = { marker, el }
      }
    })
  }, [drivers, ready, onSelect])

  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', height }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {!mapboxgl.accessToken && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', color: '#fff', textAlign: 'center', padding: 20 }}>
          <div>
            <div style={{ fontSize: 24, marginBottom: 10 }}>🗺️</div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Mapbox Token Missing</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>Please add VITE_MAPBOX_TOKEN to your .env file</div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(13,13,20,.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: '6px 10px', display: 'flex', gap: 12, zIndex: 1 }}>
        {[
          { label: 'Available', color: '#5DCAA5' },
          { label: 'On Trip', color: '#F5B800' },
          { label: 'Offline', color: '#555' }
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', fontWeight: 600 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────
function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function tooltipText(d) {
  return `${d.full_name} · ${d.plate || ''} · ${d.status}`
}

function popupHTML(d) {
  const color = STATUS_COLOR[d.status] || STATUS_COLOR.offline
  return `
    <div style="font-family:Inter,sans-serif;padding:4px 2px;min-width:140px">
      <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:4px">${d.full_name}</div>
      <div style="font-size:11px;color:#aaa;margin-bottom:6px">${d.car_model || ''} · ${d.plate || ''}</div>
      <span style="
        display:inline-block;
        padding:2px 8px;border-radius:20px;
        font-size:10px;font-weight:700;
        background:${color}22;color:${color};
        text-transform:capitalize
      ">${d.status.replace('_',' ')}</span>
    </div>
  `
}

const legendStyle = {
  position: 'absolute',
  bottom: 10, right: 10,
  background: 'rgba(15,17,23,.85)',
  backdropFilter: 'blur(6px)',
  border: '1px solid rgba(255,255,255,.08)',
  borderRadius: 8,
  padding: '6px 10px',
  display: 'flex',
  gap: 12,
}
