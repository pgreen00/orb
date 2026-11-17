/**
 * Browsers word their built-in messages in the user's language, so the
 * messages come from a probe input rather than from strings here.
 */
export function browserMessage(configure: (input: HTMLInputElement) => void): string {
  const probe = document.createElement("input");
  configure(probe);
  return probe.validationMessage;
}

/**
 * Form-associated elements don't get these from the platform, but forms
 * and `orb-textbox` read them from the element. `extra` adds the rest.
 */
export function exposeFormProps(el: HTMLElement, internals: ElementInternals, extra: PropertyDescriptorMap = {}) {
  Object.defineProperties(el, {
    form: { configurable: true, get: () => internals.form },
    labels: { configurable: true, get: () => internals.labels },
    validity: { configurable: true, get: () => internals.validity },
    validationMessage: { configurable: true, get: () => internals.validationMessage },
    willValidate: { configurable: true, get: () => internals.willValidate },
    checkValidity: { configurable: true, value: () => internals.checkValidity() },
    reportValidity: { configurable: true, value: () => internals.reportValidity() },
    ...extra,
  });
}
