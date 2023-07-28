import { useMemo } from 'react';
import { NavigateFunction, NavigateOptions, To, useLocation, useNavigate } from 'react-router-dom';

interface NavigationInterface {
  navigate: NavigateFunction;
}

export function useNavigation(): NavigationInterface {
  const navigateTo = useNavigate();
  const { search } = useLocation();

  function navigate(to: To | number, options?: NavigateOptions) {
    switch (typeof to) {
      case 'number':
        return navigateTo(to);

      case 'string':
        return navigateTo(`${to}?${new URLSearchParams(search)}`, options);

      default:
        to.search = search;
        return navigateTo(to, options);
    }
  }

  return useMemo(() => ({ navigate }), [navigateTo, search]);
}
