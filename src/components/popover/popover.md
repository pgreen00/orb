---
title: 'OrbPopover | <orb-popover>'
sidebar_label: 'Popover'
---

## Usage

Set `for` to the id of the element that opens the popover. The trigger and the popover must be in the same document or shadow root. The popover sets `aria-haspopup` and `aria-expanded` on its trigger.

For a list of actions, use [`<orb-menu>`](../menu/) instead. It handles the keyboard and focus the way menus need.

::: live-code-demo

```html
<orb-button id="popover-trigger">Open Popover</orb-button>
<orb-popover for="popover-trigger">
  <input autofocus/>
  <orb-grid>
    <orb-gr section="head">
      <orb-gc>ID</orb-gc>
      <orb-gc>Name</orb-gc>
      <orb-gc>Department</orb-gc>
    </orb-gr>
    <orb-gr>
      <orb-gc>001</orb-gc>
      <orb-gc>John Doe</orb-gc>
      <orb-gc>Marketing</orb-gc>
    </orb-gr>
    <orb-gr>
      <orb-gc>002</orb-gc>
      <orb-gc>Jeb Bush</orb-gc>
      <orb-gc>Marketing</orb-gc>
    </orb-gr>
  </orb-grid>
</orb-popover>
```

:::

**Manual test:**
- Click the button. The popover opens next to it. Click the button again, click outside, or press Escape to close it.
- After Escape, focus returns to the button.
