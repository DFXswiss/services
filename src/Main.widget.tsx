import { createMemoryRouter } from 'react-router-dom';
import App, { WidgetParams } from './App';

function MainWidget(params: WidgetParams) {
  return <App routerFactory={createMemoryRouter} params={params} />;
}

export default MainWidget;
