import { Command, IS_APPLE } from "../editing/commands";
import type { Shortcut } from "../editing/commands";

/** How a key code is written for people, such as ] for BracketRight */
const KEY_NAMES: Record<string, string> = {
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Slash: "/",
};

const keyName = (key: string) => KEY_NAMES[key] ?? key.toUpperCase();

/** How a shortcut is written in a tooltip, such as ⌘B or Ctrl+B */
export function shortcutText({ key, shift, alt }: Shortcut) {
  return IS_APPLE
    ? `${shift ? "⇧" : ""}${alt ? "⌥" : ""}⌘${keyName(key)}`
    : `Ctrl+${shift ? "Shift+" : ""}${alt ? "Alt+" : ""}${keyName(key)}`;
}

/** The shortcut for `aria-keyshortcuts`, such as Meta+B */
export function shortcutAria({ key, shift, alt }: Shortcut) {
  return `${IS_APPLE ? "Meta" : "Control"}+${shift ? "Shift+" : ""}${alt ? "Alt+" : ""}${keyName(key)}`;
}

export function ToolbarButton({
  command,
  pressed,
  color,
  disabled,
  onRun,
}: {
  command: Command;
  pressed: boolean;
  /** The current color of a color control. Null when it's unset or mixed. */
  color: string | null;
  disabled: boolean;
  onRun: () => void;
}) {
  const shortcut = command.shortcuts?.[0];
  const toggle = command.control === "toggle";
  return (
    <orb-button
      id={`action-${command.id}`}
      fill="outline"
      size="sm"
      class={{ pressed: toggle && pressed }}
      disabled={disabled}
      aria-label={command.label}
      aria-pressed={toggle ? String(pressed) : undefined}
      aria-keyshortcuts={shortcut && shortcutAria(shortcut)}
      onClick={onRun}
    >
      {command.icon?.()}
      {command.control === "color" && <span class="color-bar" style={{ "--color-bar": color || "transparent" } as any} />}
    </orb-button>
  );
}
