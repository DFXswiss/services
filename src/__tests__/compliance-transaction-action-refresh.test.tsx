// Wiring test: stop/resume keep the action result when only the detail refresh fails.

const mockGetTransactionByUid = jest.fn();
const mockStopTransaction = jest.fn();
const mockResumeTransaction = jest.fn();

jest.mock('@dfx.swiss/react', () => ({
  TransactionState: {
    FAILED: 'Failed',
    CHECK_PENDING: 'CheckPending',
    KYC_REQUIRED: 'KycRequired',
    LIMIT_EXCEEDED: 'LimitExceeded',
    UNASSIGNED: 'Unassigned',
    COMPLETED: 'Completed',
  },
  useTransaction: () => ({
    getTransactionByUid: mockGetTransactionByUid,
  }),
}));

jest.mock('@dfx.swiss/react-components', () => ({
  StyledButton: ({ label, onClick, disabled, isLoading }: any) => (
    <button type="button" onClick={onClick} disabled={disabled || isLoading}>
      {label}
    </button>
  ),
  StyledLoadingSpinner: () => <div>Loading</div>,
  SpinnerSize: { SM: 'sm' },
  StyledButtonWidth: { FULL: 'full' },
  StyledButtonColor: { STURDY_WHITE: 'white', BLUE: 'blue', RED: 'red' },
}));

jest.mock('src/hooks/compliance.hook', () => ({
  useCompliance: () => ({
    downloadTransactionPdf: jest.fn(),
    stopTransaction: mockStopTransaction,
    resumeTransaction: mockResumeTransaction,
  }),
}));

jest.mock('src/util/compliance-helpers', () => ({
  statusBadge: (v: unknown) => v,
  boolBadge: (v: unknown) => String(v),
  formatDate: (v: unknown) => String(v ?? ''),
  DetailRow: () => null,
  TransactionDetailRows: () => null,
}));

jest.mock('src/contexts/settings.context', () => ({
  useSettingsContext: () => ({
    translate: (_key: string, value: string) => value,
  }),
}));

jest.mock('src/contexts/layout.context', () => ({
  useLayoutContext: () => ({
    rootRef: { current: document.body },
    modalRootRef: { current: null },
  }),
}));

jest.mock('src/components/compliance/chargeback-modal', () => ({
  ChargebackModal: () => null,
}));

jest.mock('src/components/compliance/recall-modal', () => ({
  RecallModal: () => null,
}));

jest.mock('src/components/compliance/recall-details-modal', () => ({
  RecallDetailsModal: () => null,
}));

import type { Transaction } from '@dfx.swiss/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { TransactionsTable } from 'src/components/compliance/transactions-tab';
import type { TransactionInfo } from 'src/hooks/compliance.hook';

const tx = {
  id: 130504,
  uid: 'T2AC46F80RESUME01',
  type: 'BuyCrypto',
  sourceType: 'Bank',
  isCompleted: false,
  created: '2026-08-01T10:00:00Z',
} as unknown as TransactionInfo;

function renderTable(onStatusChanged?: () => void) {
  function Wrapper() {
    const [expandedTxUid, setExpandedTxUid] = useState<string | undefined>();
    return (
      <TransactionsTable
        transactions={[tx]}
        bankTxs={[]}
        cryptoInputs={[]}
        bankDatas={[]}
        userData={{ id: 1 } as any}
        userDataId={1}
        onExpandBankTx={jest.fn()}
        onExpandCryptoInput={jest.fn()}
        onExpandBankData={jest.fn()}
        onExpandTxUid={setExpandedTxUid}
        expandedTxUid={expandedTxUid}
        onStatusChanged={onStatusChanged}
      />
    );
  }

  return render(<Wrapper />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetTransactionByUid.mockResolvedValue({
    uid: tx.uid,
    state: 'Stopped',
  } as unknown as Transaction);
  mockStopTransaction.mockReset();
  mockResumeTransaction.mockReset();
});

describe('TransactionsTable stop/resume refresh handling', () => {
  it('keeps the resume result when only the detail refresh fails', async () => {
    const onStatusChanged = jest.fn();
    mockResumeTransaction.mockResolvedValue(undefined);
    mockGetTransactionByUid
      .mockResolvedValueOnce({
        uid: tx.uid,
        state: 'Stopped',
      } as unknown as Transaction)
      .mockRejectedValueOnce(new Error('Network error'));

    renderTable(onStatusChanged);

    await userEvent.click(screen.getByText(tx.uid));
    await userEvent.click(await screen.findByRole('button', { name: 'Resume' }));
    await waitFor(() => {
      expect(screen.getByText('Transaktion fortsetzen')).toBeInTheDocument();
    });
    const resumeButtons = screen.getAllByRole('button', { name: 'Resume' });
    await userEvent.click(resumeButtons[resumeButtons.length - 1]);

    await waitFor(() => {
      expect(mockResumeTransaction).toHaveBeenCalledTimes(1);
      expect(onStatusChanged).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText('Resume failed')).not.toBeInTheDocument();
    expect(screen.queryByText('Transaktion fortsetzen')).not.toBeInTheDocument();
    expect(await screen.findByText('Network error')).toBeInTheDocument();
  });

  it('reports a failed resume and keeps the dialog open', async () => {
    const onStatusChanged = jest.fn();
    mockResumeTransaction.mockRejectedValue(new Error('Transaction is not stopped'));

    renderTable(onStatusChanged);

    await userEvent.click(screen.getByText(tx.uid));
    await userEvent.click(await screen.findByRole('button', { name: 'Resume' }));
    await waitFor(() => {
      expect(screen.getByText('Transaktion fortsetzen')).toBeInTheDocument();
    });
    const resumeButtons = screen.getAllByRole('button', { name: 'Resume' });
    await userEvent.click(resumeButtons[resumeButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText('Transaction is not stopped')).toBeInTheDocument();
    });
    expect(screen.getByText('Transaktion fortsetzen')).toBeInTheDocument();
    expect(onStatusChanged).not.toHaveBeenCalled();
    expect(mockGetTransactionByUid).toHaveBeenCalledTimes(1);
  });

  it('keeps the stop result when only the detail refresh fails', async () => {
    const onStatusChanged = jest.fn();
    mockStopTransaction.mockResolvedValue(undefined);
    mockGetTransactionByUid
      .mockResolvedValueOnce({
        uid: tx.uid,
        state: 'Created',
      } as unknown as Transaction)
      .mockRejectedValueOnce(new Error('Network error'));

    renderTable(onStatusChanged);

    await userEvent.click(screen.getByText(tx.uid));
    await userEvent.click(await screen.findByRole('button', { name: 'Stop' }));
    await waitFor(() => {
      expect(screen.getByText('Transaktion stoppen')).toBeInTheDocument();
    });
    const stopButtons = screen.getAllByRole('button', { name: 'Stop' });
    await userEvent.click(stopButtons[stopButtons.length - 1]);

    await waitFor(() => {
      expect(mockStopTransaction).toHaveBeenCalledTimes(1);
      expect(onStatusChanged).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText('Stop failed')).not.toBeInTheDocument();
    expect(screen.queryByText('Transaktion stoppen')).not.toBeInTheDocument();
    expect(await screen.findByText('Network error')).toBeInTheDocument();
  });
});
