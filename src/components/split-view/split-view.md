---
title: 'OrbSplitView | <orb-split-view>'
sidebar_label: 'Split View'
---


::: live-code-demo

```html
<orb-split-view class="orb-radius-lg" style="height:500px;border:solid 1px var(--orb-divider-color);">
  <orb-split-panel style="width: 20%;"></orb-split-panel>
  <orb-split-panel primary>
    <orb-split-view vertical>
      <orb-split-panel style="height: 56px;"></orb-split-panel>
      <orb-split-panel primary></orb-split-panel>
      <orb-split-panel style="height: 100px;">
        <orb-split-view>
          <orb-split-panel primary></orb-split-panel>
          <orb-split-panel style="width: 20%;"></orb-split-panel>
        </orb-split-view>
      </orb-split-panel>
    </orb-split-view>
  </orb-split-panel>
  <orb-split-panel style="width: 20%;"></orb-split-panel>
</orb-split-view>
```

:::