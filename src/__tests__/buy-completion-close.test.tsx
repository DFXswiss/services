const mockCloseServices = jest.fn();
const mockNavigate = jest.fn();
const mockUseAppHandlingContext = jest.fn();

jest.mock('@dfx.swiss/react', () => ({}));

jest.mock('@dfx.swiss/react-components', () => ({
  DfxIcon: () => <div data-testid="completion-icon" />,
  IconColor: { BLUE: 'blue' },
  IconSize: { XXL: 'xxl' },
  IconVariant: { PROCESS_DONE: 'process-done' },
  SpinnerSize: { LG: 'lg' },
  StyledButton: ({ label, onClick }: any) => (
    <button type="button" onClick={onClick}>
      {label}
    </button>
  ),
  StyledButtonColor: { STURDY_WHITE: 'sturdy-white' },
  StyledButtonWidth: { FULL: 'full' },
  StyledLoadingSpinner: () => <div data-testid="loading-spinner" />,
  StyledVerticalStack: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('../contexts/app-handling.context', () => ({
  CloseType: { BUY: 'buy' },
  useAppHandlingContext: () => mockUseAppHandlingContext(),
}));

jest.mock('../contexts/settings.context', () => ({
  useSettingsContext: () => ({
    translate: (_namespace: string, text: string) => text,
  }),
}));

jest.mock('../hooks/navigation.hook', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../components/edit/mail.edit', () => ({ MailEdit: () => null }));

import { fireEvent, render, screen } from '@testing-library/react';
import { BuyCompletion } from '../components/payment/buy-completion';

describe('BuyCompletion close handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function renderCompletion() {
    return render(
      <BuyCompletion
        user={{ mail: 'user@example.com' } as any}
        paymentInfo={{ id: 1 } as any}
        navigateOnClose={false}
      />,
    );
  }

  it('falls back to the account without blanking the completion when no close channel fired', () => {
    mockCloseServices.mockReturnValue(false);
    // These legacy flags claim a close path exists; only the closeServices result is authoritative.
    mockUseAppHandlingContext.mockReturnValue({
      closeServices: mockCloseServices,
      isEmbedded: true,
      canClose: true,
    });
    renderCompletion();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(mockNavigate).toHaveBeenCalledWith('/account');
    expect(screen.getByTestId('completion-icon')).toBeInTheDocument();
  });

  it('does not navigate to the account when a close channel fired', () => {
    mockCloseServices.mockReturnValue(true);
    // The legacy flags deny a close path, so the old flag-based implementation would navigate.
    mockUseAppHandlingContext.mockReturnValue({
      closeServices: mockCloseServices,
      isEmbedded: false,
      canClose: false,
    });
    renderCompletion();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.queryByTestId('completion-icon')).not.toBeInTheDocument();
  });
});
