// Frontend mirror of the api dto/realunit-referral.dto.ts (RealUnitReferralRelationDto) plus the
// entities/realunit-code-binding.entity.ts enums. Date fields arrive as ISO strings over the wire.
export enum RealUnitCodeKind {
  INVITE = 'Invite',
  PROMO = 'Promo',
}

export enum RealUnitManualReviewStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
}

export interface RealUnitReferralRelation {
  id: number;
  kind: RealUnitCodeKind;
  userId: number;
  guestAccountId?: number;
  referrerAccountId?: number;
  code: string;
  consumedAt?: string;
  credited: boolean;
  created: string;
  reviewStatus?: RealUnitManualReviewStatus;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewReason?: string;
  manualRewardedAt?: string;
  manualRewardedBy?: string;
  manualRewardReason?: string;
}
