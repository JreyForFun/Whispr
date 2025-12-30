import { X, ShieldCheck, Scale, Mail, ScrollText, Lock, AlertTriangle } from 'lucide-react'

interface LegalProps {
  isOpen: boolean
  onClose: () => void
}

export function Legal({ isOpen, onClose }: LegalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />

      {/* Modal - Liquid Glass */}
      <div className="relative w-full max-w-2xl glass-liquid rounded-[32px] shadow-[0_0_100px_-20px_rgba(168,85,247,0.3)] max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-500 overflow-hidden border border-white/20">

        {/* Liquid Sheen */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-60 pointer-events-none mix-blend-overlay" />

        {/* Header */}
        <div className="p-6 md:p-8 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/5 relative z-10 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <ScrollText className="w-8 h-8 text-purple-200 drop-shadow-md" />
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-lg">Legal & Safety</h2>
              <p className="text-xs text-purple-200/60 font-medium">Community Guidelines</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all duration-300 text-gray-400 hover:text-white border border-transparent hover:border-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] group"
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 text-gray-200 leading-relaxed scrollbar-liquid relative z-10">

          <section className="relative group p-4 rounded-2xl hover:bg-white/5 transition-colors duration-300 border border-transparent hover:border-white/5">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-green-300" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-green-100">Privacy Policy</span>
            </h3>
            <p className="mb-4 text-xs font-mono text-green-200/50 uppercase tracking-widest">Last updated: December 2025</p>
            <div className="space-y-4 text-sm font-medium text-gray-300/90">
              <p>
                <strong className="text-white">1. No Data Retention:</strong> Whispr is designed to be ephemeral. We do not store your messages, video streams, or personal identities on our servers. All communication is P2P.
              </p>
              <p>
                <strong className="text-white">2. Information We Collect:</strong> Minimal technical data for connections (IP addresses for signaling, discarded post-connect), and temporary session tokens.
              </p>
              <p>
                <strong className="text-white">3. Cookies:</strong> Strictly local storage for consent & session ID. No tracking cookies.
              </p>
            </div>
          </section>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <section className="relative group p-4 rounded-2xl hover:bg-white/5 transition-colors duration-300 border border-transparent hover:border-white/5">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
              <Scale className="w-6 h-6 text-blue-300" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-100">Terms of Service</span>
            </h3>
            <div className="space-y-4 text-sm font-medium text-gray-300/90">
              <p>
                <strong className="text-white">1. Age Restriction:</strong> You must be 18+ to use Whispr.
              </p>
              <p>
                <strong className="text-white">2. Zero Tolerance:</strong> Harassment, hate speech, nudity, or illegal content results in a permanent ban.
              </p>
              <p>
                <strong className="text-white">3. Reporting:</strong> Use the Report button. Validated reports trigger immediate device bans.
              </p>
              <p>
                <strong className="text-white">4. Disclaimer:</strong> Service provided "as is". We moderate via automation and reporting but are not liable for user actions.
              </p>
            </div>
          </section>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <section className="relative group p-4 rounded-2xl hover:bg-white/5 transition-colors duration-300 border border-transparent hover:border-white/5">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
              <Mail className="w-6 h-6 text-yellow-300" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-yellow-100">Contact</span>
            </h3>
            <p className="text-sm font-medium text-gray-300">
              For legal inquiries or appeals, contact us at <a href="#" className="text-purple-300 hover:text-white transition-colors border-b border-purple-300/30 hover:border-white">legal@whispr.app</a>
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-black/20 relative z-10 flex justify-end backdrop-blur-xl">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-purple-50 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-300 active:scale-95 text-sm uppercase tracking-wide"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
