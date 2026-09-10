const mockCreateRoot = jest.fn();
const mockRender = jest.fn();
const mockInstallStorageFallback = jest.fn();
const mockIsStorageHardBlocked = jest.fn();
const mockClearLoginSessionStorage = jest.fn();
const mockInstallChunkErrorHandling = jest.fn();
const mockReportClientError = jest.fn();
const mockRenderHardBlockedPage = jest.fn();

jest.mock('react-dom/client', () => ({
  createRoot: (...args: unknown[]) => mockCreateRoot(...args),
}));

jest.mock('../Main', () => ({
  __esModule: true,
  default: function MainStub() {
    return null;
  },
}));

jest.mock('../components/boot-error-boundary', () => ({
  BootErrorBoundary: function BootErrorBoundaryPassThrough({ children }: { children: unknown }) {
    return children;
  },
  renderHardBlockedPage: (...args: unknown[]) => mockRenderHardBlockedPage(...args),
}));

jest.mock('../util/safe-storage', () => ({
  installStorageFallback: (...args: unknown[]) => mockInstallStorageFallback(...args),
  isStorageHardBlocked: (...args: unknown[]) => mockIsStorageHardBlocked(...args),
  clearLoginSessionStorage: (...args: unknown[]) => mockClearLoginSessionStorage(...args),
}));

jest.mock('../util/client-error', () => ({
  installChunkErrorHandling: (...args: unknown[]) => mockInstallChunkErrorHandling(...args),
  reportClientError: (...args: unknown[]) => mockReportClientError(...args),
}));

import { BootErrorBoundary } from '../components/boot-error-boundary';
import { startStandaloneApp } from '../util/boot-standalone';

describe('startStandaloneApp', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    mockCreateRoot.mockReset().mockReturnValue({ render: mockRender });
    mockRender.mockReset();
    mockInstallStorageFallback.mockReset();
    mockIsStorageHardBlocked.mockReset().mockReturnValue(false);
    mockClearLoginSessionStorage.mockReset();
    mockInstallChunkErrorHandling.mockReset();
    mockReportClientError.mockReset();
    mockRenderHardBlockedPage.mockReset();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/', search: '', reload: jest.fn() },
    });
  });

  it('hard-blocked: does not createRoot and renders the hard-blocked page', () => {
    mockIsStorageHardBlocked.mockReturnValue(true);
    const root = document.getElementById('root');

    startStandaloneApp();

    expect(mockInstallStorageFallback).toHaveBeenCalledTimes(1);
    expect(mockRenderHardBlockedPage).toHaveBeenCalledWith(root);
    expect(mockCreateRoot).not.toHaveBeenCalled();
    expect(mockInstallChunkErrorHandling).not.toHaveBeenCalled();
    expect(mockReportClientError).toHaveBeenCalledWith(expect.any(Error), '/');
  });

  it('not hard-blocked: installs fallback, chunk handling, and renders Main in BootErrorBoundary', () => {
    startStandaloneApp();

    expect(mockInstallStorageFallback).toHaveBeenCalledTimes(1);
    expect(mockInstallChunkErrorHandling).toHaveBeenCalledTimes(1);
    expect(mockCreateRoot).toHaveBeenCalledWith(document.getElementById('root'));
    expect(mockRender).toHaveBeenCalledTimes(1);
    const element = mockRender.mock.calls[0][0] as { type: unknown };
    expect(element.type).toBe(BootErrorBoundary);
  });

  it('clears login session when URL has address and signature', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/', search: '?address=0x1&signature=sig', reload: jest.fn() },
    });

    startStandaloneApp();

    expect(mockClearLoginSessionStorage).toHaveBeenCalledTimes(1);
  });

  it('clears login session when URL has session', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/', search: '?session=abc', reload: jest.fn() },
    });

    startStandaloneApp();

    expect(mockClearLoginSessionStorage).toHaveBeenCalledTimes(1);
  });

  it('does not clear login session when URL has neither', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/', search: '?lang=de', reload: jest.fn() },
    });

    startStandaloneApp();

    expect(mockClearLoginSessionStorage).not.toHaveBeenCalled();
  });

  it('does not clear login session when address is present without signature', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/', search: '?address=0x1', reload: jest.fn() },
    });

    startStandaloneApp();

    expect(mockClearLoginSessionStorage).not.toHaveBeenCalled();
  });
});
