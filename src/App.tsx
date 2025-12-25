import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './lib/supabase'
import { useSession } from './store/useSession'
import { useWebRTC } from './hooks/useWebRTC'
import { ConsentModal } from './components/ConsentModal'
import { VideoRoom } from './components/VideoRoom'
import { TextRoom } from './components/TextRoom'
import { Legal } from './components/Legal'
import { ErrorBoundary } from './components/ErrorBoundary'
import { BackgroundEffect } from './components/BackgroundEffect'
import { Zap, MessageSquare, Search } from 'lucide-react'

// Poll interval for matchmaking
const MATCH_POLL_MS = 2000

function App() {
  const {
    consentGiven,
    sessionId,
    hasVideo,
    isMatching,
    roomId,
    setRoomId,
    setHasVideo,
    setIsMatching
  } = useSession()

  // Reset transient state on mount to prevent ghost matching
  useEffect(() => {
    setIsMatching(false)
    setRoomId(null)
  }, [setIsMatching, setRoomId])

  const [isInitiator, setIsInitiator] = useState(false)
  const lastRoomIdRef = useRef<string | null>(null)
  const [peerExited, setPeerExited] = useState(false)
  const [showLegal, setShowLegal] = useState(false)

  const handlePeerExited = useCallback(() => setPeerExited(true), [])

  const {
    localStream,
    remoteStream,
    connectionState,
    startLocalStream,
    stop,
    messages,
    sendChatMessage,
    sendTyping,
    isPartnerTyping,
    sendEmoji,
    incomingEmoji,
    sendSignalBye
  } = useWebRTC(isInitiator, handlePeerExited)

  const [dbError, setDbError] = useState<string | null>(null)

  const handleStop = useCallback(async (sendByeSignal = true) => {
    try {
      if (sendByeSignal) {
        await sendSignalBye().catch(err => console.error('Send bye failed', err))
      }

      // Cleanup Room from DB to avoid ghosts (best-effort)
      if (roomId) {
        lastRoomIdRef.current = roomId // Save to avoid rejoining immediately
        const { error: deleteError } = await supabase.from('active_rooms').delete().eq('id', roomId)
        if (deleteError) {
          console.error('Room cleanup failed', deleteError)
          setDbError(prev => prev ?? 'Cleanup failed. Please retry.')
        }
      }
    } catch (err) {
      console.error('Stop cleanup error', err)
    } finally {
      setIsMatching(false)
      setRoomId(null)
      stop() // Stop WebRTC
    }
  }, [roomId, sendSignalBye, setDbError, setIsMatching, setRoomId, stop])

  console.log("DEBUG RENDER:", { sessionId, roomId, isMatching, hasVideo, connectionState })

  // Handle Peer Exit
  useEffect(() => {
    if (peerExited) {
      console.log("Peer exited, auto-requeuing.")
      handleStop(false).then(() => {
        // Auto-restart search after a short delay to allow UI to reset
        setTimeout(() => {
          setIsMatching(true)
        }, 100)
      })
      setPeerExited(false) // Reset
    }
  }, [handleStop, peerExited, setIsMatching])

  // Auto-recover UI if connection drops after a match
  useEffect(() => {
    if (!roomId) return

    if (['failed', 'disconnected', 'closed'].includes(connectionState)) {
      const timer = setTimeout(() => {
        setDbError(prev => prev ?? 'Connection lost. You can wait or press Stop/Next.')
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [connectionState, roomId, setDbError])

  // Handle Browser Tab Close
  useEffect(() => {
    const handleUnload = () => {
      stop()
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [stop])

  // Matchmaking Loop
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>
    let isActive = true

    const searchForMatch = async () => {
      if (!isActive) return
      if (!isMatching || roomId) return // Stop if matched or cancelled

      try {
        setDbError(null)

        // 0. Check if we have been matched by someone else (Passive Match)
        const { data: existingRoom, error: roomError } = await supabase
          .from('active_rooms')
          .select('id')
          .or(`user_a_session.eq.${sessionId},user_b_session.eq.${sessionId}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!isActive) return
        if (roomError) throw roomError

        if (existingRoom) {
          // Guard against rejoining the room we just left (ghost room)
          if (existingRoom.id === lastRoomIdRef.current) {
            console.log("Ignored stale room (ghost):", existingRoom.id)
            return
          }

          console.log("Found existing match:", existingRoom)
          setRoomId(existingRoom.id)
          setIsInitiator(false) // I joined an existing room, so I answer
          setIsMatching(false)
          return
        }

        // 1. Insert into Queue (Idempotent-ish)
        // Step A: Upsert self to queue (refresh ping)
        const { error: upsertError } = await supabase
          .from('match_queue')
          .upsert({
            session_id: sessionId,
            constraints: { has_video: hasVideo },
            last_ping: new Date().toISOString()
          }, { onConflict: 'session_id' })

        if (!isActive) return
        if (upsertError) throw upsertError

        // Step B: Try to match (Active Match)
        const { data, error } = await supabase
          .rpc('match_user', {
            my_session_id: sessionId,
            has_video: hasVideo
          })

        if (error) throw error

        // Data is array? RPC returns TABLE
        if (data && data.length > 0) {
          // MATCH FOUND!
          const match = data[0]
          console.log("Match Found (Active):", match)
          setIsInitiator(true) // I created the room, so I offer
          setRoomId(match.room_id)
          setIsMatching(false)
          return // Exit loop
        }

        // Retry
        timeoutId = setTimeout(searchForMatch, MATCH_POLL_MS)

      } catch (err: unknown) {
        console.error("Matchmaking error:", err)
        const message = err instanceof Error ? err.message : String(err)
        setDbError(message || "Connection Error")
        // Retry slower
        timeoutId = setTimeout(searchForMatch, MATCH_POLL_MS * 2)
      }
    }

    if (isMatching && !roomId) {
      searchForMatch()
    }

    return () => {
      isActive = false
      clearTimeout(timeoutId)
    }
  }, [isMatching, roomId, sessionId, hasVideo, setRoomId, setIsMatching])

  const handleStartSearch = (mode: 'video' | 'text') => {
    setHasVideo(mode === 'video')
    setIsMatching(true)
  }

  // Auto-init media when matching starts (to avoid stale state)
  useEffect(() => {
    if (isMatching && hasVideo && !localStream) {
      startLocalStream().catch(err => {
        console.error("Failed to start stream", err)
        alert("Could not access camera/microphone. Please check permissions.")
        setIsMatching(false)
      })
    }
  }, [hasVideo, isMatching, localStream, setIsMatching, startLocalStream])

  const handleNext = async () => {
    // 1. Disconnect current & Wait for DB deletion
    await handleStop(true)

    // 2. Restart search
    setTimeout(() => {
      startLocalStream().then(() => {
        setIsMatching(true)
      })
    }, 200)
  }

  const handleReport = async () => {
    if (!roomId) return
    try {
      const { data: roomData } = await supabase
        .from('active_rooms')
        .select('user_a_session, user_b_session')
        .eq('id', roomId)
        .single()

      if (roomData) {
        const peerId = roomData.user_a_session === sessionId ? roomData.user_b_session : roomData.user_a_session

        await supabase.from('reports').insert({
          reporter_id: sessionId,
          reported_id: peerId,
          room_id: roomId,
          reason: 'harassment'
        })
        console.log("Report filed against", peerId)
      }
    } catch (e) {
      console.error("Report failed", e)
    }

    // 2. Disconnect
    handleStop()
    alert("User reported. Disconnecting.")
  }

  return (
    <div className={`bg-[#0a0a0a] text-white flex flex-col font-sans relative ${roomId ? 'h-[100dvh] overflow-hidden' : 'min-h-[100dvh] overflow-x-hidden'}`}>
      {/* Dynamic Background */}
      <BackgroundEffect />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-black/80 to-black pointer-events-none z-0" />
      <ConsentModal />

      {/* Header */}
      <header className="p-4 flex justify-between items-center z-50 shrink-0">
        <div className="flex items-center gap-3">
          <img src="/pwa-192x192.png" alt="Whispr Logo" className="w-12 h-12 object-contain hover:scale-110 transition-transform duration-300" />
          <span className="font-extrabold text-3xl tracking-tight hidden md:block bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-400">Whispr</span>
        </div>
        <OnlineUsersBadge />
      </header>

      {/* Main Content */}
      <ErrorBoundary>
        <main className={`flex-1 flex flex-col relative ${roomId ? 'w-full bg-transparent p-0 overflow-hidden' : 'items-center justify-start py-8 md:justify-center p-4'}`}>

          {/* State: Waiting Only (No Match, Not Searching) */}
          {!isMatching && !roomId && (
            <div className="flex flex-col items-center w-full max-w-5xl animate-in fade-in-up duration-700 gap-6 md:gap-12 py-8 md:py-0">
              {/* Hero Text */}
              <div className="text-center relative shrink-0">
                <div className="absolute -inset-10 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />
                <h2 className="text-5xl md:text-7xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-pink-200 to-purple-400 tracking-tighter mb-4 relative z-10 leading-[1.1]">
                  Find Your Person.
                </h2>
                <p className="text-lg md:text-2xl text-gray-400 font-medium tracking-wide">
                  Make friends. Find love. Just talk.
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl px-4 perspective-1000 shrink-0">
                {/* Text Only Card */}
                <button
                  onClick={() => handleStartSearch('text')}
                  disabled={!consentGiven}
                  className="flex-1 group relative bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-[36px] p-8 transition-all duration-500 hover:-translate-y-2 hover:bg-gray-800/70 hover:border-blue-500/30 overflow-hidden hover:shadow-[0_20px_60px_-15px_rgba(59,130,246,0.5)]"
                >
                  {/* Animated gradient border */}
                  <div className="absolute inset-0 rounded-[36px] p-[1px] bg-gradient-to-br from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:from-blue-500/50 group-hover:via-blue-400/30 group-hover:to-transparent transition-all duration-500 -z-10" />
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-10 flex flex-col items-center gap-6">
                    <div className="p-5 bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-2xl group-hover:from-blue-500 group-hover:to-blue-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-xl shadow-black/40 group-hover:shadow-blue-500/40 ring-1 ring-white/10 group-hover:ring-blue-400/50">
                      <MessageSquare className="w-8 h-8 text-blue-400 group-hover:text-white transition-colors duration-300" strokeWidth={1.5} />
                    </div>
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-100 transition-colors duration-300">Blind Chat</h3>
                      <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300 leading-relaxed">Break the ice with text</p>
                    </div>
                  </div>
                </button>

                {/* Video Chat Card */}
                <button
                  onClick={() => handleStartSearch('video')}
                  disabled={!consentGiven}
                  className="flex-1 group relative bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-[36px] p-8 transition-all duration-500 hover:-translate-y-2 hover:bg-gray-800/70 hover:border-pink-500/30 overflow-hidden hover:shadow-[0_20px_60px_-15px_rgba(236,72,153,0.5)]"
                >
                  {/* Animated gradient border */}
                  <div className="absolute inset-0 rounded-[36px] p-[1px] bg-gradient-to-br from-pink-500/0 via-pink-500/0 to-pink-500/0 group-hover:from-pink-500/50 group-hover:via-pink-400/30 group-hover:to-transparent transition-all duration-500 -z-10" />
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  {/* Enhanced Pulse Effect */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 bg-pink-500/20 rounded-full blur-[45px] animate-pulse-slow opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative z-10 flex flex-col items-center gap-6">
                    <div className="p-5 bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-2xl group-hover:from-pink-500 group-hover:to-pink-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-xl shadow-black/40 group-hover:shadow-pink-500/40 ring-1 ring-white/10 group-hover:ring-pink-400/50">
                      <Zap className="w-8 h-8 text-pink-400 group-hover:text-white transition-colors duration-300" strokeWidth={1.5} />
                    </div>
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-pink-100 transition-colors duration-300">Video Date</h3>
                      <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300 leading-relaxed">See real chemistry</p>
                    </div>
                  </div>
                </button>
              </div>

              <div className="mt-4 flex items-center gap-3 px-5 py-3 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-xs font-mono text-gray-500 shadow-lg shadow-black/20 shrink-0">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                All connections are end-to-end encrypted
              </div>

            </div>
          )}

          {/* State: Matching (Searching...) */}
          {isMatching && !roomId && (
            <div className="text-center w-full max-w-md animate-in fade-in zoom-in-95 duration-500 relative">

              {/* Radar Effect Background */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none">
                <div className="absolute inset-0 bg-purple-500/5 rounded-full animate-ping [animation-duration:3s]" />
                <div className="absolute inset-[100px] bg-purple-500/10 rounded-full animate-ping [animation-duration:3s] [animation-delay:1s]" />
                <div className="absolute inset-[200px] bg-purple-500/20 rounded-full animate-ping [animation-duration:3s] [animation-delay:2s]" />
              </div>

              <div className="relative z-10 flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-gray-900 border-2 border-purple-500/50 flex items-center justify-center mb-8 relative overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.4)]">
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent animate-spin-slow" />
                  <Search className="w-10 h-10 text-white animate-pulse" />
                </div>

                <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Searching...</h3>
                <p className="text-gray-400 mb-8 font-medium">Scanning for a match</p>

                <div className="h-[80px] w-full bg-gray-900/50 backdrop-blur border border-white/5 rounded-2xl p-4 flex items-center justify-center mb-8">
                  <MatchingTips />
                </div>

                {dbError && (
                  <div className="mb-6 py-2 px-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                    {dbError}
                  </div>
                )}

                <button
                  onClick={() => handleStop(true)}
                  className="px-8 py-3 rounded-full bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/10 hover:border-white/20"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* State: Connected */}
          {roomId && (
            <ErrorBoundary>
              {hasVideo ? (
                <VideoRoom
                  localStream={localStream}
                  remoteStream={remoteStream}
                  connectionState={connectionState}
                  messages={messages}
                  sendChatMessage={sendChatMessage}
                  sendTyping={sendTyping}
                  sendEmoji={sendEmoji}
                  incomingEmoji={incomingEmoji}
                  isPartnerTyping={isPartnerTyping}
                  onStop={() => handleStop(true)}
                  onNext={handleNext}
                  onReport={handleReport}
                />
              ) : (
                <TextRoom
                  connectionState={connectionState}
                  messages={messages}
                  sendChatMessage={sendChatMessage}
                  sendTyping={sendTyping}
                  sendEmoji={sendEmoji}
                  incomingEmoji={incomingEmoji}
                  isPartnerTyping={isPartnerTyping}
                  onStop={() => handleStop(true)}
                  onNext={handleNext}
                  onReport={handleReport}
                />
              )}
            </ErrorBoundary>
          )}

        </main>
      </ErrorBoundary>

      {/* Footer (Lobby Only) */}
      {!roomId && !isMatching && (
        <footer className="p-4 text-center z-10 animate-in fade-in slide-in-from-bottom-5 duration-1000 relative shrink-0">
          <div className="flex justify-center gap-6 text-[10px] font-medium text-gray-500 mb-3">
            <button onClick={() => setShowLegal(true)} className="hover:text-purple-400 transition-colors duration-300 hover:underline underline-offset-4">Terms</button>
            <button onClick={() => setShowLegal(true)} className="hover:text-purple-400 transition-colors duration-300 hover:underline underline-offset-4">Privacy</button>
            <button onClick={() => setShowLegal(true)} className="hover:text-purple-400 transition-colors duration-300 hover:underline underline-offset-4">Guidelines</button>
          </div>
          <p className="text-[10px] text-gray-600 font-mono tracking-wide">© 2025 Whispr. InnovaREV.</p>
        </footer>
      )}

      <Legal isOpen={showLegal} onClose={() => setShowLegal(false)} />
    </div>
  )
}

function OnlineUsersBadge() {
  const [count, setCount] = useState(1243)
  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => prev + Math.floor(Math.random() * 5) - 2)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-2.5 px-4 py-2 bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-full shadow-lg shadow-black/20">
      <div className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
      </div>
      <span className="text-xs font-semibold text-gray-300 tabular-nums tracking-wide">{count.toLocaleString()} Online</span>
    </div>
  )
}

function MatchingTips() {
  const tips = [
    "Tip: Be polite and respectful.",
    "Did you know? You can skip anytime.",
    "Safety First: Don't share personal details.",
    "Smile! It makes a great first impression.",
    "Connecting to servers near you...",
    "Finding someone who shares your interests...",
  ]
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIdx(prev => (prev + 1) % tips.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  return (
    <p className="text-sm text-gray-400 animate-in fade-in slide-in-from-bottom-2 duration-500 key={idx}">
      {tips[idx]}
    </p>
  )
}

export default App
