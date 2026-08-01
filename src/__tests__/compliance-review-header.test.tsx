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
        clerks={['Alice']}
        clerksLoading={false}
        isSaving={false}
        onSetKycStatusCheck={onSetKycStatusCheck}
      />,
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Editor für KYC-Status' }), {
      target: { value: 'Alice' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Auf Check setzen' }));

    expect(window.confirm).toHaveBeenCalledWith(
      'KYC-Status für UserData 322190 wirklich von Completed auf Check setzen?\n\nDiese produktive Änderung gilt für alle Benutzer dieser UserData.',
    );
    await waitFor(() => expect(onSetKycStatusCheck).toHaveBeenCalledWith('Alice'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Auf Check setzen' })).toBeEnabled());
  });

  it('does not change the KYC status when confirmation is rejected', () => {
    const onSetKycStatusCheck = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <ComplianceReviewHeader
        userData={userData(KycStatus.COMPLETED)}
        kycSteps={[]}
        clerks={['Alice']}
        clerksLoading={false}
        isSaving={false}
        onSetKycStatusCheck={onSetKycStatusCheck}
      />,
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Editor für KYC-Status' }), {
      target: { value: 'Alice' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Auf Check setzen' }));

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(onSetKycStatusCheck).not.toHaveBeenCalled();
  });

  it('disables the action until an editor is selected and while another save is running', () => {
    const { rerender } = render(
      <ComplianceReviewHeader
        userData={userData(KycStatus.COMPLETED)}
        kycSteps={[]}
        clerks={['Alice']}
        clerksLoading={false}
        isSaving={false}
        onSetKycStatusCheck={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Auf Check setzen' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Editor für KYC-Status' })).toBeEnabled();

    rerender(
      <ComplianceReviewHeader
        userData={userData(KycStatus.COMPLETED)}
        kycSteps={[]}
        clerks={['Alice']}
        clerksLoading={false}
        isSaving={true}
        onSetKycStatusCheck={jest.fn()}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Editor für KYC-Status' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Auf Check setzen' })).toBeDisabled();
  });

  it('disables the action and explains when no editors are available', () => {
    render(
      <ComplianceReviewHeader
        userData={userData(KycStatus.COMPLETED)}
        kycSteps={[]}
        clerks={[]}
        clerksLoading={false}
        isSaving={false}
        onSetKycStatusCheck={jest.fn()}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Editor für KYC-Status' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Auf Check setzen' })).toBeDisabled();
    expect(screen.getByText('Keine Editoren verfügbar.')).toBeInTheDocument();
  });

  it('exposes an editor loading error and keeps the action disabled', () => {
    render(
      <ComplianceReviewHeader
        userData={userData(KycStatus.COMPLETED)}
        kycSteps={[]}
        clerks={[]}
        clerksLoading={false}
        clerksError="Clerk service unavailable"
        isSaving={false}
        onSetKycStatusCheck={jest.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Editoren konnten nicht geladen werden: Clerk service unavailable',
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
        clerks={['Alice']}
        clerksLoading={false}
        isSaving={false}
        onSetKycStatusCheck={onSetKycStatusCheck}
      />,
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Editor für KYC-Status' }), {
      target: { value: 'Alice' },
    });
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
        clerks={['Alice']}
        clerksLoading={false}
        isSaving={false}
        onSetKycStatusCheck={jest.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Auf Check setzen' })).not.toBeInTheDocument();
  });
});
