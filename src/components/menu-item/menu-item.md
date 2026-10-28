---
title: 'OrbMi | <orb-mi>'
sidebar_label: 'Menu Item'
---

## Usage

`<orb-mi>` is an item in an [`<orb-menu>`](../menu/). Its content is the label. See the menu docs for checkbox and radio items, submenus, and menubars.

::: live-code-demo

```html
<orb-menu label="Example" style="max-width: 16rem;">
  <orb-mi value="plain">Plain item</orb-mi>
  <orb-mi value="icon">
    <iconify-icon icon="mdi:star" slot="icon"></iconify-icon>
    With an icon
    <kbd slot="details">⌘S</kbd>
  </orb-mi>
  <orb-mi type="checkbox" checked>Checkbox item</orb-mi>
  <orb-mi disabled>Disabled item</orb-mi>
  <orb-mi variant="danger">Danger item</orb-mi>
</orb-menu>
```

:::

**Manual test:**
- Every label lines up, because the menu has a checkable item.
- Hovering an item highlights it. Hovering the disabled item doesn't.
- Click **Checkbox item**. Its checkmark toggles.
