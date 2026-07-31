// Mock @dfx.swiss/react to avoid ES module issues
jest.mock('@dfx.swiss/react', () => ({}));
jest.mock('src/dto/safe.dto', () => ({}));

import { render, screen, waitFor } from '@testing-library/react';
import { Outlet, RouteObject, RouterProvider, createMemoryRouter } from 'react-router-dom';
import ErrorScreen from '../screens/error.screen';

jest.mock('@dfx.swiss/react-components', () => ({
  IconVariant: { HELP: 'help' },
  StyledButtonColor: { GRAY_OUTLINE: 'gray' },
  StyledButton: ({ label }: { label: string }) => <button>{label}</button>,
  StyledVerticalStack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('src/contexts/settings.context', () => ({
  useSettingsContext: () => ({ translate: (_key: string, value: string) => value }),
}));

jest.mock('src/hooks/navigation.hook', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock('src/hooks/layout-config.hook', () => ({ useLayoutOptions: jest.fn() }));

const mockReportClientError = jest.fn();
const mockReloadOnceForChunkError = jest.fn();

// Only the side effects are mocked — the classification stays real, so the test covers the
// wiring rather than restating it.
jest.mock('src/util/client-error', () => ({
  ...jest.requireActual('src/util/client-error'),
  reportClientError: (...args: unknown[]) => mockReportClientError(...args),
  reloadOnceForChunkError: () => mockReloadOnceForChunkError(),
}));

function renderAt(path: string, thrown?: unknown): void {
  const Boom = (): JSX.Element => {
    if (thrown) throw thrown;
    return <div>ok</div>;
  };

  const routes: RouteObject[] = [
    {
      path: '/',
      element: <Outlet />,
      errorElement: <ErrorScreen />,
      children: [{ path: 'buy', element: <Boom /> }],
    },
  ];

  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />);
}

describe('ErrorScreen reporting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // jsdom keeps the memory router's path out of window.location, which the screen reads.
    Object.defineProperty(window, 'location', { value: { ...window.location, pathname: '/buy' }, writable: true });
  });

  it('shows the error screen when a route render throws', async () => {
    renderAt('/buy', new Error('boom'));

    expect(await screen.findByText('Oh, sorry, something went wrong')).toBeInTheDocument();
  });

  // The failure used to exist nowhere but the customer's console.
  it('reports a render failure that the router caught', async () => {
    renderAt('/buy', Object.assign(new Error('boom'), { name: 'TypeError' }));

    await waitFor(() => expect(mockReportClientError).toHaveBeenCalledTimes(1));
    expect(mockReportClientError.mock.calls[0][0]).toMatchObject({ message: 'boom', name: 'TypeError' });
    expect(mockReportClientError.mock.calls[0][1]).toBe('/buy');
  });

  it('reports a route that matched nothing', async () => {
    renderAt('/nonexistent');

    await waitFor(() => expect(mockReportClientError).toHaveBeenCalledTimes(1));
    expect(mockReportClientError.mock.calls[0][0]).toMatchObject({ status: 404 });
  });

  it('reports only once per failure', async () => {
    renderAt('/buy', new Error('boom'));

    await waitFor(() => expect(mockReportClientError).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockReportClientError).toHaveBeenCalledTimes(1);
  });

  // A window listener never sees this error, which is why the guard has to live here.
  it('reloads once when a chunk failed to load', async () => {
    renderAt('/buy', Object.assign(new Error('Loading chunk 42 failed'), { name: 'ChunkLoadError' }));

    await waitFor(() => expect(mockReloadOnceForChunkError).toHaveBeenCalledTimes(1));
    expect(mockReportClientError).toHaveBeenCalledTimes(1);
  });

  it('does not reload for an ordinary render failure', async () => {
    renderAt('/buy', new Error('Cannot read properties of undefined'));

    await waitFor(() => expect(mockReportClientError).toHaveBeenCalledTimes(1));
    expect(mockReloadOnceForChunkError).not.toHaveBeenCalled();
  });

  // Screens navigate to /error?msg=... deliberately; that path has no route, so the router
  // reports a bare 404 that says nothing about the actual failure.
  it('reports the explicit message instead of the 404 behind it', async () => {
    Object.defineProperty(window, 'location', { value: { ...window.location, pathname: '/error' }, writable: true });

    renderAt('/error?msg=Account%20merge%20failed');

    await waitFor(() => expect(mockReportClientError).toHaveBeenCalledTimes(1));
    expect(mockReportClientError.mock.calls[0][0]).toMatchObject({
      message: 'Account merge failed',
      name: 'HandledError',
    });
    expect(screen.getByText('Account merge failed')).toBeInTheDocument();
    expect(mockReloadOnceForChunkError).not.toHaveBeenCalled();
  });
});
