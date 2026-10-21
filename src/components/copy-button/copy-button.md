---
title: 'OrbCopyButton | <orb-copy-button>'
sidebar_label: 'Copy Button'
---

## Usage

Wrap text in `<orb-copy-button>` to copy it to the clipboard. Set the `value` attribute to copy something other than the text content.

::: live-code-demo

```html
<p>
  <orb-copy-button>npm install orb-style</orb-copy-button>
</p>
<p>
  <orb-copy-button value="sk_test_example_123" label="Copy token">Token: sk_test_example_123</orb-copy-button>
</p>
<p>
  <orb-copy-button size="xs" value="xs">xs</orb-copy-button>
  <orb-copy-button size="sm" value="sm">sm</orb-copy-button>
  <orb-copy-button size="md" value="md">md</orb-copy-button>
  <orb-copy-button size="lg" value="lg">lg</orb-copy-button>
</p>
```

:::
