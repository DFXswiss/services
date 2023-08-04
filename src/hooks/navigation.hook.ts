import { useMemo } from 'react';
import { NavigateOptions, To, useLocation, useNavigate } from 'react-router-dom';

interface NavigationOptions extends NavigateOptions {
  clearSearch?: string[];
}

interface NavigationInterface {
  navigate: (to: To | number, options?: NavigationOptions) => void;
}

export function useNavigation(): NavigationInterface {
  const navigateTo = useNavigate();
  const { search } = useLocation();

  function navigate(to: To | number, options?: NavigationOptions) {
    switch (typeof to) {
      case 'number':
        return navigateTo(to);

      case 'string':
        return navigateTo(`${to}?${new URLSearchParams(search)}`, options);

      default:
        // join params
        const params = new URLSearchParams(search);
        new URLSearchParams(to.search).forEach((val, key) => params.set(key, val));
        options?.clearSearch?.forEach((s) => params.delete(s));

        to.search = `?${params}`;
        return navigateTo(to, options);
    }
  }

  return useMemo(() => ({ navigate }), [navigateTo, search]);
}
