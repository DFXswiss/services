import { useAuthContext } from '@dfx.swiss/react';
import { useCallback, useReducer, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { normalizePersonalIban } from '../util/personal-iban';

export const PERSONAL_IBAN_CONFIRMATION_STORAGE_KEY_PREFIX =
  'dfx.srv.personalIbanConfirmation.';

type PersonalIbanAnswer =
  | { answer: 'confirmed' }
  | { answer: 'declined'; occurrence: string };

type TransientPersonalIbanAnswer = PersonalIbanAnswer & {
  customerIdentity: number;
  occurrence: string;
};

type StoredAnswerResult =
  | { status: 'valid'; answer: PersonalIbanAnswer }
  | { status: 'missing' | 'invalid' | 'unavailable' };

export interface PersonalIbanConfirmation {
  /** Selector requested by the URL or widget, before confirmation is applied. */
  requestedPersonalIban?: string;
  /** Selector that may be added to the next quote request. */
  personalIban?: string;
  /** True while this customer must explicitly confirm or decline this selector occurrence. */
  requiresCustomerConfirmation: boolean;
  /** True only when quote ownership can be tied to an authenticated account. */
  hasAuthenticatedCustomer: boolean;
  /** Browser storage was unreadable, malformed, or failed to save the latest answer. */
  hasStorageWarning: boolean;
  /** Confirm the personal IBAN for this customer for the remainder of this tab. */
  confirmForCurrentCustomer: () => void;
  /** Decline the personal IBAN for this selector occurrence. */
  declineForCurrentCustomer: () => void;
}

function storageKey(customerIdentity: number): string {
  return `${PERSONAL_IBAN_CONFIRMATION_STORAGE_KEY_PREFIX}${customerIdentity}`;
}

function hasExactKeys(value: object, keys: string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function isPersonalIbanAnswer(value: unknown): value is PersonalIbanAnswer {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return false;

  const answer = (value as { answer?: unknown }).answer;
  if (answer === 'confirmed') return hasExactKeys(value, ['answer']);
  if (answer === 'declined') {
    return (
      hasExactKeys(value, ['answer', 'occurrence']) &&
      typeof (value as { occurrence?: unknown }).occurrence === 'string'
    );
  }
  return false;
}

function readAnswer(customerIdentity: number): StoredAnswerResult {
  try {
    const stored = window.sessionStorage.getItem(storageKey(customerIdentity));
    if (stored == null) return { status: 'missing' };

    const parsed: unknown = JSON.parse(stored);
    return isPersonalIbanAnswer(parsed)
      ? { status: 'valid', answer: parsed }
      : { status: 'invalid' };
  } catch {
    return { status: 'unavailable' };
  }
}

function writeAnswer(customerIdentity: number, answer: PersonalIbanAnswer): boolean {
  try {
    window.sessionStorage.setItem(storageKey(customerIdentity), JSON.stringify(answer));
    return true;
  } catch {
    return false;
  }
}

interface PersonalIbanSelection {
  occurrence: string;
  requestedPersonalIban?: string;
}

function usePersonalIbanSelection(): PersonalIbanSelection {
  const { isWidget, widgetPersonalIban, widgetPersonalIbanOccurrence } =
    useAppHandlingContext();
  const location = useLocation();
  const urlPersonalIban =
    new URLSearchParams(location.search).get('personal-iban') ?? undefined;

  return {
    requestedPersonalIban: normalizePersonalIban(
      isWidget ? widgetPersonalIban : urlPersonalIban,
    ),
    occurrence: isWidget
      ? `widget:${widgetPersonalIbanOccurrence ?? 0}`
      : `navigation:${location.key}`,
  };
}

/** Derives the selector directly from its live URL or Web Component source. */
export function usePersonalIban(): string | undefined {
  return usePersonalIbanSelection().requestedPersonalIban;
}

/**
 * Requires an explicit personal-IBAN answer once per browser tab and authenticated customer.
 * Confirmations last for the tab. Declines last only for the current selector occurrence, so a
 * new navigation or Web Component property write asks again.
 */
export function usePersonalIbanConfirmation(): PersonalIbanConfirmation {
  const { requestedPersonalIban, occurrence } = usePersonalIbanSelection();
  const { session } = useAuthContext();
  const customerIdentity =
    typeof session?.account === 'number' ? session.account : undefined;
  const [transientAnswer, setTransientAnswer] =
    useState<TransientPersonalIbanAnswer>();
  const [writeFailed, setWriteFailed] = useState(false);
  const [, rerender] = useReducer((value) => value + 1, 0);

  // Selector-free flows deliberately do not touch sessionStorage.
  const stored =
    requestedPersonalIban !== undefined && customerIdentity !== undefined
      ? readAnswer(customerIdentity)
      : undefined;
  const answer =
    transientAnswer !== undefined &&
    transientAnswer.customerIdentity === customerIdentity &&
    transientAnswer.occurrence === occurrence
      ? transientAnswer
      : stored?.status === 'valid'
      ? stored.answer
      : undefined;
  const confirmed = answer?.answer === 'confirmed';
  const declinedForOccurrence =
    answer?.answer === 'declined' && answer.occurrence === occurrence;
  const requiresCustomerConfirmation =
    requestedPersonalIban !== undefined &&
    customerIdentity !== undefined &&
    !confirmed &&
    !declinedForOccurrence;
  const personalIban = confirmed ? requestedPersonalIban : undefined;

  const saveAnswer = useCallback(
    (nextAnswer: PersonalIbanAnswer) => {
      if (customerIdentity === undefined || requestedPersonalIban === undefined) return;

      const saved = writeAnswer(customerIdentity, nextAnswer);
      setWriteFailed(!saved);
      setTransientAnswer(
        saved
          ? undefined
          : { ...nextAnswer, customerIdentity, occurrence },
      );
      rerender();
    },
    [customerIdentity, occurrence, requestedPersonalIban],
  );
  const confirmForCurrentCustomer = useCallback(
    () => saveAnswer({ answer: 'confirmed' }),
    [saveAnswer],
  );
  const declineForCurrentCustomer = useCallback(
    () => saveAnswer({ answer: 'declined', occurrence }),
    [occurrence, saveAnswer],
  );

  return {
    requestedPersonalIban,
    personalIban,
    requiresCustomerConfirmation,
    hasAuthenticatedCustomer: customerIdentity !== undefined,
    hasStorageWarning:
      writeFailed ||
      stored?.status === 'invalid' ||
      stored?.status === 'unavailable',
    confirmForCurrentCustomer,
    declineForCurrentCustomer,
  };
}
