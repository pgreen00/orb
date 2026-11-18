/** An emoji the emoji picker offers, with the group it's listed under */
export interface EmojiEntry {
  emoji: string;
  label: string;
  group: number;
  tags: string[];
  /** Names typed between colons, such as `smile` for :smile: */
  shortcodes: string[];
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

/**
 * Loads the emoji data on first use, with the shortcodes joined in by hexcode.
 * Skin tone variants stay nested in their base entries, so only base entries are kept.
 */
export const loadEmoji = () =>
  (emoji ??= Promise.all([
    import("emojibase-data/en/compact.json"),
    import("emojibase-data/en/shortcodes/emojibase.json"),
  ]).then(([compact, shortcodes]) => {
    const names = shortcodes.default as Record<string, string | string[]>;
    return compact.default.flatMap(({ unicode, label, group, tags = [], hexcode }) =>
      group === undefined || group === 2
        ? []
        : [{ emoji: unicode, label, group, tags, shortcodes: [names[hexcode] ?? []].flat() }],
    );
  }));
