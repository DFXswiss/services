import { useLocation } from 'react-router-dom';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { normalizePersonalIban } from '../util/personal-iban';

/**
 * No state, no lifecycle: the selector is derived fresh on every render from its one true
 * source — the URL search (standalone/browser) or the live widget prop (embedded). Browser
 * back/forward, SPA navigation, and widget attribute/property changes all take effect
 * automatically because nothing is ever copied or cached.
 */
export function usePersonalIban(): string | undefined {
  const { isWidget, widgetPersonalIban } = useAppHandlingContext();
  const { search } = useLocation();

  return isWidget
    ? normalizePersonalIban(widgetPersonalIban)
    : normalizePersonalIban(new URLSearchParams(search).get('personal-iban') ?? undefined);
}
