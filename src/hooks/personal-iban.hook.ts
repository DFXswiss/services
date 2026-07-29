import { useAuthContext } from '@dfx.swiss/react';
import { useLocation } from 'react-router-dom';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import {
  isExplicitFrickPersonalIbanRequest,
  normalizePersonalIban,
} from '../util/personal-iban';

export interface PersonalIbanSelection {
  /** Selector requested by the URL or widget. */
  requestedPersonalIban?: string;
  /** Selector that may be added to the next quote request. */
  personalIban?: string;
  /** True only when quote ownership can be tied to an authenticated account. */
  hasAuthenticatedCustomer: boolean;
}

/**
 * Derives the personal-IBAN selector from the URL (standalone) or live widget property.
 * A recognized Frick request is applied directly; no intermediate confirmation step.
 */
export function usePersonalIbanSelection(): PersonalIbanSelection {
  const { isWidget, widgetPersonalIban } = useAppHandlingContext();
  const location = useLocation();
  const urlPersonalIban =
    // lgtm[js/clear-text-storage-of-sensitive-data] - The public parameter carries a provider
    // identifier, never an IBAN; this hook reads the live URL and does not persist the value.
    new URLSearchParams(location.search).get('personal-iban') ?? undefined;
  const requestedPersonalIban = normalizePersonalIban(
    isWidget ? widgetPersonalIban : urlPersonalIban,
  );
  const { session } = useAuthContext();
  const customerIdentity =
    typeof session?.account === 'number' ? session.account : undefined;
  const personalIban = isExplicitFrickPersonalIbanRequest(requestedPersonalIban)
    ? requestedPersonalIban
    : undefined;

  return {
    requestedPersonalIban,
    personalIban,
    hasAuthenticatedCustomer: customerIdentity !== undefined,
  };
}
