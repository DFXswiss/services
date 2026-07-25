import { FiatPaymentMethod } from '@dfx.swiss/react';

export function normalizePersonalIban(value: string | undefined): string | undefined {
  return value?.toLowerCase() === 'frick' ? 'Frick' : value;
}

export function toPersonalIbanProviderRequest(
  value: string | undefined,
): { personalIbanProvider?: string } {
  return value === undefined ? {} : { personalIbanProvider: normalizePersonalIban(value) };
}

export function isPersonalIbanApplicable(
  currencyName: string | undefined,
  paymentMethod: FiatPaymentMethod | undefined,
): boolean {
  return currencyName === 'EUR' && paymentMethod === FiatPaymentMethod.BANK;
}

/**
 * Feature-local error copy for Bank Frick personal-IBAN failures during the buy quote flow
 * (buy.screen / buy-info.screen). These must not reuse shared TransactionError members:
 * PaymentMethodNotAllowed would show the generic account-level wording (wrong here),
 * KycRequired would show generic KYC copy without naming the personal-IBAN level-50
 * requirement, PersonalIbanIssuanceFailed has no fitting shared member, and the
 * invalid-provider validation message is also feature-specific. Returns untranslated
 * English defaults; callers translate via translate('screens/payment', text).
 *
 * Only maps QuoteError tokens for the purchase/selection flow. Raw backend
 * BadRequestException texts (e.g. 'Asset not found') are intentionally not matched.
 */
export function getPersonalIbanErrorMessage(message: string | undefined): string | undefined {
  if (!message) return undefined;

  if (message.includes('PaymentMethodNotAllowed')) {
    return 'Personal IBANs require the bank transfer payment method.';
  }
  if (message.includes('KycRequired')) {
    return 'Personal IBANs require KYC level 50.';
  }
  if (message.includes('PersonalIbanIssuanceFailed')) {
    return 'We could not issue your personal IBAN. Please try again later or contact support if the problem persists.';
  }
  if (message.includes('PersonalIbanProviderUnsupported')) {
    return 'The requested personal IBAN provider is not recognized.';
  }
  if (message.includes('PersonalIbanCurrencyNotSupported')) {
    return 'Personal IBANs are currently only available for EUR.';
  }

  return undefined;
}

/**
 * Feature-local error copy for reconstructing stored bank/IBAN payment details when
 * opening an invoice or receipt PDF (transaction.screen TransactionList). These tokens
 * describe missing or obsolete stored selection state, not buy-quote failures. Returns
 * untranslated English defaults; callers translate via translate('screens/payment', text).
 *
 * Only maps stored-detail reconstruction tokens. Unrelated or buy-flow tokens (e.g.
 * KycRequired) are intentionally not matched so invoice/receipt errors never show
 * purchase-flow wording.
 */
export function getStoredPaymentDetailErrorMessage(message: string | undefined): string | undefined {
  if (!message) return undefined;

  if (message.includes('StoredTransactionRequestBankSelectionIncomplete')) {
    return 'This stored payment detail is incomplete. Please start a new purchase.';
  }
  if (message.includes('StoredTransactionRequestBankNoLongerExists')) {
    return 'The bank for this payment is no longer available. Please start a new purchase.';
  }
  if (message.includes('StoredPersonalIbanDoesNotBelongToThisUser')) {
    return 'This stored personal IBAN is no longer valid for your account. Please start a new purchase.';
  }
  if (message.includes('StoredPersonalIbanDoesNotMatchThisTransactionRequest')) {
    return 'This stored personal IBAN does not match this transaction. Please start a new purchase.';
  }
  if (message.includes('StoredPersonalIbanIsNoLongerActive')) {
    return 'This personal IBAN is no longer active. Please start a new purchase.';
  }
  if (message.includes('StoredBankNoLongerAcceptsPayments')) {
    return 'This bank no longer accepts payments. Please start a new purchase.';
  }
  if (message.includes('CurrencyNotFound')) {
    return 'The selected currency is not available. Please try a different currency or contact support.';
  }
  if (message.includes('NoBankAvailableForThisCurrency')) {
    return 'No bank is available for this currency. Please try a different currency or contact support.';
  }

  return undefined;
}
