import type { ReactNode } from "react";
import { LIQ_THRESHOLD, MAX_LTV } from "./chain";

export function Logo({ onNavy = false }: { onNavy?: boolean }) {
  return (
    <a className={`logo ${onNavy ? "on-navy" : ""}`} href="/" aria-label="Mooring Finance home">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="6" className="mark-bg" />
        {/* a dock bollard: cap, post, and the deck it stands on */}
        <path d="M10 12h12M12 21v-9h8v9M8 21h16" className="mark-ink" />
      </svg>
      Mooring
    </a>
  );
}

export function Built() {
  return (
    <a className="built" href="https://mezo.org" target="_blank" rel="noreferrer">
      Built on <img src="/brand/mezo-logo-light.svg" alt="Mezo" />
    </a>
  );
}

export function LinkButton({ href, children, plain = false }: { href: string; children: ReactNode; plain?: boolean }) {
  const external = href.startsWith("http");
  return <a className={`btn ${plain ? "plain" : ""}`} href={href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>{children}</a>;
}

const SCALE = 0.8; // the ruler runs from 0% to 80% loan-to-value

/** A loan's loan-to-value against the 50% borrow limit and the 65% liquidation line. */
export function MooringLine({ ltv, label }: { ltv?: number; label: string }) {
  const at = (x: number) => `${(Math.min(x, SCALE) / SCALE) * 100}%`;
  const described = ltv === undefined ? "No loan to show." : `${label} at ${(ltv * 100).toFixed(1)}% of its collateral value.`;
  return (
    <div className="mline" role="img" aria-label={`Loan-to-value ruler. Borrowing stops at ${MAX_LTV * 100}%, liquidation starts at ${LIQ_THRESHOLD * 100}%. ${described}`}>
      {ltv !== undefined && (
        <span className="mline-buoy" style={{ left: at(ltv) }} aria-hidden="true">
          <b>{label} {(ltv * 100).toFixed(1)}%</b>
          <i />
        </span>
      )}
      <div className="mline-track" aria-hidden="true">
        <span className="mline-zone room" style={{ width: at(MAX_LTV) }} />
        <span className="mline-zone full" style={{ width: `calc(${at(LIQ_THRESHOLD)} - ${at(MAX_LTV)})` }} />
        <span className="mline-zone liq" style={{ flex: 1 }} />
      </div>
      <div className="mline-ticks" aria-hidden="true">
        {[0, 0.25, MAX_LTV, LIQ_THRESHOLD, SCALE].map((t) => (
          <span key={t} className="mline-tick" style={{ left: at(t) }}>{t * 100}%</span>
        ))}
      </div>
    </div>
  );
}

export function MooringLegend() {
  return (
    <div className="mline-legend">
      <span><i style={{ background: "var(--kelp-soft)" }} />Room to borrow</span>
      <span><i style={{ background: "var(--yellow)" }} />Over the limit, can&apos;t borrow more</span>
      <span><i style={{ background: "var(--red)" }} />Anyone can liquidate</span>
    </div>
  );
}
