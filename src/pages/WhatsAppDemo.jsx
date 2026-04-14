import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

const MOCK_DATA = {
  user: {
    name: 'Charbel',
    points: 1250,
    tier: 'Silver',
    savedLocations: {
      Home: 'Raouche, Beirut',
      Work: 'ABC Mall, Achrafieh'
    }
  },
  promoCodes: {
    'WKND20': '20% discount',
    'FIRST5': '$5 off your ride'
  },
  drivers: [
    { name: 'Tony G.', car: 'White Toyota Camry', plate: 'G-1234', eta: '3 mins' },
    { name: 'Kareem S.', car: 'Black Kia Cerato', plate: 'M-5678', eta: '7 mins' }
  ]
}

const INITIAL_MESSAGES = [
  { id: 1, dir: 'out', text: "Hello! Welcome to Allway Taxi. I'm your AI assistant. 🚕", time: '10:00 AM' },
  { id: 2, dir: 'out', text: "You can book a ride, check your loyalty points, or apply a promo code here. How can I help you today?", time: '10:00 AM' }
]

export default function WhatsAppDemo() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const addMessage = (text, dir) => {
    const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    setMessages(prev => [...prev, { id: Date.now(), text, dir, time }])
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMsg = input.trim()
    addMessage(userMsg, 'in')
    setInput('')
    
    // Simulate AI Thinking
    setIsTyping(true)
    await new Promise(r => setTimeout(r, 1500))
    setIsTyping(false)

    processResponse(userMsg)
  }

  const processResponse = (text) => {
    const msg = text.toLowerCase()

    if (msg.includes('book') || msg.includes('ride') || msg.includes('taxi')) {
      addMessage(`Sure! I can help you with that. Would you like to go to your saved **Work** location (${MOCK_DATA.user.savedLocations.Work})?`, 'out')
    } else if (msg.includes('points') || msg.includes('loyalty') || msg.includes('balance')) {
      addMessage(`You have **${MOCK_DATA.user.points} points**! You're currently a **${MOCK_DATA.user.tier}** member. 🌟`, 'out')
      addMessage(`You can redeem 500 points for a $5 discount. Would you like to do that now?`, 'out')
    } else if (msg.includes('promo') || msg.includes('discount') || msg.includes('code')) {
      addMessage(`Please enter your promo code below.`, 'out')
    } else if (msg.includes('wknd20')) {
      addMessage(`Promo code **WKND20** applied! You'll get 20% off your next ride. ✅`, 'out')
    } else if (msg.includes('yes') || msg.includes('work')) {
      const driver = MOCK_DATA.drivers[0]
      addMessage(`Great! Booking confirmed. **${driver.name}** is on the way in a **${driver.car}** (${driver.plate}). \n\nEstimated arrival: **${driver.eta}**.`, 'out')
    } else {
      addMessage(`I'm not sure I understood that. You can say "Book a ride", "Points balance", or "Apply promo".`, 'out')
    }
  }

  return (
    <div className="wa-demo-container">
      <style>{`
        .wa-demo-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          min-height: 700px;
          background: transparent;
        }
        .phone-frame {
          width: 360px;
          height: 640px;
          background: #0b141a;
          border: 12px solid #1f2c33;
          border-radius: 40px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }
        .wa-header {
          background: #202c33;
          padding: 30px 16px 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: white;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .wa-avatar {
          width: 36px;
          height: 36px;
          background: #F5B800;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          color: black;
        }
        .wa-chat-area {
          flex: 1;
          background: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png');
          background-color: #0b141a;
          background-blend-mode: overlay;
          padding: 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .msg-bubble {
          max-width: 85%;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.4;
          position: relative;
          color: #e9edef;
          box-shadow: 0 1px 0.5px rgba(0,0,0,.13);
        }
        .msg-in {
          align-self: flex-end;
          background: #005c4b;
          border-top-right-radius: 0;
        }
        .msg-out {
          align-self: flex-start;
          background: #202c33;
          border-top-left-radius: 0;
        }
        .msg-time {
          font-size: 10px;
          opacity: 0.6;
          text-align: right;
          margin-top: 4px;
        }
        .wa-input-area {
          background: #202c33;
          padding: 10px 16px;
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .wa-input {
          flex: 1;
          background: #2a3942;
          border: none;
          border-radius: 20px;
          padding: 10px 16px;
          color: white;
          font-size: 14px;
          outline: none;
        }
        .wa-send-btn {
          width: 40px;
          height: 40px;
          background: #00a884;
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
        }
        .typing-indicator {
          font-size: 12px;
          color: #8696a0;
          margin-bottom: 4px;
          margin-left: 4px;
          font-style: italic;
        }
      `}</style>

      <div className="phone-frame">
        <div className="wa-header">
          <div className="wa-avatar">A</div>
          <div>
            <div style={{ fontWeight: 600 }}>Allway Taxi AI</div>
            <div style={{ fontSize: 11, color: '#8696a0' }}>Online</div>
          </div>
        </div>

        <div className="wa-chat-area">
          {messages.map(m => (
            <motion.div
              initial={{ opacity: 0, x: m.dir === 'in' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              key={m.id}
              className={`msg-bubble msg-${m.dir}`}
            >
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {m.text.split('**').map((part, i) => i % 2 === 1 ? <b key={i} style={{color: '#F5B800'}}>{part}</b> : part)}
              </div>
              <div className="msg-time">{m.time}</div>
            </motion.div>
          ))}
          {isTyping && (
            <div className="typing-indicator">AI is typing...</div>
          )}
          <div ref={scrollRef} />
        </div>

        <form className="wa-input-area" onSubmit={handleSend}>
          <input
            className="wa-input"
            placeholder="Type a message..."
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button type="submit" className="wa-send-btn">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
