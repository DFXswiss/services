import { KycStatus } from '@dfx.swiss/react';
import type { TransactionInfo } from 'src/hooks/compliance.hook';

export function hasBuyCryptoReviewResetEligibleState(tx: TransactionInfo): boolean {
  return (
    tx.buyCryptoId != null &&
    !tx.isCompleted &&
    tx.buyCryptoIsComplete === false &&
    tx.buyCryptoStatus != null &&
    tx.buyCryptoStatus !== 'Stopped' &&
    tx.buyCryptoHasBatch === false &&
    tx.buyCryptoHasChargeback === false &&
    tx.buyCryptoReviewResetBlocked === false
  );
}

export function canResetBuyCryptoAmlForReview(tx: TransactionInfo, kycStatus: string | undefined): boolean {
  return kycStatus === KycStatus.CHECK && hasBuyCryptoReviewResetEligibleState(tx);
}
