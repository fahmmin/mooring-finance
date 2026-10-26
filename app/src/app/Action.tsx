import { useState, type ReactNode } from "react";
import { formatEther, maxUint256, parseEther, type Abi } from "viem";
import { MARKET, erc20Abi, fmt } from "../chain";
import { Card, type PageProps } from "./parts";
import { useToast } from "./toast";

type Call = { address: `0x${string}`; abi: Abi; functionName: string; args: unknown[] };

export type ActionTab = {
  id: string;
  label: string;
  verb: string; // "Lend", "Borrow"…
  token: "MUSD" | "MEZO";
  available?: bigint; // what the user can use for this action
  availableText: string;
  tooMuch: string; // button text when the amount is over `available`
  allowance?: bigint; // set when the action pulls tokens from the wallet
  tokenAddress?: `0x${string}`;
  call: (amount: bigint, all: boolean) => Call;
  preview: (amount: bigint) => ReactNode;
  hint?: ReactNode;
};

function parseAmount(s: string): bigint | null {
  if (!s.trim()) return 0n;
  try {
    const v = parseEther(s.trim() as `${number}`);
    return v >= 0n ? v : null;
  } catch {
    return null;
  }
}

/** Sends a call with a pending → success/error toast, then reloads balances. */
export function useRun({ live, wallet }: PageProps) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function run(title: string, call: Call, done: string, onSuccess?: () => void) {
    setBusy(true);
    const id = toast({ kind: "pending", title, body: "Confirm in your wallet, then wait for Mezo." });
    try {
      const hash = await wallet.send(call);
      toast({ kind: "success", title: done, tx: hash }, id);
      onSuccess?.(); // before the balance reload below, so typing during the reload is kept
      return true;
    } catch (e: any) {
      const rejected = /reject|denied/i.test(e.shortMessage ?? e.message ?? "");
      toast({ kind: "error", title: rejected ? "Cancelled in your wallet" : "Transaction failed", body: rejected ? undefined : e.shortMessage ?? e.message, tx: e.hash }, id);
      return false;
    } finally {
      setBusy(false);
      await Promise.all([wallet.refresh(), live.reload()]).catch(() => {});
    }
  }
  return { busy, run };
}

/** Amount input with tabs; the button always says the one thing to do next. */
export function ActionCard({ tabs, page, base }: { tabs: ActionTab[]; page: PageProps; base: string }) {
  const { wallet } = page;
  const { busy, run } = useRun(page);
  const toast = useToast();
  const initial = new URLSearchParams(location.search).get("tab");
  const [tabId, setTabId] = useState(tabs.some((t) => t.id === initial) ? initial! : tabs[0].id);
  const [input, setInput] = useState("");
  const tab = tabs.find((t) => t.id === tabId)!;
  const amount = parseAmount(input);
  const needsApproval = tab.allowance !== undefined && !!amount && tab.allowance < amount;
  // "Max" on repay sends the max so the contract clears the debt including interest accrued in this block
  const all = tab.available !== undefined && amount === tab.available;

  const switchTab = (id: string) => {
    setTabId(id);
    setInput("");
    history.replaceState(null, "", id === tabs[0].id ? base : `${base}?tab=${id}`);
  };

  async function primary() {
    if (!wallet.address) return wallet.connect().catch((e) => toast({ kind: "error", title: "Couldn't connect", body: e.message }));
    if (wallet.wrongNetwork) return wallet.switchNetwork();
    if (!MARKET || !amount) return;
    if (needsApproval) {
      await run(`Approving ${tab.token}`, { address: tab.tokenAddress!, abi: erc20Abi as Abi, functionName: "approve", args: [MARKET, maxUint256] }, `${tab.token} approved`);
      return;
    }
    await run(`${tab.verb}: ${input} ${tab.token}`, tab.call(amount, all), `${tab.verb} ${input} ${tab.token} done`, () => setInput(""));
  }

  let label = `${tab.verb} ${input} ${tab.token}`.replace("  ", " ");
  let disabled = busy;
  if (!wallet.hasWallet) { label = "Install a browser wallet"; disabled = true; }
  else if (!wallet.address) label = "Connect wallet";
  else if (wallet.wrongNetwork) label = "Switch to Mezo Testnet";
  else if (amount === null) { label = "Enter a valid amount"; disabled = true; }
  else if (!amount) { label = "Enter an amount"; disabled = true; }
  else if (tab.available !== undefined && amount > tab.available) { label = tab.tooMuch; disabled = true; }
  else if (needsApproval) label = `Approve ${tab.token}`;
  if (busy) label = "Waiting for confirmation…";

  return (
    <Card className="action-card">
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={t.id === tabId} className={t.id === tabId ? "on" : ""} onClick={() => switchTab(t.id)}>{t.label}</button>
        ))}
      </div>

      <div className="amount-box">
        <div className="amount-top">
          <span>{tab.label}</span>
          {wallet.account && <button className="max" onClick={() => setInput(formatEther(tab.available ?? 0n))}>Max {fmt(tab.available)}</button>}
        </div>
        <div className="amount-row">
          <input inputMode="decimal" placeholder="0.00" value={input} aria-label={`Amount of ${tab.token}`}
            onChange={(e) => setInput(e.target.value.replace(",", "."))} />
          <span className="token">{tab.token === "MUSD" ? <img src="/brand/musd.svg" alt="" /> : <img src="/brand/mezo-mark.svg" alt="" />}{tab.token}</span>
        </div>
        <span className="amount-sub">{wallet.account ? tab.availableText : "Connect a wallet to see your balance"}</span>
      </div>

      <dl className="preview">{tab.preview(amount ?? 0n)}</dl>

      <button className="btn wide" disabled={disabled} onClick={primary}>{label}</button>
      {tab.hint && <p className="hint">{tab.hint}</p>}
    </Card>
  );
}
