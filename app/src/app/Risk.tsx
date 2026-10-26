import { GITHUB, MARKET, MEZO_CONTRACTS, ORACLE } from "../chain";
import { Address, Card, Pill } from "./parts";

const RULES = [
  { name: "Borrow limit", value: "50%", body: "You can borrow MUSD worth up to half your MEZO collateral, checked on every borrow and withdrawal." },
  { name: "Liquidation line", value: "65%", body: "Once a loan's debt passes 65% of its collateral value, anyone can liquidate it." },
  { name: "Liquidator bonus", value: "8%", body: "A liquidator repays MUSD and receives that much MEZO plus 8%." },
  { name: "Close factor", value: "50%", body: "One liquidation can repay at most half the debt, so borrowers keep the rest." },
  { name: "Interest curve", value: "2–112%", body: "2% when idle, 12% at 80% borrowed, then steep, so lenders can always get out." },
  { name: "Price source", value: "TWAP", body: "MEZO is priced from the Mezo Pools MEZO/MUSD pool's time-weighted average, not a single trade." },
];

export function Risk() {
  return (
    <>
      <div className="grid-2">
        <Card title="Rules in the contract">
          <ul className="rules">
            {RULES.map((r) => (
              <li key={r.name}>
                <div><strong>{r.name}</strong><p>{r.body}</p></div>
                <span className="rule-value">{r.value}</span>
              </li>
            ))}
          </ul>
        </Card>
        <div className="stack">
          <Card title="Who can do what">
            <dl className="kv">
              <div><dt>Lenders</dt><dd>Withdraw unlent MUSD any time</dd></div>
              <div><dt>Borrowers</dt><dd>Borrow, repay, take MEZO back within the limit</dd></div>
              <div><dt>Anyone</dt><dd>Liquidate loans past 65%</dd></div>
              <div><dt>Owner</dt><dd>Can only change the price source<span className="kv-note">No pause, no upgrade, no access to funds</span></dd></div>
            </dl>
          </Card>
          <Card title="Status" className="soft">
            <div className="status-list">
              <div><span>Network</span><Pill tone="info">Mezo Testnet</Pill></div>
              <div><span>Audit</span><Pill tone="warn">Not audited</Pill></div>
              <div><span>Price source</span><Pill tone="warn">Small testnet pool</Pill></div>
              <div><span>Source code</span><a href={GITHUB} target="_blank" rel="noreferrer" className="textlink">GitHub</a></div>
            </div>
          </Card>
        </div>
      </div>

      <Card title="Contracts">
        <div className="table contracts">
          <div className="tr th"><span>Contract</span><span>Address</span><span>Role</span></div>
          {MARKET && <div className="tr"><strong>Mooring Market (mMUSD)</strong><Address value={MARKET} /><span className="muted">Holds deposits and collateral, enforces the rules</span></div>}
          {ORACLE && <div className="tr"><strong>Pool TWAP oracle</strong><Address value={ORACLE} /><span className="muted">Prices MEZO from Mezo Pools</span></div>}
          {MEZO_CONTRACTS.map((c) => (
            <div className="tr" key={c.address}><strong>{c.name}</strong><Address value={c.address} /><span className="muted">Mezo</span></div>
          ))}
        </div>
      </Card>
    </>
  );
}
