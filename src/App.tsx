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
import { ReportModal } from './components/ReportModal'
import { MessageCircle, Search, AlertTriangle, Video } from 'lucide-react'

// Poll interval for matchmaking
const MATCH_POLL_MS = 1000

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

  const [showReportModal, setShowReportModal] = useState(false)

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
      console.log("Peer exited, showing disconnected screen.")
      // Stop connection locally but KEEP roomId so we show PeerDisconnectedScreen
      stop()
      setPeerExited(false) // Reset
    }
  }, [stop, peerExited])

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

  const onStopClick = async () => {
    // User stops manually -> Returns to Lobby
    await handleStop(true)
  }

  const onNextClick = async () => {
    // User wants next person -> Disconnect & Auto-Search
    await handleStop(true)
    setTimeout(() => {
      setIsMatching(true)
    }, 100)
  }

  const onConfirmReport = async () => {
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

    setShowReportModal(false)

    // Disconnect & Auto-Search (Treat like "Next")
    await handleStop(true)
    setTimeout(() => {
      setIsMatching(true)
    }, 100)
  }

  return (
    <div className={`bg-[#0a0a0a] text-white flex flex-col font-sans relative ${roomId ? 'h-[100dvh] overflow-hidden' : 'min-h-[100dvh] overflow-x-hidden'}`}>
      {/* Dynamic Background */}
      <BackgroundEffect />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-black/80 to-black pointer-events-none z-0" />
      <ConsentModal />

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onConfirm={onConfirmReport}
      />

      {/* Header */}
      {/* Header */}
      <header className="p-4 flex justify-between items-center z-[100] shrink-0 absolute top-0 left-0 right-0 md:relative">
        <div className="flex items-center gap-3">
          <img src="/pwa-192x192.png" alt="Whispr Logo" className="w-10 h-10 md:w-12 md:h-12 object-contain hover:scale-110 transition-transform duration-300" />
          <span className="font-extrabold text-2xl md:text-3xl tracking-tight hidden md:block bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-400 font-brand">Whispr</span>
        </div>

        {roomId && connectionState === 'connected' ? (
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 p-2 md:px-4 md:py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-full backdrop-blur-md border border-red-500/20 transition-all text-xs font-bold shadow-lg shadow-red-900/20 hover:shadow-red-500/20 z-50 pointer-events-auto group"
          >
            <AlertTriangle className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="hidden md:inline">REPORT USER</span>
          </button>
        ) : (
          <OnlineUsersBadge />
        )}
      </header>

      {/* Main Content */}
      <ErrorBoundary>
        <main className={`flex-1 flex flex-col relative ${roomId ? 'w-full bg-transparent p-0 overflow-hidden' : 'items-center justify-center pt-4 pb-8 p-4'}`}>

          {/* State: Waiting Only (No Match, Not Searching) */}
          {!isMatching && !roomId && (
            <div className="flex flex-col items-center w-full max-w-5xl h-full min-h-[600px] animate-in fade-in-up duration-700 justify-evenly md:justify-center md:gap-12">
              {/* Hero Text */}
              <div className="text-center relative shrink-0 mt-12 md:mt-0">
                <div className="absolute -inset-10 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />
                <h2 className="text-4xl md:text-7xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-pink-200 to-purple-400 tracking-tighter mb-2 md:mb-4 relative z-10 leading-[1.1] font-brand">
                  Find Your Person.
                </h2>
                <p className="text-base md:text-2xl text-gray-400 font-medium tracking-wide max-w-xs mx-auto md:max-w-none">
                  Make friends. Find love. Just talk.
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl px-4 perspective-1000 shrink-0">
                {/* Text Only Card */}
                <button
                  onClick={() => handleStartSearch('text')}
                  disabled={!consentGiven}
                  className="flex-1 group relative overflow-hidden rounded-[24px] md:rounded-[36px] p-6 md:p-8 transition-all duration-700 ease-out hover:-translate-y-2 hover:scale-[1.02] w-full glass-liquid hover:shadow-[0_20px_60px_-15px_rgba(59,130,246,0.6)] hover:bg-white/10 hover:backdrop-saturate-150 border-white/10 hover:border-white/20"
                >
                  {/* Water Reflection (Sheen) */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none mix-blend-overlay" />
                  <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-white/20 to-transparent rotate-[35deg] translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-[1.5s] ease-in-out pointer-events-none" />

                  <div className="relative z-10 flex flex-row md:flex-col items-center gap-4 md:gap-6 text-left md:text-center">
                    <MessageCircle className="w-12 h-12 md:w-16 md:h-16 text-blue-300 group-hover:text-white transition-all duration-300 relative z-10 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] group-hover:scale-110 group-hover:rotate-3" strokeWidth={1.5} />
                    <div>
                      <h3 className="text-xl md:text-2xl font-black text-white mb-1 md:mb-2 group-hover:text-blue-200 transition-colors duration-300 drop-shadow-lg tracking-tight">Blind Chat</h3>
                      <p className="text-xs md:text-sm text-blue-100/70 group-hover:text-white transition-colors duration-300 leading-relaxed font-medium">Break the ice with text</p>
                    </div>
                  </div>
                </button>

                {/* Video Chat Card */}
                <button
                  onClick={() => handleStartSearch('video')}
                  disabled={!consentGiven}
                  className="flex-1 group relative overflow-hidden rounded-[24px] md:rounded-[36px] p-6 md:p-8 transition-all duration-700 ease-out hover:-translate-y-2 hover:scale-[1.02] w-full glass-liquid hover:shadow-[0_20px_60px_-15px_rgba(236,72,153,0.6)] hover:bg-white/10 hover:backdrop-saturate-150 border-white/10 hover:border-white/20"
                >
                  {/* Water Reflection (Sheen) */}
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-400/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none mix-blend-overlay" />
                  <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-white/20 to-transparent rotate-[35deg] translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-[1.5s] ease-in-out pointer-events-none" />

                  {/* Enhanced Pulse Effect */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 bg-pink-500/20 rounded-full blur-[45px] animate-pulse-slow opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative z-10 flex flex-row md:flex-col items-center gap-4 md:gap-6 text-left md:text-center">
                    <Video className="w-12 h-12 md:w-16 md:h-16 text-pink-300 group-hover:text-white transition-all duration-300 relative z-10 drop-shadow-[0_0_15px_rgba(236,72,153,0.5)] group-hover:scale-110 group-hover:rotate-3" strokeWidth={1.5} />
                    <div>
                      <h3 className="text-xl md:text-2xl font-black text-white mb-1 md:mb-2 group-hover:text-pink-200 transition-colors duration-300 drop-shadow-lg tracking-tight">Video Date</h3>
                      <p className="text-xs md:text-sm text-pink-100/70 group-hover:text-white transition-colors duration-300 leading-relaxed font-medium">See real chemistry</p>
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

          {/* State: Connected or Connecting */}
          {roomId && (
            <ErrorBoundary>
              {connectionState === 'connected' ? (
                /* Connected: Show Room */
                hasVideo ? (
                  <VideoRoom
                    localStream={localStream}
                    remoteStream={remoteStream}
                    messages={messages}
                    sendChatMessage={sendChatMessage}
                    sendTyping={sendTyping}
                    sendEmoji={sendEmoji}
                    incomingEmoji={incomingEmoji}
                    isPartnerTyping={isPartnerTyping}
                    onStop={onStopClick}
                    onNext={onNextClick}
                  />
                ) : (
                  <TextRoom
                    messages={messages}
                    sendChatMessage={sendChatMessage}
                    sendTyping={sendTyping}
                    sendEmoji={sendEmoji}
                    incomingEmoji={incomingEmoji}
                    isPartnerTyping={isPartnerTyping}
                    onStop={onStopClick}
                    onNext={onNextClick}
                  />
                )
              ) : ['disconnected', 'failed', 'closed'].includes(connectionState) ? (
                /* Disconnected: Show Lost Screen */
                <PeerDisconnectedScreen onNext={onNextClick} onStop={onStopClick} />
              ) : (
                /* Connecting: Show Overlay */
                <ConnectingScreen onCancel={onStopClick} />
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

function ConnectingScreen({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full animate-in fade-in duration-500 z-50">
      <div className="relative mb-8">
        {/* Pulsing Rings */}
        <div className="absolute inset-0 bg-purple-500/20 rounded-full animate-ping [animation-duration:2s]" />
        <div className="absolute inset-0 bg-purple-500/10 rounded-full animate-ping [animation-duration:3s] [animation-delay:0.5s]" />

        <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center border border-white/10 shadow-[0_0_40px_-10px_rgba(168,85,247,0.5)] relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-transparent animate-spin-slow" />
          <div className="w-16 h-16 border-4 border-white/5 border-t-purple-500 rounded-full animate-spin" />
        </div>
      </div>

      <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">Connecting...</h3>
      <p className="text-gray-400 font-medium mb-8">Establishing a secure line</p>

      <button
        onClick={onCancel}
        className="px-8 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-medium transition-all border border-white/10 hover:border-white/20 text-sm"
      >
        Cancel
      </button>
    </div>
  )
}

function PeerDisconnectedScreen({ onNext, onStop }: { onNext: () => void, onStop: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full animate-in fade-in zoom-in-95 duration-300 z-50">
      <h3 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tighter drop-shadow-xl">Connection Ended</h3>
      <p className="text-gray-400 mb-8 font-medium">Your partner left the chat.</p>

      <div className="flex items-center gap-4">
        <button
          onClick={onStop}
          className="px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/10 hover:border-white/20 text-xs tracking-wide"
        >
          Back to Lobby
        </button>
        <button
          onClick={onNext}
          className="px-8 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold transition-all shadow-[0_10px_30px_-10px_rgba(168,85,247,0.5)] hover:scale-105 active:scale-95 text-sm flex items-center gap-2"
        >
          <span>Find Next</span>
          <span>→</span>
        </button>
      </div>
    </div>
  )
}

function OnlineUsersBadge() {
  const [count, setCount] = useState(1) // Start with 1 (Me)

  useEffect(() => {
    // Unique channel for global presence
    const channel = supabase.channel('global_lobby', {
      config: {
        presence: {
          key: 'user-' + Math.random().toString(36).substring(7), // Anonymous unique ID
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        // Count total unique keys
        const totalUsers = Object.keys(state).length
        setCount(totalUsers > 0 ? totalUsers : 1)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() })
        }
      })

    return () => {
      channel.unsubscribe()
    }
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
