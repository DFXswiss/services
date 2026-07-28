const mockInvoiceFor = jest.fn();

jest.mock('@dfx.swiss/react', () => ({
  useBuy: () => ({ invoiceFor: mockInvoiceFor }),
  useUserContext: () => ({ user: { kyc: { dataComplete: true } } }),
}));

jest.mock('@dfx.swiss/react-components', () => ({
  SpinnerSize: { MD: 'md' },
  SpinnerVariant: { LIGHT_MODE: 'light' },
  StyledLoadingSpinner: () => <span>Loading</span>,
  StyledButton: () => null,
  StyledButtonColor: { GRAY_OUTLINE: 'gray-outline' },
}));

jest.mock('../contexts/settings.context', () => ({
  useSettingsContext: () => ({
    translate: (_namespace: string, text: string) => text,
  }),
}));

jest.mock('../hooks/navigation.hook', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../util/utils', () => ({
  openPdfFromString: jest.fn(),
}));

jest.mock('../components/payment/qr-code', () => ({
  QrBasic: () => <div>QR code</div>,
}));

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentQrCode } from '../components/payment/payment-qr-code';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PaymentQrCode invoice errors', () => {
  it('shows the stored-payment-detail message when invoice generation rejects with a known token', async () => {
    mockInvoiceFor.mockRejectedValue({ message: 'StoredPersonalIbanIsNoLongerActive' });

    render(<PaymentQrCode value="<svg>QR bill</svg>" txId={42} />);

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'PDF Invoice' }));
    });

    await waitFor(() => {
      expect(screen.getByText('This personal IBAN is no longer active. Please start a new purchase.')).toBeVisible();
    });
    expect(screen.queryByText('StoredPersonalIbanIsNoLongerActive')).not.toBeInTheDocument();
  });

  it('shows the API message unchanged when the token is not mapped', async () => {
    mockInvoiceFor.mockRejectedValue({ message: 'Invoice service is unavailable' });

    render(<PaymentQrCode value="<svg>QR bill</svg>" txId={42} />);

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'PDF Invoice' }));
    });

    await waitFor(() => {
      expect(screen.getByText('Invoice service is unavailable')).toBeVisible();
    });
    expect(screen.queryByText('Unknown error')).not.toBeInTheDocument();
  });
});
