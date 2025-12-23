import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90 text-white p-4 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-4 text-red-500">Application Error</h2>
          <p className="mb-4 text-gray-400">The application encountered a critical error.</p>
          <pre className="text-xs bg-gray-900/50 p-6 rounded-lg border border-red-900/50 max-w-2xl w-full overflow-auto font-mono text-red-200 mb-8 whitespace-pre-wrap">
            {this.state.error?.toString()}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-red-600 text-white rounded-full font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20"
          >
            Reload Whispr
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
