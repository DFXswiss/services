// Focused unit test for PaymentInformationContent Bank-row gating.
// Mounts the REAL component (not mocked) so info.isPersonalIban && info.bank is exercised.

const mockCopy = jest.fn();

jest.mock('@dfx.swiss/react', () => ({
  Utils: {
    formatIban: (iban: string) => iban,
  },
}));

jest.mock('@dfx.swiss/react-components', () => ({
  AlignContent: { RIGHT: 'right' },
  CopyButton: () => null,
  DfxIcon: () => null,
  IconColor: { BLUE: 'blue', RED: 'red' },
  IconVariant: { SEPA_INSTANT: 'sepa' },
  StyledDataTable: ({ children, label }: any) => (
    <div data-testid={label ? `table-${label}` : 'table'}>{children}</div>
  ),
  StyledDataTableRow: ({ label, children }: any) => (
    <div data-testid={`row-${label}`}>
      <span data-testid={`row-label-${label}`}>{label}</span>
      <span data-testid={`row-value-${label}`}>{children}</span>
    </div>
  ),
  StyledInfoText: ({ children }: any) => <div>{children}</div>,
  StyledTabContainer: ({ tabs }: any) => <div>{tabs?.[0]?.content}</div>,
  StyledVerticalStack: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('../contexts/settings.context', () => ({
  useSettingsContext: () => ({
    translate: (_ns: string, key: string, params?: Record<string, string>) => {
      if (params) {
        let result = key;
        for (const [k, v] of Object.entries(params)) {
          result = result.replace(`{{${k}}}`, v);
        }
        return result;
      }
      return key;
    },
  }),
}));

jest.mock('../hooks/clipboard.hook', () => ({
  useClipboard: () => ({ copy: mockCopy }),
}));

jest.mock('../components/payment/payment-qr-code', () => ({
  PaymentQrCode: () => null,
}));

import { render, screen } from '@testing-library/react';
import { PaymentInformationContent } from '../components/payment/payment-info-buy';

function baseInfo(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    amount: 100,
    currency: { name: 'EUR' },
    iban: 'LI21088110102979K002E',
    bic: 'BFRILI22',
    name: 'Test User',
    street: 'Main',
    number: '1',
    zip: '9490',
    city: 'Vaduz',
    country: 'LI',
    sepaInstant: false,
    remittanceInfo: 'DFX-BUY-1',
    ...overrides,
  } as any;
}

describe('PaymentInformationContent Bank row', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the Bank row with the bank name when isPersonalIban is true and bank is set', () => {
    render(
      <PaymentInformationContent
        info={baseInfo({ isPersonalIban: true, bank: 'Bank Frick' })}
      />,
    );

    expect(screen.getByTestId('row-Bank')).toBeInTheDocument();
    expect(screen.getByTestId('row-value-Bank')).toHaveTextContent('Bank Frick');
  });

  it('does not show the Bank row for a normal buy (isPersonalIban falsy)', () => {
    render(<PaymentInformationContent info={baseInfo({ isPersonalIban: false, bank: 'Bank Frick' })} />);

    expect(screen.queryByTestId('row-Bank')).not.toBeInTheDocument();
  });

  it('does not show the Bank row when bank is absent even if isPersonalIban is true', () => {
    render(<PaymentInformationContent info={baseInfo({ isPersonalIban: true, bank: undefined })} />);

    expect(screen.queryByTestId('row-Bank')).not.toBeInTheDocument();
  });
});
