import { test, expect, type Locator, type Page } from "@playwright/test";
import { mount } from "./utils";

const field = (page: Page, index = 0) => page.locator("orb-mask-input").nth(index);
// The editable element inside the shadow root. Playwright locators pierce open shadow roots.
const editable = (page: Page, index = 0) => field(page, index).locator(".input");
const valueOf = (locator: Locator) => locator.evaluate((el: any) => el.value as string);
const formValid = (page: Page) =>
  page.evaluate(() => document.querySelector("form")!.checkValidity());
const isFocused = (locator: Locator) =>
  locator.evaluate((el: any) => el.shadowRoot.activeElement === el.shadowRoot.querySelector(".input"));

/** Focuses the field and sets the selection, in characters of the formatted text */
const select = (locator: Locator, start: number, end = start) =>
  locator.evaluate(async (el: any, [s, e]: [number, number]) => {
    el.focus();
    await el.setSelectionRange(s, e);
  }, [start, end] as [number, number]);

test.describe("orb-mask-input", () => {
  test("typing formats the value, adding separators as they're needed", async ({ page }) => {
    await mount(page, '<orb-mask-input mask="phone"></orb-mask-input>');

    await editable(page).click();
    await page.keyboard.type("5551");
    expect(await valueOf(field(page))).toBe("(555) 1");

    await page.keyboard.type("234567");
    expect(await valueOf(field(page))).toBe("(555) 123-4567");
  });

  test("characters that don't fit the mask are dropped", async ({ page }) => {
    await mount(page, '<orb-mask-input mask="phone"></orb-mask-input>');

    await editable(page).click();
    await page.keyboard.type("a5b5c5");

    expect(await valueOf(field(page))).toBe("(555");
  });

  test("typing in the middle goes after the separators, and a full mask pushes the last character out", async ({ page }) => {
    await mount(page, '<orb-mask-input mask="phone" value="5551234567"></orb-mask-input>');

    await select(field(page), 6);
    await page.keyboard.type("9");
    expect(await valueOf(field(page))).toBe("(555) 912-3456");

    // The caret stayed after the typed 9, so the next digit goes right behind it
    await page.keyboard.type("8");
    expect(await valueOf(field(page))).toBe("(555) 981-2345");
  });

  test("Backspace deletes the digit before a separator, not the separator", async ({ page }) => {
    await mount(page, '<orb-mask-input mask="phone" value="5551234567"></orb-mask-input>');

    await select(field(page), 6);
    await page.keyboard.press("Backspace");

    expect(await valueOf(field(page))).toBe("(551) 234-567");
  });

  test("Delete removes the digit after the caret, skipping separators", async ({ page }) => {
    await mount(page, '<orb-mask-input mask="phone" value="5551234567"></orb-mask-input>');

    await select(field(page), 4);
    await page.keyboard.press("Delete");

    expect(await valueOf(field(page))).toBe("(555) 234-567");
  });

  test("typing over a selection replaces it", async ({ page }) => {
    await mount(page, '<orb-mask-input mask="phone" value="5551234567"></orb-mask-input>');

    await field(page).evaluate((el: any) => el.select());
    await page.keyboard.type("1234");

    expect(await valueOf(field(page))).toBe("(123) 4");
  });

  test("pasted text keeps only the characters the mask takes", async ({ page }) => {
    await mount(page, '<orb-mask-input mask="phone"></orb-mask-input>');

    await editable(page).click();
    await editable(page).evaluate((el) => {
      const data = new DataTransfer();
      data.setData("text/plain", "call 123-456-7890 now");
      el.dispatchEvent(
        new ClipboardEvent("paste", { clipboardData: data, bubbles: true, composed: true, cancelable: true }),
      );
    });

    expect(await valueOf(field(page))).toBe("(123) 456-7890");
  });

  test("undo and redo step back through typing as one change", async ({ page }) => {
    await mount(page, '<orb-mask-input mask="phone"></orb-mask-input>');

    await editable(page).click();
    await page.keyboard.type("555123");
    await page.keyboard.press("ControlOrMeta+z");
    expect(await valueOf(field(page))).toBe("");

    await page.keyboard.press("ControlOrMeta+Shift+z");
    expect(await valueOf(field(page))).toBe("(555) 123");
  });

  test("Enter submits the form", async ({ page }) => {
    await mount(
      page,
      '<form><orb-mask-input mask="phone" name="phone" required></orb-mask-input></form>',
    );
    await page.evaluate(() => {
      (window as any).submits = 0;
      document.querySelector("form")!.addEventListener("submit", (ev) => {
        ev.preventDefault();
        (window as any).submits++;
      });
    });

    await editable(page).click();
    await page.keyboard.type("5551234567");
    await page.keyboard.press("Enter");

    expect(await page.evaluate(() => (window as any).submits)).toBe(1);
  });

  test("the form gets the formatted value, or the unmasked one with `unmasked`", async ({ page }) => {
    await mount(
      page,
      `<form>
        <orb-mask-input mask="phone" name="shown" value="5551234567"></orb-mask-input>
        <orb-mask-input mask="phone" name="raw" unmasked value="5551234567"></orb-mask-input>
      </form>`,
    );

    const data = await page.evaluate(() => Object.fromEntries(new FormData(document.querySelector("form")!)));
    expect(data).toEqual({ shown: "(555) 123-4567", raw: "5551234567" });
  });

  test("a form reset returns to the default value", async ({ page }) => {
    await mount(
      page,
      '<form><orb-mask-input mask="phone" value="5551234567"></orb-mask-input></form>',
    );

    await editable(page).click();
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    expect(await valueOf(field(page))).not.toBe("(555) 123-4567");

    await page.evaluate(() => document.querySelector("form")!.reset());
    expect(await valueOf(field(page))).toBe("(555) 123-4567");
  });

  test("required, incomplete, and custom errors block the form", async ({ page }) => {
    await mount(
      page,
      '<form><orb-mask-input mask="phone" name="phone" required></orb-mask-input></form>',
    );
    expect(await formValid(page)).toBe(false);

    await editable(page).click();
    await page.keyboard.type("555");
    expect(await formValid(page)).toBe(false);

    await page.keyboard.type("1234567");
    expect(await formValid(page)).toBe(true);

    await field(page).evaluate((el: any) => el.setCustomValidity("Taken"));
    expect(await formValid(page)).toBe(false);
    expect(await field(page).evaluate((el: any) => el.validationMessage)).toBe("Taken");
  });

  test("the input is labelled by orb-textbox's label, and shows its validation message after blur", async ({ page }) => {
    await mount(
      page,
      '<orb-textbox label="Phone"><orb-mask-input mask="phone" required></orb-mask-input></orb-textbox>',
    );

    const textbox = page.getByRole("textbox", { name: "Phone" });
    await expect(textbox).toBeVisible();

    await editable(page).click();
    await page.keyboard.press("Tab");

    await expect(page.locator("orb-textbox orb-note[invalid]")).not.toHaveText("");
  });

  test("clicking empty space in orb-textbox focuses the field", async ({ page }) => {
    await mount(
      page,
      '<orb-textbox label="Phone" style="width: 300px"><orb-mask-input mask="phone"></orb-mask-input></orb-textbox>',
    );

    await page.locator("orb-textbox [part=container]").click({ position: { x: 270, y: 4 } });

    expect(await isFocused(field(page))).toBe(true);
  });

  test("setting value from code formats it, keeps no undo history, and fires no input event", async ({ page }) => {
    await mount(page, '<orb-mask-input mask="phone"></orb-mask-input>');
    await page.evaluate(() => {
      (window as any).inputs = 0;
      document.querySelector("orb-mask-input")!.addEventListener("input", () => (window as any).inputs++);
    });

    await field(page).evaluate((el: any) => (el.value = "5551234567"));

    expect(await valueOf(field(page))).toBe("(555) 123-4567");
    expect(await page.evaluate(() => (window as any).inputs)).toBe(0);
  });

  test("Tab into the field selects everything, so typing replaces it", async ({ page }) => {
    await mount(
      page,
      '<input id="before"><orb-mask-input mask="phone" value="5551234567"></orb-mask-input>',
    );

    await page.locator("#before").focus();
    await page.keyboard.press("Tab");
    await page.keyboard.type("9");

    expect(await valueOf(field(page))).toBe("(9");
  });

  test("text the browser changes itself is brought back into the mask", async ({ page }) => {
    await mount(page, '<orb-mask-input mask="phone"></orb-mask-input>');

    await editable(page).evaluate((el) => {
      el.textContent = "5551234";
      el.dispatchEvent(
        new InputEvent("input", { bubbles: true, composed: true, inputType: "insertReplacementText" }),
      );
    });

    expect(await valueOf(field(page))).toBe("(555) 123-4");
  });

  test("the guide shows the rest of the mask while focused by default", async ({ page }) => {
    await mount(page, '<orb-mask-input mask="phone"></orb-mask-input>');
    const guide = field(page).locator(".guide");

    await expect(guide).toHaveCount(0);
    await editable(page).click();
    await expect(guide).toHaveText("(___) ___-____");

    await editable(page).click();
    await page.keyboard.type("555");
    await expect(guide).toHaveText("(555) ___-____");
  });

  test("guide='always' shows the guide without focus, and guide='off' hides it", async ({ page }) => {
    await mount(
      page,
      '<orb-mask-input mask="phone" guide="always"></orb-mask-input><orb-mask-input mask="phone" guide="off"></orb-mask-input>',
    );

    await expect(field(page, 0).locator(".guide")).toHaveText("(___) ___-____");
    await expect(field(page, 1).locator(".guide")).toHaveCount(0);
  });

  test("the placeholder shows only while the field is empty and no guide is showing", async ({ page }) => {
    await mount(page, '<orb-mask-input placeholder="Phone number"></orb-mask-input>');

    await expect(field(page).locator(".placeholder")).toHaveText("Phone number");
    await editable(page).click();
    await expect(field(page).locator(".placeholder")).toHaveText("Phone number");
    await page.keyboard.type("5");
    await expect(field(page).locator(".placeholder")).toHaveCount(0);
  });

  test("the currency preset keeps cents and groups thousands", async ({ page }) => {
    await mount(page, '<orb-mask-input mask="currency"></orb-mask-input>');

    await editable(page).click();
    await page.keyboard.type("5");
    expect(await valueOf(field(page))).toBe("$0.05");

    await field(page).evaluate((el: any) => (el.value = ""));
    await editable(page).click();
    await page.keyboard.type("123456");
    expect(await valueOf(field(page))).toBe("$1,234.56");
    expect(await field(page).evaluate((el: any) => el.value)).toBe("$1,234.56");
  });

  test("the date preset pads a month that can't start with that digit", async ({ page }) => {
    await mount(page, '<orb-mask-input mask="date"></orb-mask-input>');

    await editable(page).click();
    await page.keyboard.type("3");
    expect(await valueOf(field(page))).toBe("03");

    await page.keyboard.type("1");
    expect(await valueOf(field(page))).toBe("03/1");
  });

  test("a digit that makes the month impossible is dropped", async ({ page }) => {
    await mount(page, '<orb-mask-input mask="date"></orb-mask-input>');

    await editable(page).click();
    await page.keyboard.type("13");

    expect(await valueOf(field(page))).toBe("1");
  });

  test("disabled fields don't take input", async ({ page }) => {
    await mount(page, '<orb-mask-input mask="phone" disabled></orb-mask-input>');

    await field(page).evaluate((el: any) => el.focus());
    await page.keyboard.type("5551234567");

    expect(await valueOf(field(page))).toBe("");
  });

  test("the ssn preset hides all but the last four digits, while the value keeps them", async ({ page }) => {
    await mount(
      page,
      '<form><orb-mask-input mask="ssn" name="ssn"></orb-mask-input><orb-mask-input mask="ssn" name="digits" unmasked value="123456789"></orb-mask-input></form>',
    );

    await editable(page).click();
    await page.keyboard.type("1234");
    // The first five positions are always hidden, so the fourth digit is too
    await expect(editable(page)).toHaveText("•••-•");
    expect(await valueOf(field(page))).toBe("123-4");

    await page.keyboard.type("56789");
    await expect(editable(page)).toHaveText("•••-••-6789");
    expect(await valueOf(field(page))).toBe("123-45-6789");

    const data = await page.evaluate(() => Object.fromEntries(new FormData(document.querySelector("form")!)));
    expect(data).toEqual({ ssn: "123-45-6789", digits: "123456789" });
  });

  test("editing a concealed field changes the digit under the caret", async ({ page }) => {
    await mount(page, '<orb-mask-input mask="ssn" value="123456789"></orb-mask-input>');

    await select(field(page), 1);
    await page.keyboard.press("Backspace");
    await page.keyboard.type("9");

    expect(await valueOf(field(page))).toBe("923-45-6789");
    await expect(editable(page)).toHaveText("•••-••-6789");
  });

  test("a lazily registered mask loads before the field takes edits", async ({ page }) => {
    await page.goto("/tests");
    await page.evaluate(async () => {
      const { registerMask } = await import("/dist/components/index.js");
      (window as any).loads = 0;
      registerMask("slow-plate", {
        load: () =>
          new Promise((resolve) => {
            (window as any).loads++;
            setTimeout(
              () =>
                resolve({
                  default: {
                    extract: (text: string) => text.replace(/[^A-Za-z0-9]/g, "").toUpperCase(),
                    format: (raw: string) => (raw.length > 3 ? `${raw.slice(0, 3)}-${raw.slice(3, 6)}` : raw),
                  },
                }),
              300,
            );
          }),
      });
    });
    await page.locator("#root").evaluate(
      (el, markup) => (el.innerHTML = markup),
      '<orb-mask-input mask="slow-plate" value="ab1234"></orb-mask-input><orb-mask-input mask="slow-plate"></orb-mask-input>',
    );
    await page.waitForFunction(() => !document.querySelector("#root :not(:defined)"));

    await expect(editable(page, 0)).toHaveAttribute("contenteditable", "false");
    await expect(editable(page, 0)).toHaveText("AB1-234");
    expect(await valueOf(field(page, 0))).toBe("AB1-234");
    expect(await page.evaluate(() => (window as any).loads)).toBe(1);

    await editable(page, 1).click();
    await page.keyboard.type("xy9876");
    expect(await valueOf(field(page, 1))).toBe("XY9-876");
  });

  test("a field on the page before its mask is registered picks the mask up", async ({ page }) => {
    await mount(page, '<orb-mask-input mask="late" value="abc12"></orb-mask-input>');
    // Before registration, "late" is read as a pattern with no slots
    await page.evaluate(async () => {
      const { registerMasks } = await import("/dist/components/index.js");
      registerMasks({
        late: {
          load: async () => ({
            extract: (text: string) => text.replace(/\D/g, ""),
            format: (raw: string) => raw.split("").join("."),
          }),
        },
      });
    });

    await expect(editable(page)).toHaveAttribute("contenteditable", "plaintext-only");
    await editable(page).click();
    await page.keyboard.type("34");
    expect(await valueOf(field(page))).toBe("3.4");
  });

  test("a registered mask can be used by name", async ({ page }) => {
    await page.goto("/tests");
    await page.evaluate(async () => {
      const { registerMask } = await import("/dist/components/index.js");
      registerMask("plate", {
        extract: (text: string) => text.replace(/[^A-Za-z0-9]/g, "").toUpperCase(),
        format: (raw: string) => (raw.length > 3 ? `${raw.slice(0, 3)}-${raw.slice(3, 6)}` : raw),
      });
    });
    await page.locator("#root").evaluate((el, markup) => (el.innerHTML = markup), '<orb-mask-input mask="plate"></orb-mask-input>');
    await page.waitForFunction(() => !document.querySelector("#root :not(:defined)"));

    await editable(page).click();
    await page.keyboard.type("ab1234");

    expect(await valueOf(field(page))).toBe("AB1-234");
  });
});
