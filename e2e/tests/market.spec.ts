// Lender and borrower flows on Mezo Testnet with a real MetaMask: connect, lend and withdraw MUSD, then post MEZO,
// borrow MUSD, repay it in full and take the MEZO back. Moves 1 MUSD and 2 MEZO in and back out.
import { testWithSynpress } from "@synthetixio/synpress";
import { metaMaskFixtures } from "@synthetixio/synpress/playwright";
import type { BrowserContext, Page } from "@playwright/test";
import walletSetup from "../wallet-setup/mezo.setup";
import { approveInMetaMask } from "./metamask";

const test = testWithSynpress(metaMaskFixtures(walletSetup));
const { expect } = test;

const sub = async (page: Page) => Number(((await page.locator(".amount-sub").textContent()) ?? "").replace(/[^0-9.]/g, ""));

/** Fills the amount, approves the token if the button asks for it, then sends the action and waits for its toast. */
// amount null: the box was already filled by the Max button
async function act(page: Page, context: BrowserContext, amount: string | null, button: string | RegExp, toast: string) {
  const action = page.locator(".btn.wide");
  const input = page.locator(".amount-row input");
  // retype if a re-render right after a tab switch swallows the first fill
  if (amount !== null) await expect(async () => { await input.fill(amount); await expect(input).toHaveValue(amount, { timeout: 1_000 }); }).toPass();
  if (/^Approve/.test((await action.textContent()) ?? "")) {
    await action.click();
    // watch for the toast while MetaMask is still open: it closes itself after 7 seconds
    const approved = expect(page.locator(".toast.success", { hasText: "approved" })).toBeVisible();
    const approveClicks = approveInMetaMask(context, /^(Next|Confirm|Approve)$/);
    console.log("approve clicks:", (await approveClicks).join(" → "));
    await approved;
  }
  await expect(action).toHaveText(button);
  await action.click();
  const done = expect(page.locator(".toast.success", { hasText: toast })).toBeVisible();
  await approveInMetaMask(context, /^Confirm$/);
  await done;
}

test("lender and borrower flows work end to end", async ({ context, page }) => {
  await page.goto("/app/lend");
  await expect(page.getByRole("heading", { name: "Lend", exact: true })).toBeVisible();

  // connect: MetaMask asks to connect, then to add and switch to Mezo Testnet
  await page.locator(".topbar").getByRole("button", { name: "Connect wallet" }).click();
  const steps = await approveInMetaMask(context, /^(Connect|Confirm|Approve|Switch network)$/);
  const settled = await expect(page.locator(".banner.warn")).toHaveCount(0, { timeout: 15_000 }).then(() => true, () => false);
  if (!settled) steps.push(...(await approveInMetaMask(context, /^(Approve|Switch network|Confirm)$/, 20_000)));
  console.log("MetaMask connect steps:", steps.join(" → "));
  await expect(page.locator(".acct-btn")).toContainText("0xde6b");
  await expect(page.locator(".amount-sub")).toContainText("Wallet balance");
  const musd = await sub(page);
  expect(musd).toBeGreaterThanOrEqual(1);

  // input validation
  const input = page.getByLabel("Amount of MUSD");
  const action = page.locator(".btn.wide");
  await input.fill("abc");
  await expect(action).toHaveText("Enter a valid amount");
  await input.fill(String(Math.ceil(musd) + 1000));
  await expect(action).toHaveText("Not enough MUSD in your wallet");

  // lend 1 MUSD and take it back
  await act(page, context, "1", "Lend 1 MUSD", "Lend 1 MUSD done");
  await expect.poll(() => sub(page)).toBeCloseTo(musd - 1, 2);
  await page.getByRole("tab", { name: "Withdraw" }).click();
  await expect(page).toHaveURL(/tab=withdraw/);
  await act(page, context, "1", "Withdraw 1 MUSD", "Withdraw 1 MUSD done");
  await page.getByRole("tab", { name: "Lend" }).click();
  await expect.poll(() => sub(page)).toBeCloseTo(musd, 2);

  // borrower: post 2 MEZO, borrow 0.5 MUSD
  await page.locator(".nav-links").getByRole("link", { name: "Borrow" }).click();
  await expect(page).toHaveURL(/\/app\/borrow$/);
  await expect(page.locator(".amount-sub")).toContainText("MEZO");
  expect(await sub(page)).toBeGreaterThanOrEqual(2);
  await act(page, context, "2", "Deposit 2 MEZO", "Deposit 2 MEZO done");

  await page.getByRole("tab", { name: "Borrow" }).click();
  await expect(page.locator(".amount-sub")).toContainText("You can borrow");
  await page.locator(".amount-row input").fill("100");
  await expect(action).toHaveText("Over your borrow limit");
  await act(page, context, "0.5", "Borrow 0.5 MUSD", "Borrow 0.5 MUSD done");
  await expect(page.locator(".acard .pill").first()).toContainText("safe");

  // repay everything with Max (includes interest), then take all the MEZO back
  await page.getByRole("tab", { name: "Repay" }).click();
  await expect.poll(() => sub(page)).toBeGreaterThanOrEqual(0.5);
  await page.getByRole("button", { name: /^Max/ }).click();
  await act(page, context, null, /^Repay 0\.5/, "done");
  await expect.poll(() => sub(page)).toBe(0);

  await page.getByRole("tab", { name: "Take MEZO back" }).click();
  await expect.poll(() => sub(page)).toBeGreaterThanOrEqual(2);
  await page.getByRole("button", { name: /^Max/ }).click();
  await act(page, context, null, /^Withdraw 2/, "done");
  await expect(page.locator(".acard .pill").first()).toContainText("No loan");

  // the other pages render live data
  await page.locator(".nav-links").getByRole("link", { name: "Overview" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.locator(".loans-summary")).toContainText("borrower");
  await page.locator(".nav-links").getByRole("link", { name: "Liquidate" }).click();
  await expect(page.locator(".loans .tr").nth(1)).toBeVisible();
  await page.locator(".nav-links").getByRole("link", { name: "Rules" }).click();
  await expect(page.locator(".rule-value").first()).toHaveText("50%");
});
