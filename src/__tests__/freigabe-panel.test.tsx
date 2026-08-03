import { render, screen } from '@testing-library/react';
import { ComplianceReviewFreigabePanel } from '../components/compliance/freigabe-panel';
import { KycFile, KycStepInfo, UserDataDetail } from '../hooks/compliance.hook';

jest.mock('@dfx.swiss/react', () => ({}));
jest.mock('../hooks/navigation.hook', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock('../hooks/call-queue-clerks.hook', () => ({
  useCallQueueClerks: () => ({ clerks: [], isLoading: false }),
}));

describe('ComplianceReviewFreigabePanel', () => {
  it('shows the API-generated customer profile in the required document list', () => {
    const step = {
      id: 11,
      name: 'DfxApproval',
      status: 'ManualReview',
      sequenceNumber: 1,
    } as KycStepInfo;
    const customerProfile = {
      id: 17,
      uid: 'customer-profile',
      name: 'CustomerProfile.pdf',
      type: 'UserNotes',
      subType: 'CustomerProfile',
      valid: true,
    } as KycFile;

    render(
      <ComplianceReviewFreigabePanel
        step={step}
        userData={{ id: 42, accountType: 'Personal' } as UserDataDetail}
        kycSteps={[step]}
        kycFiles={[customerProfile]}
        onOpenFile={jest.fn()}
        onSave={jest.fn()}
        isSaving={false}
        approvalStatus={{ ready: false, blockers: [{ code: 'MissingDocument', documentSubType: 'RiskProfile' }] }}
      />,
    );

    expect(screen.getByText('Kundenprofil')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CustomerProfile.pdf' })).toBeInTheDocument();
    expect(screen.getByText('Dokument fehlt: RiskProfile')).toBeInTheDocument();
  });
});
