import { useState, useRef, useEffect } from 'react'
import { Send, MessageSquare, Sparkles } from 'lucide-react'

interface ChatOverlayProps {
  messages: { sender: 'me' | 'them', text: string }[]
  onSendMessage: (text: string) => void
  visible: boolean
  variant?: 'overlay' | 'fullscreen'
  connectionState?: RTCPeerConnectionState
  isPartnerTyping?: boolean
  onTyping?: (isTyping: boolean) => void
}

export function ChatOverlay({
  messages,
  onSendMessage,
  visible,
  variant = 'overlay',
  connectionState = 'new',
  isPartnerTyping,
  onTyping
}: ChatOverlayProps) {
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, visible, isPartnerTyping])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value)

    if (onTyping) {
      onTyping(true)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false)
      }, 2000)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputText.trim()) {
      onSendMessage(inputText)
      setInputText('')

      // Clear typing status immediately on send
      if (onTyping) {
        onTyping(false)
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      }
    }
  }

  if (!visible && variant === 'overlay') return null

  const overlayClasses = "absolute z-40 bottom-[85px] left-2 right-2 max-h-[40vh] md:bottom-24 md:right-auto md:left-8 md:w-80 md:h-96 md:max-h-[60vh] bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl transition-all animate-in slide-in-from-bottom-5"

  const fullscreenClasses = "relative w-full h-full bg-transparent flex flex-col"

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
      <div className="p-3 bg-black/20 backdrop-blur-xl border-b border-white/10 flex items-center justify-between shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg border border-pink-500/20 shadow-[0_0_10px_rgba(236,72,153,0.3)]">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          </div>
          <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200 tracking-wide">New Connection</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-black/20 rounded-full border border-white/5">
          <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor()}`} />
          <span className="text-[10px] text-gray-400 capitalize">{connectionState}</span>
        </div>
      </div>

      {/* Messages */}
      <div className={`flex-1 flex flex-col justify-end overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 ${variant === 'fullscreen' ? 'p-6 space-y-6' : 'p-3 space-y-3'}`}>
        {messages.length === 0 && (
          <div className={`flex flex-col items-center justify-center h-full text-center text-gray-500 opacity-60 ${variant === 'fullscreen' ? 'gap-4' : 'gap-2'}`}>
            <MessageSquare className="w-8 h-8 opacity-50" />
            <p className="text-sm">No messages yet. Say hi! 👋</p>
          </div>
        )}
        {messages.filter(m => m && m.text).map((msg, idx) => (
          <div
            key={idx}
            className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed break-words animate-in slide-in-from-bottom-2 duration-300 ${msg.sender === 'me'
              ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white self-end rounded-br-sm shadow-purple-900/20'
              : 'bg-gray-800/90 backdrop-blur-md text-gray-100 self-start rounded-bl-sm border border-white/5 shadow-black/20'
              }`}
          >
            {msg.text}
          </div>
        ))}
        {isPartnerTyping && (
          <div className="self-start px-4 py-3 bg-gray-800/50 backdrop-blur-sm rounded-2xl rounded-bl-sm border border-white/5 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="shrink-0" />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className={`bg-black/40 backdrop-blur-xl border-t border-white/5 flex gap-2 shrink-0 ${variant === 'fullscreen' ? 'p-4' : 'p-3'}`}>
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onFocus={() => onTyping?.(true)}
          onBlur={() => onTyping?.(false)}
          placeholder="Type a message..."
          className={`flex-1 bg-gray-900/50 border border-white/10 rounded-full text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all ${variant === 'fullscreen' ? 'px-6 py-4 text-base shadow-inner' : 'px-4 py-2 text-sm'
            }`}
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className={`bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale hover:shadow-lg hover:shadow-purple-500/25 flex items-center justify-center ${variant === 'fullscreen' ? 'w-14 h-14 p-0' : 'w-10 h-10 p-0'
            }`}
        >
          <Send className={`text-white ${variant === 'fullscreen' ? 'w-6 h-6 ml-0.5' : 'w-4 h-4 ml-0.5'}`} />
        </button>
      </form>
    </div>
  )
}
