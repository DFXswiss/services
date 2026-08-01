import { CallQueue, CallQueueSourceType } from '@dfx.swiss/react';
import { CallOutcomeContext } from 'src/hooks/compliance.hook';

export function buildCallOutcomeContext(params: {
  queue: CallQueue;
  userDataId: number;
  txId?: number;
  sourceType?: CallQueueSourceType;
  amlCheck?: string;
  amlReason?: string;
  buyCryptoResetEligible?: boolean;
}): CallOutcomeContext {
  const { queue, userDataId, txId, sourceType, amlCheck, amlReason, buyCryptoResetEligible } = params;
  return txId != null && sourceType
    ? { queue, userDataId, txId, sourceType, amlCheck, amlReason, buyCryptoResetEligible }
    : { queue, userDataId };
}
