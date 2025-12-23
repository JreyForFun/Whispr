import { useState, useRef, useEffect } from 'react'
import { Send, MessageSquare } from 'lucide-react'

interface ChatOverlayProps {
  messages: { sender: 'me' | 'them', text: string }[]
  onSendMessage: (text: string) => void
  visible: boolean
  variant?: 'overlay' | 'fullscreen'
  connectionState?: RTCPeerConnectionState
}

export function ChatOverlay({ messages, onSendMessage, visible, variant = 'overlay', connectionState = 'new' }: ChatOverlayProps) {
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, visible])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputText.trim()) {
      onSendMessage(inputText)
      setInputText('')
    }
  }

  if (!visible && variant === 'overlay') return null

  const overlayClasses = "absolute z-40 bottom-[85px] left-2 right-2 max-h-[40vh] md:bottom-24 md:right-auto md:left-8 md:w-80 md:h-96 md:max-h-[60vh] bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl transition-all animate-in slide-in-from-bottom-5"

  const fullscreenClasses = "relative w-full h-full bg-gray-900 flex flex-col"

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected': return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
      case 'failed':
      case 'closed':
      case 'disconnected': return 'bg-red-500'
      default: return 'bg-yellow-500 animate-pulse'
    }
  }

  return (
    <div className={`flex flex-col overflow-hidden ${variant === 'fullscreen' ? fullscreenClasses : overlayClasses}`}>

      {/* Header */}
      <div className="p-2 bg-white/5 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-gray-300">Encrypted Chat</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-black/20 rounded-full border border-white/5">
          <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor()}`} />
          <span className="text-[10px] text-gray-400 capitalize">{connectionState}</span>
        </div>
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 ${variant === 'fullscreen' ? 'p-6 space-y-6' : 'p-2 space-y-2'}`}>
        {messages.length === 0 && (
          <div className={`text-center text-gray-500 mt-10 ${variant === 'fullscreen' ? 'text-2xl font-light' : 'text-xs'}`}>
            Say hello! 👋
          </div>
        )}
        {messages.filter(m => m && m.text).map((msg, idx) => (
          <div
            key={idx}
            className={`break-words rounded-2xl shadow-md transition-all ${variant === 'fullscreen'
              ? 'max-w-[80%] px-4 py-2 text-base leading-relaxed'
              : 'max-w-[85%] px-3 py-1.5 text-sm'
              } ${msg.sender === 'me'
                ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white ml-auto rounded-br-none'
                : 'bg-gray-800 border border-gray-700 text-gray-100 mr-auto rounded-bl-none'
              }`}
          >
            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className={`bg-black/20 border-t border-white/5 flex gap-2 shrink-0 ${variant === 'fullscreen' ? 'p-3' : 'p-2'}`}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          className={`flex-1 bg-gray-800/50 border border-gray-600 rounded-full text-white focus:outline-none focus:border-purple-500 transition-colors ${variant === 'fullscreen' ? 'px-4 py-3 text-base' : 'px-3 py-1.5 text-sm'
            }`}
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className={`bg-white/10 hover:bg-purple-600 rounded-full transition-colors disabled:opacity-50 disabled:hover:bg-white/10 flex items-center justify-center ${variant === 'fullscreen' ? 'w-12 h-12 p-0' : 'p-1.5'
            }`}
        >
          <Send className={`text-white ${variant === 'fullscreen' ? 'w-5 h-5' : 'w-4 h-4'}`} />
        </button>
      </form>
    </div>
  )
}
