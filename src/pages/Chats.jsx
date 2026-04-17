import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AV_COLORS = ['av-y', 'av-r', 'av-b', 'av-g', 'av-p']
function avColor(name = '') {
  let h = 0; for (const c of name) h += c.charCodeAt(0)
  return AV_COLORS[h % AV_COLORS.length]
}
function initials(name = '') {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}
function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
function fmtRelative(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso)
  if (diff < 60000)    return 'Just now'
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function Chats() {
  const [convs, setConvs]         = useState([])
  const [messages, setMessages]   = useState([])
  const [active, setActive]       = useState(null)
  const [reply, setReply]         = useState('')
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [sending, setSending]     = useState(false)
  const messagesEndRef             = useRef(null)
  const channelRef                 = useRef(null)

  // ── Load conversations ────────────────────────────────────────
  useEffect(() => {
    async function loadConvs() {
      const { data } = await supabase
        .from('conversations')
        .select('id, customer_id, last_message, last_message_at, customers(full_name, phone)')
        .order('last_message_at', { ascending: false })
      if (data) {
        setConvs(data)
        if (data.length > 0 && !active) setActive(data[0])
      }
      setLoading(false)
    }
    loadConvs()

    // Real-time: new/updated conversations
    const ch = supabase.channel('crm-convs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        loadConvs()
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  // ── Load messages when active conversation changes ────────────
  useEffect(() => {
    if (!active) return
    setMessages([])

    supabase
      .from('messages')
      .select('id, direction, body, sent_at')
      .eq('conversation_id', active.id)
      .order('sent_at', { ascending: true })
      .then(({ data }) => { if (data) setMessages(data) })

    // Unsubscribe from previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Subscribe to new messages in this conversation
    channelRef.current = supabase
      .channel(`chat-msgs-${active.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${active.id}` },
        ({ new: msg }) => {
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })
        }
      )
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [active?.id])

  // ── Auto-scroll ───────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send message ──────────────────────────────────────────────
  async function send() {
    const text = reply.trim()
    if (!text || !active || sending) return
    setSending(true)
    setReply('')

    const now  = new Date().toISOString()
    const tmpId = `tmp-${Date.now()}`

    // Optimistically add to UI immediately
    setMessages(prev => [...prev, { id: tmpId, direction: 'outbound', body: text, created_at: now }])

    // Insert and get the real row back so we can replace the tmp record.
    // The realtime INSERT handler deduplicates by id — once we replace tmp with
    // the real id, the realtime event will find it already present and skip it.
    const [{ data: inserted }] = await Promise.all([
      supabase.from('messages').insert({ conversation_id: active.id, direction: 'outbound', body: text, sent_at: now }).select().single(),
      supabase.from('conversations').update({ last_message: text, last_message_at: now }).eq('id', active.id),
    ])

    if (inserted) {
      setMessages(prev => prev.map(m => m.id === tmpId ? inserted : m))
    }
    setSending(false)
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function handleConvClick(conv) {
    setActive(conv)
    setReply('')
  }

  const filteredConvs = convs.filter(c => {
    if (!search) return true
    const name = c.customers?.full_name || ''
    return name.toLowerCase().includes(search.toLowerCase())
  })

  const head = active ? {
    name:  active.customers?.full_name || active.customers?.phone || 'Unknown',
    phone: active.customers?.phone || 'No phone',
    cls:   avColor(active.customers?.full_name || ''),
    init:  initials(active.customers?.full_name || active.customers?.phone || ''),
  } : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>

      {/* ── Conversation list ── */}
      <div className="chat-list">
        <div className="chat-search">
          <input
            placeholder="Search conversations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="chat-section-label">{convs.length} conversations</div>

        {loading ? (
          <div style={{ padding: '20px 14px', textAlign: 'center', fontSize: 12, color: 'var(--text-ter)' }}>Loading…</div>
        ) : filteredConvs.length === 0 ? (
          <div style={{ padding: '14px', textAlign: 'center', fontSize: 12, color: 'var(--text-ter)' }}>No conversations found.</div>
        ) : filteredConvs.map(c => {
          const name = c.customers?.full_name || c.customers?.phone || 'Unknown'
          const isActive = active?.id === c.id
          return (
            <div
              key={c.id}
              className="chat-item"
              style={{
                background: isActive ? 'var(--surface2)' : undefined,
                outline: isActive ? '1px solid rgba(255,255,255,.1)' : undefined,
              }}
              onClick={() => handleConvClick(c)}
            >
              <div className="chat-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div className={`av av-sm ${avColor(name)}`}>{initials(name)}</div>
                  <span className="chat-name">{name}</span>
                  {isActive && (
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--yellow)', display: 'inline-block', flexShrink: 0 }} />
                  )}
                </div>
                <span className="chat-time">{fmtRelative(c.last_message_at)}</span>
              </div>
              <div className="chat-prev">{c.last_message}</div>
            </div>
          )
        })}
      </div>

      {/* ── Chat window ── */}
      {!head ? (
        <div className="chat-window" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--text-ter)', fontSize: 13 }}>
          {loading ? 'Loading conversations…' : 'No conversations yet'}
        </div>
      ) : (
        <div className="chat-window">
          {/* Header */}
          <div className="chat-window-head" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className={`av ${head.cls}`} style={{ width: 40, height: 40, fontSize: 14 }}>{head.init}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-pri)' }}>{head.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-ter)' }}>{head.phone}</div>
              </div>
            </div>
            <span className="badge b-green" style={{ padding: '4px 12px', fontSize: '11px' }}>Active</span>
          </div>

          {/* Messages */}
          <div className="messages" style={{ gap: '14px', padding: '20px' }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-ter)', padding: '20px 0' }}>No messages yet</div>
            ) : messages.map((m, i) => (
              <div key={m.id || i} className={`msg msg-${m.direction === 'outbound' ? 'out' : 'in'}`} style={{ marginBottom: '4px' }}>
                <div className="msg-bubble" style={{ padding: '12px 16px', fontSize: '14px', lineHeight: '1.6' }}>
                  {m.body}
                </div>
                <div className="msg-time" style={{ marginTop: '6px', fontSize: '11px' }}>
                  {fmtTime(m.sent_at)}{m.direction === 'outbound' ? ' · Dispatcher' : ''}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply box */}
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
              disabled={!reply.trim() || sending}
              style={{ opacity: reply.trim() && !sending ? 1 : 0.5, cursor: reply.trim() && !sending ? 'pointer' : 'default' }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
