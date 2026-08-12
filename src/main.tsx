import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {ErrorBoundary} from './components/ErrorBoundary';
import {reportClientError} from './lib/reportClientError';

// Fix #8 — Production Observability. Covers the two crash classes a
// React Error Boundary structurally cannot catch: errors thrown
// outside React's render (event handlers, timers, non-promise async
// code) and unhandled promise rejections (a missed .catch() on a
// Firestore call, for example). Both were previously silent — the tab
// looked frozen or "did nothing" with nothing but a console.error no
// one ever saw.
window.addEventListener('error', (event) => {
  reportClientError(event.error ?? event.message, 'window-error');
});
window.addEventListener('unhandledrejection', (event) => {
  reportClientError(event.reason, 'unhandled-promise-rejection');
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
