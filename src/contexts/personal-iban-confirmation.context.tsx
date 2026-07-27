import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export type PersonalIbanAnswer =
  | { answer: 'confirmed' }
  | { answer: 'declined'; occurrence: string };

interface PersonalIbanConfirmationContextInterface {
  answers: ReadonlyMap<number, PersonalIbanAnswer>;
  saveAnswer: (customerIdentity: number, answer: PersonalIbanAnswer) => void;
}

const PersonalIbanConfirmationContext =
  createContext<PersonalIbanConfirmationContextInterface | undefined>(
    undefined,
  );

export function usePersonalIbanConfirmationContext(): PersonalIbanConfirmationContextInterface {
  const context = useContext(PersonalIbanConfirmationContext);
  if (context === undefined) {
    throw new Error(
      'usePersonalIbanConfirmationContext must be used within PersonalIbanConfirmationContextProvider',
    );
  }
  return context;
}

/**
 * Owns personal-IBAN answers for one running App instance. Nothing is serialized:
 * leaving or reloading the page creates a new provider and asks again.
 */
export function PersonalIbanConfirmationContextProvider({
  children,
}: PropsWithChildren): JSX.Element {
  const [answers, setAnswers] = useState<Map<number, PersonalIbanAnswer>>(
    () => new Map(),
  );

  const saveAnswer = useCallback(
    (customerIdentity: number, answer: PersonalIbanAnswer) => {
      setAnswers((current) => {
        const next = new Map(current);
        next.set(customerIdentity, answer);
        return next;
      });
    },
    [],
  );

  const context = useMemo(
    () => ({ answers, saveAnswer }),
    [answers, saveAnswer],
  );

  return (
    <PersonalIbanConfirmationContext.Provider value={context}>
      {children}
    </PersonalIbanConfirmationContext.Provider>
  );
}
