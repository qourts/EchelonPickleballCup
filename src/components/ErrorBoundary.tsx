import { Component, type ReactNode } from 'react'

/** Keeps one broken page from blanking the whole portal. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Portal render error', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="notice notice-warn" role="alert">
        <p className="notice-title">Something went wrong on this page</p>
        <p>Please reload. The Player Guide and schedule keep working from the menu.</p>
        <button type="button" className="button button-ghost" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    )
  }
}
