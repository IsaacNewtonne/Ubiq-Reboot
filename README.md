# Ubiq Reboot

Ubiq Reboot is a community-led effort to make the Ubiq blockchain useful,
maintainable, and easy to build on again.

## Positioning

> The independent EVM chain that simply keeps running.

Ubiq should not compete by promising the highest throughput or the largest
incentive program. Its credible advantages are longevity, a fair launch,
Proof of Work, predictable monetary policy, community ownership, and a
conservative approach to protocol changes.

## First objective

Ship a public **Ubiq Reboot** release that gives users and developers one
reliable path into the ecosystem:

- verified node software and reproducible releases;
- healthy public RPC endpoints and a status page;
- a maintained explorer;
- one-click wallet configuration;
- current documentation and a five-minute developer quickstart;
- a transparent maintainer, treasury, and security model;
- a small, realistic roadmap backed by public issues.

## Workstreams

| Area | Outcome |
| --- | --- |
| Protocol | Establish the current chain state and upgrade requirements |
| Infrastructure | Make RPC, explorer, bootnodes, testnet, and faucet reliable |
| Developer experience | Make first deployment possible in five minutes |
| Product | Restore the basic bridge, swap, and wrapped-asset economic loop |
| Governance | Define decision-making, ownership, funding, and disclosure |
| Community | Consolidate communication and publish visible weekly progress |

## Working principles

1. Reliability before novelty.
2. Evidence before promotion.
3. One maintained product before many experiments.
4. Public issues, decisions, owners, and deadlines.
5. No promises of returns, artificial volume, or unsustainable yield.

## Repository layout

- `docs/CHARTER.md` — mission, audience, scope, and governance assumptions
- `docs/AUDIT.md` — evidence-driven audit checklist
- `docs/ROADMAP.md` — proposed 90-day execution plan
- `docs/DECISIONS.md` — lightweight architectural decision log
- `config/networks.json` — auditable machine-readable network metadata
- `src/main.rs` — cross-platform Rust RPC health checker
- `tools/Test-UbiqRpc.ps1` — legacy PowerShell RPC health checker
- `proposals/SECURE-RELEASES.md` — verifiable Gubiq release design

## Immediate next step

Identify the canonical Ubiq repositories, infrastructure owners, community
channels, and available access. Then complete Phase 0 of the audit before
announcing new products or dates.

## Cross-platform health checker

The primary health checker is written in Rust and embeds the default Ubiq
network configuration, so downloaded release binaries need no extra files.

Build and run it on Windows, macOS, or Linux:

```console
cargo run --release
```

Useful options:

```console
ubiq-health --help
ubiq-health --timeout 5
ubiq-health --config config/networks.json
ubiq-health --format json
ubiq-health --include-known-failures
```

`--format json` emits a versioned report suitable for CI, monitoring systems,
and status-page generators. The process exits successfully only when every
selected endpoint returns valid JSON-RPC responses and the expected chain ID.
Known DNS failures are skipped unless `--include-known-failures` is supplied.

## Automatic network monitoring

GitHub Actions runs the health checker every hour and can also be started
manually from the Actions tab. Each run saves its JSON report for 30 days. A
failed endpoint makes the workflow fail, allowing repository notification rules
to alert maintainers.

Every push and pull request is tested on Windows, macOS, and Linux. Version
tags such as `v0.1.0` produce downloadable binaries for Windows, Linux, and
Intel/Apple Silicon macOS.

## Status site on Cloudflare Workers

The status site is built with Next.js and deployed to Cloudflare Workers via the
[OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare). This lets the
site expose a real server-side route handler, `app/api/health/route.ts`, which
aggregates gateway health without the browser ever touching a raw RPC endpoint.

```console
npm run build      # next build
npm run deploy     # opennextjs-cloudflare build && opennextjs-cloudflare deploy
```

`wrangler.jsonc` and `open-next.config.ts` drive the adapter. The `/api/health`
handler checks the canonical node and, when `WORKER_RPC_URL` is set (your
deployed RPC worker below), the second gateway — so the status page reports two
verified endpoints.

## Public RPC worker

`worker/` is a Cloudflare Worker that acts as a **second public Ubiq RPC
gateway** — it proxies JSON-RPC to the canonical node (`rpc.ubiqsmart.com`,
hardcoded as `UPSTREAM` in `worker/index.js`), giving the ecosystem an
independently-operated endpoint. `GET /health` on the worker additionally runs
the same three read-only checks and returns a JSON report.

This is a *proxy*, not a second independent node. True node redundancy
(R-001 / R-002 in `docs/RISK-REGISTER.md`) still requires a second operator
running Gubiq. The worker closes the observable-gateway gap and, once deployed,
completes the two-endpoint picture for the status site.

Deploy the worker, then tell the status site about it:

```console
npx wrangler deploy -c worker/wrangler.toml
# then set WORKER_RPC_URL (e.g. in wrangler.jsonc "vars") to the worker URL
# and redeploy the site: npm run deploy
```

Run the worker locally:

```console
npm run worker:dev
```
