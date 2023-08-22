import { useMemo } from 'react';
import { NavigateOptions, To, useLocation, useNavigate } from 'react-router-dom';

interface NavigationOptions extends NavigateOptions {
  clearParams?: string[];
}

interface NavigationInterface {
  navigate: (to: To | number, options?: NavigationOptions) => void;
  setParams: (params: URLSearchParams) => void;
}

export function useNavigation(): NavigationInterface {
  const navigateTo = useNavigate();
  const { search, pathname } = useLocation();

  function navigate(to: To | number, options?: NavigationOptions) {
    switch (typeof to) {
      case 'number':
        return navigateTo(to);

      case 'string':
        return navigateTo(`${to}?${new URLSearchParams(search)}`, options);

      default:
        const params = addParams(new URLSearchParams(to.search), options?.clearParams);

        to.search = `?${params}`;
        return navigateTo(to, options);
    }
  }

  function setParams(newParams: URLSearchParams) {
    const params = addParams(newParams);

    return navigateTo(`${pathname}?${params}`);
  }

  function addParams(newParams: URLSearchParams, clearParams?: string[]): URLSearchParams {
    const params = new URLSearchParams(search);
    newParams.forEach((val, key) => params.set(key, val));
    clearParams?.forEach((s) => params.delete(s));

    return params;
  }

  return useMemo(() => ({ navigate, setParams }), [navigateTo, search, pathname]);
}
