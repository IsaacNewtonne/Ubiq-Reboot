# Proposed 90-Day Roadmap

This roadmap is provisional until the technical audit and maintainer interviews
confirm scope, access, and risk.

## Phase 0 — Establish reality (Days 1–14)

- Map canonical repositories, releases, infrastructure, contracts, and owners.
- Sync a node from genesis and independently verify the live network.
- Run RPC, explorer, wallet, peer, dependency, and release-process checks.
- Publish the audit, system map, risk register, and public issue board.
- Agree on maintainers, decision rules, communication channels, and release scope.

**Exit condition:** the community has one evidence-backed view of the system.

## Phase 1 — Restore the foundation (Days 15–35)

- Patch critical client and dependency risks.
- Create signed, reproducible node releases with installation documentation.
- Restore redundant bootnodes and public RPC endpoints.
- Deploy monitoring and a public status page.
- Confirm or restore explorer indexing and contract verification.
- Validate the testnet and faucet.

**Exit condition:** core infrastructure has owners, monitoring, redundancy, and
documented recovery procedures.

## Phase 2 — Make building pleasant (Days 36–55)

- Publish authoritative network metadata and one-click wallet onboarding.
- Create Hardhat and Foundry starter projects with tested examples.
- Publish a five-minute quickstart and contract verification workflow.
- Add a developer portal with endpoints, tooling, examples, and support paths.
- Open a scoped bounty board for documentation, tooling, and integrations.

**Exit condition:** an unfamiliar Solidity developer can deploy and verify a
contract without private assistance.

## Phase 3 — Restore the economic loop (Days 56–75)

- Decide whether existing bridge and exchange code is safe to revive.
- Define a minimal bridge architecture, custody model, limits, and incident plan.
- Deploy or restore one audited swap venue with transparent contracts.
- Establish modest, disclosed, time-bounded liquidity support.
- Publish dashboards for liquidity, volume, bridge balances, and system health.

**Exit condition:** users have a documented, monitored path into, within, and
out of the Ubiq economy.

## Phase 4 — Reintroduce Ubiq (Days 76–90)

- Launch the refreshed website, documentation, status page, and ecosystem index.
- Publish the Reboot release notes and audited roadmap.
- Run a small builder program around one useful application category.
- Begin weekly engineering updates and monthly public community calls.
- Review metrics and set the next roadmap based on demonstrated demand.

**Exit condition:** Ubiq presents one accurate public surface and a repeatable
operating cadence.

## Suggested success metrics

- node releases reproducible on supported platforms;
- at least two independent public RPC operators;
- published uptime and recovery targets;
- zero stale critical onboarding links;
- successful wallet-to-testnet-to-deployment journey;
- time to first verified contract under five minutes;
- issues with named owners and visible status;
- active independent contributors and node operators;
- sustained organic transactions and contract usage.

