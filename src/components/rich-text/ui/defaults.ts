/** A font the font picker offers: its name, and the CSS font stack it sets */
export interface FontOption {
  label: string;
  value: string;
}

/** The fonts offered when the `fonts` prop isn't set. "Default" is always offered first, and removes the font. */
export const DEFAULT_FONTS: FontOption[] = [
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: '"Times New Roman", serif' },
  { label: "Courier New", value: '"Courier New", monospace' },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Trebuchet MS", value: '"Trebuchet MS", sans-serif' },
];

/** The swatches in the color pickers when the `colors` prop isn't set */
export const DEFAULT_PALETTE = [
  "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#ffffff",
  "#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6fa8dc", "#8e7cc3", "#c27ba0",
];

/** The font sizes, in points, when the `fontSizes` prop isn't set */
export const DEFAULT_FONT_SIZES = "8 9 10 11 12 14 18 24 30 36 48";
