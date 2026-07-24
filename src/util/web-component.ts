type AttributeChangedCallback = (name: string, oldValue: string | null, newValue: string | null) => void;

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
        (this as unknown as Record<string, string | undefined>)[propertyName] = newValue ?? undefined;
        return;
      }

      baseAttributeChanged?.call(this, name, oldValue, newValue);
    }
  };
}
