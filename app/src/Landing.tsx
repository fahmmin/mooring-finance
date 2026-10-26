import { EXPLORER, GITHUB, MARKET, fmt, pct } from "./chain";
import { useLive } from "./live";
import { Built, LinkButton, Logo, MooringLegend, MooringLine } from "./ui";

const ROLES = [
  { name: "Lenders", body: "Put MUSD in and receive mMUSD. Borrowers' interest flows into it, so each mMUSD redeems for more MUSD over time. Take out anything that isn't lent." },
  { name: "Borrowers", body: "Put MEZO up as collateral and take out MUSD at up to half its value. The MEZO stays yours, and comes back when you repay." },
  { name: "Liquidators", body: "When a loan drifts past 65%, anyone can repay up to half of it and collect the matching MEZO plus 8%. That's what keeps lenders whole." },
];

const SIGNS = [
  { value: "50%", name: "Borrow limit", body: "Of your MEZO's value, checked on every borrow and withdrawal." },
  { value: "65%", name: "Liquidation line", body: "Past this, the loan is open to liquidators.", warn: true },
  { value: "8%", name: "Liquidator bonus", body: "Extra MEZO for whoever repays a risky loan." },
  { value: "2–112%", name: "Borrow rate", body: "Low when the market is quiet, steep when it's nearly all lent." },
];

const NEXT = [
  { name: "Pyth prices on mainnet", body: "MEZO/USD from Pyth, checked against the Mezo Pools average." },
  { name: "A reserve for bad debt", body: "A slice of interest set aside so lenders don't absorb a crash." },
  { name: "veMEZO and sMUSD as collateral", body: "Each in its own market, so one asset's risk stays put." },
  { name: "Liquidation alerts", body: "An open-source bot and Telegram warnings for borrowers." },
];

export default function Landing() {
  const { market, loans } = useLive();
  const loan = loans?.find((l) => l.debt > 0n);
  const ltv = loan && loan.collValue > 0n ? Number(loan.debt) / Number(loan.collValue) : undefined;

  return (
    <>
      <header className="wrap site-top">
        <Logo />
        <nav aria-label="Sections">
          <a href="#roles">How it works</a>
          <a href="#rules">Rules</a>
          <a href={GITHUB} target="_blank" rel="noreferrer">Code</a>
        </nav>
        <LinkButton href="/app">Open the app</LinkButton>
      </header>

      <main>
        <section className="wrap hero">
          <div>
            <h1>Borrow dollars against your MEZO.</h1>
            <p className="hero-lede">
              Mooring is a lending market on Mezo. Put up MEZO and borrow MUSD, Mezo&apos;s Bitcoin-backed dollar. Or lend
              MUSD and earn what borrowers pay.
            </p>
            <div className="hero-actions">
              <LinkButton href="/app/borrow">Borrow MUSD</LinkButton>
              <LinkButton href="/app/lend" plain>Lend MUSD</LinkButton>
            </div>
          </div>

          <aside className="hero-board" aria-label="Live market on Mezo testnet">
            <h2>Live on Mezo testnet</h2>
            <p className="muted">{loan ? "An open loan right now, measured against the market's limits." : "Reading the market…"}</p>
            <MooringLine ltv={ltv} label="Open loan" />
            <MooringLegend />
            <dl className="board-facts">
              <div><dt>Lent in</dt><dd>{market ? fmt(market.total) : "–"}</dd></div>
              <div><dt>Borrowed</dt><dd>{market ? fmt(market.borrows) : "–"}</dd></div>
              <div><dt>Lenders earn</dt><dd>{market ? pct(market.supplyRate) : "–"}</dd></div>
            </dl>
          </aside>
        </section>

        <section className="band" id="roles">
          <div className="wrap">
            <h2>Three kinds of people keep the market working.</h2>
            <div className="roles">
              {ROLES.map((r) => (
                <div key={r.name}>
                  <h3>{r.name}</h3>
                  <p>{r.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="wrap rulebook" id="rules">
          <div>
            <h2>The rules are in the contract.</h2>
            <p>
              The owner can change where the MEZO price comes from, and nothing else. No pause switch, no upgrade, no way to
              move anyone&apos;s funds. MEZO is priced from the Mezo Pools MEZO/MUSD pool&apos;s average over the last two hours,
              so a single trade can&apos;t move it.
            </p>
          </div>
          <div className="signs">
            {SIGNS.map((s) => (
              <div key={s.name} className={`sign ${s.warn ? "warn" : ""}`}>
                <strong>{s.value}</strong>
                <span>{s.name}</span>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="wrap next" aria-labelledby="next-title">
          <h2 id="next-title">Coming in Wave 2</h2>
          <ul>
            {NEXT.map((n) => (
              <li key={n.name}><strong>{n.name}</strong><p>{n.body}</p></li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="wrap site-foot">
        <Logo />
        <nav aria-label="Footer">
          <a href="/app">App</a>
          {MARKET && <a href={`${EXPLORER}/address/${MARKET}`} target="_blank" rel="noreferrer">Contract</a>}
          <a href={GITHUB} target="_blank" rel="noreferrer">Code</a>
          <Built />
        </nav>
        <small>Mooring Finance is hackathon software on Mezo testnet, built for the Mezo Buildathon. The contracts are unaudited; don&apos;t use real funds. MUSD and MEZO are Mezo&apos;s.</small>
      </footer>
    </>
  );
}
