import { Component, ErrorInfo, ReactNode } from 'react';
import { reportClientError } from '../lib/reportClientError';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Fix #8 — Production Observability.
 *
 * The app's one React Error Boundary, wrapping <App/> in main.tsx.
 * Before this existed, a render-time crash anywhere in the tree
 * unmounted the entire app to a blank white screen, with nothing but a
 * console.error that no one — not the pilot customer, not SABUSH —
 * ever saw. This catches it, reports it via reportClientError() (which
 * relays through the same alert channel as server-side critical
 * failures), and shows a minimal recovery screen instead of a blank
 * page.
 *
 * Deliberately does NOT catch: errors thrown in event handlers, async
 * code, or effects — React Error Boundaries structurally never do.
 * Those are covered separately by the window 'error' and
 * 'unhandledrejection' listeners registered alongside this boundary in
 * main.tsx.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    reportClientError(error, 'react-error-boundary', {
      componentStack: errorInfo.componentStack ?? undefined,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-[#0d0806] text-white px-6">
          <div className="max-w-sm text-center flex flex-col items-center gap-4">
            <div className="text-4xl" aria-hidden="true">⚠️</div>
            <h1 className="text-lg font-semibold">Algo correu mal</h1>
            <p className="text-sm text-white/70">
              Ocorreu um erro inesperado. A nossa equipa já foi notificada. Tente recarregar a página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-5 py-2.5 rounded-lg bg-white text-[#0d0806] text-sm font-medium"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
