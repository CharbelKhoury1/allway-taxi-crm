import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Chats() {
  const [active, setActive]     = useState(null)
  const [conversations, setConvs] = useState([])
  const [messages, setMessages] = useState([])
  const [loading, setLoading]   = useState(true)
  const [reply, setReply]       = useState('')
  const [search, setSearch]     = useState('')
  const messagesEndRef           = useRef(null)

  useEffect(() => {
    async function fetchChats() {
      const { data } = await supabase
        .from('conversations')
        .select('*, customers(full_name, phone)')
        .order('last_message_at', { ascending: false })
      
      if (data && data.length > 0) {
        setConvs(data)
        // If nothing active yet, pick the first
        if (!active) setActive(data[0].id)
      }
      setLoading(false)
    }
    fetchChats()

    // Real-time subscription for new messages
    const sub = supabase.channel('msgs').on('postgres_changes', { event:'INSERT', schema:'public', table:'messages' }, () => {
      fetchChats()
    }).subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  useEffect(() => {
    if (!active) return
    async function fetchMessages() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', active)
        .order('sent_at', { ascending: true })
      if (data) setMessages(data)
    }
    fetchMessages()
  }, [active])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = reply.trim()
    if (!text || !active) return
    
    // Optimistic UI update
    const tempMsg = { direction:'outbound', body:text, sent_at: new Date().toISOString(), sender:'dispatcher' }
    setMessages(prev => [...prev, tempMsg])
    setReply('')

    await supabase.from('messages').insert({
      conversation_id: active,
      direction: 'outbound',
      sender: 'dispatcher',
      body: text
    })
  }

  const filteredConvs = conversations.filter(c =>
    !search || c.customers?.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div style={{padding:40, textAlign:'center', color:'var(--text-ter)'}}>Loading conversations...</div>

  if (conversations.length === 0) {
    return (
      <div className="card" style={{minHeight: 500, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:40}}>
        <div style={{fontSize:48, marginBottom:16}}>💬</div>
        <div style={{fontSize:18, fontWeight:800, color:'var(--text-pri)', marginBottom:8}}>No active conversations</div>
        <p style={{fontSize:13, color:'var(--text-ter)', maxWidth:400, margin:'0 auto 24px', lineHeight:1.6}}>
          When customers message your AI Agent via WhatsApp, their conversations will appear here live.
        </p>
      </div>
    )
  }

  const activeConv = conversations.find(c => c.id === active)

  return (
    <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:20, alignItems:'start' }}>
      <div className="chat-list">
        <div className="chat-search">
          <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="chat-section-label">All conversations</div>
        {filteredConvs.map(c => (
          <div key={c.id} className="chat-item" style={{ background: active === c.id ? 'var(--surface2)' : undefined }} onClick={() => setActive(c.id)}>
             <div className="chat-top">
                <span className="chat-name">{c.customers?.full_name || 'Anonymous'}</span>
                <span className="chat-time">{new Date(c.last_message_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
             </div>
             <div className={`chat-prev ${c.status === 'needs_human' ? 'red' : ''}`}>
               {c.status === 'needs_human' ? '⚠️ Human help needed' : 'Handled by AI'}
             </div>
          </div>
        ))}
      </div>

      <div className="chat-window">
        <div className="chat-window-head">
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div className="av av-y">{activeConv?.customers?.full_name?.[0]}</div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--text-pri)' }}>{activeConv?.customers?.full_name}</div>
              <div style={{ fontSize:12, color:'var(--text-ter)' }}>{activeConv?.customers?.phone}</div>
            </div>
          </div>
          <span className={`badge ${activeConv?.status === 'needs_human' ? 'b-red' : 'b-green'}`}>
            {activeConv?.status === 'needs_human' ? 'NEEDS HUMAN' : 'AI ACTIVE'}
          </span>
        </div>
        <div className="messages">
          {messages.map((m, i) => (
             <div key={i} className={`msg msg-${m.direction === 'inbound' ? 'in' : 'out'}`}>
                <div className="msg-bubble">{m.body}</div>
                <div className="msg-time">{new Date(m.sent_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
             </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-reply">
          <input 
            placeholder="Type a reply..." 
            value={reply} 
            onChange={e => setReply(e.target.value)} 
            onKeyDown={e => e.key==='Enter' && send()} 
          />
          <button className="btn btn-primary" onClick={send} disabled={!reply.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
