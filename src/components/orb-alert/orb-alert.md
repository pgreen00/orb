---
title: 'OrbAlert | <orb-alert>'
sidebar_label: 'Alert'
---

## Usage

### Closable

Adding the `closable` attribute will display a close icon in the top right that hides the alert on click.

::: live-code-demo

```html
<orb-alert open closable>
  <orb-icon slot="start" fill>home</orb-icon>
  <h5>Hello there</h5>
  Where's the chapstick?
</orb-alert>
```

:::


### Progress

Set the `duration` attribute to have the alert close automatically after the specified amount of milliseconds. The timer will be paused if the user hovers their mouse over the alert, and will resume when the mouse leaves.

::: live-code-demo

```html
<orb-button id="show-progress-alert-button">Open Alert</orb-button>
<orb-alert id="progress-alert" duration="3000" class="orb-margin-top-sm">
  Hello there
</orb-alert>
```

```javascript
const button = document.querySelector("#show-progress-alert-button");
const alert = document.querySelector("#progress-alert");
button.addEventListener("click", () => {
  alert.open = true;
});
```

:::


### Slots

The `end` slot can be used for action items like buttons

::: live-code-demo

```html
<orb-alert open>
  <orb-icon slot="start">settings</orb-icon>
  Where's the chapstick?
  <orb-button fill="outline" size="sm" slot="end">Undo</orb-button>
  <orb-button fill="outline" size="sm" slot="end">Dismiss</orb-button>
</orb-alert>
```

:::
