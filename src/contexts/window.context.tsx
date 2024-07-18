import { PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';
import { useResizeObserver } from 'src/hooks/resize-observer.hook';

interface WindowContextInterface {
  width?: number;
}

const WindowContext = createContext<WindowContextInterface>({});

export const useWindowContext = () => useContext(WindowContext);

export function WindowContextProvider({ children }: PropsWithChildren): JSX.Element {
  const [width, setWidth] = useState<number>();

  const rootRef = useResizeObserver<HTMLDivElement>((el) => setWidth(el.offsetWidth));

  const context = useMemo(() => ({ width }), [width]);

  return (
    <WindowContext.Provider value={context}>
      <div ref={rootRef} className="h-full w-full">
        {children}
      </div>
    </WindowContext.Provider>
  );
}
