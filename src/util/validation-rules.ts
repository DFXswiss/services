import { Validations } from '@dfx.swiss/react';

// Postal codes never legitimately exceed 8 characters (longest real formats incl. spaces,
// e.g. UK "EC1A 1BB"). Capping zip inputs at the source prevents a combined
// "<postcode> <city>" value from entering the payout/KYC address path.
export const ZipValidation = [Validations.Required, Validations.Custom((v) => !v || v.length <= 8 || 'pattern')];
