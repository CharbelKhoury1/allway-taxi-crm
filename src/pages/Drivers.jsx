import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

const STATUS_COLOR = { available:'#5DCAA5', on_trip:'#F5B800', offline:'#555' }
const STATUS_LABEL = { available:'Available', on_trip:'On Trip', offline:'Offline' }

export default function Drivers() {
  const [drivers, setDrivers]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setFilter]   = useState('All')
  const [selected, setSelected]     = useState(null)
  const mapContainer = useRef(null)
  const mapRef       = useRef(null)
  const markersRef   = useRef({})   // { driverId: mapboxgl.Marker }

  // ── Fetch drivers ────────────────────────────────────────────
  useEffect(() => {
    async function fetchDrivers() {
      const { data, error } = await supabase
        .from('drivers')
        .select('id, full_name, phone, plate, car_model, rating, total_trips, online, status, lat, lng, last_seen')
        .order('online', { ascending: false })
      if (!error && data) setDrivers(data)
      setLoading(false)
    }
    fetchDrivers()

    // Real-time: listen for driver updates (online status + location)
    const channel = supabase.channel('admin-drivers-watch')
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'drivers' }, payload => {
        setDrivers(prev => prev.map(d => d.id === payload.new.id ? { ...d, ...payload.new } : d))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── Mapbox init ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return
    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [35.50, 33.88],   // Beirut
      zoom: 11,
    })
    mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
  }, [])

  // ── Sync markers ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return

    const online = drivers.filter(d => d.online && d.lat && d.lng)

    // Remove markers for drivers no longer online / no location
    Object.keys(markersRef.current).forEach(id => {
      if (!online.find(d => d.id === id)) {
        markersRef.current[id].remove()
        delete markersRef.current[id]
      }
    })

    // Add / update markers
    online.forEach(d => {
      const el = document.createElement('div')
      el.style.cssText = `
        width:36px; height:36px; border-radius:50%; border:3px solid ${STATUS_COLOR[d.status]||'#F5B800'};
        background:#1a1a24; display:flex; align-items:center; justify-content:center;
        font-size:14px; font-weight:900; color:#fff; cursor:pointer;
        box-shadow:0 0 0 6px ${STATUS_COLOR[d.status]||'#F5B800'}22, 0 4px 12px rgba(0,0,0,.5);
        transition:transform .2s, box-shadow .2s;
      `
      el.textContent = d.full_name?.[0] || '?'
      el.title = d.full_name

      const popup = new mapboxgl.Popup({ offset:20, closeButton:false, maxWidth:'200px' })
        .setHTML(`
          <div style="font-family:Inter,sans-serif;padding:4px 0">
            <div style="font-weight:800;font-size:14px;margin-bottom:4px">${d.full_name}</div>
            <div style="font-size:12px;color:#888;margin-bottom:3px">${d.car_model || '—'} · ${d.plate || '—'}</div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:6px">
              <span style="width:8px;height:8px;border-radius:50%;background:${STATUS_COLOR[d.status]||'#888'};display:inline-block"></span>
              <span style="font-size:12px;font-weight:700;color:${STATUS_COLOR[d.status]||'#888'}">${STATUS_LABEL[d.status]||d.status}</span>
              <span style="font-size:11px;color:#666;margin-left:auto">⭐ ${d.rating}</span>
            </div>
          </div>
        `)

      if (markersRef.current[d.id]) {
        markersRef.current[d.id].setLngLat([d.lng, d.lat])
      } else {
        markersRef.current[d.id] = new mapboxgl.Marker({ element:el })
          .setLngLat([d.lng, d.lat])
          .setPopup(popup)
          .addTo(mapRef.current)
      }
    })
  }, [drivers])

  // ── Fly to selected driver ───────────────────────────────────
  useEffect(() => {
    if (!selected || !mapRef.current) return
    const d = drivers.find(dr => dr.id === selected)
    if (d?.lat && d?.lng) {
      mapRef.current.flyTo({ center:[d.lng, d.lat], zoom:14, duration:1200 })
      markersRef.current[d.id]?.togglePopup()
    }
  }, [selected])

  const online  = drivers.filter(d => d.online && d.status !== 'on_trip').length
  const onTrip  = drivers.filter(d => d.status === 'on_trip').length
  const offline = drivers.filter(d => !d.online).length

  const filtered = drivers.filter(d => {
    const q = search.toLowerCase()
    const matchQ = !q || d.full_name?.toLowerCase().includes(q) || d.car_model?.toLowerCase().includes(q) || d.plate?.toLowerCase().includes(q)
    const matchS = statusFilter === 'All' ||
      (statusFilter === 'Available' && d.status === 'available') ||
      (statusFilter === 'On Trip'   && d.status === 'on_trip') ||
      (statusFilter === 'Offline'   && !d.online)
    return matchQ && matchS
  })

  function fmtSeen(iso) {
    if (!iso) return '—'
    const diff = Date.now() - new Date(iso)
    if (diff < 60000)    return 'Just now'
    if (diff < 3600000)  return `${Math.floor(diff/60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`
    return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short' })
  }

  const COL = '1fr 110px 80px 70px 90px 80px'

  return (
    <div>
      {/* ── Stats ── */}
      <div className="metrics metrics-3" style={{ marginBottom:18 }}>
        <div className="metric"><div className="m-label">Online now</div><div className="m-val m-up">{online}</div></div>
        <div className="metric"><div className="m-label">On a trip</div><div className="m-val m-yellow">{onTrip}</div></div>
        <div className="metric"><div className="m-label">Offline</div><div className="m-val" style={{ color:'var(--text-ter)' }}>{offline}</div></div>
      </div>

      {/* ── Live Map ── */}
      <div style={{ borderRadius:16, overflow:'hidden', border:'1px solid var(--bdr)', marginBottom:20, position:'relative' }}>
        <div ref={mapContainer} style={{ height:320, width:'100%' }}/>
        {/* Live badge */}
        <div style={{ position:'absolute', top:12, left:12, display:'flex', alignItems:'center', gap:7, background:'rgba(13,13,20,.85)', backdropFilter:'blur(12px)', borderRadius:50, padding:'6px 14px', border:'1px solid rgba(255,255,255,.08)' }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#5DCAA5', animation:'livePulse 2s infinite', boxShadow:'0 0 8px #5DCAA5' }}/>
          <span style={{ fontSize:11, fontWeight:800, color:'#5DCAA5' }}>LIVE — {online + onTrip} active</span>
        </div>
        <style>{`@keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:.35} }`}</style>
        {online + onTrip === 0 && (
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, background:'rgba(13,13,20,.6)', backdropFilter:'blur(4px)' }}>
            <div style={{ fontSize:32 }}>🚗</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.4)' }}>No drivers online right now</div>
          </div>
        )}
      </div>

      {/* ── Search + filter ── */}
      <div className="search-row" style={{ marginBottom:14 }}>
        <input placeholder="Search name, car or plate…" style={{ flex:1 }} value={search} onChange={e => setSearch(e.target.value)}/>
        <select value={statusFilter} onChange={e => setFilter(e.target.value)}>
          <option>All</option>
          <option>Available</option>
          <option>On Trip</option>
          <option>Offline</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="table-wrap">
        <div className="table-head" style={{ gridTemplateColumns:COL }}>
          Driver<span>Car</span><span>Trips</span><span>Rating</span><span>Last seen</span><span>Status</span>
        </div>

        {loading ? (
          <div style={{ padding:'32px 16px', textAlign:'center', color:'var(--text-ter)', fontSize:13 }}>Loading drivers…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:'24px 16px', textAlign:'center', fontSize:13, color:'var(--text-ter)' }}>
            <div style={{ fontSize:22, marginBottom:8 }}>🔍</div>
            No drivers match your search.
            <span style={{ display:'block', marginTop:6, fontSize:12, color:'var(--yellow)', cursor:'pointer' }} onClick={() => { setSearch(''); setFilter('All') }}>Clear filters</span>
          </div>
        ) : filtered.map(d => (
          <div
            key={d.id} className="table-row"
            style={{ gridTemplateColumns:COL, background:selected===d.id?'rgba(245,184,0,.06)':undefined, borderLeft:selected===d.id?'3px solid var(--yellow)':'3px solid transparent', cursor:'pointer' }}
            onClick={() => setSelected(selected === d.id ? null : d.id)}
          >
            <div style={{ display:'flex', alignItems:'center', gap:9 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:STATUS_COLOR[d.status]||'#555', flexShrink:0 }}/>
              <div style={{ width:34, height:34, borderRadius:10, background:`${STATUS_COLOR[d.status]||'#555'}22`, border:`1px solid ${STATUS_COLOR[d.status]||'#555'}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:'var(--text-pri)', flexShrink:0 }}>
                {d.full_name?.[0]}
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text-pri)' }}>{d.full_name}</div>
                <div style={{ fontSize:11, color:'var(--text-ter)' }}>{d.plate}</div>
              </div>
            </div>
            <span style={{ fontSize:12, color:'var(--text-sec)' }}>{d.car_model||'—'}</span>
            <span style={{ fontSize:15, fontWeight:800 }}>{d.total_trips??0}</span>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--yellow)' }}>{d.rating??'—'}★</span>
            <span style={{ fontSize:12, color:'var(--text-ter)' }}>{fmtSeen(d.last_seen)}</span>
            <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:STATUS_COLOR[d.status]||'#888', background:`${STATUS_COLOR[d.status]||'#888'}15`, borderRadius:6, padding:'3px 8px', border:`1px solid ${STATUS_COLOR[d.status]||'#888'}30` }}>
              {STATUS_LABEL[d.status]||d.status||'Offline'}
            </span>
          </div>
        ))}
      </div>

      {filtered.length > 0 && (
        <div style={{ marginTop:10, fontSize:11, color:'var(--text-ter)', textAlign:'right' }}>
          Showing {filtered.length} of {drivers.length} drivers
          {(search || statusFilter !== 'All') && (
            <span style={{ marginLeft:8, color:'var(--yellow)', cursor:'pointer' }} onClick={() => { setSearch(''); setFilter('All') }}>Clear filters</span>
          )}
        </div>
      )}
    </div>
  )
}
