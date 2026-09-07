// Guards the referral admin enum string values match the backend byte-for-byte (the UI's action
// gating and status display depend on them).
import { RealUnitCodeKind, RealUnitManualReviewStatus } from 'src/dto/realunit-referral.dto';

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
});
