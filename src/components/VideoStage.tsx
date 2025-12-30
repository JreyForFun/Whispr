import { useRef, useEffect } from 'react'
import { VideoOff } from 'lucide-react'

interface VideoStageProps {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
}

export function VideoStage({ localStream, remoteStream }: VideoStageProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  // Attach streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col lg:flex-row group">
      {/* Remote Video (Top 50% Mobile, Left 50% Desktop) */}
      <div className="w-full h-1/2 lg:h-full lg:w-1/2 relative overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover mirror"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center animate-pulse bg-gray-900/50">
            <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_40px_-10px_rgba(168,85,247,0.3)] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-transparent animate-spin-slow" />
              <div className="w-16 h-16 border-4 border-white/5 border-t-purple-500 rounded-full animate-spin" />
            </div>
            <p className="text-gray-400 font-medium text-sm tracking-wide">Establishing secure connection...</p>
          </div>
        )}

        {/* Connection Status Badge */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2.5 px-3 py-1.5 md:px-4 md:py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 shrink-0 shadow-lg transition-all duration-300">
          <span className="relative flex h-2 w-2 md:h-2.5 md:w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          <span className="text-[9px] md:text-[10px] font-bold text-white/90 uppercase tracking-widest">
            Live
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        <span className="absolute bottom-4 right-4 text-[10px] font-bold text-white/70 pointer-events-none transition-colors px-2 py-1 bg-black/40 backdrop-blur rounded-full border border-white/10">ANON</span>
      </div>

      {/* Local Video (Bottom 50% Mobile, Right 50% Desktop) */}
      <div className="relative w-full h-1/2 lg:h-full lg:w-1/2 bg-gray-900 overflow-hidden">
        {localStream ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500 text-xs">
            <VideoOff className="w-8 h-8 opacity-50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        <span className="absolute bottom-4 left-4 text-[10px] font-bold text-white/70 pointer-events-none transition-colors px-2 py-1 bg-black/40 backdrop-blur rounded-full border border-white/10">YOU</span>
      </div>

      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  )
}
