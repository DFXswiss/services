import { User, UserUrl } from '../definitions/user';
import { useApi } from './api.hook';

export interface UserInterface {
  getUser: () => Promise<User | undefined>;
  changeUser: (user?: User, userLinkAction?: () => void) => Promise<User | undefined>;
}

export function useUser(): UserInterface {
  const { call } = useApi();

  async function getUser(): Promise<User | undefined> {
    return call<User>({ url: UserUrl.get, method: 'GET' });
  }

  async function changeUser(user?: User, userLinkAction?: () => void): Promise<User | undefined> {
    if (!user) return undefined;
    return call<User>({
      url: UserUrl.change,
      method: 'PUT',
      data: { ...user },
      specialHandling: userLinkAction && { action: userLinkAction, statusCode: 202 },
    });
  }

  return { getUser, changeUser };
}
