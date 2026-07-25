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
- `tools/Test-UbiqRpc.ps1` — safe read-only RPC health checker
- `proposals/SECURE-RELEASES.md` — verifiable Gubiq release design

## Immediate next step

Identify the canonical Ubiq repositories, infrastructure owners, community
channels, and available access. Then complete Phase 0 of the audit before
announcing new products or dates.

Run the current RPC health check from PowerShell:

```powershell
.\tools\Test-UbiqRpc.ps1
```

To include endpoints already known to have failed DNS checks:

```powershell
.\tools\Test-UbiqRpc.ps1 -IncludeKnownFailures
```
