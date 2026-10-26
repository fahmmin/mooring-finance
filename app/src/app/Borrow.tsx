import { maxUint256, type Abi } from "viem";
import { MARKET, MEZO, MUSD, fmt, marketAbi, pct } from "../chain";
import { MooringLegend, MooringLine } from "../ui";
import { ActionCard } from "./Action";
import { Card, Pill, healthText, type PageProps } from "./parts";

const WAD = 10n ** 18n;

export function Borrow(page: PageProps) {
  const { live, wallet } = page;
  const m = live.market;
  const a = wallet.account;
  const price = m?.price ?? 0n;
  const abi = marketAbi as Abi;
  const coll = a?.coll ?? 0n;
  const debt = a?.debt ?? 0n;

  // what the position looks like after this action
  const after = (c: bigint, d: bigint) => {
    const value = (c * price) / WAD;
    const health = d === 0n ? undefined : (value * 65n * WAD) / (100n * d);
    return <>
      <div><dt>Collateral after</dt><dd>{fmt(c)} MEZO (${fmt(value)})</dd></div>
      <div><dt>Debt after</dt><dd>{fmt(d, 4)} MUSD</dd></div>
      <div><dt>Health after</dt><dd>{healthText(health).text}</dd></div>
    </>;
  };
  // the most MEZO you can take out while staying at or under 50%
  const locked = debt === 0n || price === 0n ? 0n : (debt * 2n * WAD + price - 1n) / price;
  const freeColl = coll > locked ? coll - locked : 0n;
  const room = a ? (a.maxBorrow > debt ? a.maxBorrow - debt : 0n) : undefined;
  const canBorrow = room !== undefined && m && m.cash < room ? m.cash : room;
  const status = healthText(a && a.debt > 0n ? a.health : undefined);

  return (
    <div className="earn">
      <ActionCard page={page} base="/app/borrow" tabs={[
        {
          id: "deposit", label: "Add MEZO", verb: "Deposit", token: "MEZO",
          available: a?.mezo, availableText: `Wallet balance ${fmt(a?.mezo)} MEZO`, tooMuch: "Not enough MEZO in your wallet",
          allowance: a?.mezoAllowance, tokenAddress: MEZO,
          call: (x) => ({ address: MARKET!, abi, functionName: "depositCollateral", args: [x] }),
          preview: (x) => after(coll + x, debt),
          hint: a && a.mezo === 0n ? <>Get test MEZO from the <a href="https://faucet.test.mezo.org" target="_blank" rel="noreferrer">Mezo faucet</a>.</> : undefined,
        },
        {
          id: "borrow", label: "Borrow", verb: "Borrow", token: "MUSD",
          available: canBorrow, availableText: `You can borrow ${fmt(canBorrow)} MUSD`, tooMuch: "Over your borrow limit",
          call: (x) => ({ address: MARKET!, abi, functionName: "borrow", args: [x] }),
          preview: (x) => after(coll, debt + x),
        },
        {
          id: "repay", label: "Repay", verb: "Repay", token: "MUSD",
          available: a ? (a.debt < a.musd ? a.debt : a.musd) : undefined, availableText: `You owe ${fmt(a?.debt, 4)} MUSD`, tooMuch: "More than you owe or hold",
          allowance: a?.musdAllowance, tokenAddress: MUSD,
          // Max sends uint max so the contract clears interest added after the page loaded
          call: (x, all) => ({ address: MARKET!, abi, functionName: "repay", args: [all && a && a.musd > a.debt ? maxUint256 : x, wallet.address] }),
          preview: (x) => after(coll, debt > x ? debt - x : 0n),
          hint: "Max repays the whole loan, including interest added since the page loaded.",
        },
        {
          id: "withdraw", label: "Take MEZO back", verb: "Withdraw", token: "MEZO",
          available: a ? freeColl : undefined, availableText: `Free to withdraw ${fmt(freeColl)} MEZO`, tooMuch: "That would put your loan over 50%",
          call: (x) => ({ address: MARKET!, abi, functionName: "withdrawCollateral", args: [x] }),
          preview: (x) => after(coll > x ? coll - x : 0n, debt),
        },
      ]} />

      <div className="earn-side">
        <Card title="Your loan" action={<Pill tone={status.tone}>{status.text}</Pill>}>
          <MooringLine ltv={a && a.debt > 0n && a.collValue > 0n ? Number(a.debt) / Number(a.collValue) : undefined} label="You" />
          <MooringLegend />
          <dl className="kv loan-kv">
            <div><dt>Collateral</dt><dd>{fmt(a?.coll)} MEZO (${fmt(a?.collValue)})</dd></div>
            <div><dt>Debt</dt><dd>{fmt(a?.debt, 4)} MUSD</dd></div>
            <div><dt>Borrow limit</dt><dd>{fmt(a?.maxBorrow)} MUSD</dd></div>
            <div><dt>Borrow rate</dt><dd>{pct(m?.borrowRate)} a year</dd></div>
            <div><dt>MEZO price</dt><dd>${fmt(m?.price, 4)}<span className="kv-note">Mezo Pools TWAP</span></dd></div>
            <div><dt>Liquidated if MEZO falls to</dt><dd>{a && a.debt > 0n && a.coll > 0n ? `$${fmt((a.debt * 100n * WAD) / (a.coll * 65n), 4)}` : "–"}</dd></div>
          </dl>
        </Card>
        <Card title="How borrowing works" className="soft">
          <ol className="how">
            <li><strong>Post MEZO</strong> as collateral. It stays yours and you can take it back.</li>
            <li><strong>Borrow MUSD</strong> up to 50% of the MEZO&apos;s value, at a rate set by how busy the market is.</li>
            <li><strong>Stay under 65%.</strong> Past that, anyone can repay part of your loan and take MEZO with an 8% bonus.</li>
          </ol>
        </Card>
        <p className="risk-note">Testnet only. Unaudited code; don&apos;t use real funds.</p>
      </div>
    </div>
  );
}
