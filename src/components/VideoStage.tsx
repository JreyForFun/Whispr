import React from 'react'
import { User, VideoOff } from 'lucide-react'
import clsx from 'clsx'

interface VideoStageProps {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  connectionState: string
  onReport: () => void
}

export function VideoStage({ localStream, remoteStream, connectionState, onReport }: VideoStageProps) {
  const localVideoRef = React.useRef<HTMLVideoElement>(null)
  const remoteVideoRef = React.useRef<HTMLVideoElement>(null)

  React.useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  React.useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-gray-950 overflow-hidden">
      {/* Remote Video (Main Stage) - Full Screen on Mobile, Container on Desktop */}
      <div className="relative w-full h-full bg-black overflow-hidden shadow-2xl border-0 md:border-r border-gray-800">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-4 p-4 text-center">
            <User className="w-20 h-20 animate-pulse text-gray-700" />
            <div>
              <p className="text-xl font-bold text-gray-400">
                {connectionState === 'connected' ? 'Camera Off' : 'Connecting...'}
              </p>
              <p className="text-sm text-gray-600">
                {connectionState === 'connected' ? 'The other person has their camera off.' : 'Establishing secure connection'}
              </p>
            </div>
          </div>
        )}

        {/* Report Button (Top Right) */}
        <div className="absolute top-4 right-4 z-[60]">
          <button
            className="p-2 md:p-3 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded-full transition-all backdrop-blur-md group flex items-center gap-2 border border-red-500/30"
            title="Report User"
            onClick={() => {
              if (confirm("Are you sure you want to report this user? This will end the call immediately.")) {
                onReport()
              }
            }}
          >
            <div className="flex items-center gap-2">
              <span className="hidden group-hover:block text-xs font-bold uppercase tracking-wider">Report</span>
              <span className="text-lg md:text-xl">⚠️</span>
            </div>
          </button>
        </div>

        {/* Connection Status Badge (Top Left) */}
        <div className={clsx(
          "absolute top-4 left-4 px-3 py-1.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-white/5",
          connectionState === 'connected' ? "bg-green-500/20 text-green-400" :
            connectionState === 'failed' ? "bg-red-500/20 text-red-400" :
              "bg-yellow-500/20 text-yellow-400"
        )}>
          {connectionState}
        </div>
      </div>

      {/* Local Video (PiP) */}
      {/* Mobile: Top Right (under Report) or Bottom Right. 
          Let's put it Bottom Right but lift it up above the controls/chat.
          Mobile Width: w-28 (112px). Desktop: w-48 (192px).
      */}
      <div className="absolute bottom-24 right-4 md:bottom-8 md:right-8 w-28 md:w-56 aspect-[3/4] md:aspect-video bg-gray-800 rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl z-50">
        {localStream ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform scale-x-[-1]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600 bg-gray-900">
            <VideoOff className="w-6 h-6 md:w-8 md:h-8" />
          </div>
        )}
      </div>
    </div>
  )
}
