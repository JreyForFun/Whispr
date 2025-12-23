import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface SessionState {
  sessionId: string | null
  consentGiven: boolean
  hasVideo: boolean
  isMatching: boolean
  roomId: string | null

  setSessionId: (id: string) => void
  setConsent: (given: boolean) => void
  setHasVideo: (video: boolean) => void
  setIsMatching: (matching: boolean) => void
  setRoomId: (id: string | null) => void
  resetSession: () => void
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      sessionId: null,
      consentGiven: false,
      hasVideo: false,
      isMatching: false,
      roomId: null,

      setSessionId: (id) => set({ sessionId: id }),
      setConsent: (given) => set({ consentGiven: given }),
      setHasVideo: (video) => set({ hasVideo: video }),
      setIsMatching: (matching) => set({ isMatching: matching }),
      setRoomId: (id) => set({ roomId: id }),

      resetSession: () => set({
        isMatching: false,
        roomId: null
      })
    }),
    {
      name: 'whispr-storage', // unique name
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage (survives refresh, dies on close)
      partialize: (state) => ({
        sessionId: state.sessionId,
        consentGiven: state.consentGiven,
        hasVideo: state.hasVideo
      }), // Only persist config/identity, not transient room state
    }
  )
) // We intentionally keep sessionId and consent to avoid re-prompting too much,
// unless SRS demands strictly "new session" on every match.
// PRD says "Session destroys on exit", so actually resetSession might clear sessionId too
// if we implement strict ephemeral logic. for now let's keep UUID for stability.
