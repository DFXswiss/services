import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import { Country } from '../definitions/country';
import { User } from '../definitions/user';
import { useCountry } from '../hooks/country.hook';
import { useUser } from '../hooks/user.hook';
import { useAuthContext } from './auth.context';

interface UserInterface {
  user?: User;
  refLink?: string;
  countries: Country[];
  isUserLoading: boolean;
  isUserUpdating: boolean;
  changeMail: (mail: string) => Promise<void>;
  register: (userLink: () => void) => void;
}

const UserContext = createContext<UserInterface>(undefined as any);

export function useUserContext(): UserInterface {
  return useContext(UserContext);
}

export function UserContextProvider(props: PropsWithChildren): JSX.Element {
  const { isLoggedIn } = useAuthContext();
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
      setIsUserLoading(true);
      getUser()
        .then(setUser)
        .catch(console.error) // TODO (Krysh) add real error handling
        .finally(() => setIsUserLoading(false));

      getCountries().then(setCountries);
    } else {
      setUser(undefined);
      setCountries([]);
    }
  }, [isLoggedIn]);

  async function changeMail(mail: string): Promise<void> {
    if (!user) return; // TODO (Krysh) add real error handling
    setIsUserUpdating(true);
    return changeUser({ ...user, mail }, userLinkAction)
      .then(setUser)
      .catch(console.error) // TODO (Krysh) add real error handling
      .finally(() => setIsUserUpdating(false));
  }

  function register(userLink: () => void) {
    userLinkAction = userLink;
  }

  const context: UserInterface = { user, refLink, countries, isUserLoading, isUserUpdating, changeMail, register };

  return <UserContext.Provider value={context}>{props.children}</UserContext.Provider>;
}
