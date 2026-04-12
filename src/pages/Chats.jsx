import { useState, useRef, useEffect } from 'react'

const CONVERSATIONS = [
  { id:'sara',  init:'SR', cls:'av-r', name:'Sara Rizk',    time:'2:08 PM', prev:"I've been waiting 30 mins, unacceptable!", prevCls:'red',   type:'alert'  },
  { id:'joe',   init:'JN', cls:'av-g', name:'Joe Nasr',     time:'1:52 PM', prev:'بدي agent، مش راضي عن السائق',            prevCls:'amber', type:'urgent' },
  { id:'ahmad', init:'AK', cls:'av-y', name:'Ahmad Khalil', time:'1:44 PM', prev:'شكراً، الشوفير وصل بالوقت',               prevCls:'',      type:''       },
  { id:'maya',  init:'MH', cls:'av-b', name:'Maya Haddad',  time:'1:31 PM', prev:'Can I book for tomorrow morning at 8?',   prevCls:'',      type:''       },
  { id:'lara',  init:'LF', cls:'av-p', name:'Lara Farah',   time:'12:55 PM',prev:'Booking confirmed, thank you!',           prevCls:'',      type:''       },
]

const HEADS = {
  sara:  { init:'SR', cls:'av-r', name:'Sara Rizk',    phone:'+961 70 345 678', badge:'b-red',   badgeText:'Needs human'    },
  joe:   { init:'JN', cls:'av-g', name:'Joe Nasr',     phone:'+961 76 123 456', badge:'b-amber', badgeText:'Needs human'    },
  ahmad: { init:'AK', cls:'av-y', name:'Ahmad Khalil', phone:'+961 71 234 567', badge:'b-green', badgeText:'Resolved'       },
  maya:  { init:'MH', cls:'av-b', name:'Maya Haddad',  phone:'+961 78 567 890', badge:'b-blue',  badgeText:'Pending booking'},
  lara:  { init:'LF', cls:'av-p', name:'Lara Farah',   phone:'+961 79 678 901', badge:'b-green', badgeText:'Resolved'       },
}

const INIT_MESSAGES = {
  sara: [
    { dir:'in',  text:'I need a taxi from Achrafieh to the Airport please',                                          time:'1:38 PM'             },
    { dir:'out', text:'Hello Sara! Happy to help. What time do you need the pickup?',                                 time:'1:38 PM · Allway AI'},
    { dir:'in',  text:"Right now, it's urgent",                                                                      time:'1:39 PM'             },
    { dir:'out', text:'Confirmed! Booking created — Achrafieh to Airport, now. A driver will be assigned shortly.',  time:'1:39 PM · Allway AI'},
    { dir:'in',  text:"30 minutes and NO driver!! I'm going to miss my flight!!", urgentIn:true,                     time:'2:08 PM'             },
    { dir:'out', text:'We sincerely apologise Sara. Connecting you with our dispatcher right now.', alertAmber:true, time:'2:08 PM · Allway AI'},
  ],
  joe: [
    { dir:'in',  text:'السلام عليكم، أنا بانتظار التاكسي من ٢٠ دقيقة',                                           time:'1:35 PM'             },
    { dir:'out', text:'أهلاً جو! نأسف للتأخير، السائق في الطريق إليك الآن.',                                      time:'1:36 PM · Allway AI'},
    { dir:'in',  text:'السائق كان وقح ومش محترم',                                                                  time:'1:50 PM'             },
    { dir:'out', text:'نأسف جداً على هذه التجربة. سنتابع الموضوع مع الإدارة فوراً.',                              time:'1:51 PM · Allway AI'},
    { dir:'in',  text:'بدي agent، مش راضي عن السائق',                                                              time:'1:52 PM'             },
  ],
  ahmad: [
    { dir:'in',  text:'مرحبا، أريد حجز تاكسي من حمرا إلى فردان',                                                  time:'1:40 PM'             },
    { dir:'out', text:'أهلاً أحمد! تم تأكيد الحجز. السائق كريم في طريقه إليك.',                                  time:'1:41 PM · Allway AI'},
    { dir:'in',  text:'شكراً، الشوفير وصل بالوقت',                                                                 time:'1:44 PM'             },
    { dir:'out', text:'شكراً لك! نسعد دائماً بخدمتك.',                                                             time:'1:44 PM · Allway AI'},
  ],
  maya: [
    { dir:'in',  text:'Hi! Is it possible to schedule a ride in advance?',                                          time:'1:28 PM'             },
    { dir:'out', text:'Hi Maya! Yes, absolutely. Just tell me the date, time and pickup location.',                  time:'1:29 PM · Allway AI'},
    { dir:'in',  text:'Can I book for tomorrow morning at 8?',                                                      time:'1:31 PM'             },
    { dir:'out', text:'Sure! From your saved Home (Raouche) to Work (ABC Mall)?',                                    time:'1:31 PM · Allway AI'},
  ],
  lara: [
    { dir:'in',  text:'Hi, I need a ride from Zalka to Gemmayzeh please',                                           time:'12:50 PM'            },
    { dir:'out', text:'Hi Lara! Booking confirmed. Driver Tony G. is on his way to Zalka Highway.',                  time:'12:51 PM · Allway AI'},
    { dir:'in',  text:'Booking confirmed, thank you!',                                                              time:'12:55 PM'            },
    { dir:'out', text:"You're welcome Lara! Have a great day 🚕",                                                   time:'12:55 PM · Allway AI'},
  ],
}

function nowTime() {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export default function Chats() {
  const [active, setActive]     = useState('sara')
  const [messages, setMessages] = useState(INIT_MESSAGES)
  const [reply, setReply]       = useState('')
  const [search, setSearch]     = useState('')
  const messagesEndRef           = useRef(null)

  // Auto-scroll to latest message whenever messages or active chat changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, active])

  function send() {
    const text = reply.trim()
    if (!text) return
    const newMsg = { dir:'out', text, time: nowTime() + ' · Dispatcher' }
    setMessages(prev => ({ ...prev, [active]: [...(prev[active] || []), newMsg] }))
    setReply('')
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function handleConvClick(id) {
    setActive(id)
    setReply('')  // clear any pending draft when switching chats
  }

  const filteredConvs = CONVERSATIONS.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  )

  const head = HEADS[active]
  const msgs = messages[active] || []

  // How many conversations need attention
  const attentionCount = CONVERSATIONS.filter(c => c.type === 'alert' || c.type === 'urgent').length

  return (
    <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:20, alignItems:'start' }}>

      {/* Conversation list */}
      <div className="chat-list">
        <div className="chat-search">
          <input
            placeholder="Search conversations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="chat-section-label">{attentionCount} need attention</div>
        {filteredConvs.length === 0 ? (
          <div style={{padding:'14px',textAlign:'center',fontSize:12,color:'var(--text-ter)'}}>No conversations found.</div>
        ) : filteredConvs.map(c => (
          <div
            key={c.id}
            className={`chat-item${c.type ? ' '+c.type : ''}`}
            style={{
              background: active === c.id
                ? 'var(--surface2)'
                : c.type === 'alert'  ? 'rgba(224,75,74,.04)'
                : c.type === 'urgent' ? 'rgba(245,184,0,.04)'
                : undefined,
              outline: active === c.id ? '1px solid rgba(255,255,255,.1)' : undefined,
            }}
            onClick={() => handleConvClick(c.id)}
          >
            <div className="chat-top">
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <div className={`av av-sm ${c.cls}`}>{c.init}</div>
                <span className="chat-name">{c.name}</span>
                {active === c.id && (
                  <span style={{width:6,height:6,borderRadius:'50%',background:'var(--yellow)',display:'inline-block',flexShrink:0}}></span>
                )}
              </div>
              <span className="chat-time">{c.time}</span>
            </div>
            <div className={`chat-prev${c.prevCls ? ' '+c.prevCls : ''}`}>{c.prev}</div>
          </div>
        ))}
      </div>

      {/* Chat window */}
      <div className="chat-window">
        <div className="chat-window-head" style={{ padding: '16px 20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div className={`av ${head.cls}`} style={{ width:40, height:40, fontSize:14 }}>{head.init}</div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--text-pri)' }}>{head.name}</div>
              <div style={{ fontSize:12, color:'var(--text-ter)' }}>{head.phone}</div>
            </div>
          </div>
          <span className={`badge ${head.badge}`} style={{ padding: '4px 12px', fontSize: '11px' }}>{head.badgeText}</span>
        </div>

        <div className="messages" style={{ gap: '14px', padding: '20px' }}>
          {msgs.map((m, i) => (
            <div
              key={i}
              className={`msg msg-${m.dir}${m.alertAmber ? ' alert-msg' : ''}`}
              style={{ marginBottom: '4px' }}
            >
              <div
                className="msg-bubble"
                style={{
                  padding: '12px 16px',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  ...(m.urgentIn ? { background:'rgba(224,75,74,.15)', color:'#F09595', borderRadius:'0 10px 10px 10px' } : {})
                }}
              >
                {m.text}
              </div>
              <div className="msg-time" style={{ marginTop: '6px', fontSize: '11px' }}>{m.time}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-reply">
          <input
            placeholder={`Reply to ${head.name} as Allway Taxi dispatcher...`}
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={handleKey}
          />
          <button
            className="btn btn-primary"
            onClick={send}
            disabled={!reply.trim()}
            style={{ opacity: reply.trim() ? 1 : 0.5, cursor: reply.trim() ? 'pointer' : 'default' }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
