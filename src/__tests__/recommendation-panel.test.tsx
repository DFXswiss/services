// Component tests for RecommendationPanel: the recommendation steps, the referrer list, the per-wallet
// referral-code editors, and that a saved code updates both lists without a reload.

const mockNavigate = jest.fn();
const mockUpdateUsedRef = jest.fn();

// recommendation-graph.util imports compliance.hook, which loads a few @dfx.swiss/react enum values at
// module scope (ESM this Jest setup cannot parse), so the mock must provide them.
const mockSession: { role?: string } = { role: 'Compliance' };

jest.mock('@dfx.swiss/react', () => ({
  useApi: () => ({ call: jest.fn() }),
  useAuthContext: () => ({ session: mockSession }),
  UserRole: { USER: 'User', SUPPORT: 'Support', MARKETING: 'Marketing', COMPLIANCE: 'Compliance', ADMIN: 'Admin' },
  PhoneCallStatus: {
    COMPLETED: 'Completed',
    UNAVAILABLE: 'Unavailable',
    SUSPICIOUS: 'Suspicious',
    FAILED: 'Failed',
    REPEAT: 'Repeat',
  },
  CallQueue: {
    MANUAL_CHECK_PHONE: 'ManualCheckPhone',
    MANUAL_CHECK_IP_PHONE: 'ManualCheckIpPhone',
    MANUAL_CHECK_IP_COUNTRY_PHONE: 'ManualCheckIpCountryPhone',
    MANUAL_CHECK_EXTERNAL_ACCOUNT_PHONE: 'ManualCheckExternalAccountPhone',
    UNAVAILABLE_SUSPICIOUS: 'UnavailableSuspicious',
  },
}));

jest.mock('src/hooks/used-ref.hook', () => ({
  USED_REF_PATTERN: /^\w{1,3}-\w{1,3}$/,
  useUsedRef: () => ({ updateUsedRef: mockUpdateUsedRef }),
}));

jest.mock('src/hooks/staff-verified-name.hook', () => ({
  useStaffVerifiedName: () => ({ name: 'JR', isLoading: false }),
}));

jest.mock('src/components/error-hint', () => ({ ErrorHint: () => null }));

jest.mock('src/util/compliance-helpers', () => ({
  DEFAULT_REF: '000-000',
  formatDate: (value: string) => `d:${value}`,
  statusBadge: (status: string) => <span>{status}</span>,
}));

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NavigateFunction } from 'react-router-dom';
import { RecommendationPanel } from 'src/components/compliance/recommendation-panel';
import type { KycStepInfo, UserInfo } from 'src/hooks/compliance.hook';

function wallet(overrides: Partial<UserInfo> = {}): UserInfo {
  return {
    id: 1,
    address: '0xabc',
    usedRef: '000-000',
    role: 'User',
    status: 'Active',
    walletName: 'DFX',
    created: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderPanel(props: Partial<{ kycSteps: KycStepInfo[]; users: UserInfo[] }> = {}) {
  return render(
    <RecommendationPanel
      kycSteps={props.kycSteps ?? []}
      users={props.users ?? []}
      userDataId="408808"
      navigate={mockNavigate as unknown as NavigateFunction}
    />,
  );
}

describe('RecommendationPanel', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUpdateUsedRef.mockReset();
    mockSession.role = 'Compliance';
  });

  it('shows the empty state and links to the network', () => {
    renderPanel();

    expect(screen.getByText('Recommendation (0)')).toBeInTheDocument();
    expect(screen.getByText('No recommendation')).toBeInTheDocument();
    expect(screen.queryByText('Referrer (Ref-Code)')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View Network' }));
    expect(mockNavigate).toHaveBeenCalledWith('/compliance/recommendations/408808');
  });

  it('counts only Recommendation steps and opens a step on click', () => {
    const step = { id: 5, name: 'Recommendation', status: 'Completed', created: '2026-02-02' } as KycStepInfo;
    renderPanel({
      kycSteps: [step, { id: 6, name: 'Ident', status: 'Completed', created: '2026-02-03' } as KycStepInfo],
    });

    expect(screen.getByText('Recommendation (1)')).toBeInTheDocument();
    expect(screen.getByText('d:2026-02-02')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Completed'));
    expect(mockNavigate).toHaveBeenCalledWith('/compliance/user/408808/kyc-step/5', { state: { step } });
  });

  it('treats missing steps as none', () => {
    render(
      <RecommendationPanel
        kycSteps={undefined as unknown as KycStepInfo[]}
        users={[]}
        userDataId="408808"
        navigate={mockNavigate as unknown as NavigateFunction}
      />,
    );
    expect(screen.getByText('Recommendation (0)')).toBeInTheDocument();
  });

  it('lists every wallet with its referrer, linking to the referrer account where known', () => {
    renderPanel({
      users: [
        wallet({ id: 1, usedRef: '172-134', refUserName: 'Samuel Kullmann', refUserDataId: 328304 }),
        wallet({ id: 2, address: '0xdef', usedRef: '555-555' }),
        wallet({ id: 3, address: '0x123' }),
      ],
    });

    expect(screen.getByText('Referrer (Ref-Code)')).toBeInTheDocument();
    const known = screen.getByRole('button', { name: 'Samuel Kullmann #328304 (172-134)' });
    expect(screen.getByRole('button', { name: '- (555-555)' })).toBeDisabled();
    expect(screen.getByText('No Ref-Code')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Change' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Set' })).toBeInTheDocument();

    fireEvent.click(known);
    expect(mockNavigate).toHaveBeenCalledWith('/compliance/user/328304');
  });

  it('hides the referrer box when the account has no wallet', () => {
    renderPanel({ users: [] });
    expect(screen.queryByText('Referrer (Ref-Code)')).not.toBeInTheDocument();
  });

  it('shows the saved code and referrer on the wallet row without a reload', async () => {
    renderPanel({ users: [wallet({ id: 1 }), wallet({ id: 2, address: '0xdef' })] });
    expect(screen.getAllByRole('button', { name: 'Set' })).toHaveLength(2);

    mockUpdateUsedRef.mockResolvedValue(
      wallet({ id: 2, address: '0xdef', usedRef: '194-687', refUserName: 'Joshua Kruger', refUserDataId: 317206 }),
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Set' })[1]);
    fireEvent.change(screen.getByLabelText('Ref-Code'), { target: { value: '194-687' } });
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'confirmed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Joshua Kruger #317206 (194-687)' })).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Set' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument();
  });

  it('lists the wallets read-only for a support session', () => {
    mockSession.role = 'Support';
    renderPanel({
      users: [wallet({ id: 1, usedRef: '172-134', refUserName: 'Samuel Kullmann', refUserDataId: 328304 })],
    });

    expect(screen.getByRole('button', { name: 'Samuel Kullmann #328304 (172-134)' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Set' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument();
  });

  it('follows a reload of the account with the wallets it delivers', () => {
    const { rerender } = renderPanel({ users: [wallet({ id: 1 })] });
    expect(screen.getAllByRole('button', { name: 'Set' })).toHaveLength(1);

    rerender(
      <RecommendationPanel
        kycSteps={[]}
        users={[wallet({ id: 1 }), wallet({ id: 2, address: '0xdef' })]}
        userDataId="408808"
        navigate={mockNavigate as unknown as NavigateFunction}
      />,
    );
    expect(screen.getAllByRole('button', { name: 'Set' })).toHaveLength(2);
  });
});
