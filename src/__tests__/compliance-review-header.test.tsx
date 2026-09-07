jest.mock('@dfx.swiss/react', () => ({
  KycStatus: {
    CHECK: 'Check',
    COMPLETED: 'Completed',
  },
}));

import { KycStatus } from '@dfx.swiss/react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ComplianceReviewHeader } from 'src/components/compliance/compliance-review-header';
import { KycStepInfo, UserDataDetail } from 'src/hooks/compliance.hook';

function userData(kycStatus: KycStatus, extra: Partial<UserDataDetail> = {}): UserDataDetail {
  return {
    id: 322190,
    accountType: 'Personal',
    firstname: 'Test',
    surname: 'User',
    kycLevel: 53,
    kycStatus,
    ...extra,
  } as UserDataDetail;
}

function legalEntityStep(sequenceNumber: number, created: string): KycStepInfo {
  return { id: sequenceNumber, name: 'LegalEntity', status: 'Completed', sequenceNumber, created } as KycStepInfo;
}

// Value cell next to a label cell (labels carry `select-none`, values never do).
function valueCell(label: string): Element {
  const cell = screen.getAllByText(label, { selector: 'td' }).find((el) => el.className.includes('select-none'));
  if (!cell?.nextElementSibling) throw new Error(`label "${label}" not found`);
  return cell.nextElementSibling;
}

function valueOf(label: string): string {
  return valueCell(label).textContent ?? '';
}

describe('ComplianceReviewHeader', () => {
  afterEach(() => jest.restoreAllMocks());

  it('renders the personal fields; labels are not selectable, key values select as a whole', () => {
    render(
      <ComplianceReviewHeader
        userData={userData(KycStatus.CHECK, {
          birthday: '1990-05-15',
          verifiedName: 'Test User',
          mail: 'test@example.com',
          language: { name: 'Deutsch', symbol: 'DE' },
          street: 'Bahnhofstrasse',
          houseNumber: '1',
          zip: '8001',
          location: 'Zürich',
        } as Partial<UserDataDetail>)}
        kycSteps={[]}
        isSaving={false}
        onSetKycStatusCheck={jest.fn()}
      />,
    );

    expect(valueOf('UserDataId')).toBe('322190');
    expect(valueOf('Name')).toBe('Test User');
    expect(valueOf('Adresse')).toContain('Bahnhofstrasse 1');
    expect(valueOf('Geburtstag')).toMatch(/^15\.05\.1990 \(\d+ Jahre\)$/);
    expect(valueOf('VerifiedName')).toBe('Test User');
    expect(valueOf('Mail')).toBe('test@example.com');
    expect(valueOf('Sprache')).toBe('Deutsch');
    expect(valueOf('KYC Level')).toBe('53');
    expect(screen.queryByText('Organization', { selector: 'td' })).not.toBeInTheDocument();

    // Values copied as a whole select on click; the address and the KYC Status cell keep the default.
    for (const label of ['UserDataId', 'Name', 'VerifiedName', 'Mail']) {
      expect(valueCell(label).className).toContain('select-all');
    }
    expect(valueCell('Adresse').className).not.toContain('select-all');
    expect(valueCell('KYC Status').className).not.toContain('select-all');
  });

  it('shows a dash for a missing birthday and name', () => {
    render(
      <ComplianceReviewHeader
        userData={userData(KycStatus.CHECK, { firstname: undefined, surname: undefined })}
        kycSteps={[]}
        isSaving={false}
        onSetKycStatusCheck={jest.fn()}
      />,
    );

    expect(valueOf('Name')).toBe('-');
    expect(valueOf('Geburtstag')).toBe('-');
  });

  it('renders the organization fields with the latest LegalEntity submission date', () => {
    render(
      <ComplianceReviewHeader
        userData={userData(KycStatus.CHECK, {
          accountType: 'Organization',
          organization: { name: 'Muster AG', street: 'Weg', houseNumber: '2', zip: '3000', location: 'Bern' },
        } as Partial<UserDataDetail>)}
        kycSteps={[legalEntityStep(1, '2026-01-10T10:00:00Z'), legalEntityStep(2, '2026-03-05T10:00:00Z')]}
        isSaving={false}
        onSetKycStatusCheck={jest.fn()}
      />,
    );

    expect(valueOf('Organization')).toBe('Muster AG');
    expect(valueOf('Adresse')).toContain('Weg 2');
    expect(valueOf('Ansprechsperson')).toBe('Test User');
    expect(valueOf('Datum Dokument eingereicht')).toBe('05.03.2026');
    expect(screen.queryByText('Geburtstag', { selector: 'td' })).not.toBeInTheDocument();
    expect(valueCell('Organization').className).toContain('select-all');
    expect(valueCell('Ansprechsperson').className).toContain('select-all');
    expect(valueCell('Legal Entity').className).not.toContain('select-all');
  });

  it('shows a dash as submission date when no LegalEntity step exists', () => {
    render(
      <ComplianceReviewHeader
        userData={userData(KycStatus.CHECK, { accountType: 'SoleProprietorship' })}
        kycSteps={[]}
        isSaving={false}
        onSetKycStatusCheck={jest.fn()}
      />,
    );

    expect(valueOf('Legal Entity')).toBe('Einzelunternehmen');
    expect(valueOf('Datum Dokument eingereicht')).toBe('-');
  });

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
    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(window.confirm).toHaveBeenCalledTimes(1);
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
