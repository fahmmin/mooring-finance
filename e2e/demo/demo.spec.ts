// Records the live part of the demo video as an MP4 you can copy: real MetaMask on Mezo testnet, a visible cursor,
// and a caption bar saying what to narrate. Run: npx playwright test --config demo.config.ts
// The wallet must already have approved MUSD and MEZO (the e2e test does that), so no approval popups appear.
import { testWithSynpress } from "@synthetixio/synpress";
import { metaMaskFixtures } from "@synthetixio/synpress/playwright";
import type { Locator, Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import walletSetup from "../wallet-setup/mezo.setup";
import { approveInMetaMask } from "../tests/metamask";

const test = testWithSynpress(metaMaskFixtures(walletSetup));
const { expect } = test;

const OUT = path.resolve("demo-output");
const FRAMES = path.join(OUT, "frames");

/** Caption bar and a fake cursor, since a tab screencast doesn't include the real mouse pointer. */
async function overlay(page: Page, text: string) {
  await page.evaluate((t) => {
    let bar = document.getElementById("demo-caption");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "demo-caption";
      bar.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;max-width:880px;padding:12px 18px;border-radius:8px;background:rgba(18,50,79,.94);color:#fff;font:600 18px/1.4 system-ui;text-align:center;pointer-events:none;box-shadow:0 0 0 3px #f2be22";
      document.body.appendChild(bar);
      const dot = document.createElement("div");
      dot.id = "demo-cursor";
      dot.style.cssText = "position:fixed;left:-50px;top:-50px;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(242,190,34,.85);border:2px solid #12324f;z-index:100000;pointer-events:none;transition:transform .12s";
      document.body.appendChild(dot);
      addEventListener("mousemove", (e) => { dot.style.left = e.clientX + "px"; dot.style.top = e.clientY + "px"; });
      addEventListener("mousedown", () => { dot.style.transform = "scale(.7)"; });
      addEventListener("mouseup", () => { dot.style.transform = ""; });
    }
    bar.textContent = t;
    bar.style.display = t ? "block" : "none";
  }, text);
}

async function say(page: Page, text: string, hold = 3500) {
  await overlay(page, text);
  await page.waitForTimeout(hold);
}

/** Glides the cursor to an element, then clicks it, so viewers can follow. */
async function press(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded();
  const box = (await target.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 25 });
  await page.waitForTimeout(350);
  await target.click();
}

async function typeAmount(page: Page, value: string) {
  const input = page.locator(".amount-row input");
  await press(page, input);
  await input.fill("");
  await page.keyboard.type(value, { delay: 160 });
  await expect(input).toHaveValue(value);
}

/** Clicks the main button, confirms in MetaMask, waits for the success toast and returns its transaction hash. */
async function confirm(page: Page, context: import("@playwright/test").BrowserContext, label: string | RegExp, toast: string) {
  const action = page.locator(".btn.wide");
  await expect(action).toHaveText(label);
  // read the explorer link as soon as the toast shows: toasts close themselves after 7 seconds
  const href = page.locator(".toast.success", { hasText: toast }).locator("a").getAttribute("href", { timeout: 120_000 });
  await press(page, action);
  await approveInMetaMask(context, /^Confirm$/);
  const tx = (await href) ?? "";
  await page.waitForTimeout(2500);
  return tx;
}

test("record the live demo", async ({ context, page }) => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(FRAMES, { recursive: true });

  // Chrome's screencast of the app tab: a frame each time the page repaints, with its timestamp
  const frames: { file: string; t: number }[] = [];
  const cdp = await context.newCDPSession(page);
  cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    const file = path.join(FRAMES, `${String(frames.length).padStart(5, "0")}.jpg`);
    fs.writeFileSync(file, Buffer.from(data, "base64"));
    frames.push({ file, t: metadata.timestamp! });
    await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 85, maxWidth: 1280, maxHeight: 720 });

  // ---- 0:00 intro on the landing page
  await page.goto("/");
  await say(page, "Intro: who you are. MEZO holders can lock MEZO for votes, and that's about it.", 4000);
  await say(page, "Mooring turns MEZO into collateral, and gives MUSD a lending market.", 4000);
  await page.mouse.wheel(0, 650);
  await say(page, "Three roles keep it working: lenders, borrowers and liquidators.", 4000);
  await page.mouse.wheel(0, 650);
  await say(page, "The rules live in the contract: 50% borrow limit, 65% liquidation line, 8% bonus.", 4000);

  // ---- (cut to the tldraw board here when editing, then come back)
  await page.goto("/app");
  await say(page, "[After the whiteboard] Here's the live app on Mezo testnet.", 3000);
  await press(page, page.locator(".topbar").getByRole("button", { name: "Connect wallet" }));
  await overlay(page, "Connect MetaMask and switch to Mezo Testnet.");
  await approveInMetaMask(context, /^(Connect|Confirm|Approve|Switch network)$/);
  await expect(page.locator(".acct-btn")).toContainText("0x");
  await say(page, "The strip up top is live: MEZO price, what lenders earn, what borrowers pay.", 4000);

  // ---- lend
  await press(page, page.locator(".nav-links").getByRole("link", { name: "Lend" }));
  await say(page, "Lending: put in MUSD, get mMUSD shares that grow with borrowers' interest.", 3500);
  await typeAmount(page, "1");
  await overlay(page, "Lend 1 MUSD and confirm in MetaMask.");
  await confirm(page, context, "Lend 1 MUSD", "Lend 1 MUSD done");
  await say(page, "Done in a few seconds. The toast links to the transaction on Mezo's explorer.", 3500);

  // ---- borrow
  await press(page, page.locator(".nav-links").getByRole("link", { name: "Borrow" }));
  await say(page, "Borrowing: first post MEZO as collateral.", 3000);
  await typeAmount(page, "2");
  await say(page, "The preview shows what your loan looks like after this step.", 3000);
  await confirm(page, context, "Deposit 2 MEZO", "Deposit 2 MEZO done");

  await press(page, page.getByRole("tab", { name: "Borrow" }));
  await say(page, "Now borrow MUSD against it, up to half the MEZO's value.", 3000);
  await typeAmount(page, "0.5");
  const borrowTx = await confirm(page, context, "Borrow 0.5 MUSD", "Borrow 0.5 MUSD done");
  await page.locator(".mline").scrollIntoViewIfNeeded();
  await say(page, "The ruler shows where the loan sits: well inside the safe zone. Health is the pill on the right.", 5000);

  // ---- show the transaction on the explorer
  if (borrowTx) {
    await overlay(page, "Every action is a real transaction on Mezo testnet.");
    await page.goto(borrowTx);
    await page.waitForTimeout(6000);
    await page.goto("/app/borrow?tab=repay");
    await expect(page.locator(".amount-sub")).toContainText("You owe");
  }

  // ---- repay and take the MEZO back
  await press(page, page.getByRole("tab", { name: "Repay" }));
  await say(page, "Repay with Max: it clears the loan including the interest added since.", 3500);
  await expect.poll(async () => Number(((await page.locator(".amount-sub").textContent()) ?? "").replace(/[^0-9.]/g, ""))).toBeGreaterThan(0);
  await press(page, page.getByRole("button", { name: /^Max/ }));
  await confirm(page, context, /^Repay 0\.5/, "done");
  await press(page, page.getByRole("tab", { name: "Take MEZO back" }));
  await expect.poll(async () => Number(((await page.locator(".amount-sub").textContent()) ?? "").replace(/[^0-9.]/g, ""))).toBeGreaterThanOrEqual(2);
  await press(page, page.getByRole("button", { name: /^Max/ }));
  await overlay(page, "And the MEZO comes back.");
  await confirm(page, context, /^Withdraw 2/, "done");

  // ---- liquidate and rules
  await press(page, page.locator(".nav-links").getByRole("link", { name: "Liquidate" }));
  await say(page, "Every open loan, riskiest first. Past 65%, anyone can liquidate half for an 8% bonus.", 5000);
  await press(page, page.locator(".nav-links").getByRole("link", { name: "Rules" }));
  await say(page, "Every limit here is enforced in the contract. The owner can only change the price source.", 5000);
  await page.mouse.wheel(0, 500);
  await say(page, "[Cut back to the board for Wave 2, then end on the GitHub link.]", 3500);

  await cdp.send("Page.stopScreencast");
  fs.writeFileSync(path.join(OUT, "frames.json"), JSON.stringify(frames));

  execFileSync(process.execPath, [path.join(__dirname, "stitch.mjs"), OUT], { stdio: "inherit" });

  // tidy up off-camera: take the lent MUSD back so the wallet is ready for the next take
  await page.goto("/app/lend?tab=withdraw");
  await page.getByRole("button", { name: /^Max/ }).click();
  await page.locator(".btn.wide").click();
  await approveInMetaMask(context, /^Confirm$/);
  await expect(page.locator(".amount-sub")).toContainText("Available 0.00", { timeout: 120_000 }).catch(() => console.log("cleanup: check the wallet still has MUSD lent"));

});
