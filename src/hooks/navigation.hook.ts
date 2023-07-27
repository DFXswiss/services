import { useMemo } from 'react';
import { NavigateFunction, NavigateOptions, To, useLocation, useNavigate } from 'react-router-dom';

interface NavigationInterface {
  navigate: NavigateFunction;
}

export function useNavigation(): NavigationInterface {
  const navigateTo = useNavigate();
  const { search } = useLocation();

  function navigate(to: To | number, options?: NavigateOptions) {
    typeof to === 'number' ? navigateTo(to) : navigateTo(`${to}?${new URLSearchParams(search).toString()}`, options);
  }

  return useMemo(() => ({ navigate }), [navigateTo, search]);
}
