import { Component, ErrorInfo, ReactNode } from 'react';
import { reportClientError } from '../lib/reportClientError';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
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
 * [Bug fix — a real crash's reportClientError beacon never reached the
 * server; nothing in Railway's logs, no way to diagnose it without
 * inconveniencing the customer for browser DevTools access] The error
 * itself — message and a short stack excerpt — is now also shown
 * directly on this screen, in a small collapsed "Detalhes técnicos"
 * section with its own copy button. This does not replace
 * reportClientError (still called, unchanged, still the first line of
 * defense) — it's a fallback for exactly the case that already
 * happened once: the report doesn't arrive, or no one has access to
 * check server logs. Anyone who hits this screen can now screenshot or
 * copy the technical details themselves, no DevTools/Railway access
 * needed.
 *
 * Deliberately does NOT catch: errors thrown in event handlers, async
 * code, or effects — React Error Boundaries structurally never do.
 * Those are covered separately by the window 'error' and
 * 'unhandledrejection' listeners registered alongside this boundary in
 * main.tsx.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, copied: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, copied: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    reportClientError(error, 'react-error-boundary', {
      componentStack: errorInfo.componentStack ?? undefined,
    });
  }

  handleCopyDetails = () => {
    const { error } = this.state;
    if (!error) return;
    navigator.clipboard?.writeText(this.buildDetailsText(error)).then(
      () => this.setState({ copied: true }),
      () => {
        // Clipboard permission denied or unavailable — the text is
        // still visible on screen to screenshot manually, so this is
        // never a dead end, just a smaller convenience lost.
      }
    );
  };

  // [Addition — browser/OS is a real, common variable for exactly
  // this class of bug: in-app WebViews (opened from a WhatsApp/
  // Instagram/Facebook link, not the phone's real browser), iPhone
  // HEIC photos, and older-Android createImageBitmap gaps all behave
  // differently by browser. navigator.userAgent was already being
  // sent to reportClientError's payload but was never shown on this
  // visible screen — surfaced here now so a screenshot alone answers
  // "which browser" without needing to separately ask the person who
  // hit it.
  buildDetailsText = (error: Error): string =>
    `${error.message}\n\n${error.stack || ''}\n\nUA: ${navigator.userAgent}`.trim();

  render() {
    if (this.state.hasError) {
      const { error, copied } = this.state;
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
            {error && (
              <details className="mt-2 w-full text-left">
                <summary className="text-xs text-white/40 cursor-pointer select-none">
                  Detalhes técnicos
                </summary>
                <div className="mt-2 bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
                  <p className="text-[11px] font-mono text-white/60 break-words whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {this.buildDetailsText(error)}
                  </p>
                  <button
                    type="button"
                    onClick={this.handleCopyDetails}
                    className="text-[11px] font-medium text-white/70 hover:text-white underline underline-offset-2"
                  >
                    {copied ? 'Copiado!' : 'Copiar detalhes'}
                  </button>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
