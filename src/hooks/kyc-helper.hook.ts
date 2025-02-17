import { KycLevel, KycStepName, KycStepType, LimitPeriod, TradingLimit, Utils, useUserContext } from '@dfx.swiss/react';
import { DocumentType, GenderType, LegalEntity, SignatoryPower } from '@dfx.swiss/react/dist/definitions/kyc';
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
  genderTypeToString: (genderType: GenderType) => string;
  documentTypeToString: (documentType: DocumentType) => string;
  signatoryPowerToString: (power: SignatoryPower) => string;
}

export function useKycHelper(): KycHelperInterface {
  const { translate } = useSettingsContext();
  const { user } = useUserContext();
  const { navigate } = useNavigation();

  const periodMap: Record<LimitPeriod, string> = {
    [LimitPeriod.DAY]: 'per 24h',
    [LimitPeriod.MONTH]: 'per 30 days',
    [LimitPeriod.YEAR]: 'per year',
  };

  const stepMap: Record<KycStepName, string> = {
    [KycStepName.CONTACT_DATA]: 'Contact data',
    [KycStepName.PERSONAL_DATA]: 'Personal data',
    [KycStepName.LEGAL_ENTITY]: 'Legal entity',
    [KycStepName.STOCK_REGISTER]: 'Shareholder register',
    [KycStepName.NATIONALITY_DATA]: 'Nationality',
    [KycStepName.COMMERCIAL_REGISTER]: 'Commercial register',
    [KycStepName.SIGNATORY_POWER]: 'Signatory power',
    [KycStepName.AUTHORITY]: 'Power of Attorney',
    [KycStepName.IDENT]: 'Identification',
    [KycStepName.FINANCIAL_DATA]: 'Additional data',
    [KycStepName.ADDITIONAL_DOCUMENTS]: 'Additional documents',
    [KycStepName.RESIDENCE_PERMIT]: 'Residence permit',
    [KycStepName.DFX_APPROVAL]: 'DFX approval',
  };

  const typeMap: Record<KycStepType, string> = {
    [KycStepType.AUTO]: 'auto',
    [KycStepType.VIDEO]: 'video',
    [KycStepType.MANUAL]: 'manual',
    [KycStepType.SUMSUB_AUTO]: 'auto',
    [KycStepType.SUMSUB_VIDEO]: 'video',
  };

  const legalEntityMap: Record<LegalEntity, string> = {
    [LegalEntity.PUBLIC_LIMITED_COMPANY]: 'Public Limited Company',
    [LegalEntity.LIMITED_LIABILITY_COMPANY]: 'Limited Liability Company',
    [LegalEntity.LIFE_INSURANCE]: 'Life Insurance',
    [LegalEntity.ASSOCIATION]: 'Association',
    [LegalEntity.FOUNDATION]: 'Foundation',
    [LegalEntity.TRUST]: 'Trust',
    [LegalEntity.OTHER]: 'Other',
  };

  const genderTypeMap: Record<GenderType, string> = {
    [GenderType.FEMALE]: 'Female',
    [GenderType.MALE]: 'Male',
  };

  const manualIdentDocumentTypeMap: Record<DocumentType, string> = {
    [DocumentType.PASSPORT]: 'Passport',
    [DocumentType.IDCARD]: 'ID card',
    [DocumentType.DRIVERS_LICENSE]: "Driver's license",
    [DocumentType.RESIDENCE_PERMIT]: 'Residence permit',
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

  const legalEntityToString = (entity: LegalEntity): string => {
    return translate('screens/kyc', legalEntityMap[entity]);
  };

  const genderTypeToString = (genderType: GenderType): string => {
    return translate('screens/kyc', genderTypeMap[genderType]);
  };

  const documentTypeToString = (documentType: DocumentType): string => {
    return translate('screens/kyc', manualIdentDocumentTypeMap[documentType]);
  };

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
      defaultLimit: { limit: 1000, period: LimitPeriod.MONTH },
      limit,
      levelToString,
      limitToString,
      nameToString,
      typeToString,
      legalEntityToString,
      genderTypeToString,
      documentTypeToString,
      signatoryPowerToString,
    }),
    [user, translate],
  );
}
