import React from 'react'

type Props = { children: React.ReactNode }
type State = { hasError: boolean; message?: string }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) }
  }

  componentDidCatch(error: unknown, info: unknown) {
    // Log for diagnostics
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20 }}>
          <h2>Something went wrong</h2>
          <p style={{ maxWidth: 600 }}>
            The interface failed to load. Please refresh the page or try another browser.
            If you use content blockers or strict privacy extensions, temporarily disable them
            for mattspanish.github.io.
          </p>
          {this.state.message && <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.message}</pre>}
        </div>
      )
    }
    return this.props.children
  }
}
