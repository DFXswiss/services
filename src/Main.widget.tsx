import { createMemoryRouter } from 'react-router-dom';
import App, { AppParams } from './App';

function MainWidget(params: AppParams) {
  return <App routerFactory={createMemoryRouter} params={params} />;
}

export default MainWidget;
