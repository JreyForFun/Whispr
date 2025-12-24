import { ChatOverlay } from './ChatOverlay'
import { EmojiBlast } from './EmojiBlast'
import { LogOut } from 'lucide-react'

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
    <div className="w-full h-full flex flex-col relative bg-gray-950">

      {/* Floating Emoji Layer */}
      <EmojiBlast incomingEmoji={incomingEmoji || null} />

      <div className="flex-1 relative overflow-hidden flex flex-col">
        {/* Header / Report for Text Room? */}
        <div className="absolute top-0 left-0 right-0 p-2 z-10 flex justify-end pointer-events-none">
          <button
            onClick={onReport}
            className="pointer-events-auto p-2 text-xs text-red-500 hover:text-red-400 bg-black/20 rounded backdrop-blur"
          >
            Report
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

      <div className="h-[64px] bg-gray-900 border-t border-gray-800 flex items-center justify-between px-4 md:justify-center md:gap-8 z-50 safe-area-bottom shrink-0 relative">
        <button
          onClick={onStop}
          className="flex flex-col md:flex-row items-center gap-1 md:gap-2 text-gray-400 hover:text-red-400 transition-colors p-1"
        >
          <div className="p-1.5 rounded-full bg-gray-800 hover:bg-red-500/20 transition-colors">
            <LogOut className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide">Stop</span>
        </button>

        {/* Reaction Buttons */}
        <div className="flex items-center gap-2 mx-2">
          {emojis.map(emoji => (
            <button
              key={emoji}
              onClick={() => sendEmoji && sendEmoji(emoji)}
              className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-lg md:text-xl transition-transform hover:scale-110 active:scale-95 border border-white/5"
            >
              {emoji}
            </button>
          ))}
        </div>

        <button
          onClick={onNext}
          className="px-4 py-1.5 md:px-6 md:py-2 rounded-full font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20 flex items-center gap-2"
        >
          <span>Next</span>
          <span className="hidden md:inline">Person</span>
          <span>→</span>
        </button>
      </div>
    </div>
  )
}
