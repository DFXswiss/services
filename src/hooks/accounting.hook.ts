import { useApi } from '@dfx.swiss/react';
import { useMemo } from 'react';

export interface YearlyBalance {
  opening: number;
  closing: number;
}

export interface Bank {
  name: string;
  iban: string;
  bic: string;
  currency: string;
  yearlyBalances?: Record<string, YearlyBalance>;
}

export interface BankBalanceSheet {
  bankName: string;
  currency: string;
  iban: string;
  year: number;
  openingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  calculatedClosingBalance: number;
  definedClosingBalance?: number;
  balanceMatches: boolean;
  hasDefinedClosingBalance: boolean;
}

export function useAccounting() {
  const { call } = useApi();

  async function getBanks(): Promise<Bank[]> {
    return call<Bank[]>({
      url: 'bank',
      method: 'GET',
    });
  }

  async function getBalanceSheet(iban: string, year: number): Promise<BankBalanceSheet> {
    return call<BankBalanceSheet>({
      url: `accounting/balance-sheet/${encodeURIComponent(iban)}/${year}`,
      method: 'GET',
    });
  }

  return useMemo(() => ({ getBanks, getBalanceSheet }), [call]);
}
