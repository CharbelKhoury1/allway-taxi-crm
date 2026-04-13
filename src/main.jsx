import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import DriverApp from './pages/DriverApp'
import './index.css'

// Route /driver to the PWA — everything else goes to the CRM.
// Fallback: if the URL is somehow '/' but a driver session exists in localStorage
// (e.g. home screen shortcut saved at the wrong URL), still load the Driver PWA.
const hasDriverSession = !!localStorage.getItem('allway_driver_session')
const isDriverPWA = window.location.pathname.startsWith('/driver') || hasDriverSession

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isDriverPWA ? <DriverApp /> : <App />}
  </React.StrictMode>
)
