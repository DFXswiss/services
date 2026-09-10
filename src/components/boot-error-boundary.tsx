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

function languagePrefix(): string {
  const raw = (navigator.language || navigator.languages?.[0] || 'en').toLowerCase();
  return raw.split('-')[0];
}

function resolveCopy<T>(table: Record<string, T>, fallback: T): T {
  return table[languagePrefix()] ?? fallback;
}

function resolveStorageCopy(): StorageCopy {
  return resolveCopy(STORAGE_COPY, STORAGE_COPY.en);
}

const BOOT_COPY: Record<string, StorageCopy> = {
  en: {
    message: 'Something went wrong while starting the app.',
    button: 'Reset saved data and reload',
  },
  de: {
    message: 'Beim Start der App ist ein Fehler aufgetreten.',
    button: 'Gespeicherte Daten zurücksetzen und neu laden',
  },
  fr: {
    message: "Une erreur s'est produite au démarrage de l'application.",
    button: 'Réinitialiser les données enregistrées et recharger',
  },
  it: {
    message: "Si è verificato un errore all'avvio dell'app.",
    button: 'Reimposta i dati salvati e ricarica',
  },
};

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
      const copy = resolveCopy(BOOT_COPY, BOOT_COPY.en);
      return (
        <div role="alert" className="p-8 text-center text-dfxBlue-800">
          <p className="mb-4">{copy.message}</p>
          <button
            type="button"
            className="rounded bg-dfxBlue-800 px-4 py-2 text-white"
            onClick={() => resetDfxStorageAndReload()}
          >
            {copy.button}
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
