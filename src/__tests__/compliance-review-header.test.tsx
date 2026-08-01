jest.mock('@dfx.swiss/react', () => ({
  KycStatus: {
    CHECK: 'Check',
    COMPLETED: 'Completed',
  },
}));

import { KycStatus } from '@dfx.swiss/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ComplianceReviewHeader } from 'src/components/compliance/compliance-review-header';
import { UserDataDetail } from 'src/hooks/compliance.hook';

function userData(kycStatus: KycStatus): UserDataDetail {
  return {
    id: 322190,
    accountType: 'Personal',
    firstname: 'Test',
    surname: 'User',
    kycLevel: 53,
    kycStatus,
  } as UserDataDetail;
}

describe('ComplianceReviewHeader', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sets a non-Check KYC status to Check after confirmation', async () => {
    const onSetKycStatusCheck = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <ComplianceReviewHeader
        userData={userData(KycStatus.COMPLETED)}
        kycSteps={[]}
        isSaving={false}
        onSetKycStatusCheck={onSetKycStatusCheck}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Auf Check setzen' }));

    expect(window.confirm).toHaveBeenCalledWith(
      'KYC-Status für UserData 322190 wirklich von Completed auf Check setzen?\n\nDiese produktive Änderung gilt für alle Benutzer dieser UserData.',
    );
    await waitFor(() => expect(onSetKycStatusCheck).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Auf Check setzen' })).toBeEnabled());
  });

  it('does not change the KYC status when confirmation is rejected', () => {
    const onSetKycStatusCheck = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <ComplianceReviewHeader
        userData={userData(KycStatus.COMPLETED)}
        kycSteps={[]}
        isSaving={false}
        onSetKycStatusCheck={onSetKycStatusCheck}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Auf Check setzen' }));

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(onSetKycStatusCheck).not.toHaveBeenCalled();
  });

  it('disables the action while another save is running', () => {
    render(
      <ComplianceReviewHeader
        userData={userData(KycStatus.COMPLETED)}
        kycSteps={[]}
        isSaving
        onSetKycStatusCheck={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Auf Check setzen' })).toBeDisabled();
  });

  it('prevents a second submission while the status change is pending', async () => {
    let finishStatusChange: () => void = () => undefined;
    const onSetKycStatusCheck = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finishStatusChange = resolve;
        }),
    );
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <ComplianceReviewHeader
        userData={userData(KycStatus.COMPLETED)}
        kycSteps={[]}
        isSaving={false}
        onSetKycStatusCheck={onSetKycStatusCheck}
      />,
    );

    const button = screen.getByRole('button', { name: 'Auf Check setzen' });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(onSetKycStatusCheck).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Wird gesetzt...' })).toBeDisabled();

    finishStatusChange();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Auf Check setzen' })).toBeEnabled());
  });

  it('does not offer the action when the KYC status is already Check', () => {
    render(
      <ComplianceReviewHeader
        userData={userData(KycStatus.CHECK)}
        kycSteps={[]}
        isSaving={false}
        onSetKycStatusCheck={jest.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Auf Check setzen' })).not.toBeInTheDocument();
  });
});
