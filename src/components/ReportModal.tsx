import { AlertTriangle, X } from 'lucide-react'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function ReportModal({ isOpen, onClose, onConfirm }: ReportModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 relative">

        {/* Header */}
        <div className="p-6 pb-0 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white leading-tight">Report User?</h3>
              <p className="text-xs text-gray-400 mt-0.5">This helps keep Whispr safe.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 -mt-2 text-gray-400 hover:text-white bg-transparent hover:bg-white/5 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-gray-300 leading-relaxed mb-6">
            Are you sure you want to report this user? This will end the chat immediately and flag them for review.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={onConfirm}
              className="w-full py-3.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_-5px_rgba(239,68,68,0.4)]"
            >
              <AlertTriangle className="w-4 h-4" />
              Yes, Report & Disconnect
            </button>
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-xl font-bold text-gray-300 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all border border-white/5"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
