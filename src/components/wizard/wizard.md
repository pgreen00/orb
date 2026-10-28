---
title: 'OrbWizard | <orb-wizard>'
sidebar_label: 'Wizard'
---

::: live-code-demo

```html
<orb-wizard>
  <orb-wizard-item completed>Cart</orb-wizard-item>
  <orb-wizard-item active>Shipping</orb-wizard-item>
  <orb-wizard-item>Payment</orb-wizard-item>
</orb-wizard>
```

:::

::: live-code-demo

```html
<orb-wizard>
  <orb-wizard-item completed>Account</orb-wizard-item>
  <orb-wizard-item>
    Profile
    <span slot="note">Optional</span>
  </orb-wizard-item>
  <orb-wizard-item active>Team</orb-wizard-item>
  <orb-wizard-item>Notifications</orb-wizard-item>
</orb-wizard>
```

:::