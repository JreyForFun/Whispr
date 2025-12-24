import { X, Shield, Scale, Mail } from 'lucide-react'

interface LegalProps {
  isOpen: boolean
  onClose: () => void
}

export function Legal({ isOpen, onClose }: LegalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-gray-900 border border-white/10 rounded-3xl shadow-2xl max-h-[80vh] flex flex-col animate-in zoom-in-95">

        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/5 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-xl">
              <Scale className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Legal & Safety</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 text-gray-300 leading-relaxed scrollbar-thin scrollbar-thumb-gray-700">

          <section>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              Privacy Policy
            </h3>
            <p className="mb-4 text-sm">Last updated: December 2025</p>
            <div className="space-y-4 text-sm">
              <p>
                <strong>1. No Data Retention:</strong> Whispr is designed to be ephemeral. We do not store your messages, video streams, or personal identities on our servers. All communication is peer-to-peer (P2P).
              </p>
              <p>
                <strong>2. Information We Collect:</strong> We only collect minimal technical data necessary to establish connections (IP addresses for signaling, which are discarded after connection), and temporary session tokens to prevent abuse.
              </p>
              <p>
                <strong>3. Cookies:</strong> We use local storage solely to remember your consent status and session ID. No tracking cookies are used.
              </p>
            </div>
          </section>

          <hr className="border-white/5" />

          <section>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Scale className="w-4 h-4 text-blue-400" />
              Terms of Service
            </h3>
            <div className="space-y-4 text-sm">
              <p>
                <strong>1. Age Restriction:</strong> You must be 18 years or older to use Whispr. By using this service, you warrant that you are at least 18.
              </p>
              <p>
                <strong>2. Zero Tolerance Policy:</strong> We have zero tolerance for harassment, hate speech, nudity, or illegal content. Users found violating these rules will be banned permanently.
              </p>
              <p>
                <strong>3. Reporting:</strong> Use the Report button to flag violations. Validated reports result in immediate device-level bans.
              </p>
              <p>
                <strong>4. Disclaimer:</strong> The service is provided "as is". We are not responsible for the actions of users, though we do our best to moderate the community through automated systems and user reporting.
              </p>
            </div>
          </section>

          <hr className="border-white/5" />

          <section>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Mail className="w-4 h-4 text-yellow-400" />
              Contact
            </h3>
            <p className="text-sm">
              For legal inquiries or appeals, contact us at <a href="#" className="text-purple-400 hover:underline">legal@whispr.app</a>
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-black/20 rounded-b-3xl flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
