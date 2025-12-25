import { ChatOverlay } from './ChatOverlay'
import { EmojiBlast } from './EmojiBlast'
import { LogOut, AlertTriangle, ArrowRight } from 'lucide-react'

interface TextRoomProps {
  connectionState: RTCPeerConnectionState
  messages: any[]
  sendChatMessage: (text: string) => void
  sendTyping?: (isTyping: boolean) => void
  sendEmoji?: (emoji: string) => void
  incomingEmoji?: { emoji: string, id: string } | null
  isPartnerTyping?: boolean
  onStop: () => void
  onNext: () => void
  onReport: () => void
}

export function TextRoom({
  connectionState,
  messages,
  sendChatMessage,
  sendTyping,
  sendEmoji,
  incomingEmoji,
  isPartnerTyping,
  onStop,
  onNext,
  onReport
}: TextRoomProps) {
  const emojis = ["👍", "❤️", "😂", "😮"]

  return (
    <div className="w-full h-full flex flex-col relative bg-black/20 backdrop-blur-sm">

      {/* Floating Emoji Layer */}
      <EmojiBlast incomingEmoji={incomingEmoji || null} />

      <div className="flex-1 relative overflow-hidden flex flex-col">
        {/* Header / Report for Text Room */}
        <div className="absolute top-4 right-4 z-10 opacity-0 hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={onReport}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-full backdrop-blur border border-red-500/20 transition-all text-xs font-bold hover:shadow-[0_0_20px_-5px_rgba(239,68,68,0.4)]"
          >
            <AlertTriangle className="w-3 h-3" />
            REPORT
          </button>
        </div>

        <ChatOverlay
          messages={messages}
          onSendMessage={sendChatMessage}
          visible={true}
          variant="fullscreen"
          connectionState={connectionState}
          isPartnerTyping={isPartnerTyping}
          onTyping={sendTyping}
        />
      </div>

      <div className="h-[72px] bg-black/80 backdrop-blur-xl border-t border-white/10 flex items-center justify-between px-4 md:justify-center md:gap-12 z-50 safe-area-bottom shrink-0 relative shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)]">
        <button
          onClick={onStop}
          className="flex flex-col md:flex-row items-center gap-1 md:gap-2 text-gray-400 hover:text-red-400 transition-colors p-2 group"
        >
          <div className="p-2 rounded-full bg-white/5 border border-white/5 group-hover:bg-red-500/10 group-hover:border-red-500/20 transition-all">
            <LogOut className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide group-hover:text-red-400 transition-colors hidden md:block">Stop</span>
        </button>

        {/* Reaction Buttons */}
        <div className="flex items-center gap-3 mx-2">
          {emojis.map(emoji => (
            <button
              key={emoji}
              onClick={() => sendEmoji && sendEmoji(emoji)}
              className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-xl md:text-2xl transition-all hover:scale-110 active:scale-95 border border-white/5 hover:border-white/20 hover:shadow-[0_0_15px_-5px_rgba(255,255,255,0.1)]"
            >
              {emoji}
            </button>
          ))}
        </div>

        <button
          onClick={onNext}
          className="px-6 py-2.5 rounded-full font-bold text-sm text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all shadow-[0_0_20px_-5px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.6)] flex items-center gap-2 hover:scale-105 active:scale-95"
        >
          <span>Next</span>
          <span className="hidden md:inline">Person</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
