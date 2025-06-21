import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

interface OrderUIInterface {
  showsCompletion: boolean;
  showPaymentNameForm: boolean;
  bankAccountSelection: boolean;
  setCompletion: (show: boolean) => void;
  setPaymentNameForm: (show: boolean) => void;
  setBankAccountSelection: (isOpen: boolean) => void;
}

const OrderUIContext = createContext<OrderUIInterface>(undefined as any);

export function useOrderUIContext(): OrderUIInterface {
  return useContext(OrderUIContext);
}

export function OrderUIContextProvider({ children }: { children: ReactNode }) {
  const [showsCompletion, setShowsCompletion] = useState(false);
  const [showPaymentNameForm, setShowPaymentNameForm] = useState(false);
  const [bankAccountSelection, setBankAccountSelection] = useState(false);

  const context: OrderUIInterface = useMemo(
    () => ({
      showsCompletion,
      showPaymentNameForm,
      bankAccountSelection,
      setCompletion: setShowsCompletion,
      setPaymentNameForm: setShowPaymentNameForm,
      setBankAccountSelection,
    }),
    [showsCompletion, showPaymentNameForm, bankAccountSelection],
  );

  return <OrderUIContext.Provider value={context}>{children}</OrderUIContext.Provider>;
}
