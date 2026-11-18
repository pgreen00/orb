import { test, expect, type Page } from "@playwright/test";
import { choose, content, editor, modKey, placeCaret, selectText } from "./rich-text-utils";

const toolbarButton = (page: Page, id: string) => page.locator(`orb-rich-text #action-${id}`);
/** Only the controls these tests use, which the default toolbar would move into More at this width */
const TABLE_TOOLBAR = 'toolbar="table blockType tableRows tableColumns tableHeader tableDelete"';
const SAMPLE = "<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>C</td><td>D</td></tr></tbody></table>";

/** Pastes HTML at the caret, the way the clipboard does */
const pasteHtml = (page: Page, html: string) =>
  page.locator("orb-rich-text").evaluate((host: any, html) => {
    const area = host.shadowRoot.querySelector(".editor-content");
    area.focus();
    const dt = new DataTransfer();
    dt.setData("text/html", html);
    area.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, html);

test.describe("orb-rich-text tables", () => {
  test("the table picker inserts a table of the chosen size, with a header row", async ({ page }) => {
    await editor(page, "<p>Start</p>", TABLE_TOOLBAR);
    await placeCaret(page, "Start", 5);
    await toolbarButton(page, "table").click();
    await page.locator('orb-rich-text .picker-cell[aria-label="2 by 3 table"]').filter({ visible: true }).click();
    expect(await content(page)).toContain(
      "<table><thead><tr><th><br></th><th><br></th><th><br></th></tr></thead>" +
        "<tbody><tr><td><br></td><td><br></td><td><br></td></tr></tbody></table>",
    );
  });

  test("Tab moves to the next cell, and Tab in the last cell adds a row", async ({ page }) => {
    await editor(page, SAMPLE, TABLE_TOOLBAR);
    await placeCaret(page, "A", 1);
    await page.keyboard.press("Tab");
    await page.keyboard.type("x");
    // The browser puts the caret at the start of a cell it's tabbed into
    expect(await content(page)).toContain("<th>A</th><th>xB</th>");

    await placeCaret(page, "D", 1);
    await page.keyboard.press("Tab");
    expect(await content(page)).toContain("<tr><td>C</td><td>D</td></tr><tr><td><br></td><td><br></td></tr>");
  });

  test("Enter in a cell adds a line break, not a new cell", async ({ page }) => {
    await editor(page, SAMPLE, TABLE_TOOLBAR);
    await placeCaret(page, "A", 1);
    await page.keyboard.press("Enter");
    await page.keyboard.type("more");
    expect(await content(page)).toContain("<th>A<br>more</th><th>B</th>");
  });

  test("Backspace at the start of a cell doesn't merge it into the cell before", async ({ page }) => {
    await editor(page, SAMPLE, TABLE_TOOLBAR);
    await placeCaret(page, "B", 0);
    await page.keyboard.press("Backspace");
    expect(await content(page)).toBe(SAMPLE);
  });

  test("Up and Down move to the same column in the row above or below", async ({ page }) => {
    await editor(page, SAMPLE, TABLE_TOOLBAR);
    await placeCaret(page, "A", 1);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.type("x");
    expect(await content(page)).toContain("<td>xC</td>");
  });

  test("the rows control inserts a row below the caret's row", async ({ page }) => {
    await editor(page, SAMPLE, TABLE_TOOLBAR);
    await placeCaret(page, "C", 1);
    await choose(page, "tableRows", "Insert row below");
    expect(await content(page)).toContain("<tr><td>C</td><td>D</td></tr><tr><td><br></td><td><br></td></tr>");
  });

  test("the columns control inserts a column to the right, in every row", async ({ page }) => {
    await editor(page, SAMPLE, TABLE_TOOLBAR);
    await placeCaret(page, "A", 1);
    await choose(page, "tableColumns", "Insert column right");
    expect(await content(page)).toBe(
      "<table><thead><tr><th>A</th><th><br></th><th>B</th></tr></thead>" +
        "<tbody><tr><td>C</td><td><br></td><td>D</td></tr></tbody></table>",
    );
  });

  test("the header row control moves the first row between the header and the body", async ({ page }) => {
    await editor(page, SAMPLE, TABLE_TOOLBAR);
    await placeCaret(page, "A", 1);
    await toolbarButton(page, "tableHeader").click();
    expect(await content(page)).toBe("<table><tbody><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></tbody></table>");
    await expect(toolbarButton(page, "tableHeader")).toHaveAttribute("aria-pressed", "false");
  });

  test("the delete table control removes the table", async ({ page }) => {
    await editor(page, SAMPLE, TABLE_TOOLBAR);
    await placeCaret(page, "A", 1);
    await toolbarButton(page, "tableDelete").click();
    expect(await content(page)).not.toContain("<table>");
  });

  test("the table controls show only while the caret is in a table", async ({ page }) => {
    await editor(page, `<p>Text</p>${SAMPLE}`, TABLE_TOOLBAR);
    await placeCaret(page, "Text", 1);
    await expect(toolbarButton(page, "tableRows")).toHaveCount(0);
    await placeCaret(page, "A", 1);
    await expect(toolbarButton(page, "tableRows")).toHaveCount(1);
  });

  test("block commands don't apply inside a cell, so the table keeps its shape", async ({ page }) => {
    await editor(page, SAMPLE, TABLE_TOOLBAR);
    await selectText(page, "C");
    await choose(page, "blockType", "Heading 1");
    expect(await content(page)).toBe(SAMPLE);
  });

  test("a right-click in a cell opens the table menu, which can insert a row", async ({ page }) => {
    await editor(page, SAMPLE, TABLE_TOOLBAR);
    await page.locator("orb-rich-text td").first().click({ button: "right" });
    const item = page.locator('orb-rich-text orb-mi:text-is("Insert row above")').filter({ visible: true });
    await expect(item).toHaveCount(1);
    await item.evaluate((el: HTMLElement) => el.click());
    // The menu acted on the first cell it found, which is in the body, so the row goes above it
    expect(await content(page)).toContain("<tbody><tr><td><br></td><td><br></td></tr><tr><td>C</td><td>D</td></tr></tbody>");
  });

  test("Down keeps the column across several rows, however the caret got into the cell", async ({ page }) => {
    await editor(page, "<table><tbody><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr><tr><td>5</td><td>6</td></tr></tbody></table>", TABLE_TOOLBAR);
    await placeCaret(page, "1", 0);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.type("x");
    expect(await content(page)).toContain("<td>x5</td><td>6</td>");
  });

  test("Up and Down move between rows after a Right and a Down", async ({ page }) => {
    await editor(page, "<table><tbody><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></tbody></table>", TABLE_TOOLBAR);
    await placeCaret(page, "1", 0);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.type("y");
    expect(await content(page)).toContain("<td>y1</td><td>2</td>");
  });

  test("the rows menu is an action menu, named by its label alone", async ({ page }) => {
    await editor(page, SAMPLE, TABLE_TOOLBAR);
    await placeCaret(page, "C", 1);
    await expect(toolbarButton(page, "tableRows")).toHaveAttribute("aria-label", "Rows");
  });

  test("a row added below the header goes to the top of the body, so there's still one header row", async ({ page }) => {
    await editor(page, SAMPLE, TABLE_TOOLBAR);
    await placeCaret(page, "A", 1);
    await choose(page, "tableRows", "Insert row below");
    expect(await content(page)).toBe(
      "<table><thead><tr><th>A</th><th>B</th></tr></thead>" +
        "<tbody><tr><td><br></td><td><br></td></tr><tr><td>C</td><td>D</td></tr></tbody></table>",
    );
  });

  test("a row added above the header takes the header, and the old header becomes the first body row", async ({ page }) => {
    await editor(page, SAMPLE, TABLE_TOOLBAR);
    await placeCaret(page, "A", 1);
    await choose(page, "tableRows", "Insert row above");
    expect(await content(page)).toBe(
      "<table><thead><tr><th><br></th><th><br></th></tr></thead>" +
        "<tbody><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></tbody></table>",
    );
  });

  test("undo reverts a table change", async ({ page }) => {
    await editor(page, SAMPLE, TABLE_TOOLBAR);
    await placeCaret(page, "C", 1);
    await choose(page, "tableRows", "Insert row below");
    expect(await content(page)).toContain("<tr><td><br></td><td><br></td></tr>");
    await page.locator("orb-rich-text .editor-content").focus();
    await page.keyboard.press(`${await modKey(page)}+z`);
    expect(await content(page)).toBe(SAMPLE);
  });

  test("a pasted cell that spans two columns becomes two cells", async ({ page }) => {
    await editor(page, "<p><br></p>", TABLE_TOOLBAR);
    await pasteHtml(page, '<table><tr><td colspan="2">Wide</td></tr><tr><td>a</td><td>b</td></tr></table>');
    expect(await content(page)).toContain("<tr><td>Wide</td><td><br></td></tr><tr><td>a</td><td>b</td></tr>");
  });

  test("paragraphs in a pasted cell become lines in it", async ({ page }) => {
    await editor(page, "<p><br></p>", TABLE_TOOLBAR);
    await pasteHtml(page, "<table><tr><td><p>one</p><p>two</p></td></tr></table>");
    expect(await content(page)).toContain("<td>one<br>two</td>");
  });
});
