import { test, expect, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { mount } from "./utils";

process.env.TZ = "America/New_York";
test.use({ timezoneId: "America/New_York" });

/** The live demos in calendar.md, as the docs site runs them */
const docs = fs.readFileSync(path.join(process.cwd(), "src/components/calendar/calendar.md"), "utf8");
const demos = [...docs.matchAll(/::: live-code-demo\n\n([\s\S]*?)\n:::/g)].map((match) => ({
  html: /```html\n([\s\S]*?)```/.exec(match[1])?.[1] ?? "",
  js: /```javascript\n([\s\S]*?)```/.exec(match[1])?.[1] ?? "",
}));

/**
 * Runs a demo's script the way the docs page does, as an async function body.
 * The docs site serves the build at /build, and the test server serves it at /dist.
 */
const runScript = (page: Page, js: string) =>
  page.evaluate((code) => new Function(`return (async () => {\n${code}\n})()`)(), js.replaceAll("/build/", "/dist/"));

test.describe("calendar.md demos", () => {
  test("there are demos to check", () => {
    expect(demos.length).toBeGreaterThan(0);
  });

  test("the demos don't use the removed props, or applyEventChange to update the calendar", () => {
    for (const demo of demos) {
      expect(demo.js, demo.html.slice(0, 80)).not.toMatch(/applyEventChange/);
      expect(demo.js, demo.html.slice(0, 80)).not.toMatch(/\.(events|calendars)\s*=/);
    }
  });

  test("every live demo mounts and its script runs without errors", async ({ page }) => {
    for (const demo of demos) {
      const errors: string[] = [];
      const onError = (error: Error) => errors.push(error.message);
      page.on("pageerror", onError);
      await mount(page, demo.html);
      if (demo.js) await runScript(page, demo.js);
      await page.waitForTimeout(100);
      page.off("pageerror", onError);
      expect(errors, demo.html.slice(0, 80)).toEqual([]);
    }
  });

  test("a demo with events draws them from its markup", async ({ page }) => {
    for (const demo of demos.filter((demo) => demo.html.includes("<orb-calendar-event"))) {
      await mount(page, demo.html);
      if (demo.js) await runScript(page, demo.js);
      await expect
        .poll(() =>
          page.evaluate(() => document.querySelector("orb-calendar")?.shadowRoot?.querySelectorAll("[part~='event']").length ?? 0),
        )
        .toBeGreaterThan(0);
    }
  });

  test("the demos' events and calendars have ids unique across the page, since the demos share it", async ({ page }) => {
    await mount(page, demos.map((demo) => demo.html).join("\n"));
    const duplicates = await page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll("orb-calendar-event[id], orb-calendar-source[id]"), (el) => el.id);
      return ids.filter((id, index) => ids.indexOf(id) !== index);
    });
    expect(duplicates).toEqual([]);
  });
});
