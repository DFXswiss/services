import { createMemoryRouter } from 'react-router-dom';
import App, { WidgetParams } from './App';
import { markEmbedded } from './util/client-error';

// Runs on a third party's page: a chunk failure here is reported, never recovered by reloading
// their page.
markEmbedded();

function MainWidget(params: WidgetParams) {
  return (
    <>
      <link type="text/css" rel="stylesheet" href="main-widget.css" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap"
      />
      <App
        routerFactory={createMemoryRouter}
        params={params}
      />
    </>
  );
}

export default MainWidget;
