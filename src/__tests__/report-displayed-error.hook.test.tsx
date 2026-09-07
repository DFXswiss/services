let mockUser: { accountId: number } | undefined;
jest.mock('@dfx.swiss/react', () => ({ useUserContext: () => ({ user: mockUser }) }));
jest.mock('src/dto/safe.dto', () => ({}));

import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useReportDisplayedError } from '../hooks/report-displayed-error.hook';

const mockReportClientError = jest.fn();
jest.mock('src/util/client-error', () => ({
  ...jest.requireActual('src/util/client-error'),
  reportClientError: (...args: unknown[]) => mockReportClientError(...args),
}));

function wrapper({ children }: { children: React.ReactNode }): JSX.Element {
  return <MemoryRouter initialEntries={['/buy']}>{children}</MemoryRouter>;
}

describe('useReportDisplayedError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = undefined;
    Object.defineProperty(window, 'location', {
      value: { ...window.location, pathname: '/host-page' },
      writable: true,
    });
  });

  it('does not report when message is undefined', async () => {
    renderHook(() => useReportDisplayedError(undefined), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockReportClientError).not.toHaveBeenCalled();
  });

  it('does not report when message is empty', async () => {
    renderHook(() => useReportDisplayedError(''), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockReportClientError).not.toHaveBeenCalled();
  });

  it('reports a non-empty message without an account when nobody is signed in', async () => {
    renderHook(() => useReportDisplayedError('boom'), { wrapper });

    await waitFor(() => expect(mockReportClientError).toHaveBeenCalledTimes(1));
    expect(mockReportClientError.mock.calls[0][0]).toMatchObject({ message: 'boom', name: 'HandledError' });
    expect(mockReportClientError.mock.calls[0][1]).toBe('/buy');
    expect(mockReportClientError.mock.calls[0][2]).toBeUndefined();
  });

  it('reports the account of the customer who saw the failure', async () => {
    mockUser = { accountId: 123456 };

    renderHook(() => useReportDisplayedError('boom'), { wrapper });

    await waitFor(() => expect(mockReportClientError).toHaveBeenCalledTimes(1));
    expect(mockReportClientError.mock.calls[0][2]).toBe(123456);
  });

  it('reports the route the customer was on, not the browser URL', async () => {
    renderHook(() => useReportDisplayedError('boom'), { wrapper });

    await waitFor(() => expect(mockReportClientError).toHaveBeenCalledTimes(1));
    expect(mockReportClientError.mock.calls[0][1]).toBe('/buy');
    expect(mockReportClientError.mock.calls[0][1]).not.toBe('/host-page');
  });

  it('reports again when the message changes', async () => {
    const { rerender } = renderHook(({ message }) => useReportDisplayedError(message), {
      wrapper,
      initialProps: { message: 'boom' },
    });

    await waitFor(() => expect(mockReportClientError).toHaveBeenCalledTimes(1));
    expect(mockReportClientError.mock.calls[0][0]).toMatchObject({ message: 'boom', name: 'HandledError' });

    rerender({ message: 'other' });

    await waitFor(() => expect(mockReportClientError).toHaveBeenCalledTimes(2));
    expect(mockReportClientError.mock.calls[1][0]).toMatchObject({ message: 'other', name: 'HandledError' });
  });

  it('does not report again when deps are unchanged', async () => {
    const { rerender } = renderHook(({ message }) => useReportDisplayedError(message), {
      wrapper,
      initialProps: { message: 'boom' },
    });

    await waitFor(() => expect(mockReportClientError).toHaveBeenCalledTimes(1));

    rerender({ message: 'boom' });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockReportClientError).toHaveBeenCalledTimes(1);
  });

  it('does not report a second time once the account arrives', async () => {
    const { rerender } = renderHook(({ message }) => useReportDisplayedError(message), {
      wrapper,
      initialProps: { message: 'boom' },
    });

    await waitFor(() => expect(mockReportClientError).toHaveBeenCalledTimes(1));
    expect(mockReportClientError.mock.calls[0][2]).toBeUndefined();

    mockUser = { accountId: 123456 };
    rerender({ message: 'boom' });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockReportClientError).toHaveBeenCalledTimes(1);
  });

  it('reports with the provided type instead of HandledError', async () => {
    renderHook(() => useReportDisplayedError('boom', 'QuoteError'), { wrapper });

    await waitFor(() => expect(mockReportClientError).toHaveBeenCalledTimes(1));
    expect(mockReportClientError.mock.calls[0][0]).toMatchObject({ message: 'boom', name: 'QuoteError' });
    expect(mockReportClientError.mock.calls[0][1]).toBe('/buy');
  });

  it('reports again when the type changes', async () => {
    const { rerender } = renderHook(({ message, type }) => useReportDisplayedError(message, type), {
      wrapper,
      initialProps: { message: 'boom', type: 'HandledError' },
    });

    await waitFor(() => expect(mockReportClientError).toHaveBeenCalledTimes(1));
    expect(mockReportClientError.mock.calls[0][0]).toMatchObject({ message: 'boom', name: 'HandledError' });

    rerender({ message: 'boom', type: 'QuoteError' });

    await waitFor(() => expect(mockReportClientError).toHaveBeenCalledTimes(2));
    expect(mockReportClientError.mock.calls[1][0]).toMatchObject({ message: 'boom', name: 'QuoteError' });
  });

  it('does not report again when type is unchanged', async () => {
    const { rerender } = renderHook(({ message, type }) => useReportDisplayedError(message, type), {
      wrapper,
      initialProps: { message: 'boom', type: 'QuoteError' },
    });

    await waitFor(() => expect(mockReportClientError).toHaveBeenCalledTimes(1));

    rerender({ message: 'boom', type: 'QuoteError' });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockReportClientError).toHaveBeenCalledTimes(1);
  });
});
