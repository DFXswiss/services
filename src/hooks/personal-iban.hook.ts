import { useAuthContext } from '@dfx.swiss/react';
import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import {
  PersonalIbanAnswer,
  usePersonalIbanConfirmationContext,
} from '../contexts/personal-iban-confirmation.context';
import { normalizePersonalIban } from '../util/personal-iban';

export interface PersonalIbanConfirmation {
  /** Selector requested by the URL or widget, before confirmation is applied. */
  requestedPersonalIban?: string;
  /** Selector that may be added to the next quote request. */
  personalIban?: string;
  /** True while this customer must explicitly confirm or decline this selector occurrence. */
  requiresCustomerConfirmation: boolean;
  /** True only when quote ownership can be tied to an authenticated account. */
  hasAuthenticatedCustomer: boolean;
  /** Confirm the personal IBAN for this customer for this running app instance. */
  confirmForCurrentCustomer: () => void;
  /** Decline the personal IBAN for this selector occurrence. */
  declineForCurrentCustomer: () => void;
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
      ? `widget:${widgetPersonalIbanOccurrence}`
      : `navigation:${location.key}`,
  };
}

/** Derives the selector directly from its live URL or Web Component source. */
export function usePersonalIban(): string | undefined {
  return usePersonalIbanSelection().requestedPersonalIban;
}

/**
 * Requires an explicit personal-IBAN answer per running app instance and authenticated customer.
 * Confirmations last for that app instance. Declines last only for the current selector occurrence,
 * so a new navigation or widget/React property occurrence asks again.
 */
export function usePersonalIbanConfirmation(): PersonalIbanConfirmation {
  const { requestedPersonalIban, occurrence } = usePersonalIbanSelection();
  const { session } = useAuthContext();
  const { answers, saveAnswer: saveInMemoryAnswer } =
    usePersonalIbanConfirmationContext();
  const customerIdentity =
    typeof session?.account === 'number' ? session.account : undefined;
  const answer =
    customerIdentity === undefined ? undefined : answers.get(customerIdentity);
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

      saveInMemoryAnswer(customerIdentity, nextAnswer);
    },
    [customerIdentity, requestedPersonalIban, saveInMemoryAnswer],
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
    confirmForCurrentCustomer,
    declineForCurrentCustomer,
  };
}
