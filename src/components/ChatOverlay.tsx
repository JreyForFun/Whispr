import { useState, useRef, useEffect } from 'react'
import { Send, MessageSquare, Heart } from 'lucide-react'

interface ChatOverlayProps {
  messages: { sender: 'me' | 'them', text: string }[]
  onSendMessage: (text: string) => void
  visible: boolean
  variant?: 'overlay' | 'fullscreen'
  isPartnerTyping?: boolean
  onTyping?: (isTyping: boolean) => void
  showHeader?: boolean
}

export function ChatOverlay({
  messages,
  onSendMessage,
  visible,
  variant = 'overlay',
  isPartnerTyping,
  onTyping,
  showHeader = true
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

  const overlayClasses = "absolute z-40 bottom-[85px] left-2 right-2 max-h-[40vh] md:bottom-24 md:right-auto md:left-8 md:w-80 md:h-96 md:max-h-[60vh] glass-liquid rounded-2xl transition-all animate-in slide-in-from-bottom-5"

  const fullscreenClasses = "relative w-full h-full bg-transparent flex flex-col"

  return (
    <div className={`flex flex-col overflow-hidden ${variant === 'fullscreen' ? fullscreenClasses : overlayClasses}`}>

      {/* Header - Conditional */}
      {showHeader && (
        <div className="p-3 bg-white/5 border-b border-white/10 flex items-center justify-center shrink-0 z-30">
          <div className="flex items-center gap-2">
            <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400/20" />
            <span className="text-[10px] md:text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200 tracking-wide uppercase">
              Make Love. Find Friends. Be Connected.
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-liquid">
        <div className={`min-h-full flex flex-col justify-end ${variant === 'fullscreen' ? 'p-6 space-y-6' : 'p-3 space-y-3'}`}>
          {messages.length === 0 && (
            <div className={`flex flex-col items-center justify-center p-8 text-center text-gray-500 opacity-60 ${variant === 'fullscreen' ? 'gap-4' : 'gap-2'}`}>
              <MessageSquare className="w-8 h-8 opacity-50" />
              <p className="text-sm">No messages yet. Say hi! 👋</p>
            </div>
          )}
          {messages.filter(m => m && m.text).map((msg, idx) => (
            <div
              key={idx}
              className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed break-words animate-in slide-in-from-bottom-2 duration-300 ${msg.sender === 'me'
                ? 'bg-gradient-to-br from-purple-500/80 to-indigo-600/80 backdrop-blur-md text-white self-end rounded-br-sm border border-white/20 shadow-[0_4px_15px_rgba(139,92,246,0.3)]'
                : 'bg-white/5 backdrop-blur-md text-gray-100 self-start rounded-bl-sm border border-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.2)]'
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
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className={`bg-transparent border-t border-white/10 flex gap-2 shrink-0 ${variant === 'fullscreen' ? 'p-3' : 'p-3'}`}>
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onFocus={() => onTyping?.(true)}
          onBlur={() => onTyping?.(false)}
          placeholder="Type a message..."
          className={`flex-1 glass-liquid-input rounded-full text-white placeholder-gray-400 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all ${variant === 'fullscreen' ? 'px-4 py-2 text-sm' : 'px-4 py-2 text-sm'
            }`}
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className={`glass-liquid-button rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 flex items-center justify-center ${variant === 'fullscreen' ? 'w-10 h-10 p-0' : 'w-10 h-10 p-0'
            }`}
        >
          <Send className={`text-white ${variant === 'fullscreen' ? 'w-6 h-6 ml-0.5' : 'w-4 h-4 ml-0.5'}`} />
        </button>
      </form>
    </div>
  )
}
