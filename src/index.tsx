import ReactDOM from 'react-dom/client';
import Main from './Main';
import './index.css';
import reportWebVitals from './reportWebVitals';
import { isChunkLoadError, reloadOnceForChunkError, reportClientError } from './util/client-error';

// Clear session data when URL contains new login credentials
// This must happen BEFORE React initializes to prevent the @dfx.swiss/react
// package from loading a stale session from storage
// Only clear session-related keys, preserve user preferences (language, etc.)
const urlParams = new URLSearchParams(window.location.search);
if ((urlParams.has('address') && urlParams.has('signature')) || urlParams.has('session')) {
  localStorage.removeItem('dfx.authenticationToken');
  localStorage.removeItem('dfx.srv.activeWallet');
  localStorage.removeItem('dfx.srv.queryParams');
  sessionStorage.clear();
}

// A chunk that fails to load outside the router — during startup, or from code React does not
// render — reaches neither Suspense nor the router's error boundary, so it is caught here.
// Chunk failures inside the router are handled by the error screen, which is where React hands
// them; these listeners never see those.
function handleChunkError(error: unknown): void {
  if (!isChunkLoadError(error)) return;

  reportClientError(error, window.location.pathname);
  reloadOnceForChunkError();
}

window.addEventListener('error', (event) => handleChunkError(event?.error ?? event?.message));
window.addEventListener('unhandledrejection', (event) => handleChunkError(event?.reason));

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<Main />);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
