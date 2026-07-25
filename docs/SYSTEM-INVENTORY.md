# System Inventory

**Audit date:** 2026-07-26

This is a discovery document, not an endorsement of any endpoint, binary,
contract, or repository. Items remain untrusted until independently tested.

## Canonical public sources

- Organization: https://github.com/ubiq
- Project website: https://ubiqsmart.com
- Documentation: https://docs.ubiqsmart.com
- Improvement proposals: https://github.com/ubiq/UIPs

The GitHub organization identifies itself as “Ubiq — Smart contract platform”
and links to `ubiqsmart.com`. It contains 85 public repositories.

## Initial repository map

| Component | Repository | Last public push | Initial status |
| --- | --- | ---: | --- |
| Protocol client | `ubiq/go-ubiq` | 2024-03-26 | Amber |
| Release builder | `ubiq/go-ubiq-builder` | 2024-03-26 | Amber |
| Documentation | `ubiq/docs` | 2022-12-29 | Red |
| Website | `ubiq/ubiqsmart` | 2023-09-13 | Amber |
| Proposals | `ubiq/UIPs` | 2020-06-03 | Red |
| Browser wallet | `ubiq/pyrus` | 2025-04-29 | Amber |
| Mining software | `ubiq/ubqminer` | 2024-10-19 | Amber |
| Hash implementation | `ubiq/ubqhash` | 2023-02-25 | Amber |
| Discord operations | `ubiq/tars-discord` | 2026-07-10 | Unknown |

Statuses are provisional:

- **Amber** means the component may operate but its maintenance, dependencies,
  deployment, ownership, or recovery process needs verification.
- **Red** means the public source is stale enough to be a material onboarding
  or governance risk.
- **Unknown** means recency alone does not establish its operational state.

## Observed network surfaces

| Surface | Observed value | Verification state |
| --- | --- | --- |
| Mainnet chain ID | `8` | Needs canonical code/config confirmation |
| Native symbol | `UBQ` | Widely documented |
| Blockbook explorer | `ubqblockexplorer.com` | Live and synchronized when observed |
| Legacy explorer | `ubiqexplorer.com` | Responding; data quality not yet tested |
| Documented explorer | `ubiqscan.io` | Needs availability and ownership checks |
| Website RPC | `rpc.octano.dev` | Red: hostname did not resolve |
| Wallet RPC | `pyrus1.ubiqscan.io` | Red: hostname did not resolve |
| Third-party RPC | `pyrus2.ubiqscan.io` | Red: hostname did not resolve |
| Working RPC | `rpc.ubiqsmart.com` | Green: chain ID, head, and client responded |

## First verification results

### Canonical client

- Audited commit: `29a4ef4949df41907312c5caabf9a3dc8647d54b`
- Default branch: `master`
- Last commit: 2024-03-26, “Update bootnodes”
- Go module path: `github.com/ubiq/go-ubiq/v7`
- Declared Go language version: `1.15`
- Mainnet chain ID: `8`
- Mainnet genesis hash:
  `0x406f1b7dd39fca54d8c702141851ed8b755463ab5b560e6f19b963b4047418af`
- Activated revisions include Byzantium, Constantinople, Petersburg, Istanbul,
  Berlin, London, and the Ubiq-specific Monoceros fork.
- The client contains nine hard-coded discovery-v4 bootnodes and two discovery-v5
  records.

### Public RPC check

Safe read-only checks were performed on 2026-07-26 using `eth_chainId`,
`eth_blockNumber`, and `web3_clientVersion`.

| Endpoint | Result |
| --- | --- |
| `https://rpc.octano.dev` | DNS resolution failed |
| `https://pyrus1.ubiqscan.io` | DNS resolution failed |
| `https://pyrus2.ubiqscan.io` | DNS resolution failed |
| `https://rpc.ubiqsmart.com` | Healthy; chain `0x8`; head `8,381,098` |

The working endpoint identified itself as
`Gubiq/v7.0.2-develop-2384cb50/linux-amd64/go1.22.1`.

The reported commit was subsequently located in public history. Commit
`2384cb5034cf23261d681bf3366bbfe07bbf376d` is the parent of the v7.0.2 version
bump and an ancestor of the v7.0.2 release and current `master`. The endpoint is
therefore running a traceable but pre-release build, not an unknown newer build.
It should still be upgraded to a documented release.

### Release provenance

- Latest public release: `v7.0.2 - Sunflower`
- Published: 2024-03-26
- Release tag object: `28f28bda187a9bcca063192f2831020316c08015`
- Tagged source commit: `29a4ef4949df41907312c5caabf9a3dc8647d54b`
- Builder uses Go `1.22.x` and GitHub Actions.
- Release assets exist for Linux AMD64/ARM64/ARM7, macOS AMD64, and Windows
  AMD64.
- The tag object contains no cryptographic signature.
- The release assets contain raw binaries but no published checksum manifest,
  signature, SBOM, or provenance attestation.
- The separate builder workflow triggers on every push while building a
  hard-coded tag. It uploads workflow artifacts; the audited workflow does not
  itself publish or sign GitHub Release assets.

### Bootnode sampling

A first TCP connectivity sample against port `30388` found:

- first four hard-coded nodes unreachable;
- the fifth and sixth nodes reachable;
- the remaining three unverified because the check reached its time limit.

TCP reachability alone does not prove a valid Ubiq peer. A protocol-level peer
test remains required.

## Immediate risk hypotheses

1. The canonical node appears to be based on an old Go-Ethereum generation and
   advertises Go 1.13-era build requirements.
2. Public infrastructure and documentation may name different explorers and
   RPC endpoints, creating onboarding and phishing risk.
3. Many unarchived repositories have seen no activity for several years,
   obscuring which products are supported.
4. Governance proposals have no visible repository activity since 2020.
5. A working chain does not guarantee a reproducible client release, healthy
   peer topology, safe wallet, or recoverable public infrastructure.
6. The only responding audited RPC runs a traceable pre-release commit rather
   than the latest tagged release.
7. Release binaries lack a published checksum/signature/SBOM/attestation chain.

## Local audit sources

The following upstream repositories are mirrored locally under `upstream/`
for read-only examination and are intentionally excluded from this repository:

- `go-ubiq`
- `go-ubiq-builder`
- `docs`
- `ubiqsmart`
- `UIPs`
- `pyrus`
- `tars-discord`

## Next verification pass

1. Record exact branches, commits, tags, and release dates.
2. Inspect network configuration, genesis, bootnodes, supported forks, and EVM.
3. Inspect build and release workflows for obsolete or compromised dependencies.
4. Test every published RPC with a fixed set of safe read-only JSON-RPC calls.
5. Compare website, docs, wallet, and source configuration for contradictions.
6. Produce a ranked risk register with evidence and recommended owners.
