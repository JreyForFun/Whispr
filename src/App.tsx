import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './lib/supabase'
import { useSession } from './store/useSession'
import { useWebRTC } from './hooks/useWebRTC'
import { ConsentModal } from './components/ConsentModal'
import { VideoRoom } from './components/VideoRoom'
import { TextRoom } from './components/TextRoom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Loader2, Zap, MessageSquare } from 'lucide-react'

// Poll interval for matchmaking
const MATCH_POLL_MS = 2000

function App() {
  const {
    consentGiven,
    sessionId,
    hasVideo,
    isMatching,
    roomId,
    setIsMatching,
    setRoomId,
    setHasVideo
  } = useSession()



  const [isInitiator, setIsInitiator] = useState(false)
  const lastRoomIdRef = useRef<string | null>(null)

  // Handler for when peer disconnects
  // Defined BEFORE useWebRTC call
  // But useWebRTC is called at top level. 
  // We need to use a reference or update logic. 
  // Actually, we can just define a function reference that depends on nothing or uses a ref?
  // Easier: Define it later? No, hook needs it.

  // To avoid circular dependency (handleStop needs sendSignalBye from useWebRTC, useWebRTC needs handlePeerDisconnect which calls handleStop),
  // We can use a useEffect on a returned flag 'peerDisconnected' OR use a Ref for the callback.
  // BUT the simplest way with the current hook structure:
  // 1. Pass a callback to useWebRTC that sets a state 'peerDidDisconnect'.
  // 2. useEffect on 'peerDidDisconnect' to call handleStop.

  const [peerExited, setPeerExited] = useState(false)

  const handlePeerExited = useCallback(() => setPeerExited(true), [])

  const {
    localStream,
    remoteStream,
    connectionState,
    startLocalStream,
    stop,
    messages,
    sendChatMessage,
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
      console.log("Peer exited, stopping session.")
      handleStop(false) // Don't send bye back if they already left
      setPeerExited(false) // Reset
    }
  }, [handleStop, peerExited])

  // Auto-recover UI if connection drops after a match
  useEffect(() => {
    if (!roomId) return

    if (['failed', 'disconnected', 'closed'].includes(connectionState)) {
      const timer = setTimeout(() => {
        // Instead of tearing down the UI (handleStop), keep roomId so UI stays visible.
        // We only surface an error message and let the user decide to stop/next.
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
    if (!roomId) return // Can't report if no room (or session ID of peer unknown here)
    // In a real app, 'active_rooms' has user_b_session. 
    // BUT we don't have peer's Session ID locally easily unless we stored it from match result or signaling.
    // 'match_user' return data had 'partner_session_id'.
    // NOTE: For MVP, we need to know WHO we are reporting.
    // Hack: We report the ROOM. The backend report table has 'room_id'.
    // We can run a Quick query to find the 'other' user in this room.

    // 1. Log Report
    try {
      // Find peer ID from room (Client side fetch? Or just send Room ID)
      // Let's send Room ID and let Backend/Admin resolve it? 
      // OR better: Fetch peer ID first.
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
          reason: 'harassment' // Default for button
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
    <div className="h-screen h-[100dvh] bg-[#1a1a1a] text-white flex flex-col font-sans relative overflow-hidden">
      <ConsentModal />
      {/* Header */}
      <header className="p-2 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 backdrop-blur z-50 h-14 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center font-bold text-lg">
            W
          </div>
          <span className="font-bold text-xl tracking-tight">Whispr</span>
        </div>
        <div className="text-xs text-gray-500 font-mono">
          {sessionId ? `ID: ${sessionId.slice(0, 8)}...` : 'No Session'}
        </div>
      </header>

      {/* Main Content */}
      <ErrorBoundary>
        <main className={`flex-1 flex flex-col relative ${roomId ? 'w-full bg-gray-950 p-0 overflow-hidden' : 'items-center justify-center p-4'}`}>

          {/* State: Waiting Only (No Match, Not Searching) */}
          {!isMatching && !roomId && (
            <div className="flex flex-col items-center animate-fade-in-up w-full max-w-4xl">
              <h2 className="text-4xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 mb-12 tracking-tighter">
                WHISPR
              </h2>

              <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl px-4">
                {/* Text Only Card */}
                <button
                  onClick={() => handleStartSearch('text')}
                  disabled={!consentGiven}
                  className="flex-1 bg-gray-800/50 hover:bg-gray-800 border-2 border-transparent hover:border-blue-500 rounded-3xl p-8 transition-all group disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-4 hover:scale-105"
                >
                  <div className="p-4 bg-blue-500/20 rounded-full group-hover:bg-blue-500 text-blue-400 group-hover:text-white transition-colors">
                    <MessageSquare className="w-10 h-10" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-1">Text Chat</h3>
                    <p className="text-sm text-gray-400">Classic anonymous messaging.</p>
                  </div>
                </button>

                {/* Video Chat Card */}
                <button
                  onClick={() => handleStartSearch('video')}
                  disabled={!consentGiven}
                  className="flex-1 bg-gray-800/50 hover:bg-gray-800 border-2 border-transparent hover:border-purple-500 rounded-3xl p-8 transition-all group disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-4 hover:scale-105"
                >
                  <div className="p-4 bg-purple-500/20 rounded-full group-hover:bg-purple-500 text-purple-400 group-hover:text-white transition-colors">
                    <Zap className="w-10 h-10" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-1">Video Chat</h3>
                    <p className="text-sm text-gray-400">Face-to-face connections.</p>
                  </div>
                </button>
              </div>

              <div className="mt-12 opacity-50 text-xs tracking-widest uppercase text-gray-500">
                State of the Art • Secure • Ephemeral
              </div>
            </div>
          )}

          {/* State: Matching (Searching...) */}
          {isMatching && !roomId && (
            <div className="text-center animate-pulse">
              <Loader2 className="w-16 h-16 text-purple-500 animate-spin mx-auto mb-4" />
              <h3 className="text-2xl font-semibold mb-2">Searching for a partner...</h3>
              <p className="text-gray-400">Connecting you to someone, somewhere.</p>
              {dbError && (
                <p className="mt-4 text-red-400 bg-red-900/20 px-4 py-2 rounded text-sm max-w-md mx-auto">
                  Attempting to connect: {dbError}
                </p>
              )}

              {/* Debug Info */}
              <div className="mt-6 p-4 bg-gray-800/50 rounded-lg text-xs font-mono text-left max-w-xs mx-auto border border-gray-700 opacity-70">
                <p className="text-gray-400 font-bold mb-2">DEBUG INFO:</p>
                <p>MyID: <span className="text-blue-400">{sessionId?.slice(0, 8)}</span></p>
                <DbStats />
              </div>

              <button
                onClick={() => handleStop(true)}
                className="mt-8 px-6 py-2 rounded-full border border-gray-600 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
              >
                Cancel
              </button>
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
                  onStop={() => handleStop(true)}
                  onNext={handleNext}
                  onReport={handleReport}
                />
              ) : (
                <TextRoom
                  connectionState={connectionState}
                  messages={messages}
                  sendChatMessage={sendChatMessage}
                  onStop={() => handleStop(true)}
                  onNext={handleNext}
                  onReport={handleReport}
                />
              )}
            </ErrorBoundary>
          )}

        </main>
      </ErrorBoundary>

      {/* Footer */}
      <footer className="p-2 text-center text-[10px] text-gray-600 z-10 border-t border-gray-900/50 shrink-0">
        &copy; 2025 Whispr. Leave no trace.
      </footer>
    </div>
  )
}

function DbStats() {
  const [stats, setStats] = useState({ queue: 0, rooms: 0 })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const interval = setInterval(async () => {
      const { count: queueCount, error: qErr } = await supabase.from('match_queue').select('*', { count: 'exact', head: true })
      const { count: roomCount, error: rErr } = await supabase.from('active_rooms').select('*', { count: 'exact', head: true })

      if (qErr) {
        setError(qErr.message)
        console.error("Queue Stats Error:", qErr)
      } else if (rErr) {
        setError(rErr.message)
        console.error("Room Stats Error:", rErr)
      } else {
        setError(null)
        setStats({ queue: queueCount || 0, rooms: roomCount || 0 })
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-1 mt-2 border-t border-gray-700 pt-2 text-gray-500">
      {error ? (
        <p className="text-red-400 text-[10px] leading-tight break-words">{error}</p>
      ) : (
        <>
          <p>Queue Count: <span className="text-yellow-400">{stats.queue}</span></p>
          <p>Active Rooms: <span className="text-green-400">{stats.rooms}</span></p>
        </>
      )}
    </div>
  )
}

export default App
