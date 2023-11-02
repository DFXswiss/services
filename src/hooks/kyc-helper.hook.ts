import { KycStatus, Utils, useUserContext } from '@dfx.swiss/react';
import { useMemo } from 'react';
import { useSettingsContext } from '../contexts/settings.context';

interface KycHelperInterface {
  status: string;
  limit: string;
  isComplete: boolean;
  start: () => Promise<void>;
}

export function useKycHelper(): KycHelperInterface {
  const { translate } = useSettingsContext();
  const { user } = useUserContext();

  const kycMap: Record<string, string> = {
    ['chatbot']: 'chatbot onboarding',
    ['onlineid']: 'online identification',
    ['videoid']: 'video identification',
    ['check']: 'Data in review',
    ['completed']: 'Verification completed',
    ['rejected']: 'Verification rejected',
    ['na']: 'In progress',
    ['reminded']: 'In progress',
    ['failed']: 'Failed',
    ['review']: 'In review',
  };

  const periodMap: Record<string, string> = {
    ['Day']: 'per day',
    ['Year']: 'per year',
  };

  const limit =
    user?.tradingLimit != null
      ? `${Utils.formatAmount(user.tradingLimit.limit)} CHF ${translate('kyc', periodMap[user.tradingLimit.period])}`
      : '';

  const isInProgress = [KycStatus.CHATBOT, KycStatus.ONLINE_ID, KycStatus.VIDEO_ID].includes(
    user?.kycStatus ?? KycStatus.NA,
  );

  const isComplete = [KycStatus.COMPLETED].includes(user?.kycStatus ?? KycStatus.NA);

  function buildKycStatusString(): string {
    if (!user) return kycMap[KycStatus.NA.toLowerCase()];
    if (isInProgress) {
      return `${kycMap[user.kycState.toLowerCase()]} (${kycMap[user.kycStatus.toLowerCase()]})`;
    } else {
      return kycMap[user.kycStatus.toLowerCase()];
    }
  }

  async function start(): Promise<void> {
    if (!user) return;
    const newTab = window.open(`${process.env.REACT_APP_KYC_URL}?code=${user.kycHash}`, '_blank', 'noreferrer');
    const popUpBlocked = newTab == null || newTab.closed || typeof newTab.closed == 'undefined';
    if (popUpBlocked) console.error('popUp blocked'); // TODO: (Krysh) use correct error handling here
  }

  return useMemo(() => ({ start, status: buildKycStatusString(), isComplete, limit }), [user]);
}
