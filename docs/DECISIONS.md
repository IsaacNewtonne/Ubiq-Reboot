# Decision Log

Use this log for decisions that affect protocol compatibility, security,
custody, governance, infrastructure ownership, or major product scope.

### ADR-001: Propose application-level UBQ settlement before native integration

- **Status:** Proposed
- **Date:** 2026-07-26
- **Owners:** Ubiq Reboot contributors; Freenet maintainers decide upstream scope
- **Context:** Freenet has no built-in currency or globally ordered transaction
  ledger. Its contracts are eventually consistent replicated state machines,
  while Ubiq balances are finalized by Proof-of-Work consensus. Freenet also
  requires maintainer approval of a design issue before feature code.
- **Decision:** First request approval for a separate, application-level UBQ
  payment integration. Ubiq remains the settlement and balance authority.
  Freenet contracts may carry signed requests and informational receipts, and
  local wallets or delegates handle keys. Do not call UBQ Freenet's native
  currency or modify `freenet-core` without an explicit protocol decision.
- **Alternatives:** Add protocol fees/rewards in UBQ; build a Ubiq light client
  in a Freenet contract; maintain a Freenet-native UBQ ledger; take no action.
- **Consequences:** The proposal fits current Freenet primitives and avoids a
  false trustless-bridge claim, but it depends on external Ubiq availability and
  does not itself create Freenet node incentives.
- **Evidence:** `proposals/FREENET-UBQ-CURRENCY.md`; Freenet whitepaper,
  application tutorial, contract interface, and contribution policy.

## Template

### ADR-000: Decision title

- **Status:** Proposed
- **Date:** YYYY-MM-DD
- **Owners:** Names or handles
- **Context:** What constraint or problem requires a decision?
- **Decision:** What was selected?
- **Alternatives:** What credible options were rejected?
- **Consequences:** What becomes easier, harder, riskier, or irreversible?
- **Evidence:** Links to tests, discussions, code, or reports.
