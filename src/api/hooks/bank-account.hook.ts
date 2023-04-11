import { BankAccount, BankAccountUrl } from '../definitions/bank-account';
import { Fiat } from '../definitions/fiat';
import { useApi } from './api.hook';

export interface CreateBankAccount {
  label?: string;
  preferredCurrency?: Fiat;
  iban: string;
}

export interface UpdateBankAccount {
  label?: string;
  preferredCurrency?: Fiat;
}

export interface BankAccountInterface {
  getAccounts: () => Promise<BankAccount[]>;
  createAccount: (newAccount: CreateBankAccount) => Promise<BankAccount>;
  updateAccount: (id: number, changedAccount: UpdateBankAccount) => Promise<BankAccount>;
}

export function useBankAccount(): BankAccountInterface {
  const { call } = useApi();

  async function getAccounts(): Promise<BankAccount[]> {
    return call<BankAccount[]>({ url: BankAccountUrl.get, method: 'GET' });
  }

  async function createAccount(newAccount: CreateBankAccount): Promise<BankAccount> {
    return call<BankAccount>({ url: BankAccountUrl.create, method: 'POST', data: newAccount });
  }

  async function updateAccount(id: number, changedAccount: UpdateBankAccount): Promise<BankAccount> {
    return call<BankAccount>({ url: BankAccountUrl.update(id), method: 'PUT', data: changedAccount });
  }

  return { getAccounts, createAccount, updateAccount };
}
