import { createElement } from 'react';
import ReactDOM from 'react-dom/client';
import Main from '../Main';
import { BootErrorBoundary, renderHardBlockedPage } from '../components/boot-error-boundary';
import { installChunkErrorHandling, reportClientError } from './client-error';
import {
  clearLoginSessionStorage,
  installStorageFallback,
  isStorageBlocked,
  isStorageHardBlocked,
} from './safe-storage';

export function startStandaloneApp(): void {
  installStorageFallback();

  const rootEl = document.getElementById('root');
  if (!rootEl) return;

  if (isStorageHardBlocked()) {
    renderHardBlockedPage(rootEl);
    reportClientError(new Error('Storage blocked'), window.location.pathname);
    return;
  }

  // Clear session data when URL contains new login credentials.
  // This must happen BEFORE React initializes to prevent the @dfx.swiss/react
  // package from loading a stale session from storage.
  // Only clear session-related keys, preserve user preferences (language, etc.).
  const urlParams = new URLSearchParams(window.location.search);
  if ((urlParams.has('address') && urlParams.has('signature')) || urlParams.has('session')) {
    clearLoginSessionStorage();
  }

  // A memory shim makes the chunk-reload guard ephemeral: reload wipes it, so a
  // leftover chunk error would loop. Report still happens via the error boundary.
  if (!isStorageBlocked()) {
    installChunkErrorHandling();
  }

  ReactDOM.createRoot(rootEl).render(createElement(BootErrorBoundary, null, createElement(Main)));
}
