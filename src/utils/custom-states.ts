/**
 * Lets a component set custom states on another component's element, such as
 * orb-grid on its orb-cells, without rendering it again. Each element shares
 * its `ElementInternals` here when it loads. States set before then are kept,
 * and added once it does.
 */
const internalsOf = new WeakMap<Element, ElementInternals>();
const wanted = new WeakMap<Element, Set<string>>();

/** Call from the element's component when it loads */
export function shareStates(el: Element, internals: ElementInternals) {
  internalsOf.set(el, internals);
  for (const name of wanted.get(el) ?? []) internals.states.add(name);
}

/** Adds or removes a state on another component's element */
export function setState(el: Element, name: string, on: boolean) {
  let names = wanted.get(el);
  if (!names) wanted.set(el, (names = new Set()));
  if (on) names.add(name);
  else names.delete(name);
  const states = internalsOf.get(el)?.states;
  if (states) toggleState(states, name, on);
}

/**
 * Adds or removes a state in a component's own state set. Adding a state
 * that's there, or removing one that isn't, does nothing. Doesn't check
 * `has()` first, since WebKit can report false for a state that's set.
 */
export function toggleState(states: CustomStateSet, name: string, on: boolean) {
  if (on) states.add(name);
  else states.delete(name);
}
