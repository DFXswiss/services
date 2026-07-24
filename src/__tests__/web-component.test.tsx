import createWebComponent from '@r2wc/react-to-web-component';
import { act } from '@testing-library/react';
import { preserveEmptyStringAttribute } from '../util/web-component';

interface TestProps {
  personalIban?: string;
}

function TestComponent({ personalIban }: TestProps): JSX.Element {
  return <span>{personalIban === undefined ? 'absent' : JSON.stringify(personalIban)}</span>;
}

describe('Web Component string selector handling', () => {
  it('renders an explicit empty attribute on initial connection', async () => {
    const BaseElement = createWebComponent(TestComponent, { props: { personalIban: 'string' } });
    const TestElement = preserveEmptyStringAttribute(BaseElement, 'personal-iban', 'personalIban');
    const elementName = 'personal-iban-selector-test';
    customElements.define(elementName, TestElement);

    const element = document.createElement(elementName) as HTMLElement & TestProps;
    element.setAttribute('personal-iban', '');
    await act(async () => document.body.append(element));
    expect(element.textContent).toBe('""');
  });
});
