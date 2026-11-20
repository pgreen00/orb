export interface Settings {
  showNames: boolean;
  avatars: boolean;
  groupWithin: string;
  dateDividers: boolean;
  threads: "none" | "inline" | "panel";
  receipts: "none" | "delivered" | "read";
  presence: "none" | "sampled" | "full";
  layout: "bubbles" | "flat" | "assistant" | "compact";
  anchor: "bottom" | "top";
  follow: "bottom" | "question";
  pauseOnScroll: boolean;
  announce: boolean;
  votes: "none" | "up" | "up-down";
  /** The sort options, separated by spaces. Empty means there's no sort menu. */
  sorts: string;
  maxDepth: number;
  /** How updates are batched, such as "250ms". "0" draws each frame. */
  coalesce: string;
}

export type SettingName = keyof Settings;

export const SETTING_NAMES: SettingName[] = [
  "showNames",
  "avatars",
  "groupWithin",
  "dateDividers",
  "threads",
  "receipts",
  "presence",
  "layout",
  "anchor",
  "follow",
  "pauseOnScroll",
  "announce",
  "votes",
  "sorts",
  "maxDepth",
  "coalesce",
];

/**
 * What each preset sets, and the kind it uses when `kind` isn't set. An
 * attribute on the element wins over these, and these win over `BUILT_IN`.
 */
export const PRESETS: Record<"assistant" | "workspace" | "comments" | "live", Partial<Settings> & { kind?: "direct" | "group" | "open" }> = {
  assistant: {
    kind: "direct",
    layout: "assistant",
    showNames: false,
    avatars: false,
    groupWithin: "0",
    dateDividers: false,
    follow: "question",
  },
  workspace: {
    kind: "group",
    layout: "flat",
    showNames: true,
    avatars: true,
    threads: "panel",
    receipts: "delivered",
    presence: "sampled",
  },
  comments: {
    kind: "open",
    layout: "flat",
    anchor: "top",
    announce: false,
    threads: "inline",
    maxDepth: 3,
    votes: "up-down",
    sorts: "top new old",
    receipts: "none",
    presence: "none",
  },
  live: {
    kind: "open",
    layout: "compact",
    announce: false,
    coalesce: "250ms",
    pauseOnScroll: true,
    presence: "sampled",
    threads: "none",
    receipts: "none",
    groupWithin: "0",
  },
};

/** The defaults for each kind, used when neither the element nor the preset sets a setting */
export const BUILT_IN: Record<"direct" | "group" | "open", Settings> = {
  direct: {
    showNames: false,
    avatars: false,
    groupWithin: "5m",
    dateDividers: true,
    threads: "none",
    receipts: "read",
    presence: "none",
    layout: "bubbles",
    anchor: "bottom",
    follow: "bottom",
    pauseOnScroll: false,
    announce: true,
    votes: "none",
    sorts: "",
    maxDepth: 1,
    coalesce: "0",
  },
  group: {
    showNames: true,
    avatars: true,
    groupWithin: "5m",
    dateDividers: true,
    threads: "none",
    receipts: "delivered",
    presence: "none",
    layout: "bubbles",
    anchor: "bottom",
    follow: "bottom",
    pauseOnScroll: false,
    announce: true,
    votes: "none",
    sorts: "",
    maxDepth: 1,
    coalesce: "0",
  },
  open: {
    showNames: true,
    avatars: true,
    groupWithin: "5m",
    dateDividers: true,
    threads: "panel",
    receipts: "none",
    presence: "sampled",
    layout: "bubbles",
    anchor: "bottom",
    follow: "bottom",
    pauseOnScroll: false,
    announce: true,
    votes: "none",
    sorts: "",
    maxDepth: 1,
    coalesce: "0",
  },
};
