import { Validations } from '@dfx.swiss/react';

// Creditor / payout zip. OLKYPAY rejects any recipient zip longer than 8 characters
// (CLIENT_INVALID_ZIPCODE), and the backend mirror of that check was retired
// (DFXswiss/api#3985 closed) in favour of validating at the source — so this frontend cap is
// the ONLY guard for the bank-refund / payout path. Keep it at 8 for creditor zip fields.
export const ZipValidation = [Validations.Required, Validations.Custom((v) => !v || v.length <= 8 || 'pattern')];

// KYC / address zip. Not payout-bound, so it must accept international formats — US ZIP+4
// "90210-1234" (10), Brazilian CEP "01310-100" (9). Cap at 10, which still keeps a combined
// "<postcode> <city>" value (longer) out of the field.
export const AddressZipValidation = [Validations.Required, Validations.Custom((v) => !v || v.length <= 10 || 'pattern')];
