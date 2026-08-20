# Initial Risk Register

**Audit date:** 2026-07-26

Severity represents potential impact; confidence represents the quality of
current evidence. No security conclusion should be treated as final until the
relevant owner has had an opportunity to provide missing evidence.

| ID | Risk | Severity | Confidence | Immediate action |
| --- | --- | --- | --- | --- |
| R-001 | Official website recommends an RPC hostname that does not resolve | High | High | Replace or restore endpoint and publish status |
| R-002 | Pyrus embeds a primary Ubiq RPC hostname that does not resolve | High | High | Patch defaults and add healthy fallback RPCs |
| R-003 | Public RPC runs a traceable pre-release commit instead of v7.0.2 | Medium | High | Upgrade and document the deployed release |
| R-004 | Canonical node source has no public commits since March 2024 | High | High | Establish maintainers and upstream upgrade plan |
| R-005 | At least four of nine hard-coded v4 bootnodes were unreachable | High | Medium | Run protocol-level checks and refresh bootnodes |
| R-006 | Docs have no public commits since December 2022 | High | High | Audit every onboarding link and rebuild docs |
| R-007 | Governance proposal repo has no public commits since June 2020 | Medium | High | Clarify whether UIP governance remains active |
| R-008 | Website, wallet, and third parties advertise conflicting RPCs | High | High | Create canonical machine-readable network metadata |
| R-009 | Go module declares language version 1.15 | High | High | Inventory dependencies and test supported Go versions |
| R-010 | Testnet configuration references retired Ethereum testnets | Medium | High | Define and document a Ubiq-owned test environment |
| R-011 | Release binaries lack checksums, signatures, SBOMs, and attestations | Critical | High | Replace release pipeline with signed provenance |
| R-012 | Builder workflow does not publish releases and builds a hard-coded tag on every push | High | High | Create tag-gated least-privilege release workflow |

## Priority interpretation

The first release must not begin with marketing. R-001, R-002, R-004, R-005,
R-011, and R-012 affect the ability to join, verify, and safely operate the
network. They are the initial release blockers.

## Evidence needed next

- operator ownership for `rpc.ubiqsmart.com`;
- deployment and upgrade process for `rpc.ubiqsmart.com`;
- protocol-level peer results for all canonical bootnodes;
- latest signed release and checksum verification;
- clean builds and tests on current supported toolchains;
- dependency and known-vulnerability reports for Gubiq and Pyrus.

## Planned mitigations

- **R-001 / R-002 (single-operator RPC risk):** mitigated by standing up a
  genuinely independent Gubiq node on a Raspberry Pi 4 (64-bit OS, external SSD,
  `v7.0.2` release, RPC over a `cloudflared` tunnel). This adds a second
  *operator*, not just a second proxy — the distinction the roadmap requires.
  See "Next phase" in `ROADMAP.md`.
- **R-003 (pre-release client in production):** the Pi node will run the tagged
  `v7.0.2` release, establishing at least one endpoint on a documented build.
