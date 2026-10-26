import { fmt, pct } from "../chain";
import { Card, Go, Pill, Stat, healthText, type PageProps } from "./parts";

export function Overview({ live, wallet }: PageProps) {
  const m = live.market;
  const a = wallet.account;
  const h = healthText(a && a.debt > 0n ? a.health : undefined);
  const risky = live.loans?.filter((l) => l.debt > 0n && l.health < 10n ** 18n).length;

  return (
    <>
      <div className="stats-row">
        <Stat label="Total lent" value={m ? fmt(m.total) : undefined} unit="MUSD" sub="Mezo testnet market" />
        <Stat label="Lender rate" value={m ? pct(m.supplyRate) : undefined} sub="A year, paid in MUSD" />
        <Stat label="Borrow rate" value={m ? pct(m.borrowRate) : undefined} sub={`${pct(m?.utilization, 1)} of the market borrowed`} />
        <Stat label="MEZO price" value={m ? `$${fmt(m.price, 4)}` : undefined} sub="Mezo Pools TWAP" />
      </div>

      <div className="grid-2">
        <Card title="Your lending" action={<Go to="/app/lend" className="textlink">Manage</Go>}>
          {!wallet.address ? (
            <div className="empty-state">
              <p>Connect a wallet to lend MUSD or borrow against MEZO.</p>
              <button className="btn" onClick={() => wallet.connect().catch(() => {})}>Connect wallet</button>
            </div>
          ) : (
            <>
              <div className="position">
                <Stat label="Lent" value={a ? fmt(a.value) : undefined} unit="MUSD" loading={!a} />
                <Stat label="Shares" value={a ? fmt(a.shares, 4) : undefined} unit="mMUSD" loading={!a} />
                <Stat label="In your wallet" value={a ? fmt(a.musd) : undefined} unit="MUSD" loading={!a} />
              </div>
              <div className="row-actions">
                <Go to="/app/lend" className="btn">Lend</Go>
                <Go to="/app/lend?tab=withdraw" className="btn plain">Withdraw</Go>
              </div>
            </>
          )}
        </Card>

        <Card title="Your loan" action={<Pill tone={h.tone}>{h.text}</Pill>}>
          {!wallet.address ? <p className="muted">Post MEZO and borrow MUSD without selling it.</p> : (
            <>
              <div className="position">
                <Stat label="Collateral" value={a ? fmt(a.coll) : undefined} unit="MEZO" loading={!a} />
                <Stat label="Debt" value={a ? fmt(a.debt, 4) : undefined} unit="MUSD" loading={!a} />
                <Stat label="Borrow limit" value={a ? fmt(a.maxBorrow) : undefined} unit="MUSD" loading={!a} />
              </div>
              <div className="row-actions">
                <Go to="/app/borrow" className="btn">Borrow</Go>
                <Go to="/app/borrow?tab=repay" className="btn plain">Repay</Go>
              </div>
            </>
          )}
        </Card>
      </div>

      <Card title="Open loans" action={<Go to="/app/liquidate" className="textlink">All loans</Go>}>
        {!live.loans ? <div className="skel-list"><span className="skel" /></div> : (
          <p className="muted loans-summary">{live.loans.length} {live.loans.length === 1 ? "borrower has" : "borrowers have"} {fmt(m?.borrows)} MUSD out. {risky === 0 ? "None can be liquidated." : `${risky} can be liquidated.`}</p>
        )}
      </Card>
    </>
  );
}
