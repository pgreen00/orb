import { test, expect } from "@playwright/test";
import { mount } from "./utils";

const otp = (page: import("@playwright/test").Page, index = 0) =>
  page.locator("orb-otp-input").nth(index);
const segments = (page: import("@playwright/test").Page, index = 0) =>
  otp(page, index).locator('[part="segment"]');
const valueOf = (locator: import("@playwright/test").Locator) =>
  locator.evaluate((el: any) => el.value as string);
// Form-associated custom elements have no checkValidity() of their own, so check the form
const formValid = (page: import("@playwright/test").Page) =>
  page.evaluate(() => document.querySelector("form")!.checkValidity());

test.describe("orb-otp-input", () => {
  test("renders one segment per length, and literal separators from format", async ({ page }) => {
    await mount(
      page,
      '<orb-otp-input length="4"></orb-otp-input><orb-otp-input format="###-###"></orb-otp-input>',
    );

    await expect(segments(page, 0)).toHaveCount(4);
    await expect(segments(page, 1)).toHaveCount(6);
    await expect(otp(page, 1).locator('[part="segment-literal"]')).toHaveText("-");
  });

  test("typing fills segments and drops characters the type doesn't allow", async ({ page }) => {
    await mount(page, "<orb-otp-input></orb-otp-input>");

    await segments(page).first().click();
    await page.keyboard.type("1a2b3");

    expect(await valueOf(otp(page))).toBe("123");
  });

  test("case upper transforms letters as they're typed", async ({ page }) => {
    await mount(page, '<orb-otp-input type="alpha" case="upper"></orb-otp-input>');

    await segments(page).first().click();
    await page.keyboard.type("abc");

    expect(await valueOf(otp(page))).toBe("ABC");
  });

  test("pasting keeps only allowed characters", async ({ page }) => {
    await mount(page, '<orb-otp-input length="6"></orb-otp-input>');

    await segments(page).first().click();
    await otp(page).locator("input").evaluate((input) => {
      const data = new DataTransfer();
      data.setData("text/plain", "ABC-123");
      input.dispatchEvent(
        new ClipboardEvent("paste", { clipboardData: data, bubbles: true, composed: true, cancelable: true }),
      );
    });

    expect(await valueOf(otp(page))).toBe("123");
  });

  test("Backspace removes the current character and shifts later ones left", async ({ page }) => {
    await mount(page, '<orb-otp-input value="1234" length="4"></orb-otp-input>');

    await segments(page).first().click();
    await page.keyboard.press("Backspace");

    expect(await valueOf(otp(page))).toBe("234");
  });

  test("arrow keys move the caret, so typing replaces the character under it", async ({ page }) => {
    await mount(page, '<orb-otp-input value="12" length="4"></orb-otp-input>');

    await segments(page).first().click();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.type("9");

    expect(await valueOf(otp(page))).toBe("92");
  });

  test("orbComplete fires once when the last segment is filled", async ({ page }) => {
    await mount(page, '<orb-otp-input length="3"></orb-otp-input>');
    await otp(page).evaluate((el) => {
      (window as any).completed = [];
      el.addEventListener("orbComplete", (e: CustomEvent) => (window as any).completed.push(e.detail));
    });

    await segments(page).first().click();
    await page.keyboard.type("123");

    await expect.poll(() => page.evaluate(() => (window as any).completed)).toEqual(["123"]);
  });

  test("autosubmit submits the form when filled", async ({ page }) => {
    await mount(
      page,
      '<form><orb-otp-input name="code" length="4" autosubmit></orb-otp-input></form>',
    );
    await page.evaluate(() => {
      document.querySelector("form")!.addEventListener("submit", (e) => {
        e.preventDefault();
        (window as any).submitted = new FormData(e.target as HTMLFormElement).get("code");
      });
    });

    await segments(page).first().click();
    await page.keyboard.type("1234");

    await expect.poll(() => page.evaluate(() => (window as any).submitted)).toBe("1234");
  });

  test("preventDefault on orbComplete stops autosubmit", async ({ page }) => {
    await mount(
      page,
      '<form><orb-otp-input name="code" length="4" autosubmit></orb-otp-input></form>',
    );
    await page.evaluate(() => {
      document.querySelector("orb-otp-input")!.addEventListener("orbComplete", (e) => e.preventDefault());
      document.querySelector("form")!.addEventListener("submit", (e) => {
        e.preventDefault();
        (window as any).submitted = true;
      });
    });

    await segments(page).first().click();
    await page.keyboard.type("1234");
    await page.waitForTimeout(100);

    expect(await page.evaluate(() => (window as any).submitted)).toBeUndefined();
  });

  test("Enter submits the containing form", async ({ page }) => {
    await mount(page, '<form><orb-otp-input name="code" length="4"></orb-otp-input></form>');
    await page.evaluate(() => {
      document.querySelector("form")!.addEventListener("submit", (e) => {
        e.preventDefault();
        (window as any).submitted = true;
      });
    });

    await segments(page).first().click();
    await page.keyboard.type("1234");
    await page.keyboard.press("Enter");

    await expect.poll(() => page.evaluate(() => (window as any).submitted)).toBe(true);
  });

  test("form data carries the value, and reset restores the initial value", async ({ page }) => {
    await mount(
      page,
      '<form><orb-otp-input name="pin" length="4" value="1234"></orb-otp-input></form>',
    );

    await otp(page).evaluate((el: any) => (el.value = "9999"));
    const reset = await page.evaluate(() => {
      const form = document.querySelector("form")!;
      form.reset();
      return new FormData(form).get("pin");
    });

    expect(reset).toBe("1234");
  });

  test("a partial code is invalid, and the error shows only after blur", async ({ page }) => {
    await mount(
      page,
      '<form><orb-otp-input name="code" length="4" required></orb-otp-input></form>',
    );

    await segments(page).first().click();
    await page.keyboard.type("12");
    // Checked before formValid(), since checkValidity() fires `invalid`, which counts as interaction
    expect(await otp(page).evaluate((el: any) => el.matches(":state(user-invalid)"))).toBe(false);
    expect(await formValid(page)).toBe(false);

    await page.keyboard.press("Tab");
    await expect
      .poll(() => otp(page).evaluate((el: any) => el.matches(":state(user-invalid)")))
      .toBe(true);
  });

  test("setCustomValidity blocks the form until it's cleared", async ({ page }) => {
    await mount(page, '<form><orb-otp-input name="code" length="2" value="12"></orb-otp-input></form>');

    await otp(page).evaluate((el: any) => el.setCustomValidity("Wrong code"));
    expect(await formValid(page)).toBe(false);

    await otp(page).evaluate((el: any) => el.setCustomValidity(""));
    expect(await formValid(page)).toBe(true);
  });

  test("mask hides characters from the DOM", async ({ page }) => {
    await mount(page, '<orb-otp-input mask length="4" value="12"></orb-otp-input>');

    await expect(segments(page).nth(0)).toHaveText("");
    await expect(segments(page).nth(1)).toHaveText("");
    expect(await valueOf(otp(page))).toBe("12");
  });

  test("readonly ignores typing but still submits its value", async ({ page }) => {
    await mount(
      page,
      '<form><orb-otp-input name="code" length="4" readonly value="12"></orb-otp-input></form>',
    );

    await segments(page).first().click();
    await page.keyboard.type("9");

    expect(await valueOf(otp(page))).toBe("12");
    const submitted = await page.evaluate(() => new FormData(document.querySelector("form")!).get("code"));
    expect(submitted).toBe("12");
  });

  test("disabled ignores typing and leaves the value out of form data", async ({ page }) => {
    await mount(
      page,
      '<form><orb-otp-input name="code" length="4" disabled value="12"></orb-otp-input></form>',
    );

    await otp(page).evaluate((el: any) => el.focus());
    await page.keyboard.type("9");

    expect(await valueOf(otp(page))).toBe("12");
    const submitted = await page.evaluate(() => new FormData(document.querySelector("form")!).get("code"));
    expect(submitted).toBeNull();
  });

  test("setting value in code keeps only allowed characters, and emits no input event", async ({ page }) => {
    await mount(page, '<orb-otp-input length="4"></orb-otp-input>');
    await otp(page).evaluate((el) => {
      (window as any).inputs = 0;
      el.addEventListener("orbValueChange", () => ((window as any).inputs += 1));
      (el as any).value = "a1b2c3d4";
    });

    expect(await valueOf(otp(page))).toBe("1234");
    expect(await page.evaluate(() => (window as any).inputs)).toBe(0);
  });
});
