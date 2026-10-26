# Demo video plan (2 minutes)

Board: `docs/architecture.tldr`. Open it at [tldraw.com](https://www.tldraw.com) with **Menu → File → Open** (or drag the file onto the canvas). It has three frames: **1. How Mooring works**, **2. When does a loan get liquidated?**, **3. Wave 2**. Use the frame list (or zoom to fit each frame) to jump between them.

## Before you record

- **Two browser windows, one screen:** tldraw full screen, and the app at `/app` with MetaMask on Mezo Testnet. Close everything else.
- **Wallet ready:** about 3 MUSD, 3 MEZO and some test BTC in the account you'll show. Approve MUSD and MEZO once *before* recording, so the video has no approval popups.
- **Zoom the browser to 110–125%**, so numbers are readable at 1080p.
- **Explorer tab open** on the market contract, to show a transaction landing.
- **Record at 1080p** with OBS or Loom. Mezo testnet confirms in a few seconds; if one hangs, cut it out in editing rather than waiting on camera.
- **Rehearse once with a timer.** AKINDO asks for 2 minutes; going long hurts the "submission materials" score.

## Script

| Time | Screen | What to say (in your own words) |
|---|---|---|
| 0:00–0:15 | Landing page hero | Who you are. "MEZO holders can lock it for votes, and that's about it. Mooring turns MEZO into collateral and gives MUSD a lending market." |
| 0:15–0:45 | tldraw frame 1 | Walk the arrows left to right: lenders deposit MUSD and get mMUSD; borrowers post MEZO and take MUSD at up to 50%; liquidators repay risky loans for MEZO plus 8%. Point at the oracle: MEZO priced from Mezo's own pool, as a 2-hour average. End on "the owner can only swap the price source". |
| 0:45–1:00 | tldraw frame 2 | The loan line: 0–50% safe, 50–65% can't borrow more, 65%+ liquidatable. "If MEZO falls, the loan slides right." |
| 1:00–1:40 | App | **Lend:** lend 1 MUSD, show mMUSD and the toast. **Borrow:** deposit 2 MEZO, borrow 0.5 MUSD, point at the ruler and the health pill. **Repay** with Max. Click one toast's explorer link to show the transaction on Mezo. |
| 1:40–1:50 | Liquidate and Rules pages | "Every loan, riskiest first. Every rule on this page is enforced in the contract." |
| 1:50–2:00 | tldraw frame 3 | The Wave 2 milestones in one sentence, then the GitHub link. |

## Tips

- **Say numbers out loud**, like "50%, 65%, 8%". Judges remember those.
- **Show, don't narrate code.** Mention the 6 contract tests and the MetaMask end-to-end test in one line; don't open files on camera.
- **One take per section**, then stitch them together. It's easier than one perfect 2-minute take.

# Wave 2 milestones (Nov 2 – Nov 15)

Wave 1 was a working testnet market. Wave 2 should turn it into a protocol people can actually use with real money, so the jump is visible.

| # | Milestone | What "done" looks like | Why judges care |
|---|---|---|---|
| 1 | **Mainnet launch, capped** | Market live on Mezo mainnet with a deposit cap (e.g. 10k MUSD). MEZO priced by Pyth MEZO/USD, rejected if it strays more than X% from the Mezo Pools average. | Readiness jumps from "testnet" to "mainnet". It's the strongest single signal. |
| 2 | **Market factory** | One factory contract deploys isolated markets. Ships with MEZO plus a second market (sMUSD collateral, so savers can borrow against their savings). Research veMEZO as a third. | Turns one market into a platform, and adds more ways to use MUSD and MEZO. |
| 3 | **Safety** | A reserve fund taken from interest to cover bad debt. Foundry invariant fuzz tests ("total assets ≥ total borrows", "no withdrawal makes a loan unsafe"). Parameter changes behind a 48-hour timelock. | Technical score (20%) rewards security; it also answers the first question any lender asks. |
| 4 | **Liquidation keeper + alerts** | Open-source bot that liquidates loans past 65%. Telegram bot that warns borrowers at 55% and 60%. | Liquidations that actually happen protect lenders. Telegram adds Track 2 reach. |
| 5 | **Lender rewards via Mezo Earn** | An mMUSD/MUSD pool on Mezo Pools with a gauge, so veBTC voters can direct MEZO emissions to lenders. Needs Mezo to whitelist mMUSD; ask in Discord early. | Plugs into Mezo's vote-escrow system: the "composability wins" line in the brief. |

**How to present them:** in the Wave 2 submission, open with a "Since Wave 1" list that has links: mainnet addresses, the factory, test counts, the bot, the gauge. AKINDO asks Wave 2 entries to say exactly what changed.

**If time runs short:** 1, 3 and 4 are the must-haves. 2 and 5 are where the extra points are.
