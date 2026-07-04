import { Validations } from '@dfx.swiss/react';

// Cap zip inputs at the source to keep a combined "<postcode> <city>" value out of the
// payout/KYC address path. 10 characters covers the longest real formats — US ZIP+4
// "90210-1234" (10) and Brazilian CEP "01310-100" (9) — while an injected city name (longer)
// is still rejected. The prior 8-char cap wrongly rejected these valid international codes.
export const ZipValidation = [Validations.Required, Validations.Custom((v) => !v || v.length <= 10 || 'pattern')];
