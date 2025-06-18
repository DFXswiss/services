import { createContext, PropsWithChildren, RefObject, useContext } from 'react';

interface ModalRootContextInterface {
  modalRootRef: RefObject<HTMLDivElement | null>;
}

const ModalRootContext = createContext<ModalRootContextInterface>(undefined as any);

export function useModalRootContext(): ModalRootContextInterface {
  return useContext(ModalRootContext);
}

interface ModalRootContextProviderProps extends PropsWithChildren {
  modalRootRef: RefObject<HTMLDivElement | null>;
}

export function ModalRootContextProvider({ children, modalRootRef }: ModalRootContextProviderProps): JSX.Element {
  return (
    <ModalRootContext.Provider value={{ modalRootRef }}>
      {children}
    </ModalRootContext.Provider>
  );
}
