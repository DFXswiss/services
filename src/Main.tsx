import { useState } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import { useResizeObserver } from './hooks/resize-observer.hook';

function Main() {
  const rootRef = useResizeObserver<HTMLDivElement>((el) => setWidth(el.offsetWidth));
  const [width, setWidth] = useState(0);

  return (
    <div ref={rootRef} style={{ width: '100%', height: '100%' }}>
      <App routerFactory={createBrowserRouter} width={width} />
    </div>
  );
}

export default Main;
