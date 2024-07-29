import { KycLevel, KycStepName, KycStepType, LimitPeriod, TradingLimit, Utils, useUserContext } from '@dfx.swiss/react';
import { LegalEntity, SignatoryPower } from '@dfx.swiss/react/dist/definitions/kyc';
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
  legalEntityToString: (entity: LegalEntity) => string;
  signatoryPowerToString: (power: SignatoryPower) => string;
}

export function useKycHelper(): KycHelperInterface {
  const { translate } = useSettingsContext();
  const { user } = useUserContext();
  const { navigate } = useNavigation();

  const periodMap: Record<LimitPeriod, string> = {
    [LimitPeriod.DAY]: 'per 24h',
    [LimitPeriod.YEAR]: 'per year',
  };

  const stepMap: Record<KycStepName, string> = {
    [KycStepName.CONTACT_DATA]: 'Contact data',
    [KycStepName.PERSONAL_DATA]: 'Personal data',
    [KycStepName.LEGAL_ENTITY]: 'Legal entity',
    [KycStepName.STOCK_REGISTER]: 'Stock register',
    [KycStepName.NATIONALITY_DATA]: 'Nationality',
    [KycStepName.COMMERCIAL_REGISTER]: 'Commercial register',
    [KycStepName.SIGNATORY_POWER]: 'Signatory power',
    [KycStepName.AUTHORITY]: 'Power of Attorney',
    [KycStepName.IDENT]: 'Identification',
    [KycStepName.FINANCIAL_DATA]: 'Additional data',
    [KycStepName.DOCUMENT_UPLOAD]: 'Document upload',
    [KycStepName.DFX_APPROVAL]: 'DFX approval',
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

  function legalEntityToString(entity: LegalEntity): string {
    switch (entity) {
      case LegalEntity.PUBLIC_LIMITED_COMPANY:
        return translate('screens/kyc', 'Public Limited Company');
      case LegalEntity.LIMITED_LIABILITY_COMPANY:
        return translate('screens/kyc', 'Limited Liability Company');
      case LegalEntity.LIFE_INSURANCE:
        return translate('screens/kyc', 'Life Insurance');
      default:
        return entity;
    }
  }

  function signatoryPowerToString(power: SignatoryPower): string {
    switch (power) {
      case SignatoryPower.SINGLE:
        return translate('screens/kyc', 'Authorized to sign individually');
      case SignatoryPower.DOUBLE:
        return translate('screens/kyc', 'Authorized to sign jointly');
      case SignatoryPower.NONE:
        return translate('screens/kyc', 'No signing authorization');
    }
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
      legalEntityToString,
      signatoryPowerToString,
    }),
    [user, translate],
  );
}
