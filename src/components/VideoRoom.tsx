import { useState } from 'react'
import { ChatOverlay } from './ChatOverlay'
import { VideoStage } from './VideoStage'
import { EmojiBlast } from './EmojiBlast'
import { LogOut, Mic, MicOff, Video, VideoOff, MessageSquare } from 'lucide-react'

interface VideoRoomProps {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  connectionState: RTCPeerConnectionState
  messages: any[]
  sendChatMessage: (text: string) => void
  onStop: () => void
  onNext: () => void
  sendTyping: (isTyping: boolean) => void
  sendEmoji: (emoji: string) => void
  incomingEmoji: { emoji: string, id: string } | null
  isPartnerTyping: boolean
}

export function VideoRoom({
  localStream,
  remoteStream,
  connectionState,
  messages,
  sendChatMessage,
  onStop,
  onNext,
  sendTyping,
  sendEmoji,
  incomingEmoji,
  isPartnerTyping
}: VideoRoomProps) {
  const emojis = ["👍", "❤️", "😂", "😮"]
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [showChat, setShowChat] = useState(false) // Default hidden/closed on mobile

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      setIsCameraOff(!isCameraOff)
    }
  }

  return (
    <div className="w-full h-full flex flex-col relative bg-gray-900">
      <EmojiBlast incomingEmoji={incomingEmoji || null} />

      <div className="flex-1 relative overflow-hidden flex flex-col">
        {/* Video Area */}
        <div className="relative h-full transition-all duration-300 w-full">
          <VideoStage
            localStream={localStream}
            remoteStream={remoteStream}
            connectionState={connectionState}
          />
        </div>

        {/* Chat Area - Global Overlay (Toggleable) */}
        <div
          className={`
            absolute inset-0 z-40 transition-all duration-300 transform
            ${showChat ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-[100%] opacity-0 pointer-events-none hidden'}
            bg-transparent/0
          `}
        >
          {/* Mobile/Desktop Tint when Chat Open for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

          <ChatOverlay
            messages={messages}
            onSendMessage={sendChatMessage}
            visible={true}
            variant="fullscreen"
            connectionState={connectionState}
            isPartnerTyping={isPartnerTyping}
            onTyping={sendTyping}
            showHeader={false}
          />
        </div>
      </div>

      <div className="h-[72px] glass-liquid flex items-center justify-between px-2 md:px-4 md:justify-center md:gap-8 z-50 safe-area-bottom shrink-0 overflow-x-auto [&::-webkit-scrollbar]:hidden backdrop-blur-3xl">
        <button
          onClick={onStop}
          className="flex flex-col md:flex-row items-center gap-1 md:gap-2 text-gray-400 hover:text-red-400 transition-colors p-1"
        >
          <div className="p-1.5 rounded-full bg-gray-800 hover:bg-red-500/20 transition-colors">
            <LogOut className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide hidden md:block">Stop</span>
        </button>

        <button
          onClick={toggleMute}
          className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 transition-colors p-1 ${isMuted ? 'text-red-500' : 'text-gray-400 hover:text-white'}`}
        >
          <div className={`p-1.5 rounded-full transition-colors glass-liquid-button ${isMuted ? 'bg-red-500/20 border-red-500/50' : 'hover:bg-white/10'}`}>
            {isMuted ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4" />}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide hidden md:block">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        <button
          onClick={toggleCamera}
          className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 transition-colors p-1 ${isCameraOff ? 'text-red-500' : 'text-gray-400 hover:text-white'}`}
        >
          <div className={`p-1.5 rounded-full transition-colors glass-liquid-button ${isCameraOff ? 'bg-red-500/20 border-red-500/50' : 'hover:bg-white/10'}`}>
            {isCameraOff ? <VideoOff className="w-4 h-4 text-red-500" /> : <Video className="w-4 h-4" />}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide hidden md:block">{isCameraOff ? 'Cam On' : 'Cam Off'}</span>
        </button>

        {/* Chat Toggle (Global) */}
        <button
          onClick={() => setShowChat(!showChat)}
          className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 transition-colors p-1 ${showChat ? 'text-purple-400' : 'text-gray-400 hover:text-white'}`}
        >
          <div className={`p-1.5 rounded-full transition-colors glass-liquid-button ${showChat ? 'bg-purple-500/20 border-purple-500/50' : 'hover:bg-white/10'}`}>
            <MessageSquare className={`w-4 h-4 ${showChat ? 'text-purple-400' : ''}`} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide hidden md:block">Chat</span>
        </button>

        {/* Reaction Buttons (Hidden on Mobile to save space) */}
        <div className="hidden md:flex items-center gap-1.5 md:gap-2 mx-1 md:mx-2 shrink-0">
          {emojis.map(emoji => (
            <button
              key={emoji}
              onClick={() => sendEmoji(emoji)}
              className="w-9 h-9 md:w-10 md:h-10 glass-liquid-button rounded-full flex items-center justify-center text-lg md:text-xl transition-transform hover:scale-110 active:scale-95 shrink-0"
            >
              {emoji}
            </button>
          ))}
        </div>

        <button
          onClick={onNext}
          className="px-4 md:px-6 py-1.5 md:py-2 rounded-full font-bold text-xs md:text-sm text-black bg-gradient-to-r from-gray-100 to-white hover:to-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] flex items-center gap-1.5 md:gap-2 shrink-0 border border-white/50 active:scale-95 transform"
        >
          <span>Next</span>
          <span className="hidden md:inline">Person</span>
          <span>→</span>
        </button>
      </div>
    </div>
  )
}
