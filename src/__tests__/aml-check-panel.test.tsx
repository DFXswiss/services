jest.mock('@dfx.swiss/react', () => ({
  AmlReason: {
    NA: 'NA',
    MANUAL_CHECK: 'ManualCheck',
  },
  CallQueue: {},
  CheckStatus: {
    PASS: 'Pass',
    FAIL: 'Fail',
    PENDING: 'Pending',
  },
  KycStatus: {
    CHECK: 'Check',
  },
}));

jest.mock('src/hooks/navigation.hook', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AmlCheckPendingPanel } from 'src/components/compliance/aml-check-panel';
import { ComplianceUserData, TransactionInfo } from 'src/hooks/compliance.hook';

const buyCrypto: TransactionInfo = {
  id: 326324,
  uid: 'transaction-326324',
  buyCryptoId: 130504,
  type: 'Buy',
  sourceType: 'BuyCrypto',
  inputAmount: 300000,
  inputAsset: 'EUR',
  amlCheck: 'Pass',
  amlReason: 'NA',
  isCompleted: false,
  created: '2026-08-01T00:00:00.000Z',
};

const data = {
  userData: { id: 322190, kycStatus: 'Check', kycLevel: 50 },
  kycSteps: [],
  transactions: [buyCrypto],
  bankTxs: [],
  cryptoInputs: [],
  users: [],
  bankDatas: [],
  buyRoutes: [],
  sellRoutes: [],
  swapRoutes: [],
  virtualIbans: [],
  refRewards: [],
  notifications: [],
  notes: [],
  permissions: {
    viewKycFiles: true,
    viewKycLogs: true,
    viewIpLogs: true,
    viewSupportIssues: true,
    canRequestLimit: true,
    canPerformTransactionActions: true,
    viewRecommendation: true,
  },
} as ComplianceUserData;

describe('AmlCheckPendingPanel AML reset', () => {
  afterEach(() => jest.restoreAllMocks());

  it('resets a non-completed BuyCrypto with an existing AML result after confirmation', async () => {
    const onReviewReset = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <AmlCheckPendingPanel
        data={data}
        clerks={['Alice']}
        isSaving={false}
        onUpdate={jest.fn()}
        onReset={jest.fn()}
        onReviewReset={onReviewReset}
      />,
    );

    expect(screen.getByText('BuyCrypto 130504')).toBeInTheDocument();
    expect(screen.getByText(/Transaction 326324 · AML Pass/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'AML-Check zurücksetzen' }));

    expect(window.confirm).toHaveBeenCalledWith(
      'AML-Check für BuyCrypto 130504 wirklich zurücksetzen?\n\nDer Status Pass wird entfernt und die Transaktion erneut durch den AML-Check verarbeitet.',
    );
    await waitFor(() => expect(onReviewReset).toHaveBeenCalledWith(buyCrypto));
    await waitFor(() => expect(screen.getByRole('button', { name: 'AML-Check zurücksetzen' })).toBeEnabled());
  });

  it('does not reset when confirmation is rejected', () => {
    const onReviewReset = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <AmlCheckPendingPanel
        data={data}
        clerks={['Alice']}
        isSaving={false}
        onUpdate={jest.fn()}
        onReset={jest.fn()}
        onReviewReset={onReviewReset}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'AML-Check zurücksetzen' }));

    expect(onReviewReset).not.toHaveBeenCalled();
  });

  it('keeps review reset disabled until KYC is Check', () => {
    render(
      <AmlCheckPendingPanel
        data={{ ...data, userData: { ...data.userData, kycStatus: 'Completed' } } as ComplianceUserData}
        clerks={['Alice']}
        isSaving={false}
        onUpdate={jest.fn()}
        onReset={jest.fn()}
        onReviewReset={jest.fn()}
      />,
    );

    expect(screen.getByText('Zuerst KYC-Status auf Check setzen und den Reload abwarten.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'AML-Check zurücksetzen' })).toBeDisabled();
  });
});
