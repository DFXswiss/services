import { Outlet } from 'react-router-dom';
import { RealunitContextProvider } from 'src/contexts/realunit.context';

export function RealunitLayout(): JSX.Element {
  return (
    <RealunitContextProvider>
      <Outlet />
    </RealunitContextProvider>
  );
}
