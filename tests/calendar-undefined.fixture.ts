// A test that leaves `orb-calendar-event` undefined, so a spec can put markup
// under the calendar that has no component behind it: attributes, text, and
// nothing that reports its own changes.
import { test as base } from "@playwright/test";

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      const define = customElements.define.bind(customElements);
      (customElements as unknown as { define: unknown }).define = (name: string, ...rest: unknown[]) => {
        if (name === "orb-calendar-event") return;
        return (define as never)(name, ...rest);
      };
    });
    await use(page);
  },
});
