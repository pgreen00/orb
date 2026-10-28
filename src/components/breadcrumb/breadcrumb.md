---
title: 'OrbBreadcrumb | <orb-breadcrumb>'
sidebar_label: 'Breadcrumb'
---

## Usage

`<orb-breadcrumb>` is one level in an `<orb-breadcrumbs>` trail. `orb-breadcrumbs` slots each crumb into a link (when it has an `href`) or a button (when it doesn't), so the crumb's content, including icons and other markup, renders inside it. See [Breadcrumbs](/components/breadcrumbs/) for examples.

::: live-code-demo

```html
<orb-breadcrumbs>
  <orb-breadcrumb href="#home">Home</orb-breadcrumb>
  <orb-breadcrumb>Current page</orb-breadcrumb>
</orb-breadcrumbs>
```

:::

Crumbs without an `href` render as buttons. Clicks on any crumb are forwarded to its `<orb-breadcrumb>`, so you can add a `click` listener to the crumb itself. See [Single-Page Apps](/components/breadcrumbs/#single-page-apps).
