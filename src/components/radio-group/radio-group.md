---
title: 'OrbRadioGroup | <orb-radio-group>'
sidebar_label: 'Radio Group'
---

::: live-code-demo

```html
<orb-radio-group label="What is your favorite color?" note="Do the thing" buttons value="Green">
  <orb-radio>Red</orb-radio>
  <orb-radio>Blue</orb-radio>
  <orb-radio>Green</orb-radio>
  <orb-radio>Other</orb-radio>
</orb-radio-group>
<orb-radio-group value="Green">
  <orb-label slot="label">What is your favorite color?</orb-label>
  <orb-radio>Red</orb-radio>
  <orb-radio>Blue</orb-radio>
  <orb-radio>Green</orb-radio>
  <orb-radio>Other</orb-radio>
</orb-radio-group>
```

:::

### Mode

Set `mode` to `row` or `column` to change the layout. Radios default to a column, and button groups default to a row. A row of radios wraps when there isn't enough room.

::: live-code-demo

```html
<orb-stack space="lg">
  <orb-radio-group label="Radios in a row" mode="row" value="Medium">
    <orb-radio>Small</orb-radio>
    <orb-radio>Medium</orb-radio>
    <orb-radio>Large</orb-radio>
  </orb-radio-group>
  <orb-radio-group label="Buttons in a column" mode="column" buttons value="Weekly">
    <orb-radio>Daily</orb-radio>
    <orb-radio>Weekly</orb-radio>
    <orb-radio>Monthly</orb-radio>
  </orb-radio-group>
</orb-stack>
```

:::