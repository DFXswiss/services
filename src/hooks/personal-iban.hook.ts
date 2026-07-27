import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { normalizePersonalIban } from '../util/personal-iban';

/**
 * The selector is derived fresh on every render from its source — URL search
 * (standalone/browser) or the live widget prop (embedded). After an observed customer boundary,
 * old history entries remain suppressed; a new navigation that adds the URL selector, or a
 * widget property revision, restores explicit intent.
 */
export function usePersonalIban(): string | undefined {
  const {
    isWidget,
    widgetPersonalIban,
    personalIbanSuppressed,
    restorePersonalIban,
  } = useAppHandlingContext();
  const { search } = useLocation();
  const navigationType = useNavigationType();
  const previousSearch = useRef(search);
  const urlPersonalIban = new URLSearchParams(search).get('personal-iban') ?? undefined;

  useEffect(() => {
    const previousHadSelector = new URLSearchParams(previousSearch.current).has('personal-iban');
    previousSearch.current = search;

    // POP is browser history, not new intent. Requiring an absent → present transition also keeps
    // login redirects that merely preserve a resurrected selector from lifting suppression.
    if (
      !isWidget &&
      personalIbanSuppressed &&
      navigationType !== 'POP' &&
      urlPersonalIban !== undefined &&
      !previousHadSelector
    ) {
      restorePersonalIban();
    }
  }, [
    isWidget,
    navigationType,
    personalIbanSuppressed,
    restorePersonalIban,
    search,
    urlPersonalIban,
  ]);

  return isWidget
    ? normalizePersonalIban(widgetPersonalIban)
    : personalIbanSuppressed
    ? undefined
    : normalizePersonalIban(urlPersonalIban);
}
