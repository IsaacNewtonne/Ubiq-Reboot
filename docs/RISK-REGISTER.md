# Initial Risk Register

**Audit date:** 2026-07-26

Severity represents potential impact; confidence represents the quality of
current evidence. No security conclusion should be treated as final until the
relevant owner has had an opportunity to provide missing evidence.

| ID | Risk | Severity | Confidence | Immediate action |
| --- | --- | --- | --- | --- |
| R-001 | Official website recommends an RPC hostname that does not resolve | High | High | Replace or restore endpoint and publish status |
| R-002 | Pyrus embeds a primary Ubiq RPC hostname that does not resolve | High | High | Patch defaults and add healthy fallback RPCs |
| R-003 | Public RPC binary is newer than canonical public source | Critical | Medium | Locate commit, build recipe, artifacts, and operator |
| R-004 | Canonical node source has no public commits since March 2024 | High | High | Establish maintainers and upstream upgrade plan |
| R-005 | At least four of nine hard-coded v4 bootnodes were unreachable | High | Medium | Run protocol-level checks and refresh bootnodes |
| R-006 | Docs have no public commits since December 2022 | High | High | Audit every onboarding link and rebuild docs |
| R-007 | Governance proposal repo has no public commits since June 2020 | Medium | High | Clarify whether UIP governance remains active |
| R-008 | Website, wallet, and third parties advertise conflicting RPCs | High | High | Create canonical machine-readable network metadata |
| R-009 | Go module declares language version 1.15 | High | High | Inventory dependencies and test supported Go versions |
| R-010 | Testnet configuration references retired Ethereum testnets | Medium | High | Define and document a Ubiq-owned test environment |

## Priority interpretation

The first release must not begin with marketing. R-001 through R-005 affect the
ability to join, verify, and safely operate the network. They are the initial
release blockers.

## Evidence needed next

- source and build provenance for `Gubiq/v7.0.2-develop-2384cb50`;
- operator ownership for `rpc.ubiqsmart.com`;
- protocol-level peer results for all canonical bootnodes;
- latest signed release and checksum verification;
- clean builds and tests on current supported toolchains;
- dependency and known-vulnerability reports for Gubiq and Pyrus.

