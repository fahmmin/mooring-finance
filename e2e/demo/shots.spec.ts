// Clean product screenshots for the pitch deck: opens a small loan, captures each page, then closes the loan.
// Run: npx playwright test --config demo.config.ts shots
import { testWithSynpress } from "@synthetixio/synpress";
import { metaMaskFixtures } from "@synthetixio/synpress/playwright";
import type { BrowserContext, Page } from "@playwright/test";
import path from "node:path";
import walletSetup from "../wallet-setup/mezo.setup";
import { approveInMetaMask } from "../tests/metamask";

const test = testWithSynpress(metaMaskFixtures(walletSetup));
const { expect } = test;
const OUT = path.resolve("demo-output", "shots");

async function send(page: Page, context: BrowserContext, amount: string | null, toast: string) {
  const input = page.locator(".amount-row input");
  if (amount !== null) await expect(async () => { await input.fill(amount); await expect(input).toHaveValue(amount, { timeout: 1_000 }); }).toPass();
  const done = expect(page.locator(".toast.success", { hasText: toast })).toBeVisible();
  await page.locator(".btn.wide").click();
  await approveInMetaMask(context, /^Confirm$/);
  await done;
}

const shot = async (page: Page, name: string) => {
  await page.mouse.move(0, 0);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
};

test("deck screenshots", async ({ context, page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator(".mline-buoy")).toBeVisible();
  await shot(page, "landing");

  await page.goto("/app");
  await page.locator(".topbar").getByRole("button", { name: "Connect wallet" }).click();
  await approveInMetaMask(context, /^(Connect|Confirm|Approve|Switch network)$/);
  await expect(page.locator(".acct-btn")).toContainText("0x");

  // a loan to show: 2 MEZO in, 0.6 MUSD out
  await page.goto("/app/borrow");
  await expect(page.locator(".amount-sub")).toContainText("Wallet balance");
  await send(page, context, "2", "Deposit 2 MEZO done");
  await page.getByRole("tab", { name: "Borrow" }).click();
  await send(page, context, "0.6", "Borrow 0.6 MUSD done");
  await expect(page.locator(".acard .pill").first()).toContainText("safe");
  await page.getByRole("tab", { name: "Borrow" }).click();
  await page.locator(".amount-row input").fill("0.1");
  await page.waitForTimeout(9000); // let the success toast close
  await shot(page, "borrow");

  await page.goto("/app");
  await expect(page.locator(".loans-summary")).toContainText("borrowers");
  await shot(page, "overview");
  await page.goto("/app/lend");
  await expect(page.locator(".amount-sub")).toContainText("Wallet balance");
  await page.locator(".amount-row input").fill("1");
  await shot(page, "lend");
  await page.goto("/app/liquidate");
  await expect(page.locator(".loans .tr").nth(2)).toBeVisible();
  await shot(page, "liquidate");
  await page.goto("/app/risk");
  await shot(page, "rules");

  // close the loan again
  await page.goto("/app/borrow?tab=repay");
  await expect.poll(async () => Number(((await page.locator(".amount-sub").textContent()) ?? "").replace(/[^0-9.]/g, ""))).toBeGreaterThan(0);
  await page.getByRole("button", { name: /^Max/ }).click();
  await send(page, context, null, "done");
  await page.getByRole("tab", { name: "Take MEZO back" }).click();
  await expect.poll(async () => Number(((await page.locator(".amount-sub").textContent()) ?? "").replace(/[^0-9.]/g, ""))).toBeGreaterThanOrEqual(2);
  await page.getByRole("button", { name: /^Max/ }).click();
  await send(page, context, null, "done");
});
