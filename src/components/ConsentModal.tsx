import { useState } from 'react'
import { ShieldCheck, Check, ChevronLeft, ShieldAlert, Heart, Lock, UserX } from 'lucide-react'
import { useSession } from '../store/useSession'
import { v4 as uuidv4 } from 'uuid'

export function ConsentModal() {
  const { consentGiven, setConsent, setSessionId, setHasVideo } = useSession()
  const [agreedAge, setAgreedAge] = useState(false)
  const [agreedRules, setAgreedRules] = useState(false)
  const [showRules, setShowRules] = useState(false)

  const handleEnter = () => {
    if (!agreedAge || !agreedRules) return
    setSessionId(uuidv4())
    setHasVideo(true)
    setConsent(true)
  }

  if (consentGiven) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black p-4">
      {/* Ambient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-pink-900/10 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      <div className="relative w-full max-w-[400px] animate-in fade-in zoom-in-95 duration-500">
        <div className="relative bg-[#0a0a0a] border border-white/5 p-8 md:p-10 rounded-[32px] shadow-2xl overflow-hidden min-h-[500px] flex flex-col">

          {/* Top Light Accent */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {showRules ? (
            <div className="flex-1 flex flex-col animate-in slide-in-from-right duration-300">
              <button
                onClick={() => setShowRules(false)}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 group self-start"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-semibold">Back</span>
              </button>

              <h2 className="text-2xl font-bold text-white mb-6">Community Rules</h2>

              <div className="space-y-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent flex-1 -mr-2">
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3 mb-2">
                    <ShieldAlert className="w-5 h-5 text-red-400" />
                    <h3 className="font-bold text-gray-200 text-sm">Zero Tolerance</h3>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Strictly no nudity, sexual content, violence, or illegal acts. Violations result in immediate permanent bans.
                  </p>
                </div>

                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3 mb-2">
                    <Heart className="w-5 h-5 text-pink-400" />
                    <h3 className="font-bold text-gray-200 text-sm">Respect & Kindness</h3>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    No harassment, hate speech, bullying, or discrimination. Treat everyone with dignity.
                  </p>
                </div>

                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3 mb-2">
                    <Lock className="w-5 h-5 text-blue-400" />
                    <h3 className="font-bold text-gray-200 text-sm">Privacy First</h3>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Do not share personal information (phone numbers, addresses, socials) with strangers.
                  </p>
                </div>

                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3 mb-2">
                    <UserX className="w-5 h-5 text-yellow-400" />
                    <h3 className="font-bold text-gray-200 text-sm">Age Restricted</h3>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    You must be 18+ to use this platform. We protect minors by strictly prohibiting their presence.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/5 shrink-0">
                <button
                  onClick={() => {
                    setAgreedRules(true)
                    setShowRules(false)
                  }}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white bg-white/10 hover:bg-white/20 transition-colors"
                >
                  I Understand & Agree
                </button>
              </div>
            </div>
          ) : (
            <div className="relative z-10 flex flex-col items-center animate-in slide-in-from-left duration-300 h-full">
              {/* Icon */}
              {/* Logo */}
              <div className="mb-6 shrink-0 relative hover:scale-105 transition-transform duration-500">
                <div className="absolute inset-0 bg-purple-500/30 blur-2xl rounded-full" />
                <img src="/pwa-512x512.png" alt="Whispr Logo" className="w-24 h-24 relative z-10 drop-shadow-2xl" />
              </div>

              <h1 className="text-4xl font-black text-white mb-2 tracking-tight font-brand">Whispr</h1>
              <p className="text-gray-400 mb-10 text-sm font-medium tracking-wide">
                Find Friends. Find Love. Just Talk.
              </p>

              {/* Custom Checkboxes */}
              <div className="w-full space-y-4 mb-10 flex-1">
                <label className="flex items-start gap-4 cursor-pointer group p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300">
                  <div className="relative flex-shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={agreedAge}
                      onChange={(e) => setAgreedAge(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-lg border-2 transition-all duration-300 flex items-center justify-center 
                          ${agreedAge ? 'border-purple-500 bg-purple-500' : 'border-gray-600 group-hover:border-gray-500'}`} />
                  </div>
                  <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors select-none font-medium">
                    I am 18+ years old and I confirm that I am not a minor.
                  </span>
                </label>

                <div
                  className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 group cursor-pointer"
                  onClick={() => setShowRules(true)}
                >
                  <div className="relative flex-shrink-0 mt-0.5 pointer-events-none">
                    <div
                      className={`w-5 h-5 rounded-lg border-2 transition-all duration-300 flex items-center justify-center 
                            ${agreedRules ? 'border-purple-500 bg-purple-500' : 'border-gray-600 group-hover:border-gray-500'}`} />
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors select-none font-medium">
                      I have read and agree to the
                    </span>
                    <span className="text-sm font-bold text-purple-400 group-hover:text-purple-300 group-hover:underline decoration-purple-500/30 underline-offset-4 transition-colors text-left">
                      Community Rules
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleEnter}
                disabled={!agreedAge || !agreedRules}
                className="w-full py-5 rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 shadow-[0_0_40px_-10px_rgba(168,85,247,0.4)] hover:shadow-[0_0_60px_-15px_rgba(168,85,247,0.6)] transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Get Started
              </button>

              <p className="mt-8 text-[11px] text-gray-600 font-medium uppercase tracking-widest opacity-60">
                Safe & Private
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
