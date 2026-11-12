import { Component, type ReactNode } from 'react'
import { ErrorState } from './States'

export class RouteError extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorState
          message="This page could not be shown. Try again, or go back and open it once more."
          onRetry={() => this.setState({ error: null })}
        />
      )
    }
    return this.props.children
  }
}
