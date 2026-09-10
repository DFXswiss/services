// Guards the referral admin enum string values match the backend byte-for-byte (the UI's action
// gating and status display depend on them).
import {
  RealUnitCodeKind,
  RealUnitLegalBasis,
  RealUnitManualReviewStatus,
  RealUnitPrizePayoutStatus,
} from 'src/dto/realunit-referral.dto';

describe('realunit-referral dto enums', () => {
  it('mirrors the backend RealUnitCodeKind values', () => {
    expect(RealUnitCodeKind.INVITE).toBe('Invite');
    expect(RealUnitCodeKind.PROMO).toBe('Promo');
  });

  it('mirrors the backend RealUnitManualReviewStatus values', () => {
    expect(RealUnitManualReviewStatus.PENDING).toBe('Pending');
    expect(RealUnitManualReviewStatus.APPROVED).toBe('Approved');
    expect(RealUnitManualReviewStatus.REJECTED).toBe('Rejected');
  });

  it('mirrors the backend RealUnitPrizePayoutStatus values', () => {
    expect(RealUnitPrizePayoutStatus.PENDING).toBe('Pending');
    expect(RealUnitPrizePayoutStatus.PROCESSING).toBe('Processing');
    expect(RealUnitPrizePayoutStatus.COMPLETE).toBe('Complete');
    expect(RealUnitPrizePayoutStatus.FAILED).toBe('Failed');
  });

  it('mirrors the backend RealUnitLegalBasis values', () => {
    expect(RealUnitLegalBasis.REFERRAL_PREMIUM).toBe('ReferralPremium');
    expect(RealUnitLegalBasis.PROMO_GRANT).toBe('PromoGrant');
  });
});
