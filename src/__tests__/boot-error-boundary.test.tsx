import { fireEvent, render, screen } from '@testing-library/react';

const mockReportClientError = jest.fn();
const mockResetDfxStorageAndReload = jest.fn();
const mockIsStorageBlocked = jest.fn();
const mockIsStorageHardBlocked = jest.fn();

jest.mock('../util/client-error', () => ({
  reportClientError: (...args: unknown[]) => mockReportClientError(...args),
}));

jest.mock('../util/safe-storage', () => ({
  resetDfxStorageAndReload: (...args: unknown[]) => mockResetDfxStorageAndReload(...args),
  isStorageBlocked: (...args: unknown[]) => mockIsStorageBlocked(...args),
  isStorageHardBlocked: (...args: unknown[]) => mockIsStorageHardBlocked(...args),
}));

import {
  BootErrorBoundary,
  StorageBlockedBanner,
  renderHardBlockedPage,
} from '../components/boot-error-boundary';

function ThrowingChild(): JSX.Element {
  throw new Error('boot fail');
}

describe('BootErrorBoundary', () => {
  const reloadMock = jest.fn();
  const originalLanguage = navigator.language;
  const originalLanguages = navigator.languages;

  beforeEach(() => {
    mockReportClientError.mockClear();
    mockResetDfxStorageAndReload.mockClear();
    mockIsStorageBlocked.mockReset().mockReturnValue(false);
    mockIsStorageHardBlocked.mockReset().mockReturnValue(false);
    reloadMock.mockClear();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/start', reload: reloadMock, search: '' },
    });
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'en-US' });
    Object.defineProperty(navigator, 'languages', { configurable: true, value: ['en-US'] });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'language', { configurable: true, value: originalLanguage });
    Object.defineProperty(navigator, 'languages', { configurable: true, value: originalLanguages });
    jest.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <BootErrorBoundary>
        <div data-testid="child">ok</div>
      </BootErrorBoundary>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('ok');
  });

  it('catches a child render throw and shows the EN reset button', () => {
    render(
      <BootErrorBoundary>
        <ThrowingChild />
      </BootErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong while starting the app.');
    expect(screen.getByRole('button')).toHaveTextContent('Reset saved data and reload');
    expect(mockReportClientError).toHaveBeenCalledWith(expect.any(Error), '/start');

    fireEvent.click(screen.getByRole('button'));
    expect(mockResetDfxStorageAndReload).toHaveBeenCalledTimes(1);
  });

  it('shows DE copy when navigator.language starts with de', () => {
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'de-CH' });

    render(
      <BootErrorBoundary>
        <ThrowingChild />
      </BootErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Beim Start der App ist ein Fehler aufgetreten.');
    expect(screen.getByRole('button')).toHaveTextContent('Gespeicherte Daten zurücksetzen und neu laden');
  });

  it('uses navigator.languages[0] when language is empty', () => {
    Object.defineProperty(navigator, 'language', { configurable: true, value: '' });
    Object.defineProperty(navigator, 'languages', { configurable: true, value: ['de'] });

    render(
      <BootErrorBoundary>
        <ThrowingChild />
      </BootErrorBoundary>,
    );

    expect(screen.getByRole('button')).toHaveTextContent('Gespeicherte Daten zurücksetzen und neu laden');
  });

  it('falls back to EN when language and languages are empty', () => {
    Object.defineProperty(navigator, 'language', { configurable: true, value: '' });
    Object.defineProperty(navigator, 'languages', { configurable: true, value: undefined });

    render(
      <BootErrorBoundary>
        <ThrowingChild />
      </BootErrorBoundary>,
    );

    expect(screen.getByRole('button')).toHaveTextContent('Reset saved data and reload');
  });

  it.each([
    ['fr', "Une erreur s'est produite au démarrage de l'application."],
    ['it', "Si è verificato un errore all'avvio dell'app."],
  ])('shows %s copy for the reset panel', (lang, message) => {
    Object.defineProperty(navigator, 'language', { configurable: true, value: lang });

    render(
      <BootErrorBoundary>
        <ThrowingChild />
      </BootErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(message);
  });
});

describe('StorageBlockedBanner', () => {
  const reloadMock = jest.fn();

  beforeEach(() => {
    mockIsStorageBlocked.mockReset().mockReturnValue(false);
    mockIsStorageHardBlocked.mockReset().mockReturnValue(false);
    reloadMock.mockClear();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/', reload: reloadMock, search: '' },
    });
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'en' });
  });

  it('is null when not blocked', () => {
    const { container } = render(<StorageBlockedBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('is null when hard-blocked', () => {
    mockIsStorageBlocked.mockReturnValue(true);
    mockIsStorageHardBlocked.mockReturnValue(true);
    const { container } = render(<StorageBlockedBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows instruction and reload when blocked and not hard-blocked', () => {
    mockIsStorageBlocked.mockReturnValue(true);
    mockIsStorageHardBlocked.mockReturnValue(false);

    render(<StorageBlockedBanner />);

    expect(screen.getByRole('status')).toHaveTextContent('This browser is blocking saved data');
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reloadMock).toHaveBeenCalled();
  });

  it.each([
    ['en', 'This browser is blocking saved data', 'Reload'],
    ['de', 'Dieser Browser blockiert gespeicherte Daten', 'Neu laden'],
    ['fr', 'Ce navigateur bloque les données enregistrées', 'Recharger'],
    ['it', 'Questo browser sta bloccando i dati salvati', 'Ricarica'],
    ['pt-BR', 'This browser is blocking saved data', 'Reload'],
    ['xx', 'This browser is blocking saved data', 'Reload'],
    ['', 'This browser is blocking saved data', 'Reload'],
  ])('uses %s copy (fallback en for unknown)', (lang, messagePart, button) => {
    Object.defineProperty(navigator, 'language', { configurable: true, value: lang });
    mockIsStorageBlocked.mockReturnValue(true);
    mockIsStorageHardBlocked.mockReturnValue(false);

    render(<StorageBlockedBanner />);

    expect(screen.getByRole('status')).toHaveTextContent(messagePart);
    expect(screen.getByRole('button')).toHaveTextContent(button);
  });
});

describe('renderHardBlockedPage', () => {
  const reloadMock = jest.fn();

  beforeEach(() => {
    reloadMock.mockClear();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/', reload: reloadMock, search: '' },
    });
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'en' });
  });

  it('writes instruction text and a reload button without React', () => {
    const root = document.createElement('div');
    renderHardBlockedPage(root);

    expect(root.textContent).toContain('This browser is blocking saved data');
    const button = root.querySelector('button');
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe('Reload');

    button?.click();
    expect(reloadMock).toHaveBeenCalled();
  });
});
