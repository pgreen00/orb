---
title: 'OrbPopover | <orb-popover>'
sidebar_label: 'Popover'
---

## Usage

Set `for` to the id of the element that opens the popover. The trigger and the popover must be in the same document or shadow root. The popover sets `aria-haspopup` and `aria-expanded` on its trigger.

For a list of actions, use [orb-menu](../menu/) instead. It handles the keyboard and focus the way menus need.

`show()` opens the popover at a pointer event, or at any object with `getBoundingClientRect`, such as a Range at a caret. Set `contextElement` on that object to the scrolling element that contains it, so the popover follows the scroll. Without `for`, the popover has no trigger, so a press outside it or Escape closes it.

::: live-code-demo

```html
<orb-button id="popover-trigger">Open Popover</orb-button>
<orb-popover for="popover-trigger">
  <input autofocus/>
</orb-popover>
```

:::

**Manual test:**
- Click the button. The popover opens next to it. Click the button again, click outside, or press Escape to close it.
- After Escape, focus returns to the button.
