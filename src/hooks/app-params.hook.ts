import { Blockchain } from '@dfx.swiss/react';
import { AppParams, useAppHandlingContext } from '../contexts/app-handling.context';

interface AppParamsInterface extends AppParams {
  availableBlockchains: Blockchain[] | undefined;
  setParams: (params: Partial<AppParams>) => void;
}

export function useAppParams(): AppParamsInterface {
  const { params, setParams, availableBlockchains } = useAppHandlingContext();

  return { ...params, setParams, availableBlockchains };
}
