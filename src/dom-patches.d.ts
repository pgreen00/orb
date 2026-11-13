interface ElementInternals {
  ariaLabelledByElements: readonly Element[];
  ariaDescribedByElements: readonly Element[];
  ariaControlsElements: readonly Element[];
}

interface HTMLElement {
  ariaLabelledByElements: readonly Element[];
  ariaDescribedByElements: readonly Element[];
  ariaControlsElements: readonly Element[];
}

interface Element {
  ariaLabelledByElements: readonly Element[];
  ariaDescribedByElements: readonly Element[];
  ariaControlsElements: readonly Element[];
}

interface Selection {
  getComposedRanges(options?: { shadowRoots?: ShadowRoot[] }): StaticRange[];
}
