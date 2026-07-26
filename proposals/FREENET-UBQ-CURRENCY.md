# Proposal: Evaluate UBQ as a Payment Currency for Freenet

**Status:** Draft for upstream discussion  
**Date:** 2026-07-26  
**Upstream target:** `freenet/freenet-core` issue tracker  
**Requested decision:** Is the Freenet project interested in an application-level
UBQ payment integration, and should protocol-level currency remain explicitly
out of scope?

## Summary

This proposal asks Freenet maintainers to evaluate Ubiq (`UBQ`, EVM chain ID
`8`) as an optional payment currency for Freenet applications.

It deliberately does **not** propose immediately adding UBQ to
`freenet-core`, charging protocol fees, changing routing, or representing Ubiq
balances in an eventually consistent Freenet contract. Those changes would
require a Freenet protocol and incentive design, not merely a wallet
integration.

The proposed first milestone is a separately versioned Freenet application:

1. a local delegate owns no Ubiq key by default and accesses a user-selected
   EIP-1193 wallet;
2. the UI creates and submits ordinary Ubiq transactions through that wallet;
3. payment requests use a canonical, signed format containing the Ubiq chain
   ID, recipient, amount, purpose, expiry, and nonce;
4. settlement is finalized by the Ubiq chain, not by Freenet state;
5. a Freenet contract may publish signed payment requests and receipts, but
   those receipts are informational until independently verified against Ubiq.

This would make UBQ usable *by* Freenet applications without inaccurately
calling it a Freenet protocol primitive.

## Why Ubiq

Ubiq is an independent Proof-of-Work EVM network launched without an ICO. Its
canonical mainnet parameters are:

| Field | Value |
| --- | --- |
| Chain ID | `8` |
| Network ID | `8` |
| Native currency | `Ubiq` (`UBQ`) |
| Decimals | `18` |
| Genesis hash | `0x406f1b7dd39fca54d8c702141851ed8b755463ab5b560e6f19b963b4047418af` |

The Ubiq Reboot project maintains machine-readable metadata and a
cross-platform RPC health checker. As of 2026-07-26,
`https://rpc.ubiqsmart.com` answered `eth_chainId`, `eth_blockNumber`, and
`web3_clientVersion` checks with chain ID `0x8`. A single observed endpoint is
not sufficient decentralization for a production payment dependency; endpoint
redundancy is an explicit prerequisite below.

## Architectural fit and constraints

Freenet is not a blockchain. Its contracts define valid replicated state and
summary/delta synchronization, and updates must converge regardless of arrival
order. Freenet contracts execute as WebAssembly on untrusted peers. Delegates
are the local trust zone for private data and cryptographic operations.

This creates four important constraints:

1. **No global transaction order.** A conventional account-balance ledger
   cannot safely resolve concurrent double spends using only commutative merge
   rules.
2. **No external consensus inside a contract.** An RPC response included in an
   update is a claim unless the contract verifies sufficient Ubiq consensus
   data.
3. **No secrets in contracts.** Ubiq private keys must remain in a user wallet
   or local delegate.
4. **No current contract composition assumption.** The public Freenet contract
   interface documentation says contract-to-contract state reads are planned,
   not presently available.

Consequently, phase one must treat Ubiq as the settlement network and Freenet
as the application and discovery network.

## Proposed phase-one scope

### Payment request

Define a deterministic CBOR payload:

```text
version
chain_id = 8
recipient = 20-byte Ubiq address
amount_wei = unsigned 256-bit integer
purpose = application-defined bytes
expires_at = Unix timestamp
nonce = 32 random bytes
requester_public_key
signature
```

Domain separation must bind the signature to the schema version and to
Freenet. Integer amounts are used throughout; decimal strings are a UI concern.
The exact signing algorithm should reuse an existing Freenet identity primitive
if maintainers recommend one.

### Payment execution

- The application requests chain `8` from an EIP-1193-compatible wallet.
- The wallet displays and signs the Ubiq transaction.
- The application submits through the wallet-selected provider.
- The transaction hash is associated with the request nonce.
- Confirmation policy is configurable and prominently disclosed.

The integration must never silently switch chains, store seed phrases, or ask a
Freenet contract to sign a Ubiq transaction.

### Receipt publication

A receipt can contain the request, transaction hash, observed block hash and
height, and observer signature. It is evidence for clients to verify, not an
authoritative balance mutation. Clients should query more than one independently
operated Ubiq RPC or verify headers before treating a receipt as settled.

## Explicitly out of scope

- Freenet protocol fees denominated in UBQ.
- Payment to Freenet node operators.
- Changes to peer selection, routing, storage, or admission control.
- A wrapped or bridged UBQ issued on Freenet.
- A Freenet-maintained global account ledger.
- Custodial wallets, hosted private keys, seed phrase handling, or automatic
  token swaps.
- A claim that UBQ is Freenet's "native currency" before Freenet governance
  makes a protocol-level decision.

## Security requirements

Before a public prototype:

- establish at least two independently operated, monitored Ubiq RPC endpoints;
- pin chain ID `8` and validate the canonical genesis/checkpoint lineage;
- define confirmation depth and reorg handling;
- bind each payment to a unique nonce, recipient, amount, purpose, and expiry;
- reject replay across applications, networks, and schema versions;
- keep signing behind explicit wallet confirmation;
- define behavior when RPC providers disagree or are unavailable;
- publish a threat model covering malicious payees, compromised RPCs, replay,
  reorgs, phishing, amount-display confusion, and metadata privacy;
- obtain independent review before describing the integration as production
  ready.

## Alternatives

1. **Application-level UBQ settlement (recommended first experiment).** Small
   core impact and honest trust boundaries; depends on Ubiq RPC availability.
2. **A light-client bridge contract.** Stronger verification but substantially
   more protocol and cryptographic work, including Ubiq header and PoW
   validation in WebAssembly.
3. **Protocol-native Freenet fees or rewards.** Potentially changes Freenet's
   economics and threat model; unsuitable as an unsolicited implementation.
4. **No preferred currency.** Freenet remains currency-neutral and individual
   applications integrate payment networks independently.

## Questions for Freenet maintainers

1. Is an optional UBQ payment example or reusable application component aligned
   with Freenet's roadmap?
2. Should this live outside `freenet-core` in a separate application repository?
3. Is direct EIP-1193 wallet interaction from the web UI acceptable, or should
   all signing coordination pass through a delegate?
4. Which stable Freenet identity/signature primitive should sign payment
   requests?
5. Would maintainers consider a future Ubiq light-client contract, or should
   external-chain verification remain strictly application-side?
6. Should Freenet explicitly remain currency-neutral at the protocol layer?

## Acceptance criteria for a later implementation

Implementation should begin only after a maintainer explicitly approves an
issue and its scope. A first PR would contain one logical change and include:

- canonical serialization test vectors;
- signature, expiry, nonce, chain-ID, overflow, and replay tests;
- mocked provider disagreement and reorg tests;
- no changes to Freenet routing or contract-runtime consensus;
- end-to-end testing on an isolated Ubiq test environment;
- user documentation that distinguishes a payment integration from a Freenet
  native currency;
- disclosure of AI assistance in accordance with Freenet's contribution policy.

## Evidence and references

- Freenet whitepaper: https://freenet.org/whitepaper/
- Freenet application tutorial:
  https://freenet.org/build/manual/tutorial/
- Freenet contract interface:
  https://freenet.org/build/manual/contract-interface/
- Freenet contribution policy:
  https://github.com/freenet/freenet-core/blob/main/CONTRIBUTING.md
- Ubiq canonical client: https://github.com/ubiq/go-ubiq
- Local verified metadata: `config/networks.json`

[AI-assisted - Codex]
