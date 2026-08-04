import { createMemoryRouter } from 'react-router-dom';
import App, { WidgetParams } from './App';
import { markEmbedded } from './util/client-error';

// Imported straight into someone else's React app, so this is the only place that can say so.
// Marking it turns off both recovery and the page-wide listeners: neither the consumer's page nor
// their window is ours to act on. Failures still reach the error screen and are reported there.
markEmbedded();

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
