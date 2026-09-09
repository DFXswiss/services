// Component tests for the RealUnit referral admin list screen: the held-for-review default filter,
// the pending count, toggling to show all, row navigation, and the empty state. Heavy transitive
// deps are mocked so the screen renders under @testing-library/react without the full app shell.

jest.mock('@dfx.swiss/react', () => ({}));
jest.mock('@dfx.swiss/react-components', () => ({
  SpinnerSize: { SM: 'sm', LG: 'lg' },
  StyledButtonWidth: { MIN: 'min' },
  StyledLoadingSpinner: () => null,
  StyledButton: ({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) => (
    <button type="button" disabled={disabled} onClick={onClick}>
      {label}
    </button>
  ),
}));
jest.mock('src/components/error-hint', () => ({ ErrorHint: () => null }));
jest.mock('src/hooks/guard.hook', () => ({ useRealunitGuard: () => undefined }));
jest.mock('src/contexts/settings.context', () => ({
  useSettingsContext: () => ({ translate: (_ns: string, key: string) => key }),
}));
jest.mock('src/hooks/layout-config.hook', () => ({ useLayoutOptions: () => undefined }));

const mockNavigate = jest.fn();
jest.mock('src/hooks/navigation.hook', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));

const mockGetRelations = jest.fn();
const mockGetPromoCodes = jest.fn();
jest.mock('src/hooks/realunit-referral.hook', () => ({
  useRealunitReferral: () => ({
    getRelations: mockGetRelations,
    getPromoCodes: mockGetPromoCodes,
    createPromoCode: jest.fn(),
    deactivatePromoCode: jest.fn(),
  }),
}));

jest.mock('src/util/utils', () => ({ formatSwissDateTimeWithSeconds: (v: string) => v }));

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RealUnitCodeKind, RealUnitManualReviewStatus } from 'src/dto/realunit-referral.dto';
import RealunitReferralScreen from 'src/screens/realunit-referral.screen';

const PENDING = {
  id: 1,
  kind: RealUnitCodeKind.INVITE,
  userId: 10,
  code: 'AB12CD',
  credited: false,
  created: '2026-09-01T10:00:00Z',
  reviewStatus: RealUnitManualReviewStatus.PENDING,
};
const APPROVED = {
  id: 2,
  kind: RealUnitCodeKind.PROMO,
  userId: 11,
  code: 'PROMO9',
  credited: true,
  created: '2026-09-02T10:00:00Z',
  reviewStatus: RealUnitManualReviewStatus.APPROVED,
};

describe('RealunitReferralScreen held-for-review filter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPromoCodes.mockResolvedValue([]);
  });

  it('shows only pending relations by default and the pending count', async () => {
    mockGetRelations.mockResolvedValue([PENDING, APPROVED]);
    render(<RealunitReferralScreen />);

    await waitFor(() => expect(screen.getByText('AB12CD')).toBeInTheDocument());

    expect(screen.queryByText('PROMO9')).not.toBeInTheDocument();
    expect(screen.getByText(/Relations/)).toHaveTextContent('Relations: 2');
    expect(screen.getByText(/Held for review only/)).toHaveTextContent('Held for review only (1)');
  });

  it('shows all relations when the filter is turned off', async () => {
    mockGetRelations.mockResolvedValue([PENDING, APPROVED]);
    render(<RealunitReferralScreen />);
    await waitFor(() => expect(screen.getByText('AB12CD')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('checkbox'));

    expect(screen.getByText('PROMO9')).toBeInTheDocument();
  });

  it('navigates to the detail on row click', async () => {
    mockGetRelations.mockResolvedValue([PENDING]);
    render(<RealunitReferralScreen />);
    await waitFor(() => expect(screen.getByText('AB12CD')).toBeInTheDocument());

    fireEvent.click(screen.getByText('AB12CD'));

    expect(mockNavigate).toHaveBeenCalledWith('/realunit/referral/1');
  });

  it('shows the empty state when the filtered list is empty', async () => {
    mockGetRelations.mockResolvedValue([APPROVED]); // only a non-pending row → filtered out by default
    render(<RealunitReferralScreen />);

    await waitFor(() => expect(screen.getByText('No entries found')).toBeInTheDocument());
  });

  it('does not crash when the list load fails', async () => {
    mockGetRelations.mockRejectedValue(new Error('boom'));
    render(<RealunitReferralScreen />);

    await waitFor(() => expect(mockGetRelations).toHaveBeenCalled());
    expect(screen.queryByText('AB12CD')).not.toBeInTheDocument();
  });
});
