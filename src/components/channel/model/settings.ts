export interface Settings {
  showNames: boolean;
  avatars: boolean;
  groupWithin: string;
  dateDividers: boolean;
}

export type SettingName = keyof Settings;

export const SETTING_NAMES: SettingName[] = ["showNames", "avatars", "groupWithin", "dateDividers"];

/**
 * What each preset sets, and the kind it uses when `kind` isn't set. Empty
 * until the presets are added in Phase 5.
 */
export const PRESETS: Record<string, Partial<Settings> & { kind?: "direct" | "group" | "open" }> = {
  assistant: {},
  workspace: {},
  comments: {},
  live: {},
};

/** The defaults for each kind, used when neither the element nor the preset sets a setting */
export const BUILT_IN: Record<"direct" | "group" | "open", Settings> = {
  direct: { showNames: false, avatars: false, groupWithin: "5m", dateDividers: true },
  group: { showNames: true, avatars: true, groupWithin: "5m", dateDividers: true },
  open: { showNames: true, avatars: true, groupWithin: "5m", dateDividers: true },
};
