import { useState } from 'react';
import { createMemoryRouter } from 'react-router-dom';
import App, { WidgetParams } from './App';
import { useResizeObserver } from './hooks/resize-observer.hook';

function MainWidget(params: WidgetParams) {
  const rootRef = useResizeObserver<HTMLDivElement>((el) => setWidth(el.offsetWidth));
  const [width, setWidth] = useState(0);

  return (
    <div ref={rootRef} style={{ width: '100%', height: '100%' }}>
      <link type="text/css" rel="stylesheet" href="main-widget.css" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap"
      />
      <App routerFactory={createMemoryRouter} params={params} width={width} />
    </div>
  );
}

export default MainWidget;
