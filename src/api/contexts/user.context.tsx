import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { Country } from '../definitions/country';
import { User } from '../definitions/user';
import { useCountry } from '../hooks/country.hook';
import { useUser } from '../hooks/user.hook';
import { useSessionContext } from './session.context';

interface UserInterface {
  user?: User;
  refLink?: string;
  countries: Country[];
  isUserLoading: boolean;
  isUserUpdating: boolean;
  changeMail: (mail: string) => Promise<void>;
  register: (userLink: () => void) => void;
  reloadUser: () => Promise<void>;
}

const UserContext = createContext<UserInterface>(undefined as any);

export function useUserContext(): UserInterface {
  return useContext(UserContext);
}

export function UserContextProvider(props: PropsWithChildren): JSX.Element {
  const { isLoggedIn } = useSessionContext();
  const { getUser, changeUser } = useUser();
  const { getCountries } = useCountry();
  const [user, setUser] = useState<User>();
  const [countries, setCountries] = useState<Country[]>([]);
  const [isUserLoading, setIsUserLoading] = useState<boolean>(false);
  const [isUserUpdating, setIsUserUpdating] = useState<boolean>(false);

  const refLink = user?.ref && `${process.env.REACT_APP_REF_URL}${user.ref}`;
  let userLinkAction: () => void | undefined;

  useEffect(() => {
    if (isLoggedIn) {
      reloadUser();

      getCountries().then(setCountries);
    } else {
      setUser(undefined);
      setCountries([]);
    }
  }, [isLoggedIn]);

  async function reloadUser(): Promise<void> {
    setIsUserLoading(true);
    getUser()
      .then(setUser)
      .catch(console.error) // TODO: (Krysh) add real error handling
      .finally(() => setIsUserLoading(false));
  }

  async function changeMail(mail: string): Promise<void> {
    if (!user) return; // TODO: (Krysh) add real error handling
    setIsUserUpdating(true);
    return changeUser({ ...user, mail }, userLinkAction)
      .then(setUser)
      .catch(console.error) // TODO: (Krysh) add real error handling
      .finally(() => setIsUserUpdating(false));
  }

  function register(userLink: () => void) {
    userLinkAction = userLink;
  }

  const context: UserInterface = useMemo(
    () => ({ user, refLink, countries, isUserLoading, isUserUpdating, changeMail, register, reloadUser }),
    [user, refLink, countries, isUserLoading, isUserUpdating, changeMail, register, reloadUser],
  );

  return <UserContext.Provider value={context}>{props.children}</UserContext.Provider>;
}
