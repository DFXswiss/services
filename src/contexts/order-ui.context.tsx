import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { SafeOperationType } from 'src/dto/safe.dto';

interface OrderUIInterface {
  completionType?: SafeOperationType;
  showPaymentNameForm: boolean;
  bankAccountSelection: boolean;
  setCompletionType: (type?: SafeOperationType) => void;
  setPaymentNameForm: (show: boolean) => void;
  setBankAccountSelection: (isOpen: boolean) => void;
}

const OrderUIContext = createContext<OrderUIInterface>(undefined as any);

export function useOrderUIContext(): OrderUIInterface {
  return useContext(OrderUIContext);
}

export function OrderUIContextProvider({ children }: { children: ReactNode }) {
  const [completionType, setCompletionType] = useState<SafeOperationType>();
  const [showPaymentNameForm, setShowPaymentNameForm] = useState(false);
  const [bankAccountSelection, setBankAccountSelection] = useState(false);

  const context: OrderUIInterface = useMemo(
    () => ({
      completionType,
      showPaymentNameForm,
      bankAccountSelection,
      setCompletionType,
      setPaymentNameForm: setShowPaymentNameForm,
      setBankAccountSelection,
    }),
    [completionType, showPaymentNameForm, bankAccountSelection],
  );

  return <OrderUIContext.Provider value={context}>{children}</OrderUIContext.Provider>;
}
