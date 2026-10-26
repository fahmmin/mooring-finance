import { useEffect, useRef, useState } from "react";
import { EXPLORER, fmt, mezoTestnet, pct } from "../chain";
import { useLive } from "../live";
import { Logo } from "../ui";
import { Borrow } from "./Borrow";
import { Lend } from "./Lend";
import { Liquidate } from "./Liquidate";
import { Overview } from "./Overview";
import { Go, short } from "./parts";
import { Risk } from "./Risk";
import { ToastProvider, useToast } from "./toast";
import { useWallet } from "./wallet";

const ROUTES = [
  { path: "/app", name: "Overview", intro: "The market at a glance, and where you stand in it.", Page: Overview },
  { path: "/app/lend", name: "Lend", intro: "Lend MUSD to borrowers and earn their interest.", Page: Lend },
  { path: "/app/borrow", name: "Borrow", intro: "Put up MEZO and borrow MUSD against it.", Page: Borrow },
  { path: "/app/liquidate", name: "Liquidate", intro: "Loans past the 65% line, open to anyone to repay for a bonus.", Page: Liquidate },
  { path: "/app/risk", name: "Rules", intro: "Every limit the contract enforces, and the contracts behind them.", Page: Risk },
];

function usePath() {
  const [path, setPath] = useState(location.pathname.replace(/\/$/, "") || "/app");
  useEffect(() => {
    const on = () => setPath(location.pathname.replace(/\/$/, "") || "/app");
    addEventListener("popstate", on);
    return () => removeEventListener("popstate", on);
  }, []);
  return path;
}

export default function AppShell() {
  return <ToastProvider><Shell /></ToastProvider>;
}

function Shell() {
  const path = usePath();
  const live = useLive();
  const wallet = useWallet();
  const route = ROUTES.find((r) => r.path === path) ?? ROUTES[0];
  const Page = route.Page;
  const m = live.market;

  useEffect(() => { document.title = `${route.name} | Mooring Finance`; }, [route.name]);

  return (
    <>
      <header className="app-top">
        <div className="wrap">
          <Logo onNavy />
          <nav className="nav-links" aria-label="App">
            {ROUTES.map((r) => (
              <Go key={r.path} to={r.path} className={r.path === route.path ? "active" : ""}>{r.name}</Go>
            ))}
          </nav>
          <div className="topbar">
            <span className="chain"><i className={live.block ? "ok" : ""} />Mezo Testnet</span>
            <WalletButton wallet={wallet} />
          </div>
        </div>
      </header>

      <div className="conditions" aria-label="Market conditions">
        <div className="wrap">
          <span>MEZO<b>${m ? fmt(m.price, 4) : "…"}</b></span>
          <span>Lenders earn<b>{m ? pct(m.supplyRate) : "…"}</b></span>
          <span>Borrowers pay<b>{m ? pct(m.borrowRate) : "…"}</b></span>
          <span>Free to borrow<b>{m ? `${fmt(m.cash)} MUSD` : "…"}</b></span>
        </div>
      </div>

      {wallet.wrongNetwork && (
        <div className="banner warn" role="alert">
          <div className="wrap">
            Your wallet is on another network. Mooring runs on Mezo Testnet (chain {mezoTestnet.id}).
            <button className="btn small plain" onClick={() => wallet.switchNetwork()}>Switch network</button>
          </div>
        </div>
      )}
      {live.error && <div className="banner warn"><div className="wrap">{live.error}</div></div>}

      <main className="wrap page" key={route.path}>
        <div className="page-head">
          <h1>{route.name}</h1>
          <p>{route.intro}</p>
        </div>
        <Page live={live} wallet={wallet} />
      </main>
    </>
  );
}

function WalletButton({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    addEventListener("mousedown", close);
    return () => removeEventListener("mousedown", close);
  }, []);

  if (!wallet.address) {
    return (
      <button className="btn" onClick={() => wallet.connect().catch((e) => toast({ kind: "error", title: "Couldn't connect", body: e.shortMessage ?? e.message }))}>
        Connect wallet
      </button>
    );
  }
  return (
    <div className="acct" ref={box}>
      <button className="acct-btn" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{short(wallet.address)}</span>
        {wallet.account && <small>{fmt(wallet.account.musd, 2)} MUSD</small>}
      </button>
      {open && (
        <div className="acct-menu">
          <div className="acct-bal">
            <strong>{fmt(wallet.account?.musd)} MUSD</strong>
            <small>{fmt(wallet.account?.mezo)} MEZO</small>
            <small>{fmt(wallet.account?.btc, 5)} BTC for gas</small>
          </div>
          <button onClick={() => navigator.clipboard?.writeText(wallet.address!)}>Copy address</button>
          <a href={`${EXPLORER}/address/${wallet.address}`} target="_blank" rel="noreferrer">View on the explorer</a>
          <a href="https://testnet.mezo.org" target="_blank" rel="noreferrer">Get test MUSD</a>
          <a href="https://faucet.test.mezo.org" target="_blank" rel="noreferrer">Get test MEZO</a>
          <button onClick={() => { wallet.disconnect(); setOpen(false); }}>Disconnect</button>
        </div>
      )}
    </div>
  );
}
