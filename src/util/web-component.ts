type AttributeChangedCallback = (name: string, oldValue: string | null, newValue: string | null) => void;

/**
 * Preserves an explicit empty string attribute for initial component props.
 *
 * @r2wc/core ignores empty string attributes in its callback. For selectors,
 * that would turn an explicit empty value into an absent value.
 */
export function preserveEmptyStringAttribute(
  BaseElement: CustomElementConstructor,
  attributeName: string,
  propertyName: string,
): CustomElementConstructor {
  const baseAttributeChanged = BaseElement.prototype.attributeChangedCallback as
    | AttributeChangedCallback
    | undefined;

  return class extends BaseElement {
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
      if (name === attributeName && newValue === '') {
        (this as unknown as Record<string, string>)[propertyName] = '';
        return;
      }

      baseAttributeChanged?.call(this, name, oldValue, newValue);
    }
  };
}
