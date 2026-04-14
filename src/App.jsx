import { useState, useEffect } from 'react'
import { Toaster, toast } from 'sonner'
import { supabase } from './lib/supabase'
import Login     from './pages/Login'
import Dashboard  from './pages/Dashboard'
import Orders     from './pages/Orders'
import Customers  from './pages/Customers'
import Drivers    from './pages/Drivers'
import Analytics  from './pages/Analytics'
import Chats      from './pages/Chats'
import Staff      from './pages/Staff'
import Marketing  from './pages/Marketing'
import Loyalty    from './pages/Loyalty'




const NAV = [
  {
    section: 'Operations',
    items: [
      { id:'dash',      label:'Dashboard', badge:null,
        icon:<><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></> },
      { id:'orders',    label:'Orders',    badge:null,
        icon:<><rect x="2" y="2" width="12" height="12" rx="1.5"/><line x1="5" y1="6" x2="11" y2="6"/><line x1="5" y1="9" x2="9" y2="9"/></> },
      { id:'chats',     label:'WhatsApp',  badge:2,
        icon:<path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H5l-3 2V3z"/> },
    ],
  },
  {
    section: 'People',
    items: [
      { id:'customers', label:'Customers', badge:null,
        icon:<><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3 2.7-5 6-5s6 2 6 5"/></> },
      { id:'drivers',   label:'Drivers',   badge:null,
        icon:<><circle cx="8" cy="4" r="2.5"/><rect x="3" y="9" width="10" height="5" rx="1"/><line x1="6" y1="9" x2="6" y2="14"/><line x1="10" y1="9" x2="10" y2="14"/></> },
    ],
  },
  {
    section: 'Insights',
    items: [
      { id:'analytics', label:'Analytics', badge:null,
        icon:<polyline points="2,12 6,7 9,10 14,4"/> },
    ],
  },
  {
    section: 'Admin',
    items: [
      { id:'staff',     label:'Staff',     badge:null,
        icon:<><circle cx="5" cy="4" r="2"/><circle cx="11" cy="4" r="2"/><path d="M1 13c0-2.2 1.8-4 4-4"/><path d="M15 13c0-2.2-1.8-4-4-4"/><path d="M5 9c1.1-.6 2.2-1 3-1s1.9.4 3 1c1.2.7 2 2 2 4H3c0-2 .8-3.3 2-4z"/></> },
    ],
  },
  {
    section: 'Growth',
    items: [
      { id:'marketing', label:'Marketing', badge:null,
        icon:<><path d="M2 10l5-7 3 4 2-2 2 5"/><circle cx="13" cy="11" r="2"/></> },
      { id:'loyalty',   label:'Loyalty',   badge:null,
        icon:<polygon points="8,1 10,6 15,6 11,9 13,14 8,11 3,14 5,9 1,6 6,6"/> },
    ],
  },
]


const PAGE_TITLES  = { dash:'Dashboard', orders:'Orders', customers:'Customers', drivers:'Drivers', analytics:'Analytics', chats:'WhatsApp chats', staff:'Staff', marketing:'Marketing', loyalty:'Loyalty' }
const PAGE_ACTIONS = { dash:'+ New order', orders:'Export CSV', customers:'+ Add customer', drivers:'+ Add driver', analytics:'Export report', chats:'Mark all read', staff:'+ Add staff', marketing:'+ New campaign', loyalty:'+ Add reward' }

const PAGES = { dash:Dashboard, orders:Orders, customers:Customers, drivers:Drivers, analytics:Analytics, chats:Chats, staff:Staff, marketing:Marketing, loyalty:Loyalty }



function useLiveTime() {
  function fmt() {
    const n = new Date()
    return n.toLocaleDateString('en-GB', {weekday:'short',day:'numeric',month:'short'}) + ' · ' + n.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'})
  }
  const [time, setTime] = useState(() => fmt())
  useEffect(() => {
    const id = setInterval(() => setTime(fmt()), 30000)
    return () => clearInterval(id)
  }, [])
  return time
}

export default function App() {
  // null = loading, false = logged out, object = logged in user
  const [user, setUser]   = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [page, setPage]   = useState(() => localStorage.getItem('currentPage') || 'dash')
  const [showModal, setShowModal] = useState(false)
  const [availableDrivers, setAvailableDrivers] = useState([])
  const time = useLiveTime()

  // Bootstrap: restore existing session, then listen for auth changes
  useEffect(() => {
    // 8-second timeout so a bad Supabase URL never hangs the loading screen
    const timeout = setTimeout(() => {
      setUser(false)
      setAuthReady(true)
    }, 8000)

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(timeout)
        setUser(session?.user ?? false)
        setAuthReady(true)
      })
      .catch(() => {
        clearTimeout(timeout)
        // Supabase unreachable (e.g. missing env vars in deployment)
        setUser(false)
        setAuthReady(true)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Persist theme and apply to root element
  useEffect(() => {
    localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Persist current page
  useEffect(() => {
    localStorage.setItem('currentPage', page)
  }, [page])

  // Remove the no-transitions class after the first paint
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      document.documentElement.classList.remove('no-transitions')
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setPage('dash')
  }

  // Still resolving session — show a branded spinner instead of blank screen
  if (!authReady) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0F0F0F', flexDirection:'column', gap:16 }}>
      <img src="/allway-logo.ico" alt="Allway Taxi" style={{ width:44, height:44, objectFit:'contain' }} />
      <div style={{ width:24, height:24, border:'3px solid rgba(245,184,0,.2)', borderTopColor:'#F5B800', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}></div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (!user) {
    return <Login onLogin={setUser} />
  }

  let PageComponent = PAGES[page]
  if (!PageComponent) {
    PageComponent = PAGES['dash']
  }

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')

  async function handleAction() {
    if (page === 'chats') {
      const { error } = await supabase.from('conversations').update({ status: 'resolved' }).in('status', ['active', 'needs_human'])
      if (!error) { toast.success('All conversations marked as resolved'); setTimeout(() => window.location.reload(), 800) }
    } else if (page === 'orders') {
      toast.success('Live CSV Export generated successfully')
      window.dispatchEvent(new CustomEvent('export-csv'))
    } else if (page === 'analytics') {
      toast.success('Generating Analytics Report...')
      window.dispatchEvent(new CustomEvent('export-analytics'))
    } else if (page === 'dash') {
      const { data } = await supabase
        .from('drivers')
        .select('id, full_name, plate')
        .eq('online', true)
        .eq('status', 'available')
        .order('full_name')
      setAvailableDrivers(data || [])
      setShowModal(true)
    } else if (['customers', 'drivers', 'staff', 'loyalty', 'marketing'].includes(page)) {
      setShowModal(true)
    }
  }

  return (
    <div className="app">
      <Toaster position="top-center" richColors theme={theme} />
      
      {/* GLOBAL MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card anim-scale" onClick={e => e.stopPropagation()}>
             <div className="modal-head">
                <div style={{fontSize:16, fontWeight:800}}>{PAGE_ACTIONS[page]}</div>
                <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
             </div>
             <div className="modal-body">
                {page === 'dash' && (
                  <form onSubmit={async e => {
                    e.preventDefault();
                    const fd       = new FormData(e.target);
                    const driverId = fd.get('driver_id') || null;
                    const { error } = await supabase.from('trips').insert({
                      pickup_address:  fd.get('p'),
                      dropoff_address: fd.get('d'),
                      driver_id:       driverId,
                      status:          driverId ? 'dispatching' : 'pending',
                      requested_at:    new Date().toISOString(),
                    });
                    if (!error) {
                      toast.success(driverId ? 'Trip dispatched — driver notified!' : 'Trip queued — assign a driver from Orders');
                      setShowModal(false);
                      setTimeout(() => window.location.reload(), 800);
                    } else { toast.error(error.message); }
                  }}>
                    <div className="f-row"><label>Pickup Address</label><input required name="p" placeholder="eg Mina Jbeil" /></div>
                    <div className="f-row"><label>Dropoff Address</label><input required name="d" placeholder="eg City Centre, Beirut" /></div>
                    <div className="f-row">
                      <label>Assign Driver{availableDrivers.length === 0 ? ' — none online' : ` (${availableDrivers.length} available)`}</label>
                      <select name="driver_id" style={{width:'100%',padding:10,background:'var(--bg)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text-pri)',outline:'none',marginTop:6,fontFamily:'var(--font)',fontSize:13}}>
                        <option value="">— Unassigned (dispatch later)</option>
                        {availableDrivers.map(d => (
                          <option key={d.id} value={d.id}>{d.full_name} · {d.plate}</option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{width:'100%', marginTop:14}}>
                      {availableDrivers.length > 0 ? 'Dispatch Trip' : 'Create Trip Request'}
                    </button>
                  </form>
                )}
                {page === 'customers' && (
                  <form onSubmit={async e => { 
                    e.preventDefault(); 
                    const fd = new FormData(e.target);
                    const { error } = await supabase.from('customers').insert({ full_name: fd.get('name'), phone: fd.get('phone') });
                    if (!error) { toast.success('Customer added to database!'); setShowModal(false); setTimeout(() => window.location.reload(), 1000); }
                    else { toast.error(error.message); }
                  }}>
                    <div className="f-row"><label>Full Name</label><input required name="name" placeholder="eg Charbel Khoury" /></div>
                    <div className="f-row"><label>Phone Number</label><input required name="phone" placeholder="+961..." /></div>
                    <button type="submit" className="btn btn-primary" style={{width:'100%', marginTop:10}}>Save Customer</button>
                  </form>
                )}
                {page === 'drivers' && (
                  <form onSubmit={async e => { 
                    e.preventDefault(); 
                    const fd = new FormData(e.target);
                    const { error } = await supabase.from('drivers').insert({ 
                      full_name: fd.get('name'), 
                      car_model: fd.get('car'), 
                      plate: fd.get('plate'),
                      online: false,
                      status: 'offline'
                    });
                    if (!error) { toast.success('Driver registered successfully!'); setShowModal(false); setTimeout(() => window.location.reload(), 1000); }
                    else { toast.error(error.message); }
                  }}>
                    <div className="f-row"><label>Driver Name</label><input required name="name" placeholder="Full name" /></div>
                    <div className="f-row"><label>Vehicle Model</label><input required name="car" placeholder="eg Toyota Corolla"/></div>
                    <div className="f-row"><label>License Plate</label><input required name="plate" placeholder="B 12345"/></div>
                    <button type="submit" className="btn btn-primary" style={{width:'100%', marginTop:10}}>Register Driver</button>
                  </form>
                )}
                {page === 'staff' && (
                  <form onSubmit={async e => { 
                    e.preventDefault(); 
                    const fd = new FormData(e.target);
                    const { error } = await supabase.from('staff').insert({ 
                      full_name: fd.get('name'), 
                      role: fd.get('role'), 
                      email: fd.get('email')
                    });
                    if (!error) { toast.success('Staff member added!'); setShowModal(false); setTimeout(() => window.location.reload(), 1000); }
                    else { toast.error(error.message); }
                  }}>
                    <div className="f-row"><label>Full Name</label><input required name="name" placeholder="eg Elias Mansour" /></div>
                    <div className="f-row"><label>Role</label>
                      <select name="role" className="f-input" style={{width:'100%', padding:12, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text-pri)', outline:'none'}}>
                        <option value="dispatcher">Dispatcher</option>
                        <option value="admin">Admin</option>
                        <option value="support">Support</option>
                        <option value="manager">Manager</option>
                      </select>
                    </div>
                    <div className="f-row" style={{marginTop:16}}><label>Email Address</label><input required name="email" type="email" placeholder="email@allwaytaxi.com" /></div>
                    <button type="submit" className="btn btn-primary" style={{width:'100%', marginTop:10}}>Add to Team</button>
                  </form>
                )}
                {page === 'marketing' && (
                  <form onSubmit={async e => {
                    e.preventDefault();
                    const fd     = new FormData(e.target);
                    const expiry = fd.get('expiry');
                    const { error } = await supabase.from('promo_codes').insert({
                      code:           fd.get('code').toUpperCase(),
                      discount_type:  fd.get('discount_type'),
                      discount_value: parseFloat(fd.get('discount_value')),
                      status:         'active',
                      expires_at:     expiry || null,
                    });
                    if (!error) { toast.success('Promo code created!'); setShowModal(false); setTimeout(() => window.location.reload(), 1000); }
                    else { toast.error(error.message); }
                  }}>
                    <div className="f-row"><label>Promo Code</label><input required name="code" placeholder="eg SUMMER24" style={{textTransform:'uppercase'}} /></div>
                    <div style={{display:'flex',gap:10,marginTop:8}}>
                      <div className="f-row" style={{flex:1,marginTop:0}}>
                        <label>Type</label>
                        <select name="discount_type" style={{width:'100%',padding:10,background:'var(--bg)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text-pri)',outline:'none',marginTop:6,fontFamily:'var(--font)',fontSize:13}}>
                          <option value="percent">Percent (%)</option>
                          <option value="fixed">Fixed ($)</option>
                        </select>
                      </div>
                      <div className="f-row" style={{flex:1,marginTop:0}}>
                        <label>Value</label>
                        <input required name="discount_value" type="number" min="1" placeholder="eg 15" style={{marginTop:6}} />
                      </div>
                    </div>
                    <div className="f-row"><label>Expiry Date (optional)</label><input name="expiry" type="date" /></div>
                    <button type="submit" className="btn btn-primary" style={{width:'100%', marginTop:10}}>Create Promo Code</button>
                  </form>
                )}
                {page === 'loyalty' && (
                  <form onSubmit={async e => {
                    e.preventDefault();
                    const fd    = new FormData(e.target);
                    const phone = fd.get('phone');
                    const pts   = parseInt(fd.get('points'), 10);
                    const { data: cust } = await supabase.from('customers').select('id').eq('phone', phone).single();
                    if (!cust) { toast.error('Customer not found with that phone number'); return; }
                    const { data: la } = await supabase.from('loyalty_accounts').select('id, points_balance').eq('customer_id', cust.id).single();
                    if (!la) { toast.error('No loyalty account found for this customer'); return; }
                    const newBal = Math.max(0, (la.points_balance || 0) + pts);
                    const { error } = await supabase.from('loyalty_accounts').update({ points_balance: newBal }).eq('id', la.id);
                    if (!error) { toast.success(`Balance updated → ${newBal} pts`); setShowModal(false); setTimeout(() => window.location.reload(), 800); }
                    else { toast.error(error.message); }
                  }}>
                    <div className="f-row"><label>Customer Phone</label><input required name="phone" placeholder="+961..." /></div>
                    <div className="f-row"><label>Points Adjustment (negative to deduct)</label><input required name="points" type="number" placeholder="eg 100 or -50" /></div>
                    <button type="submit" className="btn btn-primary" style={{width:'100%', marginTop:10}}>Adjust Points</button>
                  </form>
                )}
                {!['dash','customers','drivers','staff','marketing','loyalty'].includes(page) && (
                  <div style={{padding:20, textAlign:'center'}}>
                    <div style={{fontSize:40, marginBottom:10}}>🛠️</div>
                    <div style={{fontSize:15, fontWeight:700}}>{PAGE_ACTIONS[page]}</div>
                    <p style={{fontSize:13, color:'var(--text-ter)', marginTop:6}}>The "{page}" creation module is being synchronized with the database.</p>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* SIDEBAR... */}
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="sb-brand">
          <img src="/allway-logo.ico" alt="Allway Taxi" className="sb-logo" style={{ objectFit: 'contain', background: 'transparent' }} />
          <div className="sb-brand-text">
            <div className="sb-brand-name">ALLWAY <span>TAXI</span></div>
            <div className="sb-brand-sub">Operations CRM</div>
          </div>
        </div>

        {NAV.map(group => (
          <div key={group.section}>
            <div className="sb-section">{group.section}</div>
            {group.items.map(item => (
              <div key={item.id} className={`nav-item${page === item.id ? ' active' : ''}`} onClick={() => setPage(item.id)}>
                <div className="nav-inner">
                  <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">{item.icon}</svg>
                  <span>{item.label}</span>
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                </div>
              </div>
            ))}
          </div>
        ))}

        <div className="sb-footer">
          <div className="sb-av">D</div>
          <div>
            <div className="sb-uname">Dispatcher</div>
            <div className="sb-urole">allwaytaxi.com</div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="main">
        <div className="topbar">
          <div className="tb-left">
            <div className="tb-accent"></div>
            <div className="tb-title">{PAGE_TITLES[page]}</div>
          </div>
          <div className="tb-right">
            <div className="tb-time">{time}</div>
            
            <button 
              className="btn" 
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}
            >
              {theme === 'dark' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>

            <button className="btn btn-primary" onClick={handleAction}>
              {PAGE_ACTIONS[page]}
            </button>
            <button className="btn" style={{ marginLeft: 8 }} onClick={handleLogout}>Logout</button>
          </div>
        </div>

        <div className="content">
          <div key={page} className="anim-fade">
            <PageComponent onNavigate={setPage} />
          </div>
        </div>
      </div>
    </div>
  )
}





