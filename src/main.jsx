import React from 'react'
import ReactDOM from 'react-dom/client'
import { Analytics } from "@vercel/analytics/react"
import App from './App'
import DriverApp from './pages/DriverApp'
import TripTracking from './pages/TripTracking'
import './index.css'

// ── Path-based routing ────────────────────────────────────────────────────
// /driver          → Driver PWA (no auth, full-screen mobile app)
// /track/<tripId>  → Customer live-tracking page (public, no auth)
// everything else  → Operations CRM (requires Supabase auth)

const path = window.location.pathname

const isDriverPWA = path.startsWith('/driver')

const TRACK_RE  = /^\/track\/([0-9a-f-]{36})\/?$/i
const trackHit  = path.match(TRACK_RE)
const isTracking = !!trackHit
const tripId     = trackHit?.[1] ?? null

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isDriverPWA
      ? <DriverApp />
      : isTracking
      ? <TripTracking tripId={tripId} />
      : <App />
    }
    <Analytics />
  </React.StrictMode>
)
