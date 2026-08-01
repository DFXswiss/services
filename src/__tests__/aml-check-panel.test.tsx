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
  userData: { id: 322190, kycStatus: 'Completed', kycLevel: 50 },
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
    const onReset = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <AmlCheckPendingPanel
        data={data}
        clerks={['Alice']}
        isSaving={false}
        onUpdate={jest.fn()}
        onReset={onReset}
      />,
    );

    expect(screen.getByText('BuyCrypto 130504')).toBeInTheDocument();
    expect(screen.getByText(/Transaction 326324 · AML Pass/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Editor für AML-Reset von BuyCrypto 130504' }), {
      target: { value: 'Alice' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'AML-Check zurücksetzen' }));

    expect(window.confirm).toHaveBeenCalledWith(
      'AML-Check für BuyCrypto 130504 wirklich zurücksetzen?\n\nDer Status Pass wird entfernt und die Transaktion erneut durch den AML-Check verarbeitet.',
    );
    await waitFor(() => expect(onReset).toHaveBeenCalledWith(buyCrypto, 'Alice'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'AML-Check zurücksetzen' })).toBeEnabled());
  });

  it('does not reset when confirmation is rejected', () => {
    const onReset = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <AmlCheckPendingPanel
        data={data}
        clerks={['Alice']}
        isSaving={false}
        onUpdate={jest.fn()}
        onReset={onReset}
      />,
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Editor für AML-Reset von BuyCrypto 130504' }), {
      target: { value: 'Alice' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'AML-Check zurücksetzen' }));

    expect(onReset).not.toHaveBeenCalled();
  });
});
