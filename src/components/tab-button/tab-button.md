---
title: 'OrbTabButton | <orb-tab-button>'
sidebar_label: 'Tab Button'
---

## Usage

Tab buttons go inside `<orb-tabs>`. Set `panel` to the `name` of the panel the button shows.

### Icons

Put an element in the `icon` slot to show an icon before the label. It works with traditional tabs, pills, and every placement. Inline SVGs and images are sized to match the text.

::: live-code-demo

```html
<orb-stack space="lg">
  <orb-tabs class="orb-radius-md">
    <orb-tab-button panel="icon-home">
      <iconify-icon slot="icon" icon="mdi:home"></iconify-icon>
      Home
    </orb-tab-button>
    <orb-tab-button panel="icon-settings">
      <iconify-icon slot="icon" icon="mdi:cog"></iconify-icon>
      Settings
    </orb-tab-button>
    <orb-tab-panel name="icon-home">Home content</orb-tab-panel>
    <orb-tab-panel name="icon-settings">Settings content</orb-tab-panel>
  </orb-tabs>
  <orb-tabs pills closable placement="start" class="orb-radius-md">
    <orb-tab-button panel="icon-inbox">
      <iconify-icon slot="icon" icon="mdi:inbox"></iconify-icon>
      Inbox
    </orb-tab-button>
    <orb-tab-button panel="icon-drafts">
      <iconify-icon slot="icon" icon="mdi:file-document-edit"></iconify-icon>
      Drafts
    </orb-tab-button>
    <orb-tab-panel name="icon-inbox">Inbox content</orb-tab-panel>
    <orb-tab-panel name="icon-drafts">Drafts content</orb-tab-panel>
  </orb-tabs>
</orb-stack>
```

:::

An icon-only tab needs an accessible name. Set the `label` attribute on the tab button.

::: live-code-demo

```html
<orb-tabs pills class="orb-radius-md">
  <orb-tab-button panel="only-grid" label="Grid view">
    <iconify-icon slot="icon" icon="mdi:view-grid"></iconify-icon>
  </orb-tab-button>
  <orb-tab-button panel="only-list" label="List view">
    <iconify-icon slot="icon" icon="mdi:view-list"></iconify-icon>
  </orb-tab-button>
  <orb-tab-panel name="only-grid">Grid view</orb-tab-panel>
  <orb-tab-panel name="only-list">List view</orb-tab-panel>
</orb-tabs>
```

:::
