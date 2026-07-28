import { useRef } from 'react';
import { createMemoryRouter } from 'react-router-dom';
import App, { WidgetParams } from './App';

function MainLib(params: WidgetParams) {
  const previousPersonalIban = useRef<string>();
  const personalIbanOccurrence = useRef(0);
  if (previousPersonalIban.current !== params.personalIban) {
    previousPersonalIban.current = params.personalIban;
    personalIbanOccurrence.current += 1;
  }

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap"
      />
      <App
        routerFactory={createMemoryRouter}
        params={params}
        personalIbanOccurrence={personalIbanOccurrence.current}
      />
    </>
  );
}

export default MainLib;
