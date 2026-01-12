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

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<Main />);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
