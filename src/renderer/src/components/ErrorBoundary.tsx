import { Component, type ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-surface-100 p-8">
          <div className="flex flex-col items-center gap-4 max-w-md text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle size={28} className="text-red-400" />
            </div>
            <h1 className="text-lg font-semibold text-neutral-100">
              Something went wrong
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed">
              {this.state.error.message}
            </p>
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-4 py-2.5 bg-accent/20 text-accent-light text-sm font-medium rounded-lg
                         hover:bg-accent/30 transition-colors"
            >
              <RefreshCw size={16} />
              Reload app
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
