import { useState } from 'react'

const CONVERSATIONS = [
  { id:'sara',  init:'SR', cls:'av-r', name:'Sara Rizk',    time:'2:08 PM', prev:"I've been waiting 30 mins, unacceptable!", prevCls:'red',  type:'alert' },
  { id:'joe',   init:'JN', cls:'av-g', name:'Joe Nasr',     time:'1:52 PM', prev:'بدي agent، مش راضي عن السائق',           prevCls:'amber', type:'urgent' },
  { id:'ahmad', init:'AK', cls:'av-y', name:'Ahmad Khalil', time:'1:44 PM', prev:'شكراً، الشوفير وصل بالوقت',              prevCls:'',      type:'' },
  { id:'maya',  init:'MH', cls:'av-b', name:'Maya Haddad',  time:'1:31 PM', prev:'Can I book for tomorrow morning at 8?',  prevCls:'',      type:'' },
  { id:'lara',  init:'LF', cls:'av-p', name:'Lara Farah',   time:'12:55 PM',prev:'Booking confirmed, thank you!',          prevCls:'',      type:'' },
]

const SARA_MESSAGES = [
  { dir:'in',  text:'I need a taxi from Achrafieh to the Airport please', time:'1:38 PM', alert:false },
  { dir:'out', text:'Hello Sara! Happy to help. What time do you need the pickup?', time:'1:38 PM · Wallway AI', alert:false },
  { dir:'in',  text:"Right now, it's urgent", time:'1:39 PM', alert:false },
  { dir:'out', text:'Confirmed! Booking created — Achrafieh to Airport, now. A driver will be assigned shortly.', time:'1:39 PM · Wallway AI', alert:false },
  { dir:'in',  text:'30 minutes and NO driver!! I\'m going to miss my flight!!', time:'2:08 PM', alert:true },
  { dir:'out', text:'We sincerely apologise Sara. Connecting you with our dispatcher right now.', time:'2:08 PM · Wallway AI', alert:'amber' },
]

export default function Chats() {
  const [reply, setReply] = useState('')

  return (
    <div style={{display:'grid',gridTemplateColumns:'270px 1fr',gap:14,alignItems:'start'}}>
      <div className="chat-list">
        <div className="chat-search"><input placeholder="Search conversations..." /></div>
        <div className="chat-section-label">2 need attention</div>
        {CONVERSATIONS.map(c => (
          <div key={c.id} className={`chat-item${c.type ? ' '+c.type : ''}`}>
            <div className="chat-top">
              <div style={{display:'flex',alignItems:'center',gap:7}}>
                <div className={`av av-sm ${c.cls}`}>{c.init}</div>
                <span className="chat-name">{c.name}</span>
              </div>
              <span className="chat-time">{c.time}</span>
            </div>
            <div className={`chat-prev${c.prevCls ? ' '+c.prevCls : ''}`}>{c.prev}</div>
          </div>
        ))}
      </div>

      <div className="chat-window">
        <div className="chat-window-head">
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div className="av av-r" style={{width:34,height:34,fontSize:12}}>SR</div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:'var(--text-pri)'}}>Sara Rizk</div>
              <div style={{fontSize:11,color:'var(--text-ter)'}}>+961 70 345 678</div>
            </div>
          </div>
          <span className="badge b-red">Needs human</span>
        </div>
        <div className="messages">
          {SARA_MESSAGES.map((m, i) => (
            <div key={i} className={`msg msg-${m.dir}${m.alert === 'amber' ? ' alert-msg' : ''}`}>
              <div className="msg-bubble" style={m.alert === true ? {background:'rgba(224,75,74,.15)',color:'#F09595',borderRadius:'0 10px 10px 10px'} : {}}>{m.text}</div>
              <div className="msg-time">{m.time}</div>
            </div>
          ))}
        </div>
        <div className="chat-reply">
          <input placeholder="Reply as Wallway Taxi dispatcher..." value={reply} onChange={e => setReply(e.target.value)} />
          <button className="btn btn-primary" onClick={() => setReply('')}>Send</button>
        </div>
      </div>
    </div>
  )
}
