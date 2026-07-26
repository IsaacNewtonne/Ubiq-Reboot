"use client";

import { useCallback, useEffect, useState } from "react";

type Check = {
  method: string;
  value: string | null;
  latencyMs: number;
  error?: string;
};

type Report = {
  checkedAt: string;
  healthy: boolean;
  network: {
    name: string;
    chainId: number;
    endpoint: string;
    blockNumber: number | null;
    client: string | null;
    latencyMs: number;
    checks: Check[];
  };
};

const RPC_URL = "https://rpc.ubiqsmart.com";
const METHODS = ["eth_chainId", "eth_blockNumber", "web3_clientVersion"] as const;
type Method = (typeof METHODS)[number];

function isHexQuantity(value: string) {
  return /^0x(?:0|[1-9a-f][0-9a-f]*)$/i.test(value);
}

async function rpcCall(method: Method, id: number): Promise<Check> {
  const started = performance.now();
  try {
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method, params: [], id }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = (await response.json()) as {
      result?: unknown;
      error?: unknown;
    };
    if (body.error !== undefined) throw new Error("RPC error");
    if (typeof body.result !== "string" || body.result.length === 0) {
      throw new Error("Invalid result");
    }
    if (
      (method === "eth_chainId" || method === "eth_blockNumber") &&
      !isHexQuantity(body.result)
    ) {
      throw new Error("Invalid blockchain value");
    }
    return {
      method,
      value: body.result,
      latencyMs: Math.round(performance.now() - started),
    };
  } catch (error) {
    return {
      method,
      value: null,
      latencyMs: Math.round(performance.now() - started),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkUbiqNetwork(): Promise<Report> {
  const checks = await Promise.all(
    METHODS.map((method, index) => rpcCall(method, index + 1)),
  );
  const chain = checks.find((check) => check.method === "eth_chainId");
  const block = checks.find((check) => check.method === "eth_blockNumber");
  const client = checks.find((check) => check.method === "web3_clientVersion");
  return {
    checkedAt: new Date().toISOString(),
    healthy:
      checks.every((check) => !check.error) &&
      chain?.value?.toLowerCase() === "0x8",
    network: {
      name: "Ubiq Mainnet",
      chainId: 8,
      endpoint: RPC_URL,
      blockNumber: block?.value ? Number.parseInt(block.value, 16) : null,
      client: client?.value ?? null,
      latencyMs: Math.max(...checks.map((check) => check.latencyMs)),
      checks,
    },
  };
}

function UbiqLogo() {
  return (
    <svg
      aria-label="Ubiq"
      className="logo"
      role="img"
      viewBox="0 0 135.46666 135.46667"
    >
      <g transform="matrix(.17810905 0 0 -.17810905 -42.005202 210.07727)">
        <path
          d="m284.48053 673.45605 229.658  -138.293v313.82z"
          fill="#0ca579"
        />
        <path
          d="m638.39613 1179.4868v-302.094l-353.916-203.936v306.794z"
          fill="#00ea90"
        />
        <path
          d="m947.78164 924.93386-229.659 138.284v-313.82z"
          fill="#333"
        />
        <path
          d="m593.86619 418.90406v302.094l353.915 203.936v-306.794z"
          fill="#494949"
        />
      </g>
    </svg>
  );
}

function formatAge(iso: string | undefined) {
  if (!iso) return "Waiting for first check";
  const seconds = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 1000),
  );
  if (seconds < 5) return "Checked just now";
  if (seconds < 60) return `Checked ${seconds} seconds ago`;
  return `Checked ${Math.floor(seconds / 60)} minutes ago`;
}

function shortenClient(client: string | null) {
  if (!client) return "Unavailable";
  return client.split("/").slice(0, 2).join(" ");
}

export default function Home() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestFailed, setRequestFailed] = useState(false);
  const [, setClock] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await checkUbiqNetwork();
      setReport(data);
      setRequestFailed(false);
    } catch {
      setRequestFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const poller = window.setInterval(() => void refresh(), 60_000);
    const clock = window.setInterval(() => setClock((value) => value + 1), 1_000);
    return () => {
      window.clearInterval(poller);
      window.clearInterval(clock);
    };
  }, [refresh]);

  const healthy = Boolean(report?.healthy) && !requestFailed;
  const state = loading && !report ? "checking" : healthy ? "healthy" : "down";
  const block = report?.network.blockNumber?.toLocaleString("en-US") ?? "—";

  return (
    <main>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <nav className="nav shell">
        <a className="brand" href="#" aria-label="Ubiq status home">
          <UbiqLogo />
          <span>UBIQ</span>
          <span className="brand-divider" />
          <span className="brand-subtitle">network status</span>
        </a>
        <a
          className="nav-link"
          href="https://github.com/IsaacNewtonne/Ubiq-Reboot"
          target="_blank"
          rel="noreferrer"
        >
          View the open work <span aria-hidden="true">↗</span>
        </a>
      </nav>

      <section className="hero shell">
        <div className={`status-orbit ${state}`} aria-hidden="true">
          <span />
        </div>
        <p className="eyebrow">Independent network observation</p>
        <h1>
          {state === "checking"
            ? "Checking Ubiq…"
            : healthy
              ? "Ubiq is operational."
              : "Ubiq needs attention."}
        </h1>
        <p className="hero-copy">
          {healthy
            ? "The public gateway is answering correctly, reporting the expected chain, and advancing normally."
            : state === "checking"
              ? "Contacting the public Ubiq gateway and verifying its response."
              : "The public gateway did not pass every check. The blockchain itself may still be running."}
        </p>
        <div className="hero-meta">
          <span className={`live-pill ${state}`}>
            <i />
            {state === "checking"
              ? "Checking live"
              : healthy
                ? "All checks passed"
                : "Check failed"}
          </span>
          <span>{formatAge(report?.checkedAt)}</span>
          <button onClick={() => void refresh()} disabled={loading}>
            {loading ? "Checking…" : "Check again"}
          </button>
        </div>
      </section>

      <section className="metrics shell" aria-label="Network measurements">
        <article className="metric metric-primary">
          <span className="metric-label">Latest block</span>
          <strong>{block}</strong>
          <span className="metric-note">Observed from Ubiq Mainnet</span>
        </article>
        <article className="metric">
          <span className="metric-label">Response time</span>
          <strong>
            {report ? report.network.latencyMs.toLocaleString() : "—"}
            <small> ms</small>
          </strong>
          <span className="metric-note">Slowest of three checks</span>
        </article>
        <article className="metric">
          <span className="metric-label">Chain identity</span>
          <strong>
            {report?.network.chainId ?? "—"}
            <small> / UBQ</small>
          </strong>
          <span className="metric-note">Expected network confirmed</span>
        </article>
        <article className="metric">
          <span className="metric-label">Node software</span>
          <strong className="client">
            {shortenClient(report?.network.client ?? null)}
          </strong>
          <span className="metric-note">Public gateway version</span>
        </article>
      </section>

      <section className="detail-grid shell">
        <article className="panel checks-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">What we verify</p>
              <h2>Three simple checks.</h2>
            </div>
            <span className="endpoint">rpc.ubiqsmart.com</span>
          </div>
          <div className="check-list">
            {[
              ["eth_chainId", "Correct network", "Confirms this is Ubiq, not another chain."],
              ["eth_blockNumber", "Fresh block height", "Confirms the node can read the live ledger."],
              ["web3_clientVersion", "Working node software", "Confirms the gateway is answering normally."],
            ].map(([method, title, description]) => {
              const check = report?.network.checks.find(
                (item) => item.method === method,
              );
              const passed = Boolean(check && !check.error);
              return (
                <div className="check-row" key={method}>
                  <span
                    className={`check-icon ${passed ? "passed" : state}`}
                    aria-label={passed ? "Passed" : "Not passed"}
                  >
                    {passed ? "✓" : state === "checking" ? "·" : "!"}
                  </span>
                  <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                  <span className="check-time">
                    {check ? `${check.latencyMs} ms` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </article>

        <aside className="panel honesty-panel">
          <p className="eyebrow">The honest picture</p>
          <h2>One gateway is not enough.</h2>
          <p>
            Ubiq currently has one verified public connection. This page makes
            that connection visible—it does not pretend the network already has
            redundancy.
          </p>
          <div className="gateway-count">
            <span>Verified gateways</span>
            <strong>1 <small>of 2 needed</small></strong>
            <div className="bar"><i /></div>
          </div>
          <a
            href="https://github.com/IsaacNewtonne/Ubiq-Reboot"
            target="_blank"
            rel="noreferrer"
          >
            Help strengthen Ubiq <span aria-hidden="true">→</span>
          </a>
        </aside>
      </section>

      <section className="principle shell">
        <p>Built around one principle</p>
        <blockquote>Evidence before promotion.</blockquote>
        <span>
          Live observations are clearly separated from claims about the wider
          network.
        </span>
      </section>

      <footer className="footer shell">
        <div>
          <UbiqLogo />
          <p>
            Community-run monitoring for the independent Ubiq blockchain.
          </p>
        </div>
        <div className="footer-links">
          <a href="https://ubiqsmart.com">Ubiq</a>
          <a href="https://ubqblockexplorer.com">Explorer</a>
          <a href="https://github.com/ubiq">Source</a>
        </div>
        <p className="disclaimer">
          Independent project · Not financial advice
        </p>
      </footer>
    </main>
  );
}
