import { test, expect, type Page } from "@playwright/test";
import { editor } from "./rich-text-utils";

/** The editor's content in a format, from its public method */
const exportAs = (page: Page, format: "markdown" | "json") =>
  page.locator("orb-rich-text").evaluate((el: any, f: string) => el.exportAs(f), format);

test.describe("orb-rich-text export to markdown", () => {
  test("paragraphs are separated by one blank line", async ({ page }) => {
    await editor(page, "<p>First</p><p>Second</p>");
    expect(await exportAs(page, "markdown")).toBe("First\n\nSecond\n");
  });

  test("headings use one to six hashes", async ({ page }) => {
    await editor(page, "<h1>H1</h1><h2>H2</h2><h3>H3</h3><h4>H4</h4><h5>H5</h5><h6>H6</h6>");
    expect(await exportAs(page, "markdown")).toBe(
      "# H1\n\n## H2\n\n### H3\n\n#### H4\n\n##### H5\n\n###### H6\n",
    );
  });

  test("bold, italic, strike and inline code", async ({ page }) => {
    await editor(page, "<p><strong>bold</strong> <em>italic</em> <s>strike</s> <code>code</code></p>");
    expect(await exportAs(page, "markdown")).toBe("**bold** *italic* ~~strike~~ `code`\n");
  });

  test("a link", async ({ page }) => {
    await editor(page, '<p>See <a href="https://example.com/a">the docs</a></p>');
    expect(await exportAs(page, "markdown")).toBe("See [the docs](https://example.com/a)\n");
  });

  test("nested bullet and ordered lists are indented by their marker", async ({ page }) => {
    await editor(
      page,
      "<ul><li>One<ul><li>Inner</li></ul></li><li>Two</li></ul>" +
        "<ol><li>First<ol><li>Deep</li></ol></li><li>Second</li></ol>",
    );
    expect(await exportAs(page, "markdown")).toBe("- One\n  - Inner\n- Two\n\n1. First\n   1. Deep\n2. Second\n");
  });

  test("a task list", async ({ page }) => {
    await editor(
      page,
      '<ul><li><input type="checkbox" checked>Done</li><li><input type="checkbox">Todo</li></ul>',
    );
    expect(await exportAs(page, "markdown")).toBe("- [x] Done\n- [ ] Todo\n");
  });

  test("a blockquote prefixes each of its blocks", async ({ page }) => {
    await editor(page, "<blockquote><p>Quoted</p><p>Second</p></blockquote>");
    expect(await exportAs(page, "markdown")).toBe("> Quoted\n>\n> Second\n");
  });

  test("a code block with its language", async ({ page }) => {
    await editor(page, '<pre><code class="language-ts">let a = 1;\nlet b = 2;</code></pre>');
    expect(await exportAs(page, "markdown")).toBe("```ts\nlet a = 1;\nlet b = 2;\n```\n");
  });

  test("a horizontal rule", async ({ page }) => {
    await editor(page, "<p>Above</p><hr><p>Below</p>");
    expect(await exportAs(page, "markdown")).toBe("Above\n\n---\n\nBelow\n");
  });

  test("an image in a figure is followed by its caption", async ({ page }) => {
    await editor(
      page,
      '<figure><img src="https://example.com/cat.png" alt="A cat"><figcaption>Our cat</figcaption></figure>',
    );
    expect(await exportAs(page, "markdown")).toBe("![A cat](https://example.com/cat.png)\n\nOur cat\n");
  });

  test("a YouTube embed is a link to the video", async ({ page }) => {
    await editor(
      page,
      '<figure data-embed="youtube"><iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"></iframe></figure>',
    );
    expect(await exportAs(page, "markdown")).toBe(
      "[https://www.youtube.com/watch?v=dQw4w9WgXcQ](https://www.youtube.com/watch?v=dQw4w9WgXcQ)\n",
    );
  });

  test("a table with a header row and a line break in a cell", async ({ page }) => {
    await editor(
      page,
      "<table><thead><tr><th>Name</th><th>Note</th></tr></thead>" +
        "<tbody><tr><td>Ann</td><td>one<br>two</td></tr></tbody></table>",
    );
    expect(await exportAs(page, "markdown")).toBe("| Name | Note |\n| --- | --- |\n| Ann | one<br>two |\n");
  });

  test("mentions, tags and placeholders", async ({ page }) => {
    await editor(
      page,
      '<p>Hi <span data-mention="u1">@Ada</span>, see <span data-tag="t1">#news</span> for <span data-param="name">Name</span></p>',
    );
    expect(await exportAs(page, "markdown")).toBe("Hi @Ada, see #news for {{name}}\n");
  });

  test("markup characters in text are escaped", async ({ page }) => {
    await editor(page, "<p>2 * 3 = 6 and a_b</p><p># Not a title</p>");
    expect(await exportAs(page, "markdown")).toBe("2 \\* 3 = 6 and a\\_b\n\n\\# Not a title\n");
  });

  test("underline and colors are dropped and their text kept", async ({ page }) => {
    await editor(page, '<p><u>Under</u> and <span style="color: rgb(255, 0, 0);">red</span></p>');
    expect(await exportAs(page, "markdown")).toBe("Under and red\n");
  });
});

test.describe("orb-rich-text export to JSON", () => {
  test("a paragraph with bold text", async ({ page }) => {
    await editor(page, "<p>Hi <strong>there</strong></p>");
    expect(await exportAs(page, "json")).toEqual([
      {
        type: "paragraph",
        children: [
          { type: "text", text: "Hi " },
          { type: "text", text: "there", marks: [{ type: "bold" }] },
        ],
      },
    ]);
  });

  test("a task list", async ({ page }) => {
    await editor(
      page,
      '<ul><li><input type="checkbox" checked>Done</li><li><input type="checkbox">Todo</li></ul>',
    );
    expect(await exportAs(page, "json")).toEqual([
      {
        type: "taskList",
        children: [
          { type: "listItem", attrs: { checked: "true" }, children: [{ type: "text", text: "Done" }] },
          { type: "listItem", attrs: { checked: "false" }, children: [{ type: "text", text: "Todo" }] },
        ],
      },
    ]);
  });
});
