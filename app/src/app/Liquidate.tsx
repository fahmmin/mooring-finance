import { type Abi } from "viem";
import { MARKET, fmt, marketAbi } from "../chain";
import { useRun } from "./Action";
import { Address, Card, Pill, healthText, type PageProps } from "./parts";

export function Liquidate(page: PageProps) {
  const { live, wallet } = page;
  const { busy, run } = useRun(page);
  const loans = live.loans;

  return (
    <Card title="Every loan, riskiest first" action={<span className="muted">Health under 1.00 can be liquidated</span>}>
      {!loans ? <div className="skel-list"><span className="skel" /><span className="skel" /></div>
        : loans.length === 0 ? <p className="muted">No open loans yet.</p> : (
        <div className="table loans">
          <div className="tr th"><span>Borrower</span><span>Collateral</span><span>Debt</span><span>Health</span><span /></div>
          {loans.map((l) => {
            const h = healthText(l.debt > 0n ? l.health : undefined);
            const open = l.debt > 0n && l.health < 10n ** 18n;
            return (
              <div className="tr" key={l.user}>
                <Address value={l.user} />
                <span>{fmt(l.coll)} MEZO <small className="muted">${fmt(l.collValue)}</small></span>
                <span>{fmt(l.debt, 4)} MUSD</span>
                <Pill tone={h.tone}>{h.text}</Pill>
                {open
                  ? <button className="btn small" disabled={busy || !wallet.address} onClick={() => run("Liquidating", { address: MARKET!, abi: marketAbi as Abi, functionName: "liquidate", args: [l.user, l.debt / 2n] }, "Liquidated half the loan")}>Liquidate half</button>
                  : <span className="muted">Safe</span>}
              </div>
            );
          })}
        </div>
      )}
      <p className="hint">Liquidating repays up to half a risky loan from your wallet and pays you the matching MEZO plus 8%. Approve MUSD on the Lend page first.</p>
    </Card>
  );
}
