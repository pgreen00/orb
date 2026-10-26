---
title: 'OrbCheckboxGroup | <orb-checkbox-group>'
sidebar_label: 'Checkbox Group'
---

## Usage

Wrap related checkboxes or toggles in `<orb-checkbox-group>` to give them a shared label. The group has the `group` role, takes its accessible name from the label, and takes its description from the note. Each control still submits its own value with a form.

::: live-code-demo

```html
<orb-checkbox-group label="Notifications" note="Choose how we contact you.">
  <orb-checkbox name="email" checked="true">Email</orb-checkbox>
  <orb-checkbox name="sms">Text message</orb-checkbox>
  <orb-checkbox name="push">Push notification</orb-checkbox>
</orb-checkbox-group>
```

:::

### Toggles

The group works the same way with toggles.

::: live-code-demo

```html
<orb-checkbox-group label="Privacy">
  <orb-toggle name="analytics" checked>Share usage analytics</orb-toggle>
  <orb-toggle name="personalization">Personalized recommendations</orb-toggle>
</orb-checkbox-group>
```

:::

### Mode

Controls are stacked in a column by default. Set `mode="row"` to put them in a row that wraps when there isn't enough room.

::: live-code-demo

```html
<orb-checkbox-group label="Days" mode="row">
  <orb-checkbox name="mon">Mon</orb-checkbox>
  <orb-checkbox name="tue">Tue</orb-checkbox>
  <orb-checkbox name="wed">Wed</orb-checkbox>
  <orb-checkbox name="thu">Thu</orb-checkbox>
  <orb-checkbox name="fri">Fri</orb-checkbox>
</orb-checkbox-group>
```

:::

### Slots

Use the `label` and `note` slots when the label or note needs HTML. The slotted content still names and describes the group.

::: live-code-demo

```html
<orb-checkbox-group>
  <orb-label slot="label">Interests <small>(optional)</small></orb-label>
  <orb-checkbox name="design">Design</orb-checkbox>
  <orb-checkbox name="engineering">Engineering</orb-checkbox>
  <orb-note slot="note">See the <a class="orb underline" href="#">privacy policy</a> for how we use this.</orb-note>
</orb-checkbox-group>
```

:::

### Accessibility

Inspect the group in your browser's accessibility tree. It should have the `group` role, the label as its name, and the note as its description. A screen reader announces the group name when focus moves into the first control.
