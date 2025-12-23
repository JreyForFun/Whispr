import { ChatOverlay } from './ChatOverlay'
import { VideoStage } from './VideoStage'
import { LogOut } from 'lucide-react'

interface VideoRoomProps {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  connectionState: RTCPeerConnectionState
  messages: any[]
  sendChatMessage: (text: string) => void
  onStop: () => void
  onNext: () => void
  onReport: () => void

}

export function VideoRoom({
  localStream,
  remoteStream,
  connectionState,
  messages,
  sendChatMessage,
  onStop,
  onNext,
  onReport,

}: VideoRoomProps) {

  return (
    <div className="w-full h-full flex flex-col relative bg-gray-900">
      <div className="flex-1 relative overflow-hidden flex flex-col md:flex-row">
        {/* Video Area */}
        <div className="relative h-full transition-all duration-300 w-full md:w-[70%]">
          <VideoStage
            localStream={localStream}
            remoteStream={remoteStream}
            connectionState={connectionState}
            onReport={onReport}
          />
        </div>

        {/* Chat Area - Desktop Side Panel / Mobile Overlay */}
        <div className="absolute inset-0 md:static md:h-full md:border-l md:border-gray-800 bg-gray-900 transition-all duration-300 z-40 md:w-[30%] translate-x-0">
          <ChatOverlay
            messages={messages}
            onSendMessage={sendChatMessage}
            visible={true}
            variant="fullscreen" // Use fullscreen variant to fill the container
            connectionState={connectionState}
          />
        </div>
      </div>

      <div className="h-[64px] bg-black/90 md:bg-gray-900 border-t border-white/10 md:border-gray-800 flex items-center justify-between px-4 md:justify-center md:gap-8 z-50 safe-area-bottom shrink-0">
        <button
          onClick={onStop}
          className="flex flex-col md:flex-row items-center gap-1 md:gap-2 text-gray-400 hover:text-red-400 transition-colors p-1"
        >
          <div className="p-1.5 rounded-full bg-gray-800 hover:bg-red-500/20 transition-colors">
            <LogOut className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide">Stop</span>
        </button>



        <button
          onClick={onNext}
          className="px-4 py-1.5 md:px-6 md:py-2 rounded-full font-bold text-sm text-black bg-white hover:bg-gray-200 transition-colors shadow-lg shadow-white/10 flex items-center gap-2"
        >
          <span>Next</span>
          <span className="hidden md:inline">Person</span>
          <span>→</span>
        </button>
      </div>
    </div>
  )
}
