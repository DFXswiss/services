type AttributeChangedCallback = (name: string, oldValue: string | null, newValue: string | null) => void;
const R2WC_RENDER = Symbol.for('r2wc.render');
const R2WC_PROPS = Symbol.for('r2wc.props');

type R2wcElement = HTMLElement & {
  [R2WC_PROPS]?: Record<string, string | undefined>;
  [R2WC_RENDER]?: () => void;
};

/**
 * Bridges a string attribute without dropping an explicit empty value.
 *
 * @r2wc/core ignores empty and removed string attributes in its callback. For
 * selectors, that would turn an explicit empty value into an absent value and
 * could leave a previous selection active after the attribute is removed.
 */
export function preserveStringAttribute(
  BaseElement: CustomElementConstructor,
  attributeName: string,
  propertyName: string,
): CustomElementConstructor {
  const baseAttributeChanged = BaseElement.prototype.attributeChangedCallback as
    | AttributeChangedCallback
    | undefined;

  return class extends BaseElement {
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
      if (name === attributeName) {
        const element = this as R2wcElement;
        const props = element[R2WC_PROPS];
        if (props) props[propertyName] = newValue ?? undefined;
        element[R2WC_RENDER]?.();
        return;
      }

      baseAttributeChanged?.call(this, name, oldValue, newValue);
    }
  };
}
