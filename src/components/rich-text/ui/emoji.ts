/** An emoji the emoji picker offers, with the group it's listed under */
export interface EmojiEntry {
  emoji: string;
  label: string;
  group: number;
  tags: string[];
}

/** The category tabs. Group 2 (skin tones) has no tab, and its entries are left out. */
export const EMOJI_GROUPS: { id: number; label: string; icon: string }[] = [
  { id: 0, label: "Smileys & Emotion", icon: "😀" },
  { id: 1, label: "People & Body", icon: "👋" },
  { id: 3, label: "Animals & Nature", icon: "🐶" },
  { id: 4, label: "Food & Drink", icon: "🍎" },
  { id: 5, label: "Travel & Places", icon: "✈️" },
  { id: 6, label: "Activities", icon: "⚽" },
  { id: 7, label: "Objects", icon: "💡" },
  { id: 8, label: "Symbols", icon: "🔣" },
  { id: 9, label: "Flags", icon: "🏁" },
];

let emoji: Promise<EmojiEntry[]> | undefined;

/** Loads the emoji data on first use. Skin tone variants stay nested in their base entries, so only base entries are kept. */
export const loadEmoji = () =>
  (emoji ??= import("emojibase-data/en/compact.json").then((m) =>
    m.default.flatMap(({ unicode, label, group, tags = [] }) =>
      group === undefined || group === 2 ? [] : [{ emoji: unicode, label, group, tags }],
    ),
  ));
