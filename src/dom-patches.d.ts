interface ElementInternals {
  ariaLabelledByElements: readonly Element[];
}

interface HTMLElement {
  ariaLabelledByElements: readonly Element[];
  ariaDescribedByElements: readonly Element[];
}
