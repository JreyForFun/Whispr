import { ShieldCheck } from 'lucide-react'
import { useSession } from '../store/useSession'
import { v4 as uuidv4 } from 'uuid'

export function ConsentModal() {
  const { consentGiven, setConsent, setSessionId, setHasVideo } = useSession()

  const handleEnter = (withVideo: boolean) => {
    setSessionId(uuidv4())
    setHasVideo(withVideo)
    setConsent(true)
  }

  if (consentGiven) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl max-w-md w-full shadow-2xl text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-purple-500/10 rounded-full">
            <ShieldCheck className="w-12 h-12 text-purple-400" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Whispr</h1>
        <p className="text-gray-400 mb-8">
          Anonymous chat. No login. No history.
        </p>

        <div className="bg-gray-800/50 p-6 rounded-xl mb-8 text-left space-y-3 border border-gray-700">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input type="checkbox" className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500" />
            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
              I am 16 years of age or older.
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer group">
            <input type="checkbox" className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500" />
            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
              I agree to the <span className="text-purple-400 hover:underline">Community Rules</span> (No nudity, harassment, or illegal content).
            </span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleEnter(false)}
            className="px-6 py-3 rounded-lg font-bold text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-700"
          >
            Text Only
          </button>
          <button
            onClick={() => handleEnter(true)}
            className="px-6 py-3 rounded-lg font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-lg shadow-purple-900/20"
          >
            Video Chat
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-600">
          By entering, you accept our Terms of Service.
        </p>
      </div>
    </div>
  )
}
