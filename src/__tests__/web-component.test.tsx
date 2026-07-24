import createWebComponent from '@r2wc/react-to-web-component';
import { preserveStringAttribute } from '../util/web-component';

interface TestProps {
  personalIban?: string;
}

function TestComponent(_: TestProps): null {
  return null;
}

describe('Web Component string selector handling', () => {
  it('preserves empty values and clears removed attributes', () => {
    const BaseElement = createWebComponent(TestComponent, { props: { personalIban: 'string' } });
    const TestElement = preserveStringAttribute(BaseElement, 'personal-iban', 'personalIban');
    const elementName = 'personal-iban-selector-test';
    customElements.define(elementName, TestElement);

    const element = document.createElement(elementName) as HTMLElement & TestProps;

    element.setAttribute('personal-iban', 'frick');
    expect(element.personalIban).toBe('frick');

    element.setAttribute('personal-iban', '');
    expect(element.personalIban).toBe('');

    element.removeAttribute('personal-iban');
    expect(element.personalIban).toBeUndefined();
  });
});
