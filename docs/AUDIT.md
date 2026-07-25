# Ubiq Reboot Audit

Record evidence, dates, owners, and links for every result. Use:

- **Green** — operational and maintained;
- **Amber** — operational with material risk;
- **Red** — broken, unsafe, or unowned;
- **Unknown** — not yet verified.

## 1. Chain and protocol

- [ ] Confirm canonical mainnet genesis, chain ID, network ID, and checkpoints.
- [ ] Identify current head, block time, difficulty, hashrate, and reorg history.
- [ ] Enumerate active implementations and their supported platforms.
- [ ] Compare supported EVM revision and EIPs with current developer tooling.
- [ ] Review consensus, difficulty adjustment, emissions, and governance code.
- [ ] Confirm bootstrap nodes, peer count, geographic diversity, and archival sync.
- [ ] Document upgrade and emergency-release procedures.
- [ ] Review known vulnerabilities, advisories, and dependency exposure.
- [ ] Verify deterministic/reproducible release process and artifact signatures.

## 2. Infrastructure

- [ ] Test every published RPC endpoint for freshness, latency, and limits.
- [ ] Test explorer correctness, indexing delay, verification, and APIs.
- [ ] Confirm testnet health, faucet operation, and reset policy.
- [ ] Inventory DNS, hosting, monitoring, backups, secrets, and renewal ownership.
- [ ] Create uptime checks for RPC, explorer, bootnodes, faucet, and website.
- [ ] Identify single-maintainer and single-provider failure points.

## 3. Wallets and custody

- [ ] Validate MetaMask onboarding and authoritative network metadata.
- [ ] Test Sparrow/Pyrus and document their maintenance status.
- [ ] Verify Ledger and Trezor paths using current firmware and applications.
- [ ] Publish safe recovery, transaction, and contract-interaction guidance.
- [ ] Review multisig custody for project-controlled assets.

## 4. Ecosystem and liquidity

- [ ] Inventory live contracts, tokens, applications, bridges, and exchanges.
- [ ] Measure active addresses, transactions, contract calls, and fee activity.
- [ ] Determine real UBQ market access and withdrawal/deposit reliability.
- [ ] Locate existing wrapped UBQ and bridge contracts; assess custody and risk.
- [ ] Locate exchange contracts and assess ownership, liquidity, and frontend state.

## 5. Governance and operations

- [ ] Identify active maintainers and the access each person controls.
- [ ] Inventory domains, organizations, package registries, bots, and social accounts.
- [ ] Document treasury addresses, signers, balances, and historical expenditures.
- [ ] Define contribution, review, release, disclosure, and conflict policies.
- [ ] Establish a public decision log and weekly progress report.

## 6. Brand and communication

- [ ] Inventory official and unofficial websites and remove contradictory guidance.
- [ ] Confirm authoritative channels and retire or label abandoned ones.
- [ ] Rewrite the homepage around one defensible promise.
- [ ] Publish a live network status page and a single current roadmap.
- [ ] Establish metrics that measure usage and reliability rather than attention.

## Audit deliverable

Produce a dated report containing:

1. an executive summary;
2. a red/amber/green system map;
3. confirmed risks ranked by impact and urgency;
4. recommended actions with owners and estimates;
5. a list of unknowns requiring access or community input.

