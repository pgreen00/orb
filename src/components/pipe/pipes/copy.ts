import type { Pipe } from "../../../utils/pipes.js";
import { parseArgs } from "../parse.js";

/**
 * Renders the input as text followed by a button that copies it to the
 * clipboard. The button swaps to a checkmark for two seconds after a
 * successful copy.
 *
 * A positional argument overrides the accessible label (default `Copy`)
 *
 * @example copy
 * @example copy 'Copy API key'
 * @example copy -bare
 */
const copy: Pipe = (input, ...args) => {
  const { positional } = parseArgs(args);
  const text = input == null ? "" : String(input);

  const fragment = new DocumentFragment();

  const button = document.createElement("orb-copy-button");
  button.setAttribute("value", text);
  if (positional[0]) button.setAttribute("label", positional[0]);
  button.textContent = text;

  fragment.append(button);

  return fragment;
};

export default copy;
