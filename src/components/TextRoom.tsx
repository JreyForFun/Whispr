import { ChatOverlay } from './ChatOverlay'
import { EmojiBlast } from './EmojiBlast'
import { LogOut, ArrowRight } from 'lucide-react'

interface TextRoomProps {
  messages: any[]
  sendChatMessage: (text: string) => void
  sendTyping?: (isTyping: boolean) => void
  sendEmoji?: (emoji: string) => void
  incomingEmoji?: { emoji: string, id: string } | null
  isPartnerTyping?: boolean
  onStop: () => void
  onNext: () => void
}

export function TextRoom({
  messages,
  sendChatMessage,
  sendTyping,
  sendEmoji,
  incomingEmoji,
  isPartnerTyping,
  onStop,
  onNext,
}: TextRoomProps) {
  const emojis = ["👍", "❤️", "😂", "😮"]

  return (
    <div className="w-full h-full flex flex-col relative bg-black/20 backdrop-blur-sm">

      {/* Floating Emoji Layer */}
      <EmojiBlast incomingEmoji={incomingEmoji || null} />

      <div className="flex-1 relative overflow-hidden flex flex-col">

        <ChatOverlay
          messages={messages}
          onSendMessage={sendChatMessage}
          visible={true}
          variant="fullscreen"
          isPartnerTyping={isPartnerTyping}
          onTyping={sendTyping}
        />
      </div>

      <div className="h-[72px] glass-liquid flex items-center justify-between px-2 md:px-4 md:justify-center md:gap-12 z-50 safe-area-bottom shrink-0 relative overflow-x-auto [&::-webkit-scrollbar]:hidden backdrop-blur-3xl">
        <button
          onClick={onStop}
          className="flex flex-col md:flex-row items-center gap-1 md:gap-2 text-gray-400 hover:text-red-400 transition-colors p-2 group"
        >
          <div className="p-2 rounded-full glass-liquid-button group-hover:bg-red-500/10 group-hover:border-red-500/20 transition-all">
            <LogOut className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide group-hover:text-red-400 transition-colors hidden md:block">Stop</span>
        </button>

        {/* Reaction Buttons */}
        <div className="flex items-center gap-1.5 md:gap-3 mx-1 md:mx-2 shrink-0">
          {emojis.map(emoji => (
            <button
              key={emoji}
              onClick={() => sendEmoji && sendEmoji(emoji)}
              className="w-9 h-9 md:w-11 md:h-11 rounded-full glass-liquid-button flex items-center justify-center text-lg md:text-2xl transition-all hover:scale-110 active:scale-95 hover:shadow-[0_0_15px_-5px_rgba(255,255,255,0.1)] shrink-0"
            >
              {emoji}
            </button>
          ))}
        </div>

        <button
          onClick={onNext}
          className="px-4 md:px-6 py-2 md:py-2.5 rounded-full font-bold text-xs md:text-sm text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all shadow-[0_0_20px_-5px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.6)] flex items-center gap-1.5 md:gap-2 hover:scale-105 active:scale-95 shrink-0"
        >
          <span>Next</span>
          <span className="hidden md:inline">Person</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
