import { type Abi } from "viem";
import { MARKET, MUSD, fmt, marketAbi, pct } from "../chain";
import { ActionCard } from "./Action";
import { Address, Card, Go, Pill, type PageProps } from "./parts";

export function Lend(page: PageProps) {
  const { live, wallet } = page;
  const m = live.market;
  const a = wallet.account;
  const sharePrice = m?.sharePrice ?? 10n ** 18n;
  const shares = (x: bigint) => fmt((x * 10n ** 18n) / (sharePrice || 1n), 4);
  const abi = marketAbi as Abi;

  return (
    <div className="earn">
      <ActionCard page={page} base="/app/lend" tabs={[
        {
          id: "lend", label: "Lend", verb: "Lend", token: "MUSD",
          available: a?.musd, availableText: `Wallet balance ${fmt(a?.musd)} MUSD`, tooMuch: "Not enough MUSD in your wallet",
          allowance: a?.musdAllowance, tokenAddress: MUSD,
          call: (x) => ({ address: MARKET!, abi, functionName: "deposit", args: [x, wallet.address] }),
          preview: (x) => <>
            <div><dt>You receive</dt><dd>{shares(x)} mMUSD</dd></div>
            <div><dt>Lender rate now</dt><dd>{pct(m?.supplyRate)} a year</dd></div>
            <div><dt>Network fee</dt><dd>Under 0.0001 BTC</dd></div>
          </>,
          hint: a && a.musd === 0n ? <>No MUSD yet? Borrow test MUSD against test BTC at <a href="https://testnet.mezo.org" target="_blank" rel="noreferrer">testnet.mezo.org</a>.</> : undefined,
        },
        {
          id: "withdraw", label: "Withdraw", verb: "Withdraw", token: "MUSD",
          available: a?.maxWithdraw, availableText: `Available ${fmt(a?.maxWithdraw)} MUSD of ${fmt(a?.value)} lent`, tooMuch: "More than you can withdraw now",
          call: (x) => ({ address: MARKET!, abi, functionName: "withdraw", args: [x, wallet.address, wallet.address] }),
          preview: (x) => <>
            <div><dt>Shares burned</dt><dd>{shares(x)} mMUSD</dd></div>
            <div><dt>Free to withdraw in the market</dt><dd>{fmt(m?.cash)} MUSD</dd></div>
          </>,
          hint: "You can withdraw any MUSD that isn't lent out. When most of the market is borrowed, rates climb until borrowers repay.",
        },
      ]} />

      <div className="earn-side">
        <Card title="MUSD lending market">
          <div className="vault-id">
            <img src="/brand/musd.svg" alt="" />
            <div><strong>mMUSD</strong><span>ERC-4626 shares on Mezo Testnet</span></div>
            <Pill tone="good">Open</Pill>
          </div>
          <dl className="kv">
            <div><dt>Total lent in</dt><dd>{fmt(m?.total)} MUSD</dd></div>
            <div><dt>Borrowed out</dt><dd>{fmt(m?.borrows)} MUSD ({pct(m?.utilization, 1)})</dd></div>
            <div><dt>Lender rate</dt><dd>{pct(m?.supplyRate)} a year</dd></div>
            <div><dt>Value of 1 mMUSD</dt><dd>{fmt(m?.sharePrice, 6)} MUSD</dd></div>
            <div><dt>Your position</dt><dd>{fmt(a?.value)} MUSD</dd></div>
            <div><dt>Contract</dt><dd>{MARKET && <Address value={MARKET} />}</dd></div>
          </dl>
        </Card>
        <Card title="Where your interest comes from" className="soft">
          <ol className="how">
            <li><strong>Borrowers post MEZO</strong> and borrow your MUSD at up to 50% of its value.</li>
            <li><strong>They pay interest</strong> that rises with how much of the market is borrowed. It flows straight into the value of mMUSD.</li>
            <li><strong>Risky loans get liquidated</strong> by anyone once debt passes 65% of the collateral.</li>
          </ol>
          <Go to="/app/risk" className="textlink">See the market rules</Go>
        </Card>
        <p className="risk-note">Testnet only. Unaudited code; don&apos;t use real funds.</p>
      </div>
    </div>
  );
}
