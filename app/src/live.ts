import { useCallback, useEffect, useState } from "react";
import { DEPLOY_BLOCK, MARKET, marketAbi, pub } from "./chain";

export type Market = {
  total: bigint; borrows: bigint; cash: bigint; utilization: bigint;
  borrowRate: bigint; supplyRate: bigint; price: bigint; sharePrice: bigint;
};
export type Loan = { user: `0x${string}`; coll: bigint; debt: bigint; collValue: bigint; health: bigint };

const LOG_SPAN = 9_999n; // Mezo's RPC caps a log query at 10,000 blocks

/** Everyone who has posted collateral, read from events in 10,000-block pages. */
async function borrowers(latest: bigint) {
  const users = new Set<`0x${string}`>();
  // shortcut: reads at most 40 pages (about 400k blocks) back from now; an indexer is the upgrade
  for (let to = latest, i = 0; to >= DEPLOY_BLOCK && i < 40; to -= LOG_SPAN + 1n, i++) {
    const from = to - LOG_SPAN > DEPLOY_BLOCK ? to - LOG_SPAN : DEPLOY_BLOCK;
    const logs = await pub.getContractEvents({ address: MARKET!, abi: marketAbi, eventName: "CollateralDeposited", fromBlock: from, toBlock: to });
    logs.forEach((l) => users.add((l.args as { user: `0x${string}` }).user));
  }
  return [...users];
}

/** Live market state for the landing page and the app. Polls every 20 seconds. */
export function useLive() {
  const [market, setMarket] = useState<Market>();
  const [loans, setLoans] = useState<Loan[]>();
  const [block, setBlock] = useState<bigint>();
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const latest = await pub.getBlockNumber();
    setBlock(latest);
    if (!MARKET) return;
    const m = { address: MARKET, abi: marketAbi } as const;
    const [total, borrows, cash, utilization, borrowRate, supplyRate, price, sharePrice] = await Promise.all([
      pub.readContract({ ...m, functionName: "totalAssets" }),
      pub.readContract({ ...m, functionName: "totalBorrows" }),
      pub.readContract({ ...m, functionName: "cash" }),
      pub.readContract({ ...m, functionName: "utilization" }),
      pub.readContract({ ...m, functionName: "borrowRate" }),
      pub.readContract({ ...m, functionName: "supplyRate" }),
      pub.readContract({ ...m, functionName: "collateralPrice" }),
      pub.readContract({ ...m, functionName: "convertToAssets", args: [10n ** 18n] }),
    ]);
    setMarket({ total, borrows, cash, utilization, borrowRate, supplyRate, price, sharePrice });
    const users = await borrowers(latest);
    const positions = await Promise.all(users.map((user) => pub.readContract({ ...m, functionName: "position", args: [user] })));
    setLoans(users.map((user, i) => {
      const [coll, debt, collValue, , health] = positions[i];
      return { user, coll, debt, collValue, health };
    }).filter((l) => l.coll > 0n || l.debt > 0n).sort((a, b) => (a.health < b.health ? -1 : 1)));
  }, []);

  useEffect(() => {
    load().catch((e) => setError(`Couldn't read Mezo testnet: ${e.shortMessage ?? e.message}`));
    const id = setInterval(() => load().catch(() => {}), 20_000);
    return () => clearInterval(id);
  }, [load]);

  return { market, loans, block, error, reload: load };
}
