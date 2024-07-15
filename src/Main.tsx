import { createBrowserRouter } from 'react-router-dom';
import App from './App';

function Main() {
  return <App routerFactory={createBrowserRouter} />;
}

export default Main;
