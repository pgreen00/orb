---
title: 'OrbTree | <orb-tree>'
sidebar_label: 'Tree'
---

::: live-code-demo

```html
<orb-stack>
  <orb-radio-group id="selection-radio-group" value="single" label="Selection Type">
    <orb-radio-button value="single">Single</orb-radio-button>
    <orb-radio-button value="multiple">Multiple</orb-radio-button>
    <orb-radio-button value="leaf">Leaf</orb-radio-button>
  </orb-radio-group>
  <orb-tree id="selection-tree" selection="single">
    <orb-branch label="Branch 1">
      <orb-branch label="Branch 1.a"></orb-branch>
      <orb-branch label="Branch 1.b"></orb-branch>
      <orb-branch label="Branch 1.c"></orb-branch>
    </orb-branch>
    <orb-branch label="Branch 2"></orb-branch>
    <orb-branch label="Branch 3"></orb-branch>
  </orb-tree>
</orb-stack>
```

```javascript
const tree = document.querySelector('#selection-tree')
const radioGroup = document.querySelector('#selection-radio-group')

radioGroup.addEventListener('valueChange', (e) => {
  tree.selection = e.detail
  tree.value = e.detail === 'multiple' ? [] : ''
})
```

:::