---
title: Utility Classes
section: css-utilities
layout: css-utilities.njk
description: Single-purpose classes for spacing, font weight and size, elevation, radius, and hiding content visually. Each one is a thin wrapper around a design token.
---

## Spacing

Padding and margin classes use the spacing tokens. Every class is named the same way:

| Pattern | Sets |
| --- | --- |
| `.orb-padding`, `.orb-margin` | All four sides, to `md` |
| `.orb-padding-top`, `-right`, `-bottom`, `-left` | One side |
| `.orb-padding-horizontal`, `.orb-padding-vertical` | Both inline or both block sides |
| `.orb-padding-{size}` and the same suffixes | The size, such as `-sm` or `-3xl` |
| `.orb-no-padding`, `.orb-no-margin` and the same suffixes | Sets the sides to `0`, with `!important` |

Sizes are `3xs`, `2xs`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, and `3xl`. Combine them with the side or direction, such as `orb-padding-horizontal-lg`. The `no-` versions use `!important`, so they win over the other classes. Use them only when you have to.

::: live-code-demo

```html
<div style="display: flex; flex-wrap: wrap; gap: 1rem;">
  <div class="orb-padding-xs" style="outline: 1px dashed var(--orb-divider-color);">xs padding</div>
  <div class="orb-padding" style="outline: 1px dashed var(--orb-divider-color);">md padding</div>
  <div class="orb-padding-horizontal-xl" style="outline: 1px dashed var(--orb-divider-color);">xl horizontal</div>
  <div class="orb-padding-top-3xl" style="outline: 1px dashed var(--orb-divider-color);">3xl top</div>
</div>
```

:::

**Manual test:**
- Each box has the space its class names. The **3xl top** box has space only above its text.
- **xl horizontal** has space on its left and right, but none above or below.

## Font Weight and Size

Font classes set `font-weight` and `font-size` from the typography tokens. Weights are `light`, `regular`, `semi-bold`, `bold`, and `heavy`. Sizes are `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, and `boosted`.

::: live-code-demo

```html
<p class="orb-font-light">Light weight text</p>
<p class="orb-font-regular">Regular weight text</p>
<p class="orb-font-semi-bold">Semi-bold weight text</p>
<p class="orb-font-bold">Bold weight text</p>
<p class="orb-font-heavy">Heavy weight text</p>
<p class="orb-font-xs">Extra small text</p>
<p class="orb-font-lg">Large text</p>
<p class="orb-font-3xl">Triple extra large text</p>
```

:::

**Manual test:**
- Each line gets lighter or heavier, and each size is visibly different.

## Elevation

`.orb-elevation-{size}` sets a `box-shadow` from the elevation tokens. Sizes are `xs`, `sm`, `md`, `lg`, and `xl`.

::: live-code-demo

```html
<div style="display: flex; flex-wrap: wrap; gap: 1.5rem; padding: 1rem;">
  <div class="orb-padding orb-radius-md orb-elevation-xs" style="background: var(--orb-background-color);">xs</div>
  <div class="orb-padding orb-radius-md orb-elevation-md" style="background: var(--orb-background-color);">md</div>
  <div class="orb-padding orb-radius-md orb-elevation-xl" style="background: var(--orb-background-color);">xl</div>
</div>
```

:::

**Manual test:**
- Each box casts a shadow, and the shadows get larger from **xs** to **xl**.

## Radius

`.orb-radius-{size}` sets `border-radius` from the radius tokens. Sizes are `sm`, `md`, `lg`, `xl`, `circle`, and `pill`.

::: live-code-demo

```html
<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 1rem;">
  <div class="orb-padding orb-radius-sm" style="outline: 1px solid var(--orb-divider-color);">sm</div>
  <div class="orb-padding orb-radius-lg" style="outline: 1px solid var(--orb-divider-color);">lg</div>
  <div class="orb-padding orb-radius-pill" style="outline: 1px solid var(--orb-divider-color);">pill</div>
  <div class="orb-radius-circle" style="width: 3rem; height: 3rem; outline: 1px solid var(--orb-divider-color);"></div>
</div>
```

:::

**Manual test:**
- **sm** has slightly rounded corners, and **pill** has fully rounded ends.
- The circle is a true circle.

## Visually Hidden

`orb-visually-hidden` hides content on screen but keeps it in the accessibility tree, so screen readers still announce it. Use it for text that sighted users get from the layout, such as a form group's legend or extra context on an icon-only link.

Don't use it on content that can take focus, such as links or buttons, since a keyboard user would land on something they can't see.

::: live-code-demo

```html
<fieldset style="border: none; padding: 0; margin: 0;">
  <legend class="orb-visually-hidden">Shipping address</legend>
  <orb-stack>
    <orb-textbox label="Street">
      <input name="street" autocomplete="shipping street-address">
    </orb-textbox>
    <orb-textbox label="ZIP code">
      <input name="zip" autocomplete="shipping postal-code" inputmode="numeric">
    </orb-textbox>
  </orb-stack>
</fieldset>
```

:::

**Manual test:**
- The legend "Shipping address" doesn't show on screen, and leaves no gap above the fields.
- With a screen reader, tabbing into **Street** announces the group "Shipping address".

## Accessibility

**Manual test checklist:**

- [ ] `orb-visually-hidden` is only used on text that isn't focusable.
- [ ] The `no-` spacing classes are used rarely, since `!important` is hard to override.
