---
title: Links
section: css-utilities
layout: css-utilities.njk
description: Links are underlined and muted until they're hovered or focused. Words in data-orb change them into accent links, quiet links, buttons, and tiles.
---

## Default Links

A plain `<a>` is underlined in a muted color. On hover and focus, the underline and text get darker. Links keep their native behavior, so they work with keyboards, screen readers, and the browser's back button.

::: live-code-demo

```html
<p>
  Read the <a href="#">installation guide</a> first, then try the <a href="#">tutorials</a>.
</p>
```

:::

**Manual test:**
- The link text is slightly muted and underlined. Hovering it makes the text and underline the full text color.
- Tab to a link. It shows a focus ring that isn't cut off.

## Accent

`data-orb="accent"` colors the link with the primary color, to make it stand out from the text around it.

::: live-code-demo

```html
<p>
  Sign up for <a href="#" data-orb="accent">early access</a> to the next release.
</p>
```

:::

**Manual test:**
- "early access" is in the primary color, and it's still underlined.

## Quiet

`data-orb="quiet"` removes the underline. Use it for navigation, toolbars, and places where the links are clearly links from their layout. Inside a paragraph, keep the underline, so the link is still easy to find.

::: live-code-demo

```html
<a href="#" data-orb="quiet">Quiet link</a>
<a href="#">Underlined link</a>
```

:::

**Manual test:**
- The quiet link has no underline. It still changes on hover and shows a focus ring.

## Buttons

`data-orb="button"` makes a link look like an outline button, so it can be used as a call to action. Add `accent` for a filled button.

::: live-code-demo

```html
<a href="#" data-orb="button">Read the docs</a>
<a href="#" data-orb="button accent">Get started</a>
```

:::

**Manual test:**
- "Read the docs" has a border and a transparent background. Hovering it tints the background.
- "Get started" is filled with the primary color, with light text.
- Pressing either shows a darker background while the mouse button is held.

## Tiles

`data-orb="tile"` makes the whole link a tile, around an `<orb-card>`. The card fills the tile, so tiles in the same row are the same height. On hover, the card grows slightly and its border takes the accent color. Use a tile when the whole card should go to one place.

::: live-code-demo

```html
<orb-mesh space="md" style="--min-column-size: 14rem;">
  <a data-orb="tile" href="#">
    <orb-card>
      <span slot="header">Design Tokens</span>
      Colors, type, spacing, and motion as custom properties.
    </orb-card>
  </a>
  <a data-orb="tile" href="#">
    <orb-card>
      <span slot="header">Tables</span>
      Words in data-orb turn on borders, spacing, and states.
    </orb-card>
  </a>
</orb-mesh>
```

:::

**Manual test:**
- Both tiles are the same height, even though their text is different lengths.
- Hovering a tile on a device that hovers makes the card grow a little and its border take the accent color.
- Tab to a tile. The focus ring goes around the link, not the card.
- The tile text isn't underlined.

## Accessibility

**Manual test checklist:**

- [ ] Each link's text says where it goes. Avoid "click here" or "more".
- [ ] A link that looks like a button still works with the Enter key, and a button-looking link still announces as a link.
- [ ] Quiet links in running text are still easy to tell apart from the text around them.
- [ ] Each link shows a focus ring, and the ring isn't cut off by its container.
- [ ] A tile's link is named by its visible text, so the card's content is read once.
