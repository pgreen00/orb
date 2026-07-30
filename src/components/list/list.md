---
title: 'OrbList | <orb-list>'
sidebar_label: 'List'
---

::: live-code-demo

```html
<orb-list>
  <orb-li>Apples</orb-li>
  <orb-li>
    Bananas
    <orb-list slot="sublist">
      <orb-li>Apples</orb-li>
      <orb-li>
        Bananas
        <orb-list slot="sublist">
          <orb-li>Apples</orb-li>
          <orb-li>Bananas</orb-li>
          <orb-li>Oranges</orb-li>
        </orb-list>
      </orb-li>
      <orb-li>Oranges</orb-li>
    </orb-list>
  </orb-li>
  <orb-li>Oranges</orb-li>
</orb-list>
<orb-list dense>
  <orb-li>Apples</orb-li>
  <orb-li>Bananas</orb-li>
  <orb-li>Oranges</orb-li>
</orb-list>
```

:::