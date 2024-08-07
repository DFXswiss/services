import { createMemoryRouter } from 'react-router-dom';
import App, { WidgetParams } from './App';

function MainLib(params: WidgetParams) {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap"
      />
      <App routerFactory={createMemoryRouter} params={params} />
    </>
  );
}

export default MainLib;
