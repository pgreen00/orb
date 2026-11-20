import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { mount } from "./utils";

/** The live demos in channel.md, as the docs site runs them */
const docs = fs.readFileSync(path.join(process.cwd(), "src/components/channel/channel.md"), "utf8");
const demos = [...docs.matchAll(/::: live-code-demo\n\n([\s\S]*?)\n:::/g)].map((match) => ({
  html: /```html\n([\s\S]*?)```/.exec(match[1])?.[1] ?? "",
  js: /```javascript\n([\s\S]*?)```/.exec(match[1])?.[1] ?? "",
}));

/**
 * Runs a demo's script the way the docs page does, as an async function body.
 * The docs site serves the build at /build, and the test server serves it at /dist.
 */
const runScript = (page: import("@playwright/test").Page, js: string) =>
  page.evaluate((code) => new Function(`return (async () => {\n${code}\n})()`)(), js.replaceAll("/build/", "/dist/"));

test.describe("channel.md demos", () => {
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
});
