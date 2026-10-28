/**
 * Tracks whether the user is navigating with the keyboard, so components can
 * move focus for keyboard users without surprising mouse users.
 *
 * Clicks with `detail` 0 count as keyboard input. Browsers send those when
 * Enter or Space activates a button, and some assistive technology sends them
 * without a `keydown`.
 */
let keyboard = false;

if (typeof window !== "undefined") {
  const options = { capture: true, passive: true };
  window.addEventListener("keydown", () => (keyboard = true), options);
  window.addEventListener("pointerdown", () => (keyboard = false), options);
  window.addEventListener("click", (ev) => ev.detail === 0 && (keyboard = true), options);
}

/** Whether the latest input came from the keyboard rather than a pointer. */
export function usingKeyboard() {
  return keyboard;
}
