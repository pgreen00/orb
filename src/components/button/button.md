---
title: "OrbButton | <orb-button>"
sidebar_label: "Button"
---

## Examples

### Colors and Types

::: live-code-demo

```html
<strong>Solid</strong><br />
<orb-button>Neutral</orb-button>
<orb-button color="primary">Primary</orb-button>
<orb-button color="success">Success</orb-button>
<orb-button color="warning">Warning</orb-button>
<orb-button color="danger">Danger</orb-button>

<orb-divider></orb-divider>

<strong>Outline</strong><br />
<orb-button fill="outline">Neutral</orb-button>
<orb-button fill="outline" color="primary">Primary</orb-button>
<orb-button fill="outline" color="success">Success</orb-button>
<orb-button fill="outline" color="warning">Warning</orb-button>
<orb-button fill="outline" color="danger">Danger</orb-button>

<orb-divider></orb-divider>

<strong>Clear</strong><br />
<orb-button fill="clear">Neutral</orb-button>
<orb-button fill="clear" color="primary">Primary</orb-button>
<orb-button fill="clear" color="success">Success</orb-button>
<orb-button fill="clear" color="warning">Warning</orb-button>
<orb-button fill="clear" color="danger">Danger</orb-button>
```

:::


### Sizes

::: live-code-demo

```html
<orb-button size="xs">X-Small</orb-button>
<orb-button size="sm">Small</orb-button>
<orb-button>Medium</orb-button>
<orb-button size="lg">Large</orb-button>
```

:::

### Radius

::: live-code-demo

```html
<orb-button>Default Radius</orb-button>
<orb-button radius="pill">Pill</orb-button>
<orb-button radius="circle">
  <iconify-icon icon="mdi:heart"></iconify-icon>
</orb-button>
```

:::

### Disabled

::: live-code-demo

```html
<orb-button color="primary" disabled>Medium</orb-button>
```

:::

### Pending

::: live-code-demo

```html
<orb-button id="pending-button" color="primary">Save</orb-button>
```

```javascript
const button = document.querySelector('#pending-button');
button.addEventListener('click', () => {
  button.pending = true;
  setTimeout(() => {
    button.pending = false;
  }, 2000);
});
```

:::

### Caret

::: live-code-demo

```html
<orb-button id="dropdown-button" caret space-between fill="clear">Paragraph</orb-button>
<orb-menu id="dropdown-menu" for="dropdown-button" mode="single">
  <orb-mi checked>Paragraph</orb-mi>
  <orb-mi>Heading 1</orb-mi>
  <orb-mi>Heading 2</orb-mi>
  <orb-mi>Heading 3</orb-mi>
  <orb-mi>Heading 4</orb-mi>
  <orb-mi>Heading 5</orb-mi>
  <orb-mi>Heading 6</orb-mi>
</orb-menu>
```

```javascript
const menu = document.querySelector('#dropdown-menu');
const button = document.querySelector('#dropdown-button');
menu.addEventListener('orbSelect', (e) => {
  button.textContent = e.detail.item.textContent;
});
```

:::