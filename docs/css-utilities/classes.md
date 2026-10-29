---
title: Classes
section: css-utilities
---

# Classes

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
