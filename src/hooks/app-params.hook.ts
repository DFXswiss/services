import { AppParams, useAppHandlingContext } from '../contexts/app-handling.context';

interface AppParamsInterface extends AppParams {
  setParams: (params: Partial<AppParams>) => void;
}

export function useAppParams(): AppParamsInterface {
  const { params, setParams } = useAppHandlingContext();

  return { ...params, setParams };
}
