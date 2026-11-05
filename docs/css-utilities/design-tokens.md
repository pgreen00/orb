---
title: Design Tokens
section: css-utilities
layout: css-utilities.njk
templateEngineOverride: njk,md
description: Colors, type, spacing, radius, elevation, and motion as CSS custom properties. Orb's components and classes read the same tokens, so changing one changes them all.
---

Tokens are CSS custom properties on `:root`, so any element can use them, and a page can override them. Use `var(--orb-…)` in your own styles instead of hard-coded values, and your pages will match Orb's components and their themes.

## Colors

There are five palettes: `primary`, `neutral`, `success`, `warning`, and `danger`. Each has shades from `25` (nearly white) to `975` (nearly black), named `--orb-{palette}-{shade}`. `500` is the palette's base color. Lighter shades mix in white, and darker shades mix in black.

| Palette | Base (`500`) | Used for |
| --- | --- | --- |
| `primary` | `#4141e8` | Accents, links, and primary buttons |
| `neutral` | `#99becb` | Text, backgrounds, and borders |
| `success` | `#22c55e` | Positive states |
| `warning` | `#fbbf24` | Caution |
| `danger` | `#ae1818` | Errors and destructive actions |

{% set shades = [25, 50, 75, 100, 125, 150, 175, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 825, 850, 875, 900, 925, 950, 975] -%}
{%- for palette in ["primary", "neutral", "success", "warning", "danger"] -%}
<div class="orb-font-semi-bold" style="margin-block-start: 1rem;">{{ palette }}</div>
<div aria-hidden="true" style="display: grid; grid-template-columns: repeat(27, 1fr); height: 2rem; border-radius: var(--orb-radius-md); overflow: hidden;">{%- for shade in shades -%}<span title="--orb-{{ palette }}-{{ shade }}" style="background: var(--orb-{{ palette }}-{{ shade }});"></span>{%- endfor -%}</div>
{%- endfor %}

The shades are the same in light and dark mode. Use them directly when a color should never change, or use the semantic colors below when it should.

### Semantic Colors

These colors switch between light and dark mode with `light-dark()`. The page's `color-scheme` picks the mode, so they follow the system setting, or the theme a page sets.

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `--orb-text-color` | `neutral-925` | `neutral-75` | Body text |
| `--orb-background-color` | `neutral-75` | `neutral-925` | The page background |
| `--orb-divider-color` | `neutral-400` | `neutral-800` | Lines and borders |
| `--orb-note-color` | `neutral-700` | `neutral-600` | Muted notes and captions |

```css
.hint {
  color: var(--orb-note-color);
}
```

**Manual test:**
- Switch between light and dark mode. Body text, the page background, and the lines change, and muted notes stay readable.
- Check body text against its background with a contrast checker. Aim for at least 4.5:1 in both modes.

## Typography

### Font Weights

| Token | Value |
| --- | --- |
| `--orb-font-light` | `400` |
| `--orb-font-regular` | `500` |
| `--orb-font-semi-bold` | `600` |
| `--orb-font-bold` | `700` |
| `--orb-font-heavy` | `800` |

### Font Sizes

| Token | Value |
| --- | --- |
| `--orb-font-xs` | `0.75rem` |
| `--orb-font-sm` | `0.875rem` |
| `--orb-font-md` | `1rem` |
| `--orb-font-lg` | `1.125rem` |
| `--orb-font-xl` | `1.25rem` |
| `--orb-font-2xl` | `1.5rem` |
| `--orb-font-3xl` | `2rem` |
| `--orb-font-boosted` | `3rem` |

The root font size grows with the window, from 14px to 18px, so `rem` values scale with the page.

### Text Elements

These elements keep their meaning from HTML. Orb only gives them a look, so use the one that says what you mean: `<strong>` for importance, `<em>` for stress, `<mark>` for text that's highlighted for the reader, and so on.

::: live-code-demo

```html
<p>
  <strong>strong</strong>, <b>b</b>, <em>em</em>, <i>i</i>, <u>u</u>, <s>s</s>, <del>del</del>, <ins>ins</ins>
</p>
```

:::

**Manual test:**
- **strong** and **b** are bold. *em* and *i* are italic.
- <u>u</u> is underlined. <s>s</s> has a line through it, and <del>del</del> is also muted.
- <ins>ins</ins> is underlined in the success color.

### Highlights, Small Text, and Scripts

`<mark>`, `<small>`, `<sub>`, and `<sup>` change the size or background of part of a line. They don't change the spacing between lines.

::: live-code-demo

```html
<p>
  Plain line above.<br>
  Water is H<sub>2</sub>O, and energy is E = mc<sup>2</sup>.<br>
  A <mark>highlighted</mark> word and a <small>small note</small>.<br>
  Plain line below.
</p>
```

:::

**Manual test:**
- The four lines are evenly spaced, the same as lines without these elements.
- The subscript sits below the baseline and the superscript sits above it, without making their line taller.
- The highlight has rounded corners and a background that's easy to read in light and dark mode.
- The small note is smaller, but its line is the same height as the others.

### Code and Quotes

`<code>` is set in a tinted box. `<blockquote>` is italic, with a line down its left side, and its `<footer>` or `<cite>` gets a leading dash.

::: live-code-demo

```html
<p>Run <code>npm install</code> in the project folder first.</p>
<blockquote>
  <p>Look twice before you call it a lifer.</p>
  <footer>Field notes</footer>
</blockquote>
```

:::

**Manual test:**
- The code is in a tinted box, and it stays on one line.
- The quote is italic, with a left line and a muted color. The footer starts with a dash.

## Spacing

| Token | Value |
| --- | --- |
| `--orb-spacing-3xs` | `0.125rem` |
| `--orb-spacing-2xs` | `0.25rem` |
| `--orb-spacing-xs` | `0.5rem` |
| `--orb-spacing-sm` | `0.75rem` |
| `--orb-spacing-md` | `1rem` |
| `--orb-spacing-lg` | `1.25rem` |
| `--orb-spacing-xl` | `1.5rem` |
| `--orb-spacing-2xl` | `2rem` |
| `--orb-spacing-3xl` | `2.5rem` |

::: live-code-demo

```html
<div style="display: grid; gap: 0.5rem; justify-items: start;">
  <div style="display: flex; align-items: center; gap: 1rem;"><span style="width: 4rem;">3xs</span><span style="width: var(--orb-spacing-3xs); height: 1rem; background: var(--orb-primary-400);"></span></div>
  <div style="display: flex; align-items: center; gap: 1rem;"><span style="width: 4rem;">xs</span><span style="width: var(--orb-spacing-xs); height: 1rem; background: var(--orb-primary-400);"></span></div>
  <div style="display: flex; align-items: center; gap: 1rem;"><span style="width: 4rem;">md</span><span style="width: var(--orb-spacing-md); height: 1rem; background: var(--orb-primary-400);"></span></div>
  <div style="display: flex; align-items: center; gap: 1rem;"><span style="width: 4rem;">lg</span><span style="width: var(--orb-spacing-lg); height: 1rem; background: var(--orb-primary-400);"></span></div>
  <div style="display: flex; align-items: center; gap: 1rem;"><span style="width: 4rem;">3xl</span><span style="width: var(--orb-spacing-3xl); height: 1rem; background: var(--orb-primary-400);"></span></div>
</div>
```

:::

**Manual test:**
- Each bar is longer than the one above it. The **3xl** bar is about 20 times the width of **3xs**.

## Radius

| Token | Value |
| --- | --- |
| `--orb-radius-sm` | `0.125rem` |
| `--orb-radius-md` | `0.375rem` |
| `--orb-radius-lg` | `0.625rem` |
| `--orb-radius-xl` | `1rem` |
| `--orb-radius-circle` | `50%` |
| `--orb-radius-pill` | `9999px` |

::: live-code-demo

```html
<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 1rem;">
  <span style="padding: 0.5rem 1rem; border-radius: var(--orb-radius-sm); background: var(--orb-primary-500); color: var(--orb-neutral-75);">sm</span>
  <span style="padding: 0.5rem 1rem; border-radius: var(--orb-radius-md); background: var(--orb-primary-500); color: var(--orb-neutral-75);">md</span>
  <span style="padding: 0.5rem 1rem; border-radius: var(--orb-radius-xl); background: var(--orb-primary-500); color: var(--orb-neutral-75);">xl</span>
  <span style="padding: 0.5rem 1rem; border-radius: var(--orb-radius-pill); background: var(--orb-primary-500); color: var(--orb-neutral-75);">pill</span>
</div>
```

:::

**Manual test:**
- The corners go from slightly rounded in **sm** to fully rounded in **pill**.

## Elevation

| Token | Value |
| --- | --- |
| `--orb-shadow-xs` | `0 1px 2px rgb(0 0 0 / 18%)` |
| `--orb-shadow-sm` | `0 1px 2px rgb(0 0 0 / 24%)` |
| `--orb-shadow-md` | `0 2px 4px rgb(0 0 0 / 24%)` |
| `--orb-shadow-lg` | `0 2px 8px rgb(0 0 0 / 24%)` |
| `--orb-shadow-xl` | `0 4px 16px rgb(0 0 0 / 24%)` |

::: live-code-demo

```html
<div style="display: flex; flex-wrap: wrap; gap: 1.5rem; padding: 1rem;">
  <div style="padding: 1rem; border-radius: var(--orb-radius-md); background: var(--orb-background-color); box-shadow: var(--orb-shadow-xs);">xs</div>
  <div style="padding: 1rem; border-radius: var(--orb-radius-md); background: var(--orb-background-color); box-shadow: var(--orb-shadow-md);">md</div>
  <div style="padding: 1rem; border-radius: var(--orb-radius-md); background: var(--orb-background-color); box-shadow: var(--orb-shadow-xl);">xl</div>
</div>
```

:::

**Manual test:**
- The shadow under each box grows from **xs** to **xl**.

## Transition

| Token | Value |
| --- | --- |
| `--orb-transition-x-fast` | `75ms` |
| `--orb-transition-fast` | `150ms` |
| `--orb-transition-medium` | `300ms` |
| `--orb-transition-slow` | `500ms` |

Use them as the duration in a `transition`, so all motion in your page moves at the same pace as Orb's components.

```css
.card {
  transition: box-shadow var(--orb-transition-fast) ease-in-out;
}
```

## Accessibility

**Manual test checklist:**

- [ ] Body text and muted notes meet contrast in both light and dark mode.
- [ ] Color isn't the only way a state is shown. Pair it with text or an icon.
- [ ] Animations use the transition tokens, and they're turned off when the user prefers reduced motion.
