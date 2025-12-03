export enum RecommendationStatus {
  CREATED = 'Created',
  PENDING = 'Pending',
  EXPIRED = 'Expired',
  REJECTED = 'Rejected',
  COMPLETED = 'Completed',
}

export enum RecommendationType {
  INVITATION = 'Invitation',
  REQUEST = 'Request',
}

export enum RecommendationMethod {
  REF_CODE = 'RefCode',
  MAIL = 'Mail',
  RECOMMENDATION_CODE = 'RecommendationCode',
}

export interface Recommendation {
  id: number;
  code?: string;
  status: RecommendationStatus;
  type: RecommendationType;
  method: RecommendationMethod;
  name?: string;
  mail?: string;
  confirmationDate?: Date;
  expirationDate: Date;
}

export interface CreateRecommendation {
  recommendedMail?: string;
  recommendedAlias: string;
}
