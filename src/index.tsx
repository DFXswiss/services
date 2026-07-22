import ReactDOM from 'react-dom/client';
import Main from './Main';
import './index.css';
import reportWebVitals from './reportWebVitals';

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

// A new deploy replaces the content-hashed chunks. A tab left open across a deploy can
// request a chunk that no longer exists; Cloudflare Pages then serves index.html (200)
// for it, which surfaces as a ChunkLoadError. Reload once to pick up the new chunks,
// guarded against a reload loop.
function isChunkLoadError(message?: string): boolean {
  return !!message && /Loading chunk [\w-]+ failed|ChunkLoadError|Loading CSS chunk [\w-]+ failed/i.test(message);
}
function reloadOnceForChunkError(): void {
  const KEY = 'dfx.chunkReloadAt';
  const last = Number(sessionStorage.getItem(KEY) ?? 0);
  if (Date.now() - last > 10000) {
    sessionStorage.setItem(KEY, String(Date.now()));
    window.location.reload();
  }
}
window.addEventListener('error', (event) => {
  if (isChunkLoadError(event?.message)) reloadOnceForChunkError();
});
window.addEventListener('unhandledrejection', (event) => {
  const message = (event?.reason as Error | undefined)?.message;
  if (isChunkLoadError(message)) reloadOnceForChunkError();
});

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<Main />);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
