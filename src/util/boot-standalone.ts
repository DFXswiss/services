import { createElement } from 'react';
import ReactDOM from 'react-dom/client';
import Main from '../Main';
import { BootErrorBoundary, renderHardBlockedPage } from '../components/boot-error-boundary';
import { installChunkErrorHandling, reportClientError } from './client-error';
import { clearLoginSessionStorage, installStorageFallback, isStorageHardBlocked } from './safe-storage';

export function startStandaloneApp(): void {
  installStorageFallback();

  if (isStorageHardBlocked()) {
    const root = document.getElementById('root') as HTMLElement;
    renderHardBlockedPage(root);
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

  installChunkErrorHandling();

  const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
  root.render(createElement(BootErrorBoundary, null, createElement(Main)));
}
