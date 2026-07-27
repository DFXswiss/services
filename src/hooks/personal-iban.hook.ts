import { useAuthContext } from '@dfx.swiss/react';
import { useCallback, useReducer, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { normalizePersonalIban } from '../util/personal-iban';

export const PERSONAL_IBAN_BINDINGS_STORAGE_KEY = 'dfx.srv.personalIbanBindings';

interface PersonalIbanDecision {
  customerIdentity: number;
  usePersonalIban: boolean;
}

type PersonalIbanBindings = Record<string, PersonalIbanDecision>;

export interface PersonalIbanIdentityBinding {
  /** Selector requested by the URL or widget, before the customer decision is applied. */
  requestedPersonalIban?: string;
  /** Selector that may be added to the next quote request. */
  personalIban?: string;
  /** A different authenticated customer previously used or declined this selector. */
  requiresCustomerDecision: boolean;
  /** True only when quote ownership can be tied to an authenticated account. */
  hasAuthenticatedCustomer: boolean;
  /** Persist that the current customer confirmed the requested selector. */
  confirmForCurrentCustomer: () => void;
  /** Persist that the current customer declined the requested selector. */
  declineForCurrentCustomer: () => void;
  /** Persist first use when the selector is actually added to a quote request. */
  recordApplicationForCurrentCustomer: () => void;
}

function readBindings(): PersonalIbanBindings {
  try {
    const stored = window.localStorage.getItem(PERSONAL_IBAN_BINDINGS_STORAGE_KEY);
    if (!stored) return {};

    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    // Corrupt browser storage must never trap the customer or suppress an explicit request.
    return {};
  }
}

function writeBindings(bindings: PersonalIbanBindings): void {
  try {
    window.localStorage.setItem(PERSONAL_IBAN_BINDINGS_STORAGE_KEY, JSON.stringify(bindings));
  } catch {
    // The in-memory decision still lets the customer continue when storage is unavailable.
  }
}

/**
 * Derives the selector directly from its durable source. Ownership is deliberately not inferred
 * here: quote consumers compare it with the authenticated identity at the point of use.
 */
export function usePersonalIban(): string | undefined {
  const { isWidget, widgetPersonalIban } = useAppHandlingContext();
  const { search } = useLocation();
  const urlPersonalIban = new URLSearchParams(search).get('personal-iban') ?? undefined;

  return normalizePersonalIban(isWidget ? widgetPersonalIban : urlPersonalIban);
}

/**
 * Binds application of a selector to the authenticated customer. The binding survives reloads,
 * and a different customer must explicitly confirm or decline before any quote is requested.
 */
export function usePersonalIbanIdentityBinding(): PersonalIbanIdentityBinding {
  const requestedPersonalIban = usePersonalIban();
  const { session } = useAuthContext();
  const customerIdentity =
    typeof session?.account === 'number' ? session.account : undefined;
  const bindings = useRef<PersonalIbanBindings>(readBindings());
  const [, rerender] = useReducer((value) => value + 1, 0);

  const selectorKey = requestedPersonalIban;
  const decision = selectorKey === undefined ? undefined : bindings.current[selectorKey];
  const belongsToCurrentCustomer =
    decision != null &&
    customerIdentity != null &&
    decision.customerIdentity === customerIdentity;
  const requiresCustomerDecision =
    selectorKey !== undefined &&
    customerIdentity != null &&
    decision != null &&
    decision.customerIdentity !== customerIdentity;
  const personalIban =
    requiresCustomerDecision || (belongsToCurrentCustomer && !decision.usePersonalIban)
      ? undefined
      : requestedPersonalIban;

  const persistDecision = useCallback(
    (usePersonalIban: boolean, notify: boolean) => {
      if (selectorKey === undefined || customerIdentity === undefined) return;

      bindings.current = {
        ...bindings.current,
        [selectorKey]: { customerIdentity, usePersonalIban },
      };
      writeBindings(bindings.current);
      if (notify) rerender();
    },
    [customerIdentity, selectorKey],
  );
  const confirmForCurrentCustomer = useCallback(
    () => persistDecision(true, true),
    [persistDecision],
  );
  const declineForCurrentCustomer = useCallback(
    () => persistDecision(false, true),
    [persistDecision],
  );
  const recordApplicationForCurrentCustomer = useCallback(() => {
    if (personalIban !== undefined && !belongsToCurrentCustomer) {
      persistDecision(true, false);
    }
  }, [belongsToCurrentCustomer, persistDecision, personalIban]);

  return {
    requestedPersonalIban,
    personalIban,
    requiresCustomerDecision,
    hasAuthenticatedCustomer: customerIdentity !== undefined,
    confirmForCurrentCustomer,
    declineForCurrentCustomer,
    recordApplicationForCurrentCustomer,
  };
}
