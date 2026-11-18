import { Component, type ReactNode } from 'react'
import { ErrorState } from './States'

export class RouteError extends Component<{ children: ReactNode }, { error: Error | null; nonce: number }> {
  state = { error: null as Error | null, nonce: 0 }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorState
          message="This page could not be shown. Try again, or go back and open it once more."
          onRetry={() => this.setState((current) => ({ error: null, nonce: current.nonce + 1 }))}
        />
      )
    }
    return <div key={this.state.nonce}>{this.props.children}</div>
  }
}
