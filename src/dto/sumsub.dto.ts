export enum SumsubReviewAnswer {
  GREEN = 'GREEN',
  RED = 'RED',
}

export enum SumsubReviewRejectType {
  FINAL = 'FINAL',
  RETRY = 'RETRY',
}

export interface SumsubMessage {
  reviewId: string;
  attemptId: string;
  attemptCnt: number;
  elapsedSincePendingMs: number;
  elapsedSinceQueuedMs: number;
  reprocessing: boolean;
  levelName: string;
  levelAutoCheckMode: string;
  createDate: string;
  reviewDate: string;
  reviewResult: {
    moderationComment: string;
    reviewAnswer: SumsubReviewAnswer;
    reviewRejectType: SumsubReviewRejectType;
  };
  reviewStatus: string;
  priority: number;
}
