import { useUserContext } from '../api/contexts/user.context';
import { KycStatus } from '../api/definitions/kyc';
import { Utils } from '../utils';

interface KycInterface {
  status: string;
  limit: string;
  isComplete: boolean;
  start: () => Promise<void>;
  isAllowedToBuy: (amount: number) => boolean;
}

export function useKyc(): KycInterface {
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
      ? `${Utils.formatAmount(user.tradingLimit.limit)} € ${periodMap[user.tradingLimit.period]}`
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
    if (popUpBlocked) console.error('popUp blocked'); // TODO (Krysh) use correct error handling here
  }

  function isAllowedToBuy(amount: number): boolean {
    if (isComplete) return true;
    return (user?.tradingLimit.limit ?? 0) >= amount;
  }

  return { start, status: buildKycStatusString(), isComplete, limit, isAllowedToBuy };
}
