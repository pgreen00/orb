---
title: 'OrbMarkdown | <orb-markdown>'
sidebar_label: 'Markdown'
---

## Usage

Put a `<script type="text/markdown">` inside `<orb-markdown>`. The markdown is rendered into the light DOM, right after the script, so headings, lists, tables, and links pick up the page's native styles. The script tag keeps the browser from parsing the markdown as HTML.

Indentation shared by every line is removed, so the markdown can be indented to match the surrounding HTML.

::: live-code-demo

````html
<orb-markdown>
  <script type="text/markdown">
    # Website Redesign Project

    The redesign ships in **three phases**. See the [project board](https://example.com) for details.

    - Step 1: audit the current site
    - Step 2: design new templates
      1. Home page
      2. Product pages
    - Step 3: launch -- and celebrate

    > "Good design is as little design as possible."

    | Phase  | Owner | Status      |
    | ------ | ----- | ----------- |
    | Audit  | Sam   | Done        |
    | Design | Alex  | In progress |

    ```javascript
    console.log("hello");
    ```
  </script>
</orb-markdown>
````

:::

### Updating Content

Change the script's text and the component re-renders. Adding or replacing the script element also triggers a render.

::: live-code-demo

```html
<orb-markdown id="live-markdown">
  <script type="text/markdown">
    Edit the text box to update this.
  </script>
</orb-markdown>
<textarea id="live-markdown-input" rows="4" style="border: solid 1px; padding: 0.5rem;">## Hello

- Edit me
- **Bold** and _italic_</textarea>
```

```javascript
const source = document.querySelector("#live-markdown script");
const input = document.querySelector("#live-markdown-input");
input.addEventListener("input", () => {
  source.textContent = input.value;
});
```

:::

### Raw HTML

HTML in the markdown is escaped by default. Add the `html` attribute to render it. Only do this for trusted content, because the output isn't sanitized.

::: live-code-demo

```html
<orb-markdown>
  <script type="text/markdown">
    Escaped: <mark>highlighted</mark>
  </script>
</orb-markdown>
<orb-markdown html>
  <script type="text/markdown">
    Rendered: <mark>highlighted</mark>
  </script>
</orb-markdown>
```

:::

### Line Breaks

By default, a single line break joins lines into one paragraph. Add `breaks` to turn each line break into a `<br>`.

::: live-code-demo

```html
<orb-markdown breaks>
  <script type="text/markdown">
    Roses are red,
    violets are blue.
  </script>
</orb-markdown>
```

:::

### Links and Typography

`linkify` turns plain URLs like https://example.com into links. `typographer` turns `--` into a dash and straight quotes into curly ones. Both are on by default. Set them to `false` to turn them off.

::: live-code-demo

```html
<orb-markdown linkify="false" typographer="false">
  <script type="text/markdown">
    Plain text: https://example.com -- "quoted"
  </script>
</orb-markdown>
```

:::
