---
title: 'OrbTooltip | <orb-tooltip>'
sidebar_label: 'Tooltip'
---

::: live-code-demo

```html
<orb-button id="popover-trigger">Open Tooltip</orb-button>
<orb-tooltip for="popover-trigger">
  This is a description of the button
</orb-tooltip>
```

:::

## Labels for Icon Buttons

By default, a tooltip describes its trigger. For a button with only an icon, set `type="label"` so the tooltip names the button instead. Otherwise a screen reader announces the name twice, once from `aria-label` and once from the description.

Keep an `aria-label` on the button as well. It names the button until the tooltip loads, and the tooltip replaces it after.

::: live-code-demo

```html
<orb-stack mode="row">
  <orb-button id="tooltip-share" class="icon-only" fill="outline" aria-label="Share">
    <iconify-icon icon="mdi:share-variant" aria-hidden="true"></iconify-icon>
  </orb-button>
  <orb-tooltip for="tooltip-share" type="label">Share</orb-tooltip>
  <orb-button id="tooltip-delete" class="icon-only" fill="outline" aria-label="Delete">
    <iconify-icon icon="mdi:delete" aria-hidden="true"></iconify-icon>
  </orb-button>
  <orb-tooltip for="tooltip-delete" type="label">Delete</orb-tooltip>
</orb-stack>
```

:::

**Manual test:**
- Hover or Tab to each button. Its tooltip shows the name.
- With a screen reader, each button is announced once by name, such as "Share, button", with no description.

## Placement

By default, a tooltip goes on whichever side of its trigger has the most room. Set `placement` to choose a side, such as `top` or `bottom-start`. If there isn't room on that side, it flips to the opposite one. This is useful in toolbars, where a tooltip to the side would cover the neighboring buttons.

::: live-code-demo

```html
<orb-stack mode="row">
  <orb-button id="tooltip-top" fill="outline">Top</orb-button>
  <orb-tooltip for="tooltip-top" placement="top">Above the button</orb-tooltip>
  <orb-button id="tooltip-bottom" fill="outline">Bottom</orb-button>
  <orb-tooltip for="tooltip-bottom" placement="bottom">Below the button</orb-tooltip>
  <orb-button id="tooltip-right" fill="outline">Right</orb-button>
  <orb-tooltip for="tooltip-right" placement="right">Beside the button</orb-tooltip>
</orb-stack>
```

:::

**Manual test:**
- Hover each button. Its tooltip appears on the side named on the button.
- Scroll so **Top** is at the very top of the window, then hover it. The tooltip flips below the button.