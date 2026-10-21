---
title: 'OrbMenu | <orb-menu>'
sidebar_label: 'Menu'
---

::: live-code-demo

```html
<orb-popover ex>
  <orb-menu>
    <orb-mi>
      <iconify-icon icon="mdi:minimize" slot="icon"></iconify-icon>
      Minimize
      <span slot="details">⌘M</span>
    </orb-mi>
    <orb-mi>
      <iconify-icon icon="mdi:zoom-in" slot="icon"></iconify-icon>
      Zoom
    </orb-mi>
    <orb-mi>
      <iconify-icon icon="mdi:fullscreen" slot="icon"></iconify-icon>
      Fill
    </orb-mi>
    <orb-mi>
      <iconify-icon icon="mdi:image-filter-center-focus" slot="icon"></iconify-icon>
      Center
    </orb-mi>
    <orb-divider></orb-divider>
    <orb-mi>
      orb-menu.md - orb
    </orb-mi>
  </orb-menu>
</orb-popover>
```

```javascript
document.body.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const popover = document.querySelector('orb-popover[ex]');
  popover.show(e);
});
```

:::