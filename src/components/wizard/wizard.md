---
title: 'OrbWizard | <orb-wizard>'
sidebar_label: 'Wizard'
---

## Usage

A wizard shows progress through a sequence of steps, such as a checkout, setup, or onboarding flow. Each `<orb-wizard-item>` is a step. Add `active` to the current step and `completed` to finished ones.

::: live-code-demo

```html
<orb-wizard>
  <orb-wizard-item completed>Cart</orb-wizard-item>
  <orb-wizard-item active>Shipping</orb-wizard-item>
  <orb-wizard-item>Payment</orb-wizard-item>
</orb-wizard>
```

:::

The wizard only shows progress. It doesn't hold each step's content or mark steps complete. Pair it with your own Back and Next buttons, or call its methods, and set `completed` from your own code.

**Manual test:**
- "Cart" shows a solid checkmark, "Shipping" a tinted "2" with a colored border, and "Payment" an outlined "3".
- The completed marker is a darker, solid shade. The active one is lighter and tinted, so the two are easy to tell apart.
- The line after "Cart" is colored. The line after "Shipping" isn't.

### Clickable

Add `clickable` to render each step as a button. Clicking a step, or focusing it and pressing Enter or Space, goes straight to it. Without `clickable`, steps can't be focused, and only the methods change the active step.

::: live-code-demo

```html
<orb-wizard clickable>
  <orb-wizard-item completed>Cart</orb-wizard-item>
  <orb-wizard-item active>Shipping</orb-wizard-item>
  <orb-wizard-item>Payment</orb-wizard-item>
</orb-wizard>
```

:::

**Manual test:**
- Tab moves between the three steps, each with a focus ring.
- Click "Payment" or press Enter on it. It becomes the active step.
- Hovering a step underlines its label.

### Linear

Add `linear` to require steps in order. Every step after the first incomplete one is locked, and nothing can reach it until the steps before it are `completed`. Together with `clickable`, users can go back to any completed step and forward to the next one, but can't skip ahead.

::: live-code-demo

```html
<orb-wizard id="linear-wizard" linear clickable>
  <orb-wizard-item completed>Cart</orb-wizard-item>
  <orb-wizard-item active>Shipping</orb-wizard-item>
  <orb-wizard-item>Payment</orb-wizard-item>
  <orb-wizard-item>Review</orb-wizard-item>
</orb-wizard>
<orb-toolbar space="xs" style="margin-top: 1rem;">
  <orb-button id="linear-complete" fill="outline">Complete current step</orb-button>
  <orb-button data-wizard="next linear-wizard">Next</orb-button>
</orb-toolbar>
```

```javascript
const wizard = document.querySelector("#linear-wizard");
document.querySelector("#linear-complete").addEventListener("click", () => {
  wizard.querySelector("orb-wizard-item[active]").completed = true;
});
```

:::

**Manual test:**
- "Payment" and "Review" are dimmed and can't be clicked, focused, or reached with Next.
- Press "Complete current step". "Payment" unlocks, and Next moves to it.
- Click "Cart". You can still go back to completed steps.

### Orientation

Set `orientation` to `vertical` to stack the steps, for a sidebar or narrow column. Increase `--gap` to lengthen the connectors.

::: live-code-demo

```html
<orb-mesh space="lg" style="--min-column-size: 14rem;">
  <orb-wizard orientation="vertical">
    <orb-wizard-item completed>Mix</orb-wizard-item>
    <orb-wizard-item completed>Knead</orb-wizard-item>
    <orb-wizard-item active>
      Proof
      <span slot="note">Let it rise. Resist poking it.</span>
    </orb-wizard-item>
    <orb-wizard-item>Bake</orb-wizard-item>
  </orb-wizard>
  <orb-wizard orientation="vertical" style="--gap: var(--orb-spacing-3xl);">
    <orb-wizard-item completed>Mix</orb-wizard-item>
    <orb-wizard-item completed>Knead</orb-wizard-item>
    <orb-wizard-item active>
      Proof
      <span slot="note">Let it rise. Resist poking it.</span>
    </orb-wizard-item>
    <orb-wizard-item>Bake</orb-wizard-item>
  </orb-wizard>
</orb-mesh>
```

:::

Set `orientation` to `auto` to lay steps out in a row and stack them when there's less than about 6em of width per step. Use it for anything shown on a phone. While stacked, the wizard has the `stacked` custom state, so `orb-wizard:state(stacked)` targets it. The default, `horizontal`, stays in a row at any width.

::: live-code-demo

```html
<div style="resize: horizontal; overflow: hidden; border: 1px dashed; padding: 1rem; min-width: 10rem;">
  <orb-wizard orientation="auto">
    <orb-wizard-item completed>Account</orb-wizard-item>
    <orb-wizard-item completed>Profile</orb-wizard-item>
    <orb-wizard-item active>Team</orb-wizard-item>
    <orb-wizard-item>Notifications</orb-wizard-item>
  </orb-wizard>
</div>
```

:::

**Manual test:**
- In the vertical wizards, connectors run from each marker to the next, labels sit beside the markers, and the note sits under "Proof".
- The second vertical wizard has longer connectors.
- Drag the dashed box's corner to narrow it. Below about 24em, the steps stack. Widen it and they go back to a row.

### Variant

Set `variant` on a step to color its marker: `primary` (the default), `success`, `warning`, or `danger`. The active step uses a tinted shade, a completed step a darker solid shade, and an upcoming step an outline. The color is cosmetic, so explain the reason in the label or note.

::: live-code-demo

```html
<orb-stack space="lg">
  <orb-wizard>
    <orb-wizard-item active>Current</orb-wizard-item>
    <orb-wizard-item variant="success">Success</orb-wizard-item>
    <orb-wizard-item variant="warning">Warning</orb-wizard-item>
    <orb-wizard-item variant="danger">Danger</orb-wizard-item>
  </orb-wizard>
  <orb-wizard>
    <orb-wizard-item completed variant="success">Success</orb-wizard-item>
    <orb-wizard-item completed variant="warning">Warning</orb-wizard-item>
    <orb-wizard-item completed variant="danger">Danger</orb-wizard-item>
    <orb-wizard-item active variant="success">Active success</orb-wizard-item>
  </orb-wizard>
</orb-stack>
```

:::

**Manual test:** each variant's upcoming, completed, and active markers use its color, and the text inside each marker is readable in light and dark mode.

### Errors

Set `error` on a step to mark it as failed. The marker turns red with an X, and the message shows under the label.

::: live-code-demo

```html
<orb-wizard>
  <orb-wizard-item completed variant="success">Cart</orb-wizard-item>
  <orb-wizard-item completed variant="success">Shipping</orb-wizard-item>
  <orb-wizard-item active error="Card declined">Payment</orb-wizard-item>
  <orb-wizard-item>Review</orb-wizard-item>
</orb-wizard>
```

:::

**Manual test:** "Payment" has a red X with a ring around it, since it's also the active step, and "Card declined" appears under the label.

### Size

The wizard is sized in `em`. Set `font-size` on it or an ancestor to scale markers, connectors, and text together.

::: live-code-demo

```html
<orb-stack space="lg">
  <orb-wizard style="font-size: 0.75rem;">
    <orb-wizard-item completed>Cart</orb-wizard-item>
    <orb-wizard-item active>Shipping</orb-wizard-item>
    <orb-wizard-item>Payment</orb-wizard-item>
  </orb-wizard>
  <orb-wizard>
    <orb-wizard-item completed>Cart</orb-wizard-item>
    <orb-wizard-item active>Shipping</orb-wizard-item>
    <orb-wizard-item>Payment</orb-wizard-item>
  </orb-wizard>
  <orb-wizard style="font-size: 1.25rem;">
    <orb-wizard-item completed>Cart</orb-wizard-item>
    <orb-wizard-item active>Shipping</orb-wizard-item>
    <orb-wizard-item>Payment</orb-wizard-item>
  </orb-wizard>
</orb-stack>
```

:::

### Drawing Attention

Set `attention` on a step to `pulse` or `bounce` to animate its marker. Use it sparingly, for the one step the user should act on. Set `--pulse-color` to change the pulse color. Both are turned off when the user prefers reduced motion.

::: live-code-demo

```html
<orb-stack space="lg">
  <orb-wizard>
    <orb-wizard-item completed>Create account</orb-wizard-item>
    <orb-wizard-item active attention="pulse">Verify email</orb-wizard-item>
    <orb-wizard-item>Set up profile</orb-wizard-item>
  </orb-wizard>
  <orb-wizard>
    <orb-wizard-item completed>Create account</orb-wizard-item>
    <orb-wizard-item active attention="bounce">Verify email</orb-wizard-item>
    <orb-wizard-item>Set up profile</orb-wizard-item>
  </orb-wizard>
</orb-stack>
```

:::

**Manual test:** turn on "Reduce motion" in your OS settings and reload. Both animations stop.

### Notes and Icons

Use the `note` slot for supporting text under a label, and the `icon` slot to replace the number, checkmark, or spinner. Icons keep the marker's state colors.

::: live-code-demo

```html
<orb-wizard>
  <orb-wizard-item completed>
    <iconify-icon slot="icon" icon="mdi:shopping"></iconify-icon>
    Ordered
    <span slot="note">Monday</span>
  </orb-wizard-item>
  <orb-wizard-item active>
    <iconify-icon slot="icon" icon="mdi:truck"></iconify-icon>
    Shipped
    <span slot="note">Left the warehouse</span>
  </orb-wizard-item>
  <orb-wizard-item>
    <iconify-icon slot="icon" icon="mdi:home"></iconify-icon>
    Delivered
    <span slot="note">Thursday, probably</span>
  </orb-wizard-item>
</orb-wizard>
```

:::

### Loading

Add `loading` to a step to show a spinner in its marker, for example while an async step is in progress. The step gets `aria-busy="true"`, and the wizard gets the `loading` custom state.

::: live-code-demo

```html
<orb-wizard>
  <orb-wizard-item completed>Boil the kettle</orb-wizard-item>
  <orb-wizard-item completed>Warm the pot</orb-wizard-item>
  <orb-wizard-item active loading>
    Steep
    <span slot="note">Four minutes</span>
  </orb-wizard-item>
  <orb-wizard-item>Pour</orb-wizard-item>
</orb-wizard>
```

:::

### Disabled

Add `disabled` to a step that doesn't apply. It stays visible but can't be clicked, focused, or reached with `next()`, `previous()`, or `goTo()`. `next()` and `previous()` skip over it.

::: live-code-demo

```html
<orb-wizard id="disabled-wizard" clickable>
  <orb-wizard-item active>Cart</orb-wizard-item>
  <orb-wizard-item>Shipping</orb-wizard-item>
  <orb-wizard-item disabled>Gift wrap</orb-wizard-item>
  <orb-wizard-item>Payment</orb-wizard-item>
</orb-wizard>
<orb-toolbar space="xs" style="margin-top: 1rem;">
  <orb-button fill="outline" data-wizard="previous disabled-wizard">Back</orb-button>
  <orb-button data-wizard="next disabled-wizard">Next</orb-button>
</orb-toolbar>
```

:::

**Manual test:**
- "Gift wrap" is dimmed and Tab skips it.
- From "Shipping", Next goes straight to "Payment", and Back from "Payment" returns to "Shipping".

### Navigating Declaratively

Give the wizard an `id` and add `data-wizard` to any button on the page: `next <id>`, `previous <id>`, or `goto <id> <index>`, where `index` starts at 0. The button doesn't need to be inside the wizard.

::: live-code-demo

```html
<orb-wizard id="declarative-wizard">
  <orb-wizard-item active>Cart</orb-wizard-item>
  <orb-wizard-item>Shipping</orb-wizard-item>
  <orb-wizard-item>Payment</orb-wizard-item>
</orb-wizard>
<orb-toolbar space="xs" style="margin-top: 1rem;">
  <orb-button fill="outline" data-wizard="previous declarative-wizard">Back</orb-button>
  <orb-button data-wizard="next declarative-wizard">Continue</orb-button>
  <orb-button fill="clear" data-wizard="goto declarative-wizard 2">Skip to Payment</orb-button>
</orb-toolbar>
```

:::

### Reacting to Changes

`orbStepChange` fires after the active step changes through `next()`, `previous()`, `goTo()`, a click, or a `data-wizard` button. `event.detail` has `index`, `previousIndex`, `step`, and `previousStep`. Setting `active` on an item yourself changes the step without emitting it.

The wizard never sets `completed`. This demo marks the step it leaves complete when moving forward, and clears it when going back.

::: live-code-demo

```html
<orb-wizard id="events-wizard">
  <orb-wizard-item active>Cart</orb-wizard-item>
  <orb-wizard-item>Shipping</orb-wizard-item>
  <orb-wizard-item>Payment</orb-wizard-item>
</orb-wizard>
<orb-toolbar space="xs" style="margin-top: 1rem;">
  <orb-button fill="outline" data-wizard="previous events-wizard">Back</orb-button>
  <orb-button data-wizard="next events-wizard">Continue</orb-button>
  <orb-button fill="outline" id="events-finish">Complete Payment</orb-button>
</orb-toolbar>
<p id="events-output" role="status" style="margin-top: 1rem;">Active step: 0</p>
```

```javascript
const wizard = document.querySelector("#events-wizard");
const output = document.querySelector("#events-output");

wizard.addEventListener("orbStepChange", (event) => {
  const { index, previousIndex, step, previousStep } = event.detail;
  if (previousStep && index > previousIndex) previousStep.completed = true;
  else step.completed = false;
  output.textContent = `Active step: ${index} (was ${previousIndex})`;
});
wizard.addEventListener("orbFinish", () => {
  output.textContent = "finish: every step is complete";
});
document.querySelector("#events-finish").addEventListener("click", () => {
  wizard.querySelector("orb-wizard-item[active]").completed = true;
});
```

:::

**Manual test:**
- Continue marks the step you leave as complete. Back clears the step you return to.
- On "Payment", press "Complete Payment". `orbFinish` fires once every step is complete.

### Pairing with Content

Keep each step's content in your own elements and show the matching one from a `orbStepChange` listener.

::: live-code-demo

```html
<orb-wizard id="content-wizard">
  <orb-wizard-item active>Cart</orb-wizard-item>
  <orb-wizard-item>Shipping</orb-wizard-item>
  <orb-wizard-item>Payment</orb-wizard-item>
</orb-wizard>
<orb-card style="margin-block: 1rem;">
  <p data-step="0">Review the items in your cart.</p>
  <p data-step="1" hidden>Enter the address to ship to.</p>
  <p data-step="2" hidden>Add a card to pay with.</p>
</orb-card>
<orb-toolbar space="xs">
  <orb-button fill="outline" data-wizard="previous content-wizard">Back</orb-button>
  <orb-button data-wizard="next content-wizard">Continue</orb-button>
</orb-toolbar>
```

```javascript
const wizard = document.querySelector("#content-wizard");
const panels = wizard.parentElement.querySelectorAll("[data-step]");
wizard.addEventListener("orbStepChange", (event) => {
  panels.forEach((panel) => (panel.hidden = Number(panel.dataset.step) !== event.detail.index));
});
```

:::

### Preventing a Step Change

`orbBeforeStepChange` fires before the step changes and is cancelable. Call `preventDefault()` to stop the change, for example to guard against unsaved data.

::: live-code-demo

```html
<orb-wizard id="guard-wizard">
  <orb-wizard-item completed>Cart</orb-wizard-item>
  <orb-wizard-item active>Shipping</orb-wizard-item>
  <orb-wizard-item>Payment</orb-wizard-item>
</orb-wizard>
<orb-toolbar space="xs" style="margin-top: 1rem;">
  <orb-toggle id="guard-unsaved" checked>Unsaved changes</orb-toggle>
  <orb-button data-wizard="next guard-wizard">Continue</orb-button>
</orb-toolbar>
<p id="guard-output" role="status" style="margin-top: 1rem;"></p>
```

```javascript
const wizard = document.querySelector("#guard-wizard");
const unsaved = document.querySelector("#guard-unsaved");
const output = document.querySelector("#guard-output");
wizard.addEventListener("orbBeforeStepChange", (event) => {
  if (unsaved.checked) {
    event.preventDefault();
    output.textContent = "Blocked by unsaved changes";
  } else {
    output.textContent = "";
  }
});
wizard.addEventListener("orbStepChange", (event) => {
  if (event.detail.previousStep) event.detail.previousStep.completed = true;
});
```

:::

**Manual test:** with the toggle on, Continue stays on "Shipping" and shows the message. Turn it off and Continue moves to "Payment".

### Setting the Active Step Directly

Set `active` on an item to make it the current step. The other steps become inactive automatically. This doesn't emit `orbStepChange` or make an announcement.

::: live-code-demo

```html
<orb-wizard id="direct-wizard">
  <orb-wizard-item active>One</orb-wizard-item>
  <orb-wizard-item>Two</orb-wizard-item>
  <orb-wizard-item>Three</orb-wizard-item>
</orb-wizard>
<orb-toolbar space="xs" style="margin-top: 1rem;">
  <orb-button fill="outline" class="direct" data-index="0">One</orb-button>
  <orb-button fill="outline" class="direct" data-index="1">Two</orb-button>
  <orb-button fill="outline" class="direct" data-index="2">Three</orb-button>
  <orb-button fill="outline" id="direct-add">Add a step</orb-button>
</orb-toolbar>
```

```javascript
const wizard = document.querySelector("#direct-wizard");
document.querySelectorAll(".direct").forEach((button) => {
  button.addEventListener("click", () => {
    wizard.querySelectorAll("orb-wizard-item")[button.dataset.index].active = true;
  });
});
let count = 3;
document.querySelector("#direct-add").addEventListener("click", () => {
  const item = document.createElement("orb-wizard-item");
  item.textContent = `Step ${++count}`;
  wizard.append(item);
});
```

:::

**Manual test:**
- Each button makes its step the only active one.
- "Add a step" adds a numbered step at the end, and the previous last step gains a connector.

### Customizing

Use the custom properties on `orb-wizard` and the parts and custom states on `orb-wizard-item`. This example turns the wizard into a transit line.

::: live-code-demo

```html
<orb-wizard class="transit-wizard" orientation="auto" label="Piccadilly line">
  <orb-wizard-item completed>Heathrow</orb-wizard-item>
  <orb-wizard-item completed>Earl's Court<span slot="note">District line</span></orb-wizard-item>
  <orb-wizard-item completed>Knightsbridge</orb-wizard-item>
  <orb-wizard-item active attention="pulse">Green Park<span slot="note">Victoria and Jubilee lines</span></orb-wizard-item>
  <orb-wizard-item>King's Cross</orb-wizard-item>
</orb-wizard>

<style>
  .transit-wizard {
    --line: var(--orb-primary-500);
    --marker-size: 1.25em;
    --connector-width: 0.375em;
    --connector-gap: 0px;
    --connector-color: var(--orb-primary-200);
    --connector-color-active: var(--line);
  }

  .transit-wizard orb-wizard-item::part(marker) {
    color: transparent;
    background-color: var(--orb-background-color, Canvas);
    border: 0.25em solid var(--line);
    box-shadow: none;
  }

  .transit-wizard orb-wizard-item:state(completed)::part(marker) {
    background-color: var(--line);
  }

  .transit-wizard orb-wizard-item:state(active)::part(marker) {
    scale: 1.25;
  }
</style>
```

:::

## Accessibility

- **Structure:** the wizard has the `list` role and each step has the `listitem` role, so screen readers announce the number of steps and each step's position. Set `label` when a page has more than one wizard.
- **Current step:** the active step has `aria-current="step"` on whichever element is focusable: the step itself, or its button when the wizard is `clickable`. Other steps have no `aria-current`.
- **Step changes are announced:** `next()`, `previous()`, `goTo()`, clicks, and `data-wizard` buttons announce "Step 2 of 4: Shipping" through a shared live region.
- **Step status:** each step has visually hidden status text: "Completed", "Not completed", "Disabled", "Locked", or "Error". The checkmark and other marker content are decorative.
- **Keyboard:** steps are only focusable when the wizard is `clickable`. Then each is a button, so Tab moves between them and Enter or Space activates one. Disabled and locked steps are disabled buttons, so Tab skips them.
- **Busy state:** a loading step has `aria-busy="true"`. The wizard gets the `loading` custom state for styling only.
- **Color:** `variant` is cosmetic. Put the reason in the label, note, or `error` text, and use the `icon` slot when a step should read as failed.

### Manual test checklist

- [ ] With a screen reader, the wizard is announced as a list with the right number of items.
- [ ] Each step reads its label, note, and status, such as "Shipping, Not completed".
- [ ] The active step is announced as the current step.
- [ ] Press Continue in "Reacting to Changes". The screen reader announces "Step 2 of 3: Shipping".
- [ ] In the "Clickable" demo, the active step's button has `aria-current="step"` and the step host doesn't.
- [ ] Disabled and locked steps announce "Disabled" and "Locked" and can't be focused.
- [ ] Marker text and icons are readable in light and dark mode, and active and completed steps look different.
