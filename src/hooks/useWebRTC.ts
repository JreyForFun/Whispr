import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../store/useSession'

// PRODUCTION CONFIGURATION NOTE:
// For production, you MUST provide TURN servers to ensure connections across different networks (NATs/Firewalls).
// Relying only on Google's public STUN server will fail for ~20% of users (Symmetric NATs).
// Recommended providers: Twilio, Metered.ca, or self-hosted CoTurn.
//
// Example Configuration:
// const ICE_SERVERS = {
//   iceServers: [
//     { urls: 'stun:stun.l.google.com:19302' },
//     {
//       urls: 'turn:global.turn.twilio.com:3478',
//       username: 'your-twilio-username',
//       credential: 'your-twilio-password'
//     }
//   ]
// }

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // { urls: import.meta.env.VITE_TURN_URL ... }
  ],
}

export function useWebRTC(isOfferer: boolean = false, onPeerDisconnected?: () => void) {
  const { sessionId, roomId, hasVideo } = useSession()
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new')
  const [isPartnerTyping, setIsPartnerTyping] = useState(false)
  const [incomingEmoji, setIncomingEmoji] = useState<{ emoji: string, id: string } | null>(null)

  // Auto-detect disconnects
  useEffect(() => {
    if (['disconnected', 'failed', 'closed'].includes(connectionState)) {
      onPeerDisconnected?.()
      setIsPartnerTyping(false) // Reset on disconnect
    }
  }, [connectionState, onPeerDisconnected])

  // Chat State
  const [messages, setMessages] = useState<{ sender: 'me' | 'them', text: string }[]>([])
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const iceCandidatesQueue = useRef<RTCIceCandidate[]>([])

  const peerRef = useRef<RTCPeerConnection | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // 1. Setup Local Stream
  const startLocalStream = useCallback(async () => {
    if (!hasVideo) return // Audio/Text only logic could be here
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { min: 640, ideal: 1280, max: 1920 }, // Min 480p, Ideal 720p, Max 1080p
          height: { min: 480, ideal: 720, max: 1080 },
          frameRate: { min: 30, ideal: 30, max: 60 }, // Adapt between 30-60fps
          facingMode: "user"
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      setLocalStream(stream)
      return stream
    } catch (err) {
      console.error('Failed to get user media', err)
      return null
    }
  }, [hasVideo])






  const messageQueue = useRef<string[]>([])

  // Helper to setup Data Channel events
  const setupDataChannel = (dc: RTCDataChannel) => {
    console.log('Setting up data channel', { label: dc.label, readyState: dc.readyState })
    dc.onopen = () => {
      console.log('Chat Channel Open', { label: dc.label, readyState: dc.readyState })
      // Flush queue
      while (messageQueue.current.length > 0) {
        const payload = messageQueue.current.shift()
        if (payload) dc.send(payload)
      }
    }
    dc.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'chat') {
          console.log('Chat message received', { text: data.text })
          setMessages(prev => [...prev, { sender: 'them', text: data.text }])
          setIsPartnerTyping(false) // Assume they stopped typing when they sent
        } else if (data.type === 'typing') {
          setIsPartnerTyping(data.isTyping)
        } else if (data.type === 'emoji') {
          setIncomingEmoji({ emoji: data.emoji, id: Date.now().toString() })
        }
      } catch (err) {
        // Fallback for backward compatibility or raw strings
        console.warn('Received non-JSON message, treating as text', e.data)
        setMessages(prev => [...prev, { sender: 'them', text: e.data }])
      }
    }
    dc.onerror = (err) => {
      console.error('Data channel error', err)
    }
    dc.onclose = () => {
      console.log('Data channel closed')
      setIsPartnerTyping(false)
    }
    dataChannelRef.current = dc
  }

  // 2. Initialize Peer
  const createPeer = useCallback(() => {
    if (peerRef.current) return peerRef.current

    const pc = new RTCPeerConnection(ICE_SERVERS)

    // Handle incoming Data Channel
    pc.ondatachannel = (event) => {
      console.log('Received Data Channel')
      setupDataChannel(event.channel)
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'signal_ice',
          payload: { candidate: event.candidate }
        })
      }
    }

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0])
    }

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState)
    }

    peerRef.current = pc
    return pc
  }, [])

  // 3. Handle Signaling
  useEffect(() => {
    if (!roomId || !sessionId) return

    setConnectionState('new')
    const pc = createPeer()

    // Add local tracks if stream exists
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream)
      })
    }

    const channel = supabase.channel(`room:${roomId}`)

    channel
      .on('broadcast', { event: 'signal_offer' }, async ({ payload }) => {
        console.log("Received Offer")
        if (!pc) return
        if (pc.signalingState !== 'stable') {
          console.warn("Received offer in non-stable state, ignoring collision")
          return
        }
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))

        // Flush ICE queue
        while (iceCandidatesQueue.current.length > 0) {
          const c = iceCandidatesQueue.current.shift()
          if (c) await pc.addIceCandidate(c).catch(e => console.error("Error adding queued ice", e))
        }

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        channel.send({
          type: 'broadcast',
          event: 'signal_answer',
          payload: { sdp: answer }
        })
      })
      .on('broadcast', { event: 'signal_answer' }, async ({ payload }) => {
        console.log("Received Answer")
        if (!pc) return
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))

        // Flush ICE queue
        while (iceCandidatesQueue.current.length > 0) {
          const c = iceCandidatesQueue.current.shift()
          if (c) await pc.addIceCandidate(c).catch(e => console.error("Error adding queued ice", e))
        }
      })
      .on('broadcast', { event: 'signal_ice' }, async ({ payload }) => {
        if (!pc) return
        const candidate = new RTCIceCandidate(payload.candidate)
        if (pc.remoteDescription) {
          try {
            await pc.addIceCandidate(candidate)
          } catch (e) {
            console.error('Error adding ice candidate', e)
          }
        } else {
          console.log("Queueing ICE candidate (RemoteDesc not set)")
          iceCandidatesQueue.current.push(candidate)
        }
      })
      .on('broadcast', { event: 'signal_bye' }, async () => {
        console.log("Received Bye Signal")
        if (onPeerDisconnected) {
          onPeerDisconnected()
        }
      })
      // SAFETY NET: Listen for DB Room Deletion (Zombie Protection)
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'active_rooms', filter: `id=eq.${roomId}` },
        () => {
          console.log("Room deleted in DB. Disconnecting.")
          if (onPeerDisconnected) {
            onPeerDisconnected()
          }
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log("Signaling Channel Subscribed. Is Offerer?", isOfferer)
          if (isOfferer) {
            const startOfferLoop = async () => {
              if (!peerRef.current || !channelRef.current) return

              console.log("Creating Offer (Initiator)...")
              // Setup DC first
              const dc = peerRef.current.createDataChannel("chat")
              setupDataChannel(dc)

              const offer = await peerRef.current.createOffer()
              await peerRef.current.setLocalDescription(offer)

              const sendPayload = {
                type: 'broadcast' as const,
                event: 'signal_offer',
                payload: { sdp: offer }
              }

              // Send immediately
              console.log("Sending Offer (Initial)...")
              channelRef.current.send(sendPayload)

              // Retry Loop (Polite Signaling)
              const interval = setInterval(() => {
                if (!peerRef.current || peerRef.current.signalingState === 'closed' || peerRef.current.remoteDescription) {
                  clearInterval(interval)
                  return
                }
                console.log("Resending Offer (Retry)...")
                channelRef.current?.send(sendPayload)
              }, 1000)
            }
            startOfferLoop().catch(console.error)
          }
        }
      })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      pc.close()
      peerRef.current = null
      setRemoteStream(null)
      setConnectionState('closed')
      setMessages([])
      setIsPartnerTyping(false)
      dataChannelRef.current = null
    }
  }, [roomId, sessionId, localStream, createPeer, onPeerDisconnected, isOfferer])

  const createOffer = async () => {
    if (!peerRef.current || !channelRef.current) return

    // Create Channel as Offerer
    const dc = peerRef.current.createDataChannel("chat")
    setupDataChannel(dc)

    const offer = await peerRef.current.createOffer()
    await peerRef.current.setLocalDescription(offer)
    channelRef.current.send({
      type: 'broadcast',
      event: 'signal_offer',
      payload: { sdp: offer }
    })
  }

  const sendSignalBye = async () => {
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'signal_bye',
        payload: {}
      })
    }
  }

  const sendChatMessage = (text: string) => {
    const payload = JSON.stringify({ type: 'chat', text })

    // Always show locally immediately (Optimistic UI)
    setMessages(prev => [...prev, { sender: 'me', text }])

    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      dataChannelRef.current.send(payload)
    } else {
      console.log("Queueing message...", text)
      messageQueue.current.push(payload)
    }
  }

  const sendTyping = (isTyping: boolean) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      const payload = JSON.stringify({ type: 'typing', isTyping })
      dataChannelRef.current.send(payload)
    }
  }

  const sendEmoji = (emoji: string) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      const payload = JSON.stringify({ type: 'emoji', emoji })
      dataChannelRef.current.send(payload)
    }
  }

  const stop = () => {
    localStream?.getTracks().forEach(t => t.stop())
    setLocalStream(null)
    peerRef.current?.close()
    setConnectionState('closed')
    setMessages([])
    setIsPartnerTyping(false)
    dataChannelRef.current = null
  }

  return {
    localStream,
    remoteStream,
    connectionState,
    startLocalStream,
    createOffer,
    stop,
    sendChatMessage,
    sendTyping,
    sendEmoji,
    incomingEmoji,
    messages,
    isPartnerTyping,
    sendSignalBye
  }
}
