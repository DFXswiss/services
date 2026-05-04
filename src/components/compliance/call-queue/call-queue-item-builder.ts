import { CallQueue, CallQueueSourceType } from '@dfx.swiss/react';
import { CallOutcomeContext } from 'src/hooks/compliance.hook';

export function buildCallOutcomeContext(params: {
  queue: CallQueue;
  userDataId: number;
  txId?: number;
  sourceType?: CallQueueSourceType;
}): CallOutcomeContext {
  const { queue, userDataId, txId, sourceType } = params;
  return txId != null && sourceType ? { queue, userDataId, txId, sourceType } : { queue, userDataId };
}
