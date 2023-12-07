import {
  KycStatus,
  KycStepName,
  KycStepType,
  LimitPeriod,
  TradingLimit,
  Utils,
  useUserContext,
} from '@dfx.swiss/react';
import { useMemo } from 'react';
import { useSettingsContext } from '../contexts/settings.context';

interface KycHelperInterface {
  // legacy
  limit: string;
  isComplete: boolean;
  start: () => Promise<void>;
  // new
  levelToString: (level: number) => string;
  limitToString: (limit: TradingLimit) => string;
  nameToString: (stepName: KycStepName) => string;
  typeToString: (stepType: KycStepType) => string;
}

export function useKycHelper(): KycHelperInterface {
  const { translate } = useSettingsContext();
  const { user } = useUserContext();

  const periodMap: Record<LimitPeriod, string> = {
    [LimitPeriod.DAY]: 'per 24h',
    [LimitPeriod.YEAR]: 'per year',
  };

  const stepMap: Record<KycStepName, string> = {
    [KycStepName.CONTACT_DATA]: 'Contact data',
    [KycStepName.PERSONAL_DATA]: 'Personal data',
    [KycStepName.IDENT]: 'Identification',
    [KycStepName.FINANCIAL_DATA]: 'Additional data',
    [KycStepName.DOCUMENT_UPLOAD]: 'Document upload',
  };

  const typeMap: Record<KycStepType, string> = {
    [KycStepType.AUTO]: 'auto',
    [KycStepType.VIDEO]: 'video',
    [KycStepType.MANUAL]: 'manual',
  };

  // --- LEGACY KYC --- //

  const limit =
    user?.tradingLimit != null
      ? `${Utils.formatAmount(user.tradingLimit.limit)} CHF ${translate(
          'screens/kyc',
          periodMap[user.tradingLimit.period],
        )}`
      : '';

  const isComplete = [KycStatus.COMPLETED].includes(user?.kycStatus ?? KycStatus.NA);

  async function start(): Promise<void> {
    if (!user) return;
    const newTab = window.open(`${process.env.REACT_APP_KYC_URL}?code=${user.kycHash}`, '_blank', 'noreferrer');
    const popUpBlocked = newTab == null || newTab.closed || typeof newTab.closed == 'undefined';
    if (popUpBlocked) console.error('popUp blocked'); // TODO: (Krysh) use correct error handling here
  }

  // --- NEW KYC --- //

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
    return `${Utils.formatAmount(limit)} CHF ${translate('screens/kyc', periodMap[period])}`;
  }

  function nameToString(stepName: KycStepName): string {
    return translate('screens/kyc', stepMap[stepName]);
  }

  function typeToString(stepType: KycStepType): string {
    return translate('screens/kyc', typeMap[stepType]);
  }

  return useMemo(
    () => ({ start, isComplete, limit, levelToString, limitToString, nameToString, typeToString }),
    [user, translate],
  );
}
