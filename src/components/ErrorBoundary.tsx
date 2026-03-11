import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-8">
          <div className="max-w-2xl w-full bg-card border border-destructive/30 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-destructive">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              The page crashed. Copy the error below and send it to support.
            </p>
            <pre className="bg-secondary rounded-xl p-4 text-xs text-foreground/80 overflow-auto max-h-64 whitespace-pre-wrap break-all">
              {this.state.error.message}
              {"\n\n"}
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:opacity-90"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
