---
title: 'OrbTabs | <orb-tabs>'
sidebar_label: 'Tabs'
---

::: live-code-demo

```html
<orb-tabs closable class="orb-radius-md">
  <orb-tab-button panel="tab1">Tab 1</orb-tab-button>
  <orb-tab-button panel="tab2">Tab 2</orb-tab-button>
  <orb-tab-button panel="tab3">Tab 3</orb-tab-button>
  <orb-tab-button panel="tab4">Tab 4</orb-tab-button>
  <orb-tab-button panel="tab5">Tab 5</orb-tab-button>

  <orb-tab-panel name="tab1">Tab 1 content</orb-tab-panel>
  <orb-tab-panel name="tab2">Tab 2 content</orb-tab-panel>
  <orb-tab-panel name="tab3">Tab 3 content</orb-tab-panel>
  <orb-tab-panel name="tab4">Tab 4 content</orb-tab-panel>
  <orb-tab-panel name="tab5">Tab 5 content</orb-tab-panel>
</orb-tabs>
```

:::

### Keyboard

Only the active tab is in the Tab order. Tab into the tab bar, then use these keys. Moving to a tab also selects it.

| Key | Action |
| --- | --- |
| Left / Right | Previous / next tab, for `top` and `bottom` placements. Flipped in right-to-left pages. |
| Up / Down | Previous / next tab, for `start` and `end` placements |
| Home / End | First / last tab |
| Delete | Closes the tab when `closable` is set. Emits `orbTabClose` like the close button. |

Arrow keys wrap from the last tab to the first and back. When a focused tab closes, focus moves to the tab that becomes active.

### Closing Tabs

Add `closable` to show a close button on each tab. Clicking it emits a cancelable `orbTabClose` event from the tab button, with `{ panel }` in `event.detail`. If no listener calls `preventDefault()`, the tab button and its panel are removed. When the active tab closes, the next tab becomes active, or the previous one if it was last.

Call `closeTab(panel)` on `orb-tabs` to close a tab from code. It doesn't emit `orbTabClose`.

::: live-code-demo

```html
<label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
  <input type="checkbox" id="close-guard" />
  Keep "Unsaved" open
</label>
<orb-tabs id="close-tabs" closable class="orb-radius-md">
  <orb-tab-button panel="close1">Readme</orb-tab-button>
  <orb-tab-button panel="close2">Unsaved</orb-tab-button>
  <orb-tab-button panel="close3">Notes</orb-tab-button>
  <orb-tab-panel name="close1">Readme content</orb-tab-panel>
  <orb-tab-panel name="close2">This tab has unsaved changes.</orb-tab-panel>
  <orb-tab-panel name="close3">Notes content</orb-tab-panel>
</orb-tabs>
<p id="close-log" role="status" style="margin-top: 1rem;">Close a tab.</p>
```

```javascript
const tabs = document.querySelector("#close-tabs");
const guard = document.querySelector("#close-guard");
const log = document.querySelector("#close-log");

tabs.addEventListener("orbTabClose", (event) => {
  if (guard.checked && event.detail.panel === "close2") {
    event.preventDefault();
    log.textContent = "Blocked closing Unsaved.";
  } else {
    log.textContent = `Closed ${event.detail.panel}.`;
  }
});
```

:::

### Lazy Loading

Put a panel's content inside a `<template>` to lazy load it. The template is cloned into the panel the first time the panel is selected, so content in tabs nobody opens is never created. Content outside the template renders as usual.

Set `offload-delay` (in milliseconds) on `orb-tabs` to remove loaded content again once a panel has been inactive that long. Selecting the panel re-creates it from the template, so any state inside it, like form input or scroll position, is reset. Panels can set their own `offload-delay` to override the tabs' value. Without a delay, loaded content stays.

In this demo, inactive panels offload after 3 seconds. Type in the Form tab, switch away, and come back within 3 seconds to keep the text. Wait longer and it resets. The Settings panel sets its own delay of `0`, so it offloads as soon as you leave it.

::: live-code-demo

```html
<orb-tabs offload-delay="3000" class="orb-radius-md">
  <orb-tab-button panel="lazy1">Eager</orb-tab-button>
  <orb-tab-button panel="lazy2">Form</orb-tab-button>
  <orb-tab-button panel="lazy3">Settings</orb-tab-button>

  <orb-tab-panel name="lazy1">This content isn't in a template, so it's always in the DOM.</orb-tab-panel>
  <orb-tab-panel name="lazy2">
    <template>
      <p>Loaded at <span class="lazy-time"></span></p>
      <input placeholder="Type something" style="border: solid 1px; padding: 0.25rem;" />
    </template>
  </orb-tab-panel>
  <orb-tab-panel name="lazy3" offload-delay="0">
    <template>
      <p>Loaded at <span class="lazy-time"></span></p>
    </template>
  </orb-tab-panel>
</orb-tabs>
```

```javascript
// Stamps each freshly loaded template so you can see when content is re-created.
const stamp = () => {
  document.querySelectorAll(".lazy-time:empty").forEach((el) => {
    el.textContent = new Date().toLocaleTimeString();
  });
};
new MutationObserver(stamp).observe(document.body, { childList: true, subtree: true });
```

:::

### Pills

Add `pills` to show the tab buttons as rounded pills in a toolbar, like modern browser tabs. Long labels are truncated with an ellipsis.

::: live-code-demo

```html
<orb-tabs pills closable class="orb-radius-md">
  <orb-tab-button panel="pill1">Inbox</orb-tab-button>
  <orb-tab-button panel="pill2">Drafts</orb-tab-button>
  <orb-tab-button panel="pill3">A very long tab label that gets truncated</orb-tab-button>

  <orb-tab-panel name="pill1">Inbox content</orb-tab-panel>
  <orb-tab-panel name="pill2">Drafts content</orb-tab-panel>
  <orb-tab-panel name="pill3">Long label content</orb-tab-panel>
</orb-tabs>
```

:::

### Overflow

When the tabs don't fit, the tab bar scrolls horizontally by default. Add `wrap` to move the extra tabs onto new lines instead. Narrow the window to see both behaviors. Vertical placements always scroll.

::: live-code-demo

```html
<orb-stack space="lg">
  <orb-tabs class="orb-radius-md">
    <orb-tab-button panel="scroll1">Overview</orb-tab-button>
    <orb-tab-button panel="scroll2">Activity</orb-tab-button>
    <orb-tab-button panel="scroll3">Members</orb-tab-button>
    <orb-tab-button panel="scroll4">Billing</orb-tab-button>
    <orb-tab-button panel="scroll5">Integrations</orb-tab-button>
    <orb-tab-button panel="scroll6">Security</orb-tab-button>
    <orb-tab-button panel="scroll7">Notifications</orb-tab-button>
    <orb-tab-button panel="scroll8">Advanced</orb-tab-button>
    <orb-tab-panel name="scroll1">The tab bar scrolls when it overflows.</orb-tab-panel>
    <orb-tab-panel name="scroll2">Activity</orb-tab-panel>
    <orb-tab-panel name="scroll3">Members</orb-tab-panel>
    <orb-tab-panel name="scroll4">Billing</orb-tab-panel>
    <orb-tab-panel name="scroll5">Integrations</orb-tab-panel>
    <orb-tab-panel name="scroll6">Security</orb-tab-panel>
    <orb-tab-panel name="scroll7">Notifications</orb-tab-panel>
    <orb-tab-panel name="scroll8">Advanced</orb-tab-panel>
  </orb-tabs>
  <orb-tabs wrap pills class="orb-radius-md">
    <orb-tab-button panel="wrap1">Overview</orb-tab-button>
    <orb-tab-button panel="wrap2">Activity</orb-tab-button>
    <orb-tab-button panel="wrap3">Members</orb-tab-button>
    <orb-tab-button panel="wrap4">Billing</orb-tab-button>
    <orb-tab-button panel="wrap5">Integrations</orb-tab-button>
    <orb-tab-button panel="wrap6">Security</orb-tab-button>
    <orb-tab-button panel="wrap7">Notifications</orb-tab-button>
    <orb-tab-button panel="wrap8">Advanced</orb-tab-button>
    <orb-tab-panel name="wrap1">With wrap, extra tabs move to a new line.</orb-tab-panel>
    <orb-tab-panel name="wrap2">Activity</orb-tab-panel>
    <orb-tab-panel name="wrap3">Members</orb-tab-panel>
    <orb-tab-panel name="wrap4">Billing</orb-tab-panel>
    <orb-tab-panel name="wrap5">Integrations</orb-tab-panel>
    <orb-tab-panel name="wrap6">Security</orb-tab-panel>
    <orb-tab-panel name="wrap7">Notifications</orb-tab-panel>
    <orb-tab-panel name="wrap8">Advanced</orb-tab-panel>
  </orb-tabs>
</orb-stack>
```

:::

### Placement

Set the `placement` attribute to move the tabs to a different edge of the panels.

| Placement | Tabs appear |
| --- | --- |
| `top` (default) | Above the panels, horizontally |
| `bottom` | Below the panels, horizontally |
| `start` | Before the panels, stacked vertically |
| `end` | After the panels, stacked vertically |

`start` and `end` follow the writing direction, so `start` is on the right in right-to-left pages. Vertical tabs set `aria-orientation="vertical"`.

::: live-code-demo

```html
<orb-stack space="lg">
  <orb-tabs placement="bottom" class="orb-radius-md">
    <orb-tab-button panel="bottom1">Tab 1</orb-tab-button>
    <orb-tab-button panel="bottom2">Tab 2</orb-tab-button>
    <orb-tab-panel name="bottom1">Tabs below the panels</orb-tab-panel>
    <orb-tab-panel name="bottom2">Tab 2 content</orb-tab-panel>
  </orb-tabs>
  <orb-tabs placement="start" class="orb-radius-md">
    <orb-tab-button panel="start1">Tab 1</orb-tab-button>
    <orb-tab-button panel="start2">Tab 2</orb-tab-button>
    <orb-tab-button panel="start3">Tab 3</orb-tab-button>
    <orb-tab-panel name="start1">Tabs before the panels</orb-tab-panel>
    <orb-tab-panel name="start2">Tab 2 content</orb-tab-panel>
    <orb-tab-panel name="start3">Tab 3 content</orb-tab-panel>
  </orb-tabs>
  <orb-tabs placement="end" class="orb-radius-md">
    <orb-tab-button panel="end1">Tab 1</orb-tab-button>
    <orb-tab-button panel="end2">Tab 2</orb-tab-button>
    <orb-tab-button panel="end3">Tab 3</orb-tab-button>
    <orb-tab-panel name="end1">Tabs after the panels</orb-tab-panel>
    <orb-tab-panel name="end2">Tab 2 content</orb-tab-panel>
    <orb-tab-panel name="end3">Tab 3 content</orb-tab-panel>
  </orb-tabs>
</orb-stack>
```

:::

Placement works with `pills` too. The divider line moves to the edge that faces the panels.

::: live-code-demo

```html
<orb-tabs pills placement="start" class="orb-radius-md">
  <orb-tab-button panel="pstart1">Inbox</orb-tab-button>
  <orb-tab-button panel="pstart2">Drafts</orb-tab-button>
  <orb-tab-button panel="pstart3">Archive</orb-tab-button>
  <orb-tab-panel name="pstart1">Inbox content</orb-tab-panel>
  <orb-tab-panel name="pstart2">Drafts content</orb-tab-panel>
  <orb-tab-panel name="pstart3">Archive content</orb-tab-panel>
</orb-tabs>
```

:::