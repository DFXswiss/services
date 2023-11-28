import { KycStatus, Utils, useUserContext } from '@dfx.swiss/react';
import { useMemo } from 'react';
import { useSettingsContext } from '../contexts/settings.context';
import { KycStepName, KycStepType, LimitPeriod, TradingLimit } from '../screens/tmp/kyc.hook';

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
      ? `${Utils.formatAmount(user.tradingLimit.limit)} CHF ${translate('kyc', periodMap[user.tradingLimit.period])}`
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
        return translate('kyc', 'Terminated');
      case -20:
        return translate('kyc', 'Rejected');
      default:
        return translate('kyc', `Level {{level}}`, { level });
    }
  }

  function limitToString({ limit, period }: TradingLimit): string {
    return `${Utils.formatAmount(limit)} CHF ${translate('kyc', periodMap[period])}`;
  }

  function nameToString(stepName: KycStepName): string {
    return translate('kyc', stepMap[stepName]);
  }

  function typeToString(stepType: KycStepType): string {
    return translate('kyc', typeMap[stepType]);
  }

  return useMemo(
    () => ({ start, isComplete, limit, levelToString, limitToString, nameToString, typeToString }),
    [user, translate],
  );
}
