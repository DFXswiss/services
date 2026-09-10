import { Component, PropsWithChildren, ReactNode } from 'react';
import { reportClientError } from '../util/client-error';
import { isStorageBlocked, isStorageHardBlocked, resetDfxStorageAndReload } from '../util/safe-storage';

interface StorageCopy {
  message: string;
  button: string;
}

const STORAGE_COPY: Record<string, StorageCopy> = {
  en: {
    message:
      'This browser is blocking saved data. Allow cookies for this site and reload. Otherwise a login will not survive refresh.',
    button: 'Reload',
  },
  de: {
    message:
      'Dieser Browser blockiert gespeicherte Daten. Erlauben Sie Cookies für diese Seite und laden Sie neu. Sonst übersteht eine Anmeldung kein Neuladen.',
    button: 'Neu laden',
  },
  fr: {
    message:
      'Ce navigateur bloque les données enregistrées. Autorisez les cookies pour ce site et rechargez. Sinon une connexion ne survivra pas au rechargement.',
    button: 'Recharger',
  },
  it: {
    message:
      'Questo browser sta bloccando i dati salvati. Consenti i cookie per questo sito e ricarica. Altrimenti un accesso non sopravvive al ricaricamento.',
    button: 'Ricarica',
  },
};

function resolveStorageCopy(): StorageCopy {
  const raw = (navigator.language || 'en').toLowerCase();
  const prefix = raw.split('-')[0];
  return STORAGE_COPY[prefix] ?? STORAGE_COPY.en;
}

function isGermanUi(): boolean {
  const raw = navigator.language || navigator.languages?.[0] || 'en';
  return raw.toLowerCase().startsWith('de');
}

interface BootErrorBoundaryState {
  hasError: boolean;
}

export class BootErrorBoundary extends Component<PropsWithChildren, BootErrorBoundaryState> {
  state: BootErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): BootErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    reportClientError(error, window.location.pathname);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const german = isGermanUi();
      return (
        <div role="alert" className="p-8 text-center text-dfxBlue-800">
          <p className="mb-4">
            {german ? 'Beim Start der App ist ein Fehler aufgetreten.' : 'Something went wrong while starting the app.'}
          </p>
          <button
            type="button"
            className="rounded bg-dfxBlue-800 px-4 py-2 text-white"
            onClick={() => resetDfxStorageAndReload()}
          >
            {german ? 'Gespeicherte Daten zurücksetzen und neu laden' : 'Reset saved data and reload'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function StorageBlockedBanner(): JSX.Element | null {
  if (!isStorageBlocked() || isStorageHardBlocked()) return null;

  const copy = resolveStorageCopy();

  return (
    <div role="status" className="bg-dfxBlue-800 px-4 py-3 text-center text-sm text-white">
      <p className="mb-2">{copy.message}</p>
      <button type="button" className="underline" onClick={() => window.location.reload()}>
        {copy.button}
      </button>
    </div>
  );
}

export function renderHardBlockedPage(root: HTMLElement): void {
  const copy = resolveStorageCopy();
  root.textContent = '';

  const wrap = document.createElement('div');
  wrap.style.cssText =
    'display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:1.5rem;text-align:center;font-family:sans-serif;color:#072440;';

  const message = document.createElement('p');
  message.textContent = copy.message;
  message.style.marginBottom = '1rem';
  message.style.maxWidth = '32rem';

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = copy.button;
  button.style.cssText = 'padding:0.5rem 1rem;cursor:pointer;';
  button.onclick = () => window.location.reload();

  wrap.append(message, button);
  root.append(wrap);
}
