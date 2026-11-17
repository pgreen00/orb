import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { mount } from "./utils";

/** The live demos in rich-text.md, as the docs site runs them */
const docs = fs.readFileSync(path.join(process.cwd(), "src/components/rich-text/rich-text.md"), "utf8");
const demos = [...docs.matchAll(/::: live-code-demo\n\n([\s\S]*?)\n:::/g)].map((match) => ({
  html: /```html\n([\s\S]*?)```/.exec(match[1])?.[1] ?? "",
  js: /```javascript\n([\s\S]*?)```/.exec(match[1])?.[1] ?? "",
}));

/** Runs a demo's script the way the docs page does, as an async function body */
const runScript = (page: import("@playwright/test").Page, js: string) =>
  page.evaluate((code) => new Function(`return (async () => {\n${code}\n})()`)(), js);

test.describe("rich-text.md demos", () => {
  test("every live demo mounts and its script runs without errors", async ({ page }) => {
    expect(demos.length).toBeGreaterThan(0);
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

  test("the untrusted HTML demo removes its script and handlers", async ({ page }) => {
    const demo = demos.find((d) => d.html.includes("load-unsafe"))!;
    await mount(page, demo.html);
    await runScript(page, demo.js);
    await page.locator("#load-unsafe").click();
    await expect(page.locator("#unsafe-output")).toContainText("Safe heading");
    const saved = await page.locator("#unsafe-output").textContent();
    expect(saved).not.toContain("<script");
    expect(saved).not.toContain("onclick");
    expect(saved).not.toContain("javascript:");
  });

  test("the image demo loads its picture", async ({ page }) => {
    const demo = demos.find((d) => d.html.includes("A sample image"))!;
    await mount(page, demo.html);
    const loaded = await page
      .locator("orb-rich-text .editor-content img")
      .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);
    expect(loaded).toBe(true);
  });
});
