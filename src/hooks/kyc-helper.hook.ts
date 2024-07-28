import { KycLevel, KycStepName, KycStepType, LimitPeriod, TradingLimit, Utils, useUserContext } from '@dfx.swiss/react';
import { useMemo } from 'react';
import { useSettingsContext } from '../contexts/settings.context';
import { useNavigation } from './navigation.hook';

interface KycHelperInterface {
  defaultLimit: TradingLimit;
  limit: string | undefined;
  isComplete: boolean | undefined;
  start: () => void;
  startStep: (stepName: KycStepName, stepType?: KycStepType) => void;

  levelToString: (level: number) => string;
  limitToString: (limit: TradingLimit) => string;
  nameToString: (stepName: KycStepName) => string;
  typeToString: (stepType: KycStepType) => string;
}

export function useKycHelper(): KycHelperInterface {
  const { translate } = useSettingsContext();
  const { user } = useUserContext();
  const { navigate } = useNavigation();

  const periodMap: Record<LimitPeriod, string> = {
    [LimitPeriod.DAY]: 'per 24h',
    [LimitPeriod.YEAR]: 'per year',
  };

  const stepMap: Record<KycStepName | string, string> = {
    // TODO: remove '| string' type when all steps are added
    [KycStepName.CONTACT_DATA]: 'Contact data',
    [KycStepName.PERSONAL_DATA]: 'Personal data',
    LegalEntity: 'Legal entity', // TODO: Add to KycStepName
    StockRegister: 'Stock register', // TODO: Add to KycStepName
    NationalityData: 'Nationality data', // TODO: Add to KycStepName
    CommercialRegister: 'Commercial register', // TODO: Add to KycStepName
    SignatoryPower: 'Signatory power', // TODO: Add to KycStepName
    Authority: 'Authority', // TODO: Add to KycStepName
    [KycStepName.IDENT]: 'Identification',
    [KycStepName.FINANCIAL_DATA]: 'Additional data',
    [KycStepName.DOCUMENT_UPLOAD]: 'Document upload',
    DfxApproval: 'DFX approval', // TODO: Add to KycStepName
  };

  const typeMap: Record<KycStepType, string> = {
    [KycStepType.AUTO]: 'auto',
    [KycStepType.VIDEO]: 'video',
    [KycStepType.MANUAL]: 'manual',
  };

  const limit = user && limitToString(user.tradingLimit);

  const isComplete = user && user.kyc.level >= KycLevel.Completed;

  function start() {
    navigate('/kyc');
  }

  function startStep(stepName: KycStepName, stepType?: KycStepType) {
    const step = stepName + (stepType ? `/${stepType}` : '');
    navigate({ pathname: '/kyc', search: `step=${step}` });
  }

  // formatting
  function levelToString(level: number): string {
    switch (level) {
      case -10:
        return translate('screens/kyc', 'Terminated');
      case -20:
        return translate('screens/kyc', 'Rejected');
      default:
        return translate('screens/kyc', `Level {{level}}`, { level });
    }
  }

  function limitToString({ limit, period }: TradingLimit): string {
    return `${Utils.formatAmount(limit, 0)} CHF ${translate('screens/kyc', periodMap[period])}`;
  }

  function nameToString(stepName: KycStepName): string {
    return translate('screens/kyc', stepMap[stepName]);
  }

  function typeToString(stepType: KycStepType): string {
    return translate('screens/kyc', typeMap[stepType]);
  }

  return useMemo(
    () => ({
      start,
      startStep,
      isComplete,
      defaultLimit: { limit: 1000, period: LimitPeriod.DAY },
      limit,
      levelToString,
      limitToString,
      nameToString,
      typeToString,
    }),
    [user, translate],
  );
}
