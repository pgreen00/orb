---
title: 'OrbCard | <orb-card>'
sidebar_label: 'Card'
---

## Usage

::: live-code-demo

```html
<orb-card>A card with only default content.</orb-card>
```

:::

## Layouts

The `layout` attribute changes the card's structure, and each layout has its own named slots. Content in the default slot always lands in the layout's main text area, so a card with only default content works in every layout. Sections with empty slots aren't rendered, so leave out anything you don't need.

| Layout | Slots |
| --- | --- |
| `stacked` (default) | `media`, `header`, default, `footer` |
| `horizontal` | `media`, `header`, default, `footer` |
| `overlay` | `media`, `header`, default, `footer` |
| `compact` | `media`, default (title), `subtitle`, `end` |
| `stat` | `label`, default (value), `trend`, `sparkline` |
| `feature` | `icon`, `header`, default, `footer` |
| `profile` | `cover`, `avatar`, default (name), `subtitle`, `footer` |
| `pricing` | `badge`, `header`, `price`, default, `footer` |

### Stacked

Media on top, then the header, body, and footer. Use it for blog posts, products, team members, and most grids.

::: live-code-demo

```html
<orb-mesh space="md" style="--min-column-size: 16rem;">
  <orb-card>
    <img slot="media" src="https://picsum.photos/seed/orb-stacked/800/450" alt="" style="aspect-ratio: 16 / 9;" />
    <h4 slot="header">Website redesign</h4>
    A fresh look for the marketing site, with faster pages and a new component library.
    <orb-button slot="footer" size="sm">Read more</orb-button>
    <orb-button slot="footer" size="sm" fill="clear">Share</orb-button>
  </orb-card>
  <orb-card>
    <h4 slot="header">No media</h4>
    The media section is skipped when its slot is empty.
  </orb-card>
</orb-mesh>
```

:::

### Horizontal

Media beside the content. Use it for search results, list views, and news feeds. Set `media-placement="end"` to put the media on the right. When the card is narrower than 30rem, it falls back to the stacked layout. Resize the window to see it switch.

::: live-code-demo

```html
<orb-stack>
  <orb-card layout="horizontal">
    <img slot="media" src="https://picsum.photos/seed/orb-horizontal/600/600" alt="" />
    <h4 slot="header">Designing for dark mode</h4>
    How we picked colors that work in both themes, and the tokens that keep them in sync.
    <orb-button slot="footer" size="sm" fill="outline">Read article</orb-button>
  </orb-card>
  <orb-card layout="horizontal" media-placement="end">
    <img slot="media" src="https://picsum.photos/seed/orb-horizontal-end/600/600" alt="" />
    <h4 slot="header">Media on the end</h4>
    The same layout with <code>media-placement="end"</code>.
  </orb-card>
  <div style="max-width: 24rem;">
    <orb-card layout="horizontal">
      <img slot="media" src="https://picsum.photos/seed/orb-narrow/600/600" alt="" />
      <h4 slot="header">Narrow container</h4>
      This card's container is under 30rem, so it stacks.
    </orb-card>
  </div>
</orb-stack>
```

:::

### Overlay

The media fills the card, and the text sits on a gradient scrim at the bottom. Use it for marketing tiles, featured content, and promos. Set `--min-height` to change the height.

::: live-code-demo

```html
<orb-mesh space="md" style="--min-column-size: 16rem;">
  <orb-card layout="overlay">
    <img slot="media" src="https://picsum.photos/seed/orb-overlay/800/1000" alt="" />
    <small slot="header">Featured</small>
    <h3>Summer collection</h3>
    <orb-button slot="footer" size="sm">Shop now</orb-button>
  </orb-card>
  <orb-card layout="overlay" style="--min-height: 10rem;">
    <img slot="media" src="https://picsum.photos/seed/orb-overlay-2/800/500" alt="" />
    <h4>Shorter tile</h4>
  </orb-card>
</orb-mesh>
```

:::

### Compact

A dense row with a thumbnail or avatar, a title, a subtitle, and an optional trailing action. Use it for contacts, notifications, file lists, and settings rows. Set `--thumbnail-size` and `--thumbnail-radius` to change the thumbnail.

::: live-code-demo

```html
<orb-stack space="2xs">
  <orb-card layout="compact" style="--thumbnail-radius: 50%;">
    <img slot="media" src="https://picsum.photos/seed/orb-avatar-1/100/100" alt="" />
    Ada Lovelace
    <span slot="subtitle">ada@example.com</span>
    <orb-button slot="end" size="sm" fill="outline">Message</orb-button>
  </orb-card>
  <orb-card layout="compact">
    <iconify-icon slot="media" icon="mdi:file-pdf-box" width="28" height="28"></iconify-icon>
    quarterly-report-final-v2.pdf
    <span slot="subtitle">2.4 MB · Edited yesterday</span>
  </orb-card>
  <orb-card layout="compact">
    Notifications without media
    <span slot="subtitle">The thumbnail is skipped when empty</span>
  </orb-card>
</orb-stack>
```

:::

### Stat

A label, a big number, an optional trend, and an optional sparkline. Use it on dashboards. Set `trend` to `up`, `down`, or `flat` to color the trend slot.

::: live-code-demo

```html
<orb-mesh space="md" style="--min-column-size: 12rem;">
  <orb-card layout="stat" trend="up">
    <span slot="label">Revenue</span>
    $48,210
    <span slot="trend">▲ 12.4%</span>
    <svg slot="sparkline" viewBox="0 0 100 24" height="32" preserveAspectRatio="none">
      <polyline points="0,20 15,16 30,18 45,10 60,12 75,6 100,4" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" />
    </svg>
  </orb-card>
  <orb-card layout="stat" trend="down">
    <span slot="label">Churn</span>
    3.1%
    <span slot="trend">▼ 0.4%</span>
  </orb-card>
  <orb-card layout="stat" trend="flat">
    <span slot="label">Active users</span>
    1,204
    <span slot="trend">No change</span>
  </orb-card>
</orb-mesh>
```

:::

### Feature

An icon, a title, and a short description. Use it for "why choose us" grids and feature lists. Content is centered by default. Set `align="start"` to left-align it.

::: live-code-demo

```html
<orb-mesh space="md" style="--min-column-size: 14rem;">
  <orb-card layout="feature">
    <iconify-icon slot="icon" icon="mdi:lightning-bolt"></iconify-icon>
    <h4 slot="header">Fast</h4>
    Components load on demand, so pages only pay for what they use.
  </orb-card>
  <orb-card layout="feature">
    <iconify-icon slot="icon" icon="mdi:theme-light-dark"></iconify-icon>
    <h4 slot="header">Themeable</h4>
    Light and dark modes come built in, driven by CSS variables.
  </orb-card>
  <orb-card layout="feature" align="start">
    <iconify-icon slot="icon" icon="mdi:human"></iconify-icon>
    <h4 slot="header">Accessible</h4>
    Left-aligned with <code>align="start"</code>.
    <orb-button slot="footer" size="sm" fill="clear">Learn more</orb-button>
  </orb-card>
</orb-mesh>
```

:::

### Profile

An avatar overlapping an optional cover image, then a name, role, and actions. Set `--avatar-size` and `--cover-height` to adjust it, and `align="start"` to left-align it.

::: live-code-demo

```html
<orb-mesh space="md" style="--min-column-size: 15rem;">
  <orb-card layout="profile">
    <img slot="cover" src="https://picsum.photos/seed/orb-cover/800/300" alt="" />
    <img slot="avatar" src="https://picsum.photos/seed/orb-avatar-2/200/200" alt="" />
    Grace Hopper
    <span slot="subtitle">Rear admiral, computer scientist</span>
    <orb-button slot="footer" size="sm">Follow</orb-button>
    <orb-button slot="footer" size="sm" fill="outline">Message</orb-button>
  </orb-card>
  <orb-card layout="profile" align="start">
    <img slot="avatar" src="https://picsum.photos/seed/orb-avatar-3/200/200" alt="" />
    Alan Turing
    <span slot="subtitle">No cover, left-aligned</span>
  </orb-card>
</orb-mesh>
```

:::

### Pricing

A tier name, price, feature list, and call to action. Add `highlighted` to emphasize a tier, and use the `badge` slot for a label like "Most popular".

::: live-code-demo

```html
<orb-mesh space="lg" style="--min-column-size: 14rem; padding-top: 1rem;">
  <orb-card layout="pricing">
    <span slot="header">Starter</span>
    <span slot="price">$0</span>
    <ul>
      <li>1 project</li>
      <li>Community support</li>
    </ul>
    <orb-button slot="footer" fill="outline">Get started</orb-button>
  </orb-card>
  <orb-card layout="pricing" highlighted>
    <span slot="badge">Most popular</span>
    <span slot="header">Pro</span>
    <span slot="price">$12<small>/mo</small></span>
    <ul>
      <li>Unlimited projects</li>
      <li>Priority support</li>
      <li>Custom themes</li>
    </ul>
    <orb-button slot="footer" color="primary">Upgrade</orb-button>
  </orb-card>
  <orb-card layout="pricing">
    <span slot="header">Team</span>
    <span slot="price">$40<small>/mo</small></span>
    <ul>
      <li>Everything in Pro</li>
      <li>Shared workspaces</li>
    </ul>
    <orb-button slot="footer" fill="outline">Contact sales</orb-button>
  </orb-card>
</orb-mesh>
```

:::
