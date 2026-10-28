const TOKENS = ["primary", "neutral", "success", "warning", "danger"];

/**
 * Resolves a calendar or event color into a CSS color value. Accepts raw CSS
 * (`#hex`, `rgb()`, `hsl()`, `var(...)`, named colors), an orb token
 * (`primary` becomes `var(--orb-primary-500)`), or a token and shade
 * (`primary-600` becomes `var(--orb-primary-600)`).
 */
export function resolveColor(color?: string, fallback = "primary"): string {
  const c = (color ?? fallback).trim();
  const [token, shade] = c.split("-");
  if (TOKENS.includes(token)) return `var(--orb-${token}-${shade ?? "500"})`;
  return c;
}
