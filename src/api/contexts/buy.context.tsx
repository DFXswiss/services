import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { Fiat } from '../definitions/fiat';
import { useFiat } from '../hooks/fiat.hook';
import { useAuthContext } from './auth.context';
import { CreateBankAccount, UpdateBankAccount, useBankAccount } from '../hooks/bank-account.hook';
import { BankAccount } from '../definitions/bank-account';
import { useBuy } from '../hooks/buy.hook';
import { Buy, BuyPaymentInfo } from '../definitions/buy';

interface BuyInterface {
  currencies?: Fiat[];
  bankAccounts?: BankAccount[];
  isAccountLoading: boolean;
  createAccount: (newAccount: CreateBankAccount) => Promise<BankAccount>;
  updateAccount: (id: number, changedAccount: UpdateBankAccount) => Promise<BankAccount>;
  receiveFor: (info: BuyPaymentInfo) => Promise<Buy>;
}

const BuyContext = createContext<BuyInterface>(undefined as any);

export function useBuyContext(): BuyInterface {
  return useContext(BuyContext);
}

export function BuyContextProvider(props: PropsWithChildren): JSX.Element {
  const { isLoggedIn } = useAuthContext();
  const [currencies, setCurrencies] = useState<Fiat[]>();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>();
  const [isAccountLoading, setIsAccountLoading] = useState(false);
  const { getCurrencies } = useFiat();
  const { getAccounts, createAccount, updateAccount } = useBankAccount();
  const { receiveFor } = useBuy();

  useEffect(() => {
    if (isLoggedIn) {
      Promise.all([getCurrencies(), getAccounts()])
        .then(([currencies, bankAccounts]) => {
          setCurrencies(currencies.filter((c) => c.sellable));
          setBankAccounts(bankAccounts);
        })
        .catch(console.error); // TODO (Krysh) add real error handling
    }
  }, [isLoggedIn]);

  async function addNewAccount(newAccount: CreateBankAccount): Promise<BankAccount> {
    setIsAccountLoading(true);
    return createAccount(newAccount)
      .then((b) => {
        setBankAccounts((bankAccounts ?? []).concat(b));
        return b;
      })
      .finally(() => setIsAccountLoading(false));
  }

  async function updateExistingAccount(id: number, changedAccount: UpdateBankAccount): Promise<BankAccount> {
    return updateAccount(id, changedAccount).then((b) => {
      setBankAccounts(replace(b, bankAccounts));
      return b;
    });
  }

  function replace(account: BankAccount, accounts?: BankAccount[]): BankAccount[] | undefined {
    const index = accounts?.findIndex((b) => b.id === account.id);
    if (index && accounts) accounts[index] = account;
    return accounts;
  }

  const context: BuyInterface = useMemo(
    () => ({
      currencies,
      bankAccounts,
      isAccountLoading,
      createAccount: addNewAccount,
      updateAccount: updateExistingAccount,
      receiveFor,
    }),
    [currencies, bankAccounts, isAccountLoading, addNewAccount, updateExistingAccount, receiveFor],
  );

  return <BuyContext.Provider value={context}>{props.children}</BuyContext.Provider>;
}
