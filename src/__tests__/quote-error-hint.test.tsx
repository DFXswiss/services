import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock startStep function
const mockStartStep = jest.fn();
const mockNavigate = jest.fn();
const mockStart = jest.fn();

// Mock @dfx.swiss/react
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
    user: { kyc: { level: 0 } },
  }),
}));

// Mock @dfx.swiss/react-components
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

// Mock settings context
jest.mock('../contexts/settings.context', () => ({
  useSettingsContext: () => ({
    translate: (scope: string, key: string, params?: Record<string, string>) => {
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

// Mock kyc-helper hook
jest.mock('../hooks/kyc-helper.hook', () => ({
  useKycHelper: () => ({
    start: mockStart,
    startStep: mockStartStep,
    limit: '100,000 CHF',
    defaultLimit: '1,000 CHF',
    limitToString: (limit: string) => limit,
    isComplete: false,
  }),
}));

// Mock navigation hook
jest.mock('../hooks/navigation.hook', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

import { QuoteErrorHint } from '../components/quote-error-hint';
import { TransactionError, TransactionType, KycStepName } from '@dfx.swiss/react';

describe('QuoteErrorHint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RECOMMENDATION_REQUIRED error', () => {
    it('should display correct hint text', () => {
      render(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.RECOMMENDATION_REQUIRED} />);

      const infoText = screen.getByTestId('styled-info-text');
      expect(infoText.textContent).toBe('To trade, you need a recommendation from an existing DFX customer.');
    });

    it('should display "Enter recommendation" button', () => {
      render(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.RECOMMENDATION_REQUIRED} />);

      const button = screen.getByTestId('styled-button');
      expect(button.textContent).toBe('Enter recommendation');
    });

    it('should call startStep with RECOMMENDATION on button click', () => {
      render(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.RECOMMENDATION_REQUIRED} />);

      const button = screen.getByTestId('styled-button');
      fireEvent.click(button);

      expect(mockStartStep).toHaveBeenCalledWith(KycStepName.RECOMMENDATION);
    });
  });

  describe('EMAIL_REQUIRED error', () => {
    it('should display correct hint text', () => {
      render(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.EMAIL_REQUIRED} />);

      const infoText = screen.getByTestId('styled-info-text');
      expect(infoText.textContent).toBe('To trade, please enter your email address.');
    });

    it('should display "Enter email" button', () => {
      render(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.EMAIL_REQUIRED} />);

      const button = screen.getByTestId('styled-button');
      expect(button.textContent).toBe('Enter email');
    });

    it('should call startStep with CONTACT_DATA on button click', () => {
      render(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.EMAIL_REQUIRED} />);

      const button = screen.getByTestId('styled-button');
      fireEvent.click(button);

      expect(mockStartStep).toHaveBeenCalledWith(KycStepName.CONTACT_DATA);
    });
  });

  describe('TRADING_NOT_ALLOWED error', () => {
    it('should display KYC-related hint text', () => {
      render(<QuoteErrorHint type={TransactionType.BUY} error={TransactionError.TRADING_NOT_ALLOWED} />);

      const infoText = screen.getByTestId('styled-info-text');
      expect(infoText.textContent).toContain('verified account');
    });
  });

  describe('different transaction types', () => {
    it('should work for SELL transactions', () => {
      render(<QuoteErrorHint type={TransactionType.SELL} error={TransactionError.RECOMMENDATION_REQUIRED} />);

      const infoText = screen.getByTestId('styled-info-text');
      expect(infoText.textContent).toBe('To trade, you need a recommendation from an existing DFX customer.');
    });

    it('should work for SWAP transactions', () => {
      render(<QuoteErrorHint type={TransactionType.SWAP} error={TransactionError.EMAIL_REQUIRED} />);

      const infoText = screen.getByTestId('styled-info-text');
      expect(infoText.textContent).toBe('To trade, please enter your email address.');
    });
  });
});
