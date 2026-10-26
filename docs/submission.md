# Wave 1 submission kit (draft: rewrite in your own words)

## AKINDO form

- **Project name:** Mooring Finance
- **Category:** MEZO-collateral lending market
- **TL;DR:** An isolated money market on Mezo where MUSD holders lend for interest and MEZO holders borrow MUSD against their MEZO.
- **How it works:** see the README sections "Why" and "How it works". Lead with the gap: MEZO has no use beyond vote-locking, and only one other Wave 1 entry treats it as collateral.
- **Target group:** MEZO holders who want dollars without selling (desktop, intermediate DeFi users), and MUSD holders looking for lending yield. Also yield vaults that need somewhere to put idle MUSD.
- **Tech stack:** Solidity 0.8.28 + OpenZeppelin ERC-4626, Hardhat; React + Vite + viem app; Playwright + Synpress (real MetaMask) end-to-end tests.
- **Track:** Track 1 (DeFi)
- **Chain:** Mezo testnet
- **Status:** entirely new
- **Readiness:** testnet deployment
- **Future milestones:** the three roadmap items in the README.
- **Team:** fill in names, roles, X/LinkedIn.

## 2-minute video script

| Time | Show | Say |
|---|---|---|
| 0:00–0:15 | Landing hero | "MEZO holders can lock for votes, and that's about it. Mooring turns MEZO into collateral and gives MUSD a lending market." |
| 0:15–0:40 | Lend page, lend 1 MUSD | "Lenders deposit MUSD and get mMUSD, a standard ERC-4626 share that grows with borrower interest." |
| 0:40–1:10 | Borrow page: deposit MEZO, borrow MUSD, health pill | "Borrowers post MEZO and borrow up to 50% of its value. The rate follows how busy the market is." |
| 1:10–1:30 | Liquidate page + Rules page | "Past 65%, anyone can liquidate half a loan for an 8% bonus. The owner can't pause, upgrade or touch funds." |
| 1:30–1:45 | Risk page contracts, Mezo Pools address | "MEZO is priced from the Mezo Pools MEZO/MUSD TWAP; on mainnet we add Pyth." |
| 1:45–2:00 | Roadmap | "Next: mainnet with a cap, more markets like veMEZO and sMUSD, and yield vaults lending their idle MUSD here." |

## Deck (6 slides)

1. Mooring Finance: keep your MEZO, borrow the dollars.
2. The problem: MEZO has one use; MUSD has few places to earn.
3. How it works: the diagram and rules table from the README.
4. Safety: liquidation design, owner powers, known limits (oracle, bad debt).
5. Mezo integration: MUSD, MEZO, Mezo Pools TWAP, ERC-4626 shares other vaults can hold.
6. Roadmap and asks: Wave 2 milestones; a Pyth MEZO/USD push on testnet; feedback on risk parameters.
