---
title: 'OrbWizardItem | <orb-wizard-item>'
sidebar_label: 'Wizard Item'
---

## Usage

`<orb-wizard-item>` is one step in an `<orb-wizard>`. Its content is the label. Add `active` to the current step and `completed` to finished ones. See [Wizard](/components/wizard/) for examples.

::: live-code-demo

```html
<orb-wizard>
  <orb-wizard-item completed>Account</orb-wizard-item>
  <orb-wizard-item active>
    Profile
    <span slot="note">Optional</span>
  </orb-wizard-item>
  <orb-wizard-item disabled>Team</orb-wizard-item>
  <orb-wizard-item error="Email not verified">Notifications</orb-wizard-item>
</orb-wizard>
```

:::

Only one step is active at a time. Setting `active` on a step makes the others inactive.

The wizard sets these data attributes on each step, for styling. Don't set them yourself.

| Attribute | Meaning |
| --- | --- |
| `data-index` | The step's position, starting at 0 |
| `data-locked` | The wizard is `linear` and the step can't be reached yet |
| `data-clickable` | The wizard is `clickable` |
| `data-stacked` | The steps are laid out vertically |
| `data-previous-completed` | The step before this one is completed |
| `data-previous-variant` | The step before this one's variant, or `danger` if it has an error |

Each step also has the `active`, `completed`, `locked`, and `error` custom states, so `orb-wizard-item:state(completed)::part(marker)` targets a completed step's marker.
