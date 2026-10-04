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
        <div style={{ padding: 32, maxWidth: 640, margin: '40px auto', fontFamily: 'system-ui, sans-serif', color: '#181513' }}>
          <h2 style={{ fontSize: 24, marginBottom: 12 }}>Something went wrong</h2>
          <p style={{ color: '#555', marginBottom: 20 }}>
            The POS interface encountered an unexpected error. You can refresh the page or clear the local cache to recover.
          </p>
          {this.state.message && (
            <pre style={{ padding: 14, background: '#f5f5f5', borderRadius: 8, overflowX: 'auto', fontSize: 13, color: '#dc2626' }}>
              {this.state.message}
            </pre>
          )}
          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ padding: '10px 18px', background: '#d97706', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
            >
              Reload POS
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.clear()
                } catch {
                  // ignore
                }
                window.location.reload()
              }}
              style={{ padding: '10px 18px', background: '#e5e7eb', color: '#1f2937', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}
            >
              Clear Cache & Reset
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
