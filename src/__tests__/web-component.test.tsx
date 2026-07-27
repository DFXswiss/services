import createWebComponent from '@r2wc/react-to-web-component';
import { act } from '@testing-library/react';
import { preserveStringAttribute } from '../util/web-component';

interface TestProps {
  personalIban?: string;
  personalIbanRevision?: number;
}

function TestComponent({ personalIban, personalIbanRevision }: TestProps): JSX.Element {
  return (
    <span data-revision={personalIbanRevision}>
      {personalIban === undefined ? 'absent' : JSON.stringify(personalIban)}
    </span>
  );
}

function defineTestElement(name: string): CustomElementConstructor {
  const BaseElement = createWebComponent(TestComponent, {
    // The revision is deliberately not a registered Web Component prop. The string wrapper
    // writes it only into r2wc's internal props bag.
    props: { personalIban: 'string' },
  });
  const TestElement = preserveStringAttribute(
    BaseElement,
    'personal-iban',
    'personalIban',
    'personalIbanRevision',
  );
  customElements.define(name, TestElement);
  return TestElement;
}

describe('Web Component string selector handling', () => {
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
    expect('personalIbanRevision' in element).toBe(false);

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

  it('increments the selector revision when the same property value is deliberately reasserted', async () => {
    defineTestElement('personal-iban-selector-same-value-revision-test');

    const element = document.createElement(
      'personal-iban-selector-same-value-revision-test',
    ) as HTMLElement & TestProps;
    await act(async () => document.body.append(element));

    await act(async () => {
      element.personalIban = 'frick';
    });
    expect(element.querySelector('span')).toHaveAttribute('data-revision', '1');

    await act(async () => {
      element.personalIban = 'frick';
    });
    expect(element.querySelector('span')).toHaveAttribute('data-revision', '2');
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
});
