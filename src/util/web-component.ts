type AttributeChangedCallback = (name: string, oldValue: string | null, newValue: string | null) => void;
const R2WC_RENDER = Symbol.for('r2wc.render');
const R2WC_PROPS = Symbol.for('r2wc.props');
const PERSONAL_IBAN_OCCURRENCE_PROP = '__personalIbanOccurrence';

type R2wcElement = HTMLElement & {
  [R2WC_PROPS]?: Record<string, unknown>;
  [R2WC_RENDER]?: () => void;
};

/**
 * Applies a string selector value to the r2wc props bag and re-renders.
 * Empty string stays "set but empty" (fail-closed); null/undefined means absent.
 */
function applyStringProp(
  element: R2wcElement,
  propertyName: string,
  value: string | null | undefined,
  createsOccurrence: boolean,
): void {
  const props = element[R2WC_PROPS];
  if (props) {
    props[propertyName] = value ?? undefined;
    if (propertyName === 'personalIban' && createsOccurrence) {
      const occurrence = props[PERSONAL_IBAN_OCCURRENCE_PROP];
      props[PERSONAL_IBAN_OCCURRENCE_PROP] =
        typeof occurrence === 'number' ? occurrence + 1 : 1;
    }
  }
  element[R2WC_RENDER]?.();
}

/**
 * Bridges a string attribute and its matching JS property without dropping an
 * explicit empty value.
 *
 * @r2wc/core (see node_modules/@r2wc/core/src/core.ts):
 * - attributeChangedCallback only updates props when the new value is truthy
 *   (`if (transform?.parse && value)`), so empty string and removal are ignored.
 * - Property accessors are defined on the class prototype via
 *   `Object.defineProperty(ReactWebComponent.prototype, prop, { get, set })`.
 *   The setter writes props then, for string types, calls `setAttribute` with
 *   `transform.stringify(value)` and relies on attributeChangedCallback to
 *   re-render — so an empty property assignment never re-renders under the
 *   default callback either.
 *
 * This wrapper overrides both paths so empty stays "set but invalid" and
 * removal clears the prop to undefined.
 */
export function preserveStringAttribute(
  BaseElement: CustomElementConstructor,
  attributeName: string,
  propertyName: string,
): CustomElementConstructor {
  const baseAttributeChanged = BaseElement.prototype.attributeChangedCallback as
    | AttributeChangedCallback
    | undefined;

  class PreservedAttributeElement extends BaseElement {
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
      if (name === attributeName) {
        applyStringProp(
          this as R2wcElement,
          propertyName,
          newValue,
          oldValue !== newValue,
        );
        return;
      }

      baseAttributeChanged?.call(this, name, oldValue, newValue);
    }
  }

  // Override the r2wc-generated property accessor (core.ts defines it on the
  // base prototype with configurable: true). Direct `element.personalIban = …`
  // must not bypass the fail-closed empty-string handling above.
  Object.defineProperty(PreservedAttributeElement.prototype, propertyName, {
    enumerable: true,
    configurable: true,
    get(this: R2wcElement) {
      return this[R2WC_PROPS]?.[propertyName];
    },
    set(this: R2wcElement, value: unknown) {
      if (value === null || value === undefined) {
        if (this.hasAttribute(attributeName)) {
          // removeAttribute → attributeChangedCallback(null) → applyStringProp(undefined)
          this.removeAttribute(attributeName);
        } else {
          applyStringProp(this, propertyName, undefined, false);
        }
        return;
      }

      const stringValue = String(value);
      // setAttribute is a no-op for attributeChangedCallback when the value is
      // unchanged — still push into props and re-render so property-only writes
      // with the same string stay consistent, without creating a new selector
      // occurrence.
      if (this.getAttribute(attributeName) === stringValue) {
        applyStringProp(this, propertyName, stringValue, false);
        return;
      }

      this.setAttribute(attributeName, stringValue);
    },
  });

  return PreservedAttributeElement;
}
