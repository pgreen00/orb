---
title: 'OrbViewManager | <orb-view-manager>'
sidebar_label: 'View Manager'
---

## Usage

A view manager shows one `orb-view` at a time and animates between them. Use it for multi-step wizards and nested flows, such as adding a related record without leaving a form. It's usually the content of an `orb-overlay`, and it fills its parent's height.

Give each view an `id`. Buttons with `data-view-link="<id>"` navigate to that view, and `value` sets which view shows first. Without `value`, the first view shows.

::: live-code-demo

```html
<div style="height: 18rem; border: 1px solid var(--orb-divider-color); border-radius: var(--orb-radius-md); overflow: hidden;">
  <orb-view-manager>
    <orb-view id="intro" label="Welcome" heading-level="2">
      <p>Views slide in from the side as you move forward.</p>
      <orb-button slot="footer" data-view-link="next-step">Continue</orb-button>
    </orb-view>
    <orb-view id="next-step" label="Second view" heading-level="2">
      <p>Going back reverses the animation.</p>
      <orb-button slot="footer" fill="outline" data-view-link="intro" data-view-dir="backwards">Back</orb-button>
    </orb-view>
  </orb-view-manager>
</div>
```

:::

**Manual test:**
- Continue slides the second view in from the right. Back slides the first view in from the left.
- After navigating with the keyboard, focus lands on the new view's heading.
- With "Reduce motion" turned on in your OS, the views crossfade instead of sliding.

## Breadcrumbs

Add `data-view-crumbs` to links for nested views. Going forwards adds the view to the trail, and going backwards (with `data-view-dir="backwards"`) removes crumbs back to it. Each view in the trail shows the breadcrumbs above its label, and clicking a crumb goes back to that view. Navigating without `data-view-crumbs` starts a new trail.

::: live-code-demo

```html
<div style="height: 22rem; border: 1px solid var(--orb-divider-color); border-radius: var(--orb-radius-md); overflow: hidden;">
  <orb-view-manager>
    <orb-view id="settings" label="Settings" heading-level="2">
      <orb-stack space="xs">
        <orb-button fill="outline" data-view-link="settings-account" data-view-crumbs>Account</orb-button>
        <orb-button fill="outline" data-view-link="settings-privacy" data-view-crumbs>Privacy</orb-button>
      </orb-stack>
    </orb-view>
    <orb-view id="settings-account" label="Account" heading-level="2">
      <orb-button fill="outline" data-view-link="settings-password" data-view-crumbs>Change password</orb-button>
    </orb-view>
    <orb-view id="settings-password" label="Change password" heading-level="2">
      <p>Three levels deep. Click a crumb to jump back.</p>
      <orb-button slot="footer" fill="outline" data-view-link="settings-account" data-view-dir="backwards" data-view-crumbs>Cancel</orb-button>
    </orb-view>
    <orb-view id="settings-privacy" label="Privacy" heading-level="2">
      <p>Privacy settings.</p>
    </orb-view>
  </orb-view-manager>
</div>
```

:::

**Manual test:**
- "Settings" has no breadcrumbs. Open Account, then Change password. The trail reads `Settings / Account / Change password`.
- Click "Settings" in the trail. It slides back to Settings and the trail is cleared.
- Cancel on Change password goes back one level, to `Settings / Account`.

## Wizards

Put one `orb-wizard` in the `wizard` slot. The manager moves it to the top of the content of whichever view has `show-wizard`, and hides it on other views. Since it's the same element, its progress carries across views. Control it with `data-wizard` buttons, which work alongside `data-view-link` on the same button.

Put each view's content in a `<template>` to lazy load it. The content is created when the view is shown and removed when it's hidden, so restore any form values from your own state when the view comes back. `orbViewChange` and `orbViewMount` tell you which view just appeared.

This example adds a product in an overlay. "Add manufacturer" is a nested view inside the Details step, with breadcrumbs, and it doesn't show the wizard.

::: live-code-demo

```html
<orb-button id="product-wizard-trigger">Add product</orb-button>
<orb-overlay trigger="product-wizard-trigger" side="left">
  <orb-view-manager id="product-manager" value="product-details">
    <orb-wizard id="product-wizard" slot="wizard" label="Add product progress">
      <orb-wizard-item active>Details</orb-wizard-item>
      <orb-wizard-item>Pricing</orb-wizard-item>
      <orb-wizard-item>Release</orb-wizard-item>
    </orb-wizard>

    <orb-view id="product-details" label="Details" heading-level="2" show-wizard closable>
      <template>
        <form id="details-form">
          <orb-stack>
            <orb-textbox label="Name"><input name="name" required /></orb-textbox>
            <orb-textbox label="Manufacturer">
              <select name="manufacturer" required></select>
              <orb-button slot="after" fill="outline" data-view-link="add-manufacturer" data-view-crumbs>New</orb-button>
            </orb-textbox>
          </orb-stack>
        </form>
        <orb-button slot="footer" type="submit" form="details-form">Next</orb-button>
      </template>
    </orb-view>

    <orb-view id="add-manufacturer" label="Add manufacturer" heading-level="2">
      <template>
        <orb-button slot="header-start" class="icon-only" fill="clear" aria-label="Back" data-view-link="product-details" data-view-dir="backwards" data-view-crumbs>
          <iconify-icon icon="mdi:chevron-left" aria-hidden="true"></iconify-icon>
        </orb-button>
        <form id="manufacturer-form">
          <orb-textbox label="Manufacturer name"><input name="name" required /></orb-textbox>
        </form>
        <orb-button slot="footer" fill="outline" data-view-link="product-details" data-view-dir="backwards" data-view-crumbs>Cancel</orb-button>
        <orb-button slot="footer" type="submit" form="manufacturer-form">Save</orb-button>
      </template>
    </orb-view>

    <orb-view id="product-pricing" label="Pricing" heading-level="2" show-wizard closable>
      <template>
        <form id="pricing-form">
          <orb-textbox label="Price"><input name="price" type="number" min="0" step="0.01" required /></orb-textbox>
        </form>
        <orb-button slot="footer" fill="outline" data-view-link="product-details" data-view-dir="backwards" data-wizard="previous product-wizard">Back</orb-button>
        <orb-button slot="footer" type="submit" form="pricing-form">Next</orb-button>
      </template>
    </orb-view>

    <orb-view id="product-release" label="Release" heading-level="2" show-wizard closable>
      <template>
        <pre id="product-summary"></pre>
        <orb-button slot="footer" fill="outline" data-view-link="product-pricing" data-view-dir="backwards" data-wizard="previous product-wizard">Back</orb-button>
        <orb-button slot="footer" data-overlay="hide">Release product</orb-button>
      </template>
    </orb-view>
  </orb-view-manager>
</orb-overlay>
```

```javascript
const manager = document.querySelector("#product-manager");
const wizard = document.querySelector("#product-wizard");
const state = { details: {}, pricing: {}, manufacturers: ["Acme"] };

// The wizard never marks steps complete itself.
wizard.addEventListener("orbStepChange", (event) => {
  const { index, previousIndex, step, previousStep } = event.detail;
  if (previousStep && index > previousIndex) previousStep.completed = true;
  else step.completed = false;
});

// Template content is recreated each time a view shows, so restore it here.
const restore = (id) => {
  if (id === "product-details") {
    const form = manager.querySelector("#details-form");
    if (!form) return;
    form.manufacturer.replaceChildren(
      ...state.manufacturers.map((name) => new Option(name, name)),
    );
    form.name.value = state.details.name ?? "";
    form.manufacturer.value = state.details.manufacturer ?? state.manufacturers.at(-1);
  } else if (id === "product-pricing") {
    const form = manager.querySelector("#pricing-form");
    if (form) form.price.value = state.pricing.price ?? "";
  } else if (id === "product-release") {
    const summary = manager.querySelector("#product-summary");
    if (summary) summary.textContent = JSON.stringify(
      { ...state.details, ...state.pricing },
      null,
      2,
    );
  }
};
manager.addEventListener("orbViewMount", (event) => restore(event.detail));
manager.addEventListener("orbViewChange", (event) => restore(event.detail.to));
// The first view may have mounted before this script ran.
restore(manager.value);

// Saves Details as the user types, so it survives a trip to "Add manufacturer".
manager.addEventListener("input", (event) => {
  const form = event.target.closest("#details-form");
  if (form) state.details = Object.fromEntries(new FormData(form));
});

// Forms inside templates come and go, so listen for submits on the manager.
manager.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  if (event.target.id === "details-form") {
    state.details = data;
    wizard.next();
    manager.navigate("product-pricing");
  } else if (event.target.id === "manufacturer-form") {
    state.manufacturers.push(data.name);
    state.details = { ...state.details, manufacturer: data.name };
    manager.navigate("product-details", { direction: "backwards", crumbs: true });
  } else if (event.target.id === "pricing-form") {
    state.pricing = data;
    wizard.next();
    manager.navigate("product-release");
  }
});
```

:::

**Manual test:**
- Open the overlay. "Details" shows the wizard with step 1 active.
- Press "New" next to Manufacturer. "Add manufacturer" slides in with `Details / Add manufacturer` breadcrumbs and no wizard.
- Save a manufacturer. You return to Details with the new manufacturer selected, and any name you typed is still there.
- Press Next with an empty name. The browser's validation stops you.
- Fill in Details and Pricing. Each completed step gets a checkmark, and Release shows a summary of what you entered.
- Back from Release returns to Pricing with your price filled in, and moves the wizard back a step.
- The close button and "Release product" close the overlay.

## Setting the View

Set `value` to a view's `id` to show it without an animation. That emits `orbViewMount` instead of `orbViewChange`. To restore a flow, for example after a page refresh, save `value` and `crumbs` and set both.

::: live-code-demo

```html
<orb-toolbar space="xs" style="margin-bottom: 1rem;">
  <orb-button size="sm" fill="outline" class="set-view" data-id="set-a">Show A</orb-button>
  <orb-button size="sm" fill="outline" class="set-view" data-id="set-b">Show B</orb-button>
  <orb-button size="sm" fill="outline" id="set-restore">Restore A / B / C</orb-button>
</orb-toolbar>
<div style="height: 16rem; border: 1px solid var(--orb-divider-color); border-radius: var(--orb-radius-md); overflow: hidden;">
  <orb-view-manager id="set-manager">
    <orb-view id="set-a" label="View A" heading-level="2">
      <orb-button data-view-link="set-b" data-view-crumbs>Go to B</orb-button>
    </orb-view>
    <orb-view id="set-b" label="View B" heading-level="2">
      <orb-button data-view-link="set-c" data-view-crumbs>Go to C</orb-button>
    </orb-view>
    <orb-view id="set-c" label="View C" heading-level="2">
      <p>The end.</p>
    </orb-view>
  </orb-view-manager>
</div>
<p id="set-log" role="status" style="margin-top: 1rem;">Events will appear here.</p>
```

```javascript
const manager = document.querySelector("#set-manager");
const log = document.querySelector("#set-log");
manager.addEventListener("orbViewMount", (event) => (log.textContent = `viewMount: ${event.detail}`));
manager.addEventListener("orbViewChange", (event) => {
  log.textContent = `viewChange: ${event.detail.from} → ${event.detail.to}, crumbs: ${manager.crumbs.join(" / ")}`;
});
document.querySelectorAll(".set-view").forEach((button) => {
  button.addEventListener("click", () => (manager.value = button.dataset.id));
});
document.querySelector("#set-restore").addEventListener("click", () => {
  manager.crumbs = ["set-a", "set-b", "set-c"];
  manager.value = "set-c";
});
```

:::

**Manual test:**
- "Show B" switches instantly and logs `viewMount: set-b`.
- "Go to C" animates and logs `orbViewChange` with the crumbs.
- "Restore A / B / C" shows View C with the full trail.

## Lifecycle

Set `init` and `destroy` on a view to run code before it's shown and after it's hidden, for example to load data. Both can return a promise, and the manager waits for it.

`init` runs before the view's template is cloned, so use it to fetch data, and fill in the cloned content from `orbViewChange` or `orbViewMount`.

```js
const view = document.querySelector("#product-pricing");
let suggestedPrice;
view.init = async () => {
  suggestedPrice = await fetchSuggestedPrice();
};
view.destroy = () => {
  suggestedPrice = undefined;
};
manager.addEventListener("orbViewChange", (event) => {
  if (event.detail.to === "product-pricing") {
    manager.querySelector("#pricing-form").price.placeholder = suggestedPrice;
  }
});
```

## Accessibility

- After navigating, focus moves to the new view's heading if focus was in the view, so keyboard and screen reader users start at the top of the new view.
- The outgoing view is inert while it animates out, so it can't be clicked or focused.
- Animations become a crossfade when the user prefers reduced motion.
- Breadcrumbs and the wizard bring their own accessibility features. Give the wizard a `label`.
