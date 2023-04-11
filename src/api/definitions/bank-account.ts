import { Fiat } from './fiat';

export const BankAccountUrl = {
  get: 'bankAccount',
  create: 'bankAccount',
  update: (id: number) => `bankAccount/${id}`,
};

export interface BankAccount {
  id: number;
  iban: string;
  label?: string;
  preferredCurrency?: Fiat;
  sepaInstant: boolean;
}
