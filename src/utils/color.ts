export type Color = "primary" | "success" | "danger" | "warning";

const COLORS = {
  primary: "var(--orb-primary)",
  neutral: "var(--orb-neutral)",
  success: "var(--orb-success)",
  warning: "var(--orb-warning)",
  danger: "var(--orb-danger)",
} as const;

export const shade = (color: Color | "neutral", shade = 500) => {
  if (shade === 500) {
    return COLORS[color];
  } else if (shade < 500) {
    const percentageToWhite = (500 - shade) / 5 / 100;
    const colorPercentage = ((1 - percentageToWhite) * 100).toFixed(2);
    const whitePercentage = (percentageToWhite * 100).toFixed(2);
    return `color-mix(in srgb, ${COLORS[color]} ${colorPercentage}%, white ${whitePercentage}%)`;
  } else if (shade > 500) {
    const percentageToBlack = (shade - 500) / 5 / 100;
    const colorPercentage = ((1 - percentageToBlack) * 100).toFixed(2);
    const blackPercentage = (percentageToBlack * 100).toFixed(2);
    return `color-mix(in srgb, ${COLORS[color]} ${colorPercentage}%, black ${blackPercentage}%)`;
  }
};
