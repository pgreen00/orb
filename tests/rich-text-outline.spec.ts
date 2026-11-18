import { test, expect, type Page } from "@playwright/test";
import { choose, content, editor, placeCaret, selectText } from "./rich-text-utils";

const toolbarButton = (page: Page, id: string) => page.locator(`orb-rich-text #action-${id}`);

// The tests below need the editor to assign heading ids, refresh the TOC and
// register a "toc" command after each change. They fail until those are wired.
test.describe("orb-rich-text outline", () => {
  test("a heading without an id gets one from its text, and an existing id is kept", async ({ page }) => {
    await editor(page, '<h2 id="setup">Setup</h2><p>Body</p>');
    await selectText(page, "Body");
    await choose(page, "blockType", "Heading 1");
    expect(await content(page)).toBe('<h2 id="setup">Setup</h2><h1 id="body">Body</h1>');
  });

  test("a heading with the same text as one before it gets a -2 suffix", async ({ page }) => {
    await editor(page, "<h1>Intro</h1><p>Intro</p>");
    await selectText(page, "Intro", 1);
    await choose(page, "blockType", "Heading 2");
    expect(await content(page)).toBe('<h1 id="intro">Intro</h1><h2 id="intro-2">Intro</h2>');
  });

  test("the table of contents nests headings by level, and a skipped level nests one step under the item above", async ({ page }) => {
    await editor(page, "<h1>Intro</h1><h2>Setup</h2><h4>Deep</h4><h2>After</h2><p>Body</p>", 'toolbar="toc"');
    await placeCaret(page, "Body", 0);
    await toolbarButton(page, "toc").click();
    expect(await content(page)).toBe(
      '<h1 id="intro">Intro</h1><h2 id="setup">Setup</h2><h4 id="deep">Deep</h4><h2 id="after">After</h2>' +
        '<nav data-toc=""><ol><li><a href="#intro">Intro</a><ol>' +
        '<li><a href="#setup">Setup</a><ol><li><a href="#deep">Deep</a></li></ol></li>' +
        '<li><a href="#after">After</a></li>' +
        "</ol></li></ol></nav><p>Body</p>",
    );
  });

  test("the table of contents follows a heading change in place, and undo reverts both at once", async ({ page }) => {
    await editor(page, "<p>Intro</p><nav data-toc></nav>", 'toolbar="blockType undo"');
    await selectText(page, "Intro");
    await choose(page, "blockType", "Heading 1");
    expect(await content(page)).toBe(
      '<h1 id="intro">Intro</h1><nav data-toc=""><ol><li><a href="#intro">Intro</a></li></ol></nav><p><br></p>',
    );
    await toolbarButton(page, "undo").click();
    expect(await content(page)).toBe('<p>Intro</p><nav data-toc=""></nav><p><br></p>');
  });
});
