import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login({ onLogin }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    onLogin(data.user)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <img src="/allway-logo.ico" alt="Allway Taxi" style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 16 }} />
          <h1>Allway Taxi</h1>
          <p>Operations Control Center</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@allwaytaxi.com"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div style={{ fontSize: 13, color: '#F09595', background: 'rgba(240,149,149,.1)', border: '1px solid rgba(240,149,149,.2)', borderRadius: 8, padding: '10px 14px' }}>
              {error}
            </div>
          )}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <p>Allway Taxi &copy; {new Date().getFullYear()} — Authorized access only</p>
        </div>
      </div>

      <div className="login-bg-decor">
        <div className="decor-circle circle-1"></div>
        <div className="decor-circle circle-2"></div>
      </div>

      <style>{`
        .login-page {
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0F0F0F;
          font-family: 'Inter', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .login-card {
          width: 400px;
          background: #1C1C1C;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 40px;
          position: relative;
          z-index: 10;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }

        .login-header {
          text-align: center;
          margin-bottom: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .login-header h1 {
          font-size: 24px;
          font-weight: 800;
          color: #F0F0F0;
          margin-bottom: 4px;
        }

        .login-header p {
          font-size: 14px;
          color: rgba(240,240,240,0.4);
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 12px;
          font-weight: 600;
          color: rgba(240,240,240,0.6);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .form-group input {
          background: #252525;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 12px 16px;
          color: #F0F0F0;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .form-group input:focus {
          border-color: #F5B800;
          box-shadow: 0 0 0 3px rgba(245,184,0,0.1);
        }

        .login-btn {
          margin-top: 10px;
          background: #F5B800;
          color: #111;
          border: none;
          border-radius: 10px;
          padding: 14px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.1s, background 0.2s;
        }

        .login-btn:hover {
          background: #e6ac00;
        }

        .login-btn:active {
          transform: scale(0.98);
        }

        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-footer {
          margin-top: 24px;
          text-align: center;
        }

        .login-footer p {
          font-size: 11px;
          color: rgba(240,240,240,0.3);
        }

        .login-footer span {
          color: rgba(240,240,240,0.5);
          font-weight: 600;
        }

        .login-bg-decor {
          position: absolute;
          inset: 0;
          z-index: 1;
        }

        .decor-circle {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
        }

        .circle-1 {
          width: 400px;
          height: 400px;
          background: rgba(245,184,0,0.05);
          top: -100px;
          right: -100px;
        }

        .circle-2 {
          width: 500px;
          height: 500px;
          background: rgba(55,138,221,0.03);
          bottom: -150px;
          left: -150px;
        }
      `}</style>
    </div>
  )
}
