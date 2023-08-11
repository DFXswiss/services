import { createMemoryRouter } from 'react-router-dom';
import App, { WidgetParams } from './App';

function MainWidget(params: WidgetParams) {
  return (
    <>
      <link type="text/css" rel="stylesheet" href="main-widget.css" />
      <App routerFactory={createMemoryRouter} params={params} />
    </>
  );
}

export default MainWidget;
