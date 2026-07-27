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

import createWebComponent from '@r2wc/react-to-web-component';
import { act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PersonalIbanConfirmationContextProvider } from '../contexts/personal-iban-confirmation.context';
import { usePersonalIbanConfirmation } from '../hooks/personal-iban.hook';
import { preserveStringAttribute } from '../util/web-component';

interface TestProps {
  personalIban?: string;
  __personalIbanOccurrence?: number;
}

function TestComponent({
  personalIban,
  __personalIbanOccurrence,
}: TestProps): JSX.Element {
  return (
    <span data-occurrence={__personalIbanOccurrence}>
      {personalIban === undefined ? 'absent' : JSON.stringify(personalIban)}
    </span>
  );
}

function defineTestElement(name: string): CustomElementConstructor {
  const BaseElement = createWebComponent(TestComponent, {
    props: { personalIban: 'string' },
  });
  const TestElement = preserveStringAttribute(
    BaseElement,
    'personal-iban',
    'personalIban',
  );
  customElements.define(name, TestElement);
  return TestElement;
}

function ConfirmationProbe(): JSX.Element {
  const confirmation = usePersonalIbanConfirmation();
  return (
    <>
      <span data-testid="decision">
        {confirmation.requiresCustomerConfirmation
          ? 'required'
          : 'not-required'}
      </span>
      <button
        type="button"
        onClick={confirmation.declineForCurrentCustomer}
      >
        decline
      </button>
    </>
  );
}

function ConfirmationComponent({
  personalIban,
  __personalIbanOccurrence,
}: TestProps): JSX.Element {
  mockAppHandlingValue = {
    isWidget: true,
    widgetPersonalIban: personalIban,
    widgetPersonalIbanOccurrence: __personalIbanOccurrence,
  };
  return (
    <PersonalIbanConfirmationContextProvider>
      <MemoryRouter>
        <ConfirmationProbe />
      </MemoryRouter>
    </PersonalIbanConfirmationContextProvider>
  );
}

function defineConfirmationTestElement(name: string): void {
  const BaseElement = createWebComponent(ConfirmationComponent, {
    props: { personalIban: 'string' },
  });
  customElements.define(
    name,
    preserveStringAttribute(
      BaseElement,
      'personal-iban',
      'personalIban',
    ),
  );
}

describe('Web Component string selector handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthContext.mockReturnValue({ session: { account: 401 } });
  });

  it('renders nonempty, empty, and removed attribute values on a connected element', async () => {
    defineTestElement('personal-iban-selector-attr-test');

    const element = document.createElement('personal-iban-selector-attr-test') as HTMLElement & TestProps;
    await act(async () => document.body.append(element));

    expect(element.textContent).toBe('absent');

    await act(async () => element.setAttribute('personal-iban', 'frick'));
    expect(element.textContent).toBe('"frick"');

    await act(async () => element.setAttribute('personal-iban', ''));
    expect(element.textContent).toBe('""');

    await act(async () => element.removeAttribute('personal-iban'));
    expect(element.textContent).toBe('absent');
  });

  it('renders nonempty, empty, and cleared property values on a connected element', async () => {
    defineTestElement('personal-iban-selector-prop-test');

    const element = document.createElement('personal-iban-selector-prop-test') as HTMLElement & TestProps;
    await act(async () => document.body.append(element));

    expect(element.textContent).toBe('absent');
    expect(element.personalIban).toBeUndefined();

    await act(async () => {
      element.personalIban = 'frick';
    });
    expect(element.textContent).toBe('"frick"');
    expect(element.personalIban).toBe('frick');
    expect(element.getAttribute('personal-iban')).toBe('frick');

    // Empty string stays "set but invalid" — must not collapse to absent.
    await act(async () => {
      element.personalIban = '';
    });
    expect(element.textContent).toBe('""');
    expect(element.personalIban).toBe('');
    expect(element.getAttribute('personal-iban')).toBe('');

    // Property clear (undefined) removes the selection.
    await act(async () => {
      element.personalIban = undefined;
    });
    expect(element.textContent).toBe('absent');
    expect(element.personalIban).toBeUndefined();
    expect(element.hasAttribute('personal-iban')).toBe(false);
  });

  it('keeps an empty property value after the element is already connected with a prior selection', async () => {
    defineTestElement('personal-iban-selector-prop-empty-after-set-test');

    const element = document.createElement(
      'personal-iban-selector-prop-empty-after-set-test',
    ) as HTMLElement & TestProps;
    await act(async () => document.body.append(element));
    await act(async () => {
      element.personalIban = 'frick';
    });
    expect(element.textContent).toBe('"frick"');

    await act(async () => {
      element.personalIban = '';
    });
    expect(element.textContent).toBe('""');
    expect(element.personalIban).toBe('');
  });

  it('renders an attribute that was already set before the element was connected (initial markup case)', async () => {
    defineTestElement('personal-iban-selector-preset-nonempty-test');
    const nonEmptyElement = document.createElement(
      'personal-iban-selector-preset-nonempty-test',
    ) as HTMLElement & TestProps;
    await act(async () => nonEmptyElement.setAttribute('personal-iban', 'frick'));
    await act(async () => document.body.append(nonEmptyElement));
    expect(nonEmptyElement.textContent).toBe('"frick"');

    defineTestElement('personal-iban-selector-preset-empty-test');
    const emptyElement = document.createElement(
      'personal-iban-selector-preset-empty-test',
    ) as HTMLElement & TestProps;
    await act(async () => emptyElement.setAttribute('personal-iban', ''));
    await act(async () => document.body.append(emptyElement));
    // Fail-closed: an explicit empty value set before connection must stay "set but invalid",
    // not silently collapse to absent.
    expect(emptyElement.textContent).toBe('""');
  });

  it('creates occurrences only when the attribute or property value changes', async () => {
    defineTestElement('personal-iban-selector-occurrence-test');
    const element = document.createElement(
      'personal-iban-selector-occurrence-test',
    ) as HTMLElement & TestProps;
    await act(async () => document.body.append(element));

    await act(async () => {
      element.personalIban = 'frick';
    });
    expect(element.querySelector('span')).toHaveAttribute('data-occurrence', '1');

    await act(async () => {
      element.personalIban = 'frick';
    });
    expect(element.querySelector('span')).toHaveAttribute('data-occurrence', '1');

    await act(async () => {
      element.setAttribute('personal-iban', 'frick');
    });
    expect(element.querySelector('span')).toHaveAttribute('data-occurrence', '1');

    await act(async () => {
      element.personalIban = '';
    });
    expect(element.querySelector('span')).toHaveAttribute('data-occurrence', '2');

    await act(async () => {
      element.removeAttribute('personal-iban');
    });
    expect(element.querySelector('span')).toHaveAttribute('data-occurrence', '3');
    expect('__personalIbanOccurrence' in element).toBe(false);
    expect(element.hasAttribute('__personal-iban-occurrence')).toBe(false);
  });

  it('keeps a same-value decline for one customer but asks a new customer', async () => {
    defineConfirmationTestElement(
      'personal-iban-selector-customer-change-test',
    );
    const element = document.createElement(
      'personal-iban-selector-customer-change-test',
    ) as HTMLElement & TestProps;
    await act(async () => document.body.append(element));

    await act(async () => {
      element.personalIban = 'frick';
    });
    expect(
      element.querySelector('[data-testid="decision"]'),
    ).toHaveTextContent('required');

    await act(async () => {
      element.querySelector('button')?.click();
    });
    expect(
      element.querySelector('[data-testid="decision"]'),
    ).toHaveTextContent('not-required');

    await act(async () => {
      element.personalIban = 'frick';
    });
    expect(
      element.querySelector('[data-testid="decision"]'),
    ).toHaveTextContent('not-required');

    mockUseAuthContext.mockReturnValue({ session: { account: 402 } });
    await act(async () => {
      element.personalIban = 'frick';
    });
    expect(
      element.querySelector('[data-testid="decision"]'),
    ).toHaveTextContent('required');
  });
});
