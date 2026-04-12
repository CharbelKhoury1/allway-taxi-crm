import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import DriverApp from './pages/DriverApp'
import './index.css'

// Route /driver to the PWA — everything else goes to the CRM.
// No React Router needed; this runs before any component mounts.
const isDriverPWA = window.location.pathname.startsWith('/driver')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isDriverPWA ? <DriverApp /> : <App />}
  </React.StrictMode>
)
