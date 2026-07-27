const mockUseAuthContext = jest.fn();
let mockAppHandlingValue: {
  isWidget: boolean;
  widgetPersonalIban?: string;
  widgetPersonalIbanOccurrence?: number;
};

jest.mock('@dfx.swiss/react', () => ({
  PersonalIbanProvider: { FRICK: 'Frick' },
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock('../contexts/app-handling.context', () => ({
  useAppHandlingContext: () => mockAppHandlingValue,
}));

jest.mock('../App', () => {
  const { MemoryRouter } = jest.requireActual('react-router-dom');
  const {
    PersonalIbanConfirmationContextProvider,
  } = jest.requireActual('../contexts/personal-iban-confirmation.context');
  const {
    usePersonalIbanConfirmation,
  } = jest.requireActual('../hooks/personal-iban.hook');

  function ConfirmationProbe() {
    const confirmation = usePersonalIbanConfirmation();
    return (
      <>
        <div data-testid="occurrence">
          {String(mockAppHandlingValue.widgetPersonalIbanOccurrence)}
        </div>
        <div data-testid="requested">
          {confirmation.requestedPersonalIban ?? 'absent'}
        </div>
        <div data-testid="decision">
          {confirmation.requiresCustomerConfirmation
            ? 'required'
            : 'not-required'}
        </div>
        <button
          type="button"
          onClick={confirmation.declineForCurrentCustomer}
        >
          decline
        </button>
      </>
    );
  }

  return {
    __esModule: true,
    default: ({
      params,
      personalIbanOccurrence,
    }: {
      params: { personalIban?: string };
      personalIbanOccurrence?: number;
    }) => {
      mockAppHandlingValue = {
        isWidget: true,
        widgetPersonalIban: params.personalIban,
        widgetPersonalIbanOccurrence: personalIbanOccurrence,
      };
      return (
        <PersonalIbanConfirmationContextProvider>
          <MemoryRouter>
            <ConfirmationProbe />
          </MemoryRouter>
        </PersonalIbanConfirmationContextProvider>
      );
    },
  };
});

import { act, render, screen } from '@testing-library/react';
import MainLib from '../Main.lib';

describe('MainLib personal-IBAN selector occurrences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthContext.mockReturnValue({ session: { account: 301 } });
  });

  it('decline, remove, and re-add creates a fresh React occurrence that asks again', async () => {
    const { rerender } = render(<MainLib personalIban="frick" />);

    expect(screen.getByTestId('occurrence')).toHaveTextContent('1');
    expect(screen.getByTestId('decision')).toHaveTextContent('required');

    await act(async () =>
      screen.getByRole('button', { name: 'decline' }).click(),
    );
    expect(screen.getByTestId('decision')).toHaveTextContent('not-required');

    rerender(<MainLib />);
    expect(screen.getByTestId('occurrence')).toHaveTextContent('2');
    expect(screen.getByTestId('requested')).toHaveTextContent('absent');

    rerender(<MainLib personalIban="frick" />);
    expect(screen.getByTestId('occurrence')).toHaveTextContent('3');
    expect(screen.getByTestId('decision')).toHaveTextContent('required');
  });
});
