import { useRef, useEffect, useState } from 'react'
import { VideoOff, AlertTriangle } from 'lucide-react'

interface VideoStageProps {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  connectionState: RTCPeerConnectionState
  onReport: () => void
}

export function VideoStage({ localStream, remoteStream, connectionState, onReport }: VideoStageProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  // Draggable State
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const initialPosRef = useRef({ x: 0, y: 0 })

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

  // Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    initialPosRef.current = { ...position }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y

      setPosition({
        x: initialPosRef.current.x + dx,
        y: initialPosRef.current.y + dy
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center group">
      {/* Remote Video */}
      {remoteStream ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-8 text-center animate-pulse">
          <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_40px_-10px_rgba(168,85,247,0.3)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-transparent animate-spin-slow" />
            <div className="w-16 h-16 border-4 border-white/5 border-t-purple-500 rounded-full animate-spin" />
          </div>
          <p className="text-gray-400 font-medium text-sm tracking-wide">Establishing secure connection...</p>
        </div>
      )}

      {/* Connection Status Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2.5 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 shrink-0 shadow-lg transition-all duration-300">
        {connectionState === 'connected' ? (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
        ) : (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
          </span>
        )}
        <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest">
          {connectionState === 'connected' ? 'Live Secure Feed' : connectionState}
        </span>
      </div>

      {/* Report Button */}
      <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button onClick={onReport} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-full backdrop-blur border border-red-500/20 transition-all text-xs font-bold hover:shadow-[0_0_20px_-5px_rgba(239,68,68,0.4)]">
          <AlertTriangle className="w-3 h-3" />
          REPORT
        </button>
      </div>

      {/* Draggable Local Video (PiP) */}
      <div
        className="absolute bottom-4 right-4 z-20 w-28 h-40 md:w-40 md:h-56 bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 cursor-grab active:cursor-grabbing hover:border-purple-500/50 transition-all duration-300 group/pip hover:scale-105"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none'
        }}
        onMouseDown={handleMouseDown}
      >
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
        <span className="absolute bottom-2 left-3 text-[10px] font-bold text-white/70 pointer-events-none group-hover/pip:text-purple-400 transition-colors">YOU</span>
      </div>

      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  )
}
