import createWebComponent from '@r2wc/react-to-web-component';
import { act } from '@testing-library/react';
import { preserveStringAttribute } from '../util/web-component';

interface TestProps {
  personalIban?: string;
}

function TestComponent({ personalIban }: TestProps): JSX.Element {
  return <span>{personalIban === undefined ? 'absent' : JSON.stringify(personalIban)}</span>;
}

describe('Web Component string selector handling', () => {
  it('renders nonempty, empty, and removed attribute values', async () => {
    const BaseElement = createWebComponent(TestComponent, { props: { personalIban: 'string' } });
    const TestElement = preserveStringAttribute(BaseElement, 'personal-iban', 'personalIban');
    const elementName = 'personal-iban-selector-test';
    customElements.define(elementName, TestElement);

    const element = document.createElement(elementName) as HTMLElement & TestProps;
    await act(async () => document.body.append(element));

    expect(element.textContent).toBe('absent');

    await act(async () => element.setAttribute('personal-iban', 'frick'));
    expect(element.textContent).toBe('"frick"');

    await act(async () => element.setAttribute('personal-iban', ''));
    expect(element.textContent).toBe('""');

    await act(async () => element.removeAttribute('personal-iban'));
    expect(element.textContent).toBe('absent');
  });
});
