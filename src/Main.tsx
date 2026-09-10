import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import { StorageBlockedBanner } from './components/boot-error-boundary';

function Main() {
  return (
    <>
      <StorageBlockedBanner />
      <App routerFactory={createBrowserRouter} />
    </>
  );
}

export default Main;
