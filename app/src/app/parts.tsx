import { useState, type ReactNode } from "react";
import { EXPLORER } from "../chain";
import { icons } from "./icons";

export const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

/** In-app link that changes the page without reloading. */
export function Go({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <a href={to} className={className} onClick={(e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      history.pushState(null, "", to);
      dispatchEvent(new PopStateEvent("popstate"));
      scrollTo(0, 0);
    }}>{children}</a>
  );
}

export function Stat({ label, value, unit, sub, loading }: { label: string; value?: ReactNode; unit?: string; sub?: ReactNode; loading?: boolean }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      {loading || value === undefined ? <span className="skel" style={{ width: "60%", height: 30 }} /> : (
        <strong className="stat-value">{value}{unit && <small>{unit}</small>}</strong>
      )}
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

export function Address({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="addr">
      {label && <span className="addr-label">{label}</span>}
      <code>{short(value)}</code>
      <button aria-label={`Copy ${label ?? "address"}`} onClick={() => {
        navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
      }}>{copied ? "✓" : icons.copy}</button>
      <a aria-label={`Open ${label ?? "address"} on the explorer`} href={`${EXPLORER}/address/${value}`} target="_blank" rel="noreferrer">{icons.external}</a>
    </span>
  );
}

export function Pill({ tone, children }: { tone: "good" | "warn" | "bad" | "info" | "plain"; children: ReactNode }) {
  return <span className={`pill ${tone}`}><i />{children}</span>;
}

export function Card({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`acard ${className}`}>
      {(title || action) && <header className="acard-head">{title && <h2>{title}</h2>}{action}</header>}
      {children}
    </section>
  );
}

export const ago = (t?: number) => {
  if (!t) return "";
  const s = Math.max(1, Math.round(Date.now() / 1000 - t));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

/** Loan health in words: collateral value × 65% ÷ debt. Under 1.00 can be liquidated. */
export function healthText(health?: bigint): { tone: "good" | "warn" | "bad" | "info"; text: string } {
  if (health === undefined) return { tone: "info", text: "No loan" };
  const h = Number(health) / 1e18;
  if (h < 1) return { tone: "bad", text: `Health ${h.toFixed(2)} · can be liquidated` };
  if (h < 1.2) return { tone: "warn", text: `Health ${h.toFixed(2)} · at risk` };
  return { tone: "good", text: `Health ${h.toFixed(2)} · safe` };
}

export type PageProps = { live: ReturnType<typeof import("../live").useLive>; wallet: import("./wallet").Wallet };
