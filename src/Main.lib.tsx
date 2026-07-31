import { createMemoryRouter } from 'react-router-dom';
import App, { WidgetParams } from './App';
import { installChunkErrorHandling, markEmbedded } from './util/client-error';

// The library is imported straight into someone else's React app, so it has no entry point of its
// own to wire this up — it has to do it here. Reporting only: a chunk failure is not worth
// reloading the consumer's page over.
markEmbedded();
installChunkErrorHandling();

function MainLib(params: WidgetParams) {
  return (
    <>
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

export default MainLib;
