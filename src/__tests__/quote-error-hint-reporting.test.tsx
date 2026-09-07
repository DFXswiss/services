import React from 'react';

let mockIsComplete = false;
let mockUser: { accountId?: number; kyc?: { level: number } } | undefined = { kyc: { level: 0 } };
let mockLimit: string | undefined = '100,000 CHF';
const mockStartStep = jest.fn();
const mockNavigate = jest.fn();
const mockStart = jest.fn();
const mockReportClientError = jest.fn();

jest.mock('@dfx.swiss/react', () => ({
  KycStepName: {
    RECOMMENDATION: 'Recommendation',
    CONTACT_DATA: 'ContactData',
    IDENT: 'Ident',
  },
  KycStepType: {
    SUMSUB_VIDEO: 'SumsubVideo',
  },
  TransactionError: {
    TRADING_NOT_ALLOWED: 'TradingNotAllowed',
    KYC_REQUIRED: 'KycRequired',
    RECOMMENDATION_REQUIRED: 'RecommendationRequired',
    EMAIL_REQUIRED: 'EmailRequired',
    KYC_DATA_REQUIRED: 'KycDataRequired',
    KYC_REQUIRED_INSTANT: 'KycRequiredInstant',
    LIMIT_EXCEEDED: 'LimitExceeded',
    BANK_TRANSACTION_MISSING: 'BankTransactionMissing',
    BANK_TRANSACTION_OR_VIDEO_MISSING: 'BankTransactionOrVideoMissing',
    VIDEO_IDENT_REQUIRED: 'VideoIdentRequired',
    NATIONALITY_NOT_ALLOWED: 'NationalityNotAllowed',
    IBAN_CURRENCY_MISMATCH: 'IbanCurrencyMismatch',
    PAYMENT_METHOD_NOT_ALLOWED: 'PaymentMethodNotAllowed',
  },
  TransactionType: {
    BUY: 'Buy',
    SELL: 'Sell',
    SWAP: 'Swap',
  },
  useUserContext: () => ({
    user: mockUser,
  }),
}));

jest.mock('@dfx.swiss/react-components', () => ({
  StyledButton: ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button onClick={onClick} data-testid="styled-button">
      {label}
    </button>
  ),
  StyledButtonWidth: {
    FULL: 'full',
  },
  StyledInfoText: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="styled-info-text">{children}</div>
  ),
  StyledLink: ({ label, onClick }: { label: string; onClick: () => void }) => (
    <a onClick={onClick} data-testid="styled-link">
      {label}
    </a>
  ),
  StyledVerticalStack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../contexts/settings.context', () => ({
  useSettingsContext: () => ({
    translate: (_scope: string, key: string, params?: Record<string, string>) => {
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

jest.mock('../hooks/kyc-helper.hook', () => ({
  useKycHelper: () => ({
    start: mockStart,
    startStep: mockStartStep,
    limit: mockLimit,
    defaultLimit: '1,000 CHF',
    limitToString: (limit: string) => limit,
    isComplete: mockIsComplete,
  }),
}));

jest.mock('../hooks/navigation.hook', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('src/util/client-error', () => ({
  ...jest.requireActual('src/util/client-error'),
  reportClientError: (...args: unknown[]) => mockReportClientError(...args),
}));

jest.mock('src/dto/safe.dto', () => ({}));

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { KycStepName, KycStepType, TransactionError, TransactionType } from '@dfx.swiss/react';
import { QuoteErrorHint } from '../components/quote-error-hint';

function renderHint(ui: JSX.Element) {
  return render(<MemoryRouter initialEntries={['/buy']}>{ui}</MemoryRouter>);
}

async function expectReported(message: string) {
  await waitFor(() => expect(mockReportClientError).toHaveBeenCalledTimes(1));
  expect(mockReportClientError.mock.calls[0][0]).toMatchObject({ message, name: 'QuoteError' });
  expect(mockReportClientError.mock.calls[0][1]).toBe('/buy');
}

async function expectNotReported() {
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(mockReportClientError).not.toHaveBeenCalled();
}

describe('QuoteErrorHint reporting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsComplete = false;
    mockUser = { kyc: { level: 0 } };
    mockLimit = '100,000 CHF';
    Object.defineProperty(window, 'location', {
      value: { ...window.location, pathname: '/host-page' },
      writable: true,
    });
  });

  it('reports LIMIT_EXCEEDED with needs-verified copy when KYC is incomplete', async () => {
    renderHint(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.LIMIT_EXCEEDED} />);

    await expectReported(
      'Your account needs to get verified once your transaction volume exceeds 100,000 CHF. If you want to increase your trading limit, please complete our KYC (Know-Your-Customer) process.',
    );
    expect(mockReportClientError.mock.calls[0][1]).not.toBe('/host-page');
  });

  it('reports LIMIT_EXCEEDED with trading-limit copy when KYC is complete', async () => {
    mockIsComplete = true;
    renderHint(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.LIMIT_EXCEEDED} />);

    await expectReported(
      'This transaction exceeds your trading limit of 100,000 CHF. If you would like to increase your limit, please submit a request using the button below.',
    );
  });

  it('reports LIMIT_EXCEEDED with empty limit when KYC is incomplete and limit is undefined', async () => {
    mockLimit = undefined;
    renderHint(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.LIMIT_EXCEEDED} />);

    await expectReported(
      'Your account needs to get verified once your transaction volume exceeds . If you want to increase your trading limit, please complete our KYC (Know-Your-Customer) process.',
    );
  });

  it('reports LIMIT_EXCEEDED with empty limit when KYC is complete and limit is undefined', async () => {
    mockLimit = undefined;
    mockIsComplete = true;
    renderHint(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.LIMIT_EXCEEDED} />);

    await expectReported(
      'This transaction exceeds your trading limit of . If you would like to increase your limit, please submit a request using the button below.',
    );
  });

  it('reports TRADING_NOT_ALLOWED with verified-account copy', async () => {
    renderHint(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.TRADING_NOT_ALLOWED} />);

    await expectReported(
      'This transaction is only possible with a verified account. Please complete our KYC (Know-Your-Customer) process.',
    );
  });

  it('reports KYC_REQUIRED with verified-account copy', async () => {
    renderHint(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.KYC_REQUIRED} />);

    await expectReported(
      'This transaction is only possible with a verified account. Please complete our KYC (Know-Your-Customer) process.',
    );
  });

  it('reports RECOMMENDATION_REQUIRED', async () => {
    renderHint(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.RECOMMENDATION_REQUIRED} />);

    await expectReported('To trade, you need a recommendation from an existing DFX customer.');
  });

  it('reports EMAIL_REQUIRED', async () => {
    renderHint(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.EMAIL_REQUIRED} />);

    await expectReported('To trade, please enter your email address.');
  });

  it('reports KYC_DATA_REQUIRED as the error string and omits StyledInfoText', async () => {
    renderHint(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.KYC_DATA_REQUIRED} />);

    expect(screen.queryByTestId('styled-info-text')).not.toBeInTheDocument();
    await expectReported('KycDataRequired');
  });

  it('reports KYC_REQUIRED_INSTANT', async () => {
    renderHint(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.KYC_REQUIRED_INSTANT} />);

    await expectReported(
      'Instant bank transactions are only possible with a verified account. If you would like to use SEPA Instant, please complete our KYC (Know-Your-Customer) process.',
    );
  });

  it('reports BANK_TRANSACTION_MISSING without an action button', async () => {
    renderHint(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.BANK_TRANSACTION_MISSING} />);

    expect(screen.queryByTestId('styled-button')).not.toBeInTheDocument();
    await expectReported('A buy bank transaction is required.');
  });

  it('reports BANK_TRANSACTION_OR_VIDEO_MISSING for BUY with credit-card volume copy', async () => {
    renderHint(
      <QuoteErrorHint type={TransactionType.BUY} error={TransactionError.BANK_TRANSACTION_OR_VIDEO_MISSING} />,
    );

    await expectReported(
      'A buy bank transaction or identification by video is required once your credit card transaction volume exceeds 1,000 CHF.',
    );
  });

  it('reports BANK_TRANSACTION_OR_VIDEO_MISSING for SELL with sell volume copy', async () => {
    renderHint(
      <QuoteErrorHint type={TransactionType.SELL} error={TransactionError.BANK_TRANSACTION_OR_VIDEO_MISSING} />,
    );

    await expectReported(
      'A buy bank transaction or identification by video is required once your sell transaction volume exceeds 1,000 CHF.',
    );
  });

  it('reports BANK_TRANSACTION_OR_VIDEO_MISSING for SWAP with swap volume copy', async () => {
    renderHint(
      <QuoteErrorHint type={TransactionType.SWAP} error={TransactionError.BANK_TRANSACTION_OR_VIDEO_MISSING} />,
    );

    await expectReported(
      'A buy bank transaction or identification by video is required once your swap transaction volume exceeds 1,000 CHF.',
    );
  });

  it('reports VIDEO_IDENT_REQUIRED', async () => {
    renderHint(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.VIDEO_IDENT_REQUIRED} />);

    await expectReported('Identification by video is required once your transaction volume exceeds 1,000 CHF.');
  });

  it('reports NATIONALITY_NOT_ALLOWED without an action button', async () => {
    renderHint(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.NATIONALITY_NOT_ALLOWED} />);

    expect(screen.queryByTestId('styled-button')).not.toBeInTheDocument();
    await expectReported(
      'We are unable to process this transaction due to restrictions based on your nationality.',
    );
  });

  it('reports IBAN_CURRENCY_MISMATCH without an action button', async () => {
    renderHint(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.IBAN_CURRENCY_MISMATCH} />);

    expect(screen.queryByTestId('styled-button')).not.toBeInTheDocument();
    await expectReported('This IBAN cannot be used with this currency.');
  });

  it('reports PAYMENT_METHOD_NOT_ALLOWED without an action button', async () => {
    renderHint(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.PAYMENT_METHOD_NOT_ALLOWED} />);

    expect(screen.queryByTestId('styled-button')).not.toBeInTheDocument();
    await expectReported('This payment method is not allowed for your account.');
  });

  it('does not report an unhandled TransactionError and renders an empty fragment', async () => {
    const { container } = renderHint(
      <QuoteErrorHint type={TransactionType.BUY} error={'AmountTooLow' as TransactionError} />,
    );

    expect(container).toBeEmptyDOMElement();
    await expectNotReported();
  });

  it('reports a message override and keeps standard actions for that error', async () => {
    renderHint(
      <QuoteErrorHint
        type={TransactionType.BUY}
        error={TransactionError.EMAIL_REQUIRED}
        message="custom blocker"
      />,
    );

    expect(screen.getByTestId('styled-info-text').textContent).toBe('custom blocker');
    expect(screen.getByTestId('styled-button').textContent).toBe('Enter email');
    await expectReported('custom blocker');
  });

  it('starts video identification for BANK_TRANSACTION_OR_VIDEO_MISSING', async () => {
    renderHint(
      <QuoteErrorHint type={TransactionType.BUY} error={TransactionError.BANK_TRANSACTION_OR_VIDEO_MISSING} />,
    );

    fireEvent.click(screen.getByTestId('styled-button'));
    expect(mockStartStep).toHaveBeenCalledWith(KycStepName.IDENT, KycStepType.SUMSUB_VIDEO);
    await expectReported(
      'A buy bank transaction or identification by video is required once your credit card transaction volume exceeds 1,000 CHF.',
    );
  });

  it('starts video identification for VIDEO_IDENT_REQUIRED', async () => {
    renderHint(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.VIDEO_IDENT_REQUIRED} />);

    fireEvent.click(screen.getByTestId('styled-button'));
    expect(mockStartStep).toHaveBeenCalledWith(KycStepName.IDENT, KycStepType.SUMSUB_VIDEO);
  });

  it('starts the recommendation step for RECOMMENDATION_REQUIRED', async () => {
    renderHint(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.RECOMMENDATION_REQUIRED} />);

    fireEvent.click(screen.getByTestId('styled-button'));
    expect(mockStartStep).toHaveBeenCalledWith(KycStepName.RECOMMENDATION);
  });

  it('starts the contact-data step for EMAIL_REQUIRED', async () => {
    renderHint(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.EMAIL_REQUIRED} />);

    fireEvent.click(screen.getByTestId('styled-button'));
    expect(mockStartStep).toHaveBeenCalledWith(KycStepName.CONTACT_DATA);
  });

  it('navigates to profile for KYC_DATA_REQUIRED', async () => {
    renderHint(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.KYC_DATA_REQUIRED} />);

    fireEvent.click(screen.getByTestId('styled-button'));
    expect(mockNavigate).toHaveBeenCalledWith('/profile', { setRedirect: true });
  });

  it('starts KYC when incomplete on the default path', async () => {
    renderHint(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.KYC_REQUIRED} />);

    expect(screen.getByTestId('styled-button').textContent).toBe('Complete KYC');
    fireEvent.click(screen.getByTestId('styled-button'));
    expect(mockStart).toHaveBeenCalled();
  });

  it('navigates to the limit-request issue when complete on LIMIT_EXCEEDED', async () => {
    mockIsComplete = true;
    renderHint(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.LIMIT_EXCEEDED} />);

    expect(screen.getByTestId('styled-button').textContent).toBe('Increase limit');
    fireEvent.click(screen.getByTestId('styled-button'));
    expect(mockNavigate).toHaveBeenCalledWith({
      pathname: '/support/issue',
      search: '?issue-type=LimitRequest',
    });
  });

  it('shows the already-verified link when kyc.level is 0 and navigates to /link', async () => {
    mockUser = { kyc: { level: 0 } };
    renderHint(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.KYC_REQUIRED} />);

    const link = screen.getByTestId('styled-link');
    expect(link.textContent).toBe('I am already verified with DFX');
    fireEvent.click(link);
    expect(mockNavigate).toHaveBeenCalledWith('/link', { setRedirect: true });
  });

  it('hides the already-verified link when kyc.level is not 0', async () => {
    mockUser = { kyc: { level: 1 } };
    renderHint(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.KYC_REQUIRED} />);

    expect(screen.queryByTestId('styled-link')).not.toBeInTheDocument();
    await expectReported(
      'This transaction is only possible with a verified account. Please complete our KYC (Know-Your-Customer) process.',
    );
  });

  it('hides the already-verified link when user is undefined', async () => {
    mockUser = undefined;
    renderHint(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.KYC_REQUIRED} />);

    expect(screen.queryByTestId('styled-link')).not.toBeInTheDocument();
    await expectReported(
      'This transaction is only possible with a verified account. Please complete our KYC (Know-Your-Customer) process.',
    );
  });
});
