import type { Page } from "@playwright/test";
import { mount } from "./utils";

/** Mounts an editor with `html` as its content, and returns its locator */
export async function editor(page: Page, html = "", attrs = "") {
  await mount(page, `<orb-rich-text ${attrs}></orb-rich-text>`);
  const el = page.locator("orb-rich-text");
  await el.evaluate((e: any, h) => e.setContent(h), html);
  return el;
}

/** Selects the nth occurrence of `text` in the editor */
export const selectText = (page: Page, text: string, nth = 0) =>
  page.locator("orb-rich-text").evaluate(
    (host, [text, nth]) => {
      const root = host.shadowRoot!.querySelector<HTMLElement>(".editor-content")!;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let seen = 0;
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        let at = node.data.indexOf(text);
        while (at >= 0) {
          if (seen === nth) {
            root.focus();
            const selection = window.getSelection()!;
            selection.setBaseAndExtent(node, at, node, at + text.length);
            return;
          }
          seen++;
          at = node.data.indexOf(text, at + text.length);
        }
      }
      throw new Error(`"${text}" not found`);
    },
    [text, nth] as const,
  );

/** Puts a collapsed caret `offset` characters into the first text node containing `needle` */
export const placeCaret = (page: Page, needle: string, offset: number) =>
  page.locator("orb-rich-text").evaluate(
    (host, [needle, offset]) => {
      const root = host.shadowRoot!.querySelector<HTMLElement>(".editor-content")!;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        const at = node.data.indexOf(needle);
        if (at >= 0) {
          root.focus();
          window.getSelection()!.setBaseAndExtent(node, at + offset, node, at + offset);
          return;
        }
      }
      throw new Error(`"${needle}" not found`);
    },
    [needle, offset] as const,
  );

/** Puts a collapsed caret at a child position of an element, found by its tag and text */
export const placeCaretIn = (page: Page, tag: string, offset: number) =>
  page.locator("orb-rich-text").evaluate(
    (host, [tag, offset]) => {
      const root = host.shadowRoot!.querySelector<HTMLElement>(".editor-content")!;
      const el = root.querySelector(tag)!;
      root.focus();
      window.getSelection()!.setBaseAndExtent(el, offset, el, offset);
    },
    [tag, offset] as const,
  );

/** The modifier the editor uses for shortcuts on this platform: Meta on Apple devices, Control elsewhere */
export const modKey = (page: Page) =>
  page.evaluate(() => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? "Meta" : "Control"));

/** Chooses an option from a toolbar select, by its exact label, from the menu that's open */
export async function choose(page: Page, id: string, label: string) {
  await page.locator(`orb-rich-text #action-${id}`).click();
  // A tooltip can sit over the item, so the click goes straight to it, as the menu's keyboard activation does.
  await page
    .locator(`orb-rich-text orb-mi:text-is("${label}")`)
    .filter({ visible: true })
    .evaluate((item: HTMLElement) => item.click());
}

/** The editor's saved HTML */
export const content = (page: Page) =>
  page.locator("orb-rich-text").evaluate((e: any) => e.getContent());

/** The editor's plain text */
export const text = (page: Page) =>
  page.locator("orb-rich-text").evaluate((e: any) => e.getText());
