# Firestore Tenant Isolation Audit — Findings

**Status:** Executed. Analyzed: pending review of this document. Accepted:
pending final approval. See Section 5 for full lifecycle detail.

**Depends on:** [Audit Plan](./firestore-tenant-isolation-audit-plan.md)
(defines scope, attack scenarios, and acceptance criteria — this document
reports results against that plan, and does not redefine scope).

**Note on evidence provenance:** The emulator execution recorded below
was reported by the operator/session that ran it, in an environment with
the network access this sandbox does not have (`HANDOFF.md` documents
this repo's sandbox as blocked from reaching Firebase emulator infra).
It was **not independently reproduced inside this authoring session** —
no raw stdout/log file was attached at time of writing. That distinction
matters for a document whose purpose is evidentiary integrity, so it's
stated plainly rather than presented as first-hand verification. If the
raw terminal output or a saved log file exists, it should be attached
here as an appendix in a follow-up commit; that upgrades this record
from "reported result" to "reproducible evidence," which is the actual
bar Section 4 of the audit plan sets ("full suite passes against the
real Firebase Rules Emulator — not just locally reasoned about").

---

## 1. Audit Scope

Per the [Audit Plan](./firestore-tenant-isolation-audit-plan.md), this
audit verifies, for every business-scoped Firestore collection:

- **Tenant isolation** — Business A data is unreachable to Business B
  members, across read, write, update, delete, and query paths.
- **Business-level data boundaries** — the `businessId` scoping already
  encoded in `firestore.rules` (`isMemberOf`, `isOwnerOf`) actually holds
  under adversarial test, not just by inspection.
- **Owner access rules** — Owner-only operations (e.g. reopening a
  Closing) are inaccessible to non-Owners of the same business.
- **Manager access rules** — `isOwnerOrGrantedManager` grants are scoped
  correctly and don't leak across businesses.
- **Staff access rules** — Staff-tier members get read/write access
  consistent with their role and no more, and lose it immediately on
  suspension (`isSuspended()`), not just at token expiry.
- **Closing Integrity protections** — closed-period immutability
  (Amendment v1.0: blocked backdated writes to `expenses`/`withdrawals`
  in closed periods, admin-only logged reopening) holds at the rules
  layer, not just in application code.

Scope matches the Audit Plan's Section 1 collection table exactly:
`users`, `businesses`, `products`, `batches`, `purchaseBatches`,
`quebras`, `expenses`, `stockCounts`, `withdrawals`, `closings`,
`closedPeriods`, `staff`, `timelineEvents`. Admin-SDK server code
(`server/index.ts`) and UI-layer access control remain explicitly out of
scope, as stated in the plan.

---

## 2. Execution Details

| Field | Value |
|---|---|
| Command | `npm run test:rules:emulator` |
| Node | v22.22.2 |
| npm | 10.9.7 |
| Java | OpenJDK 21.0.10 |
| Firebase CLI | 15.25.1 |
| Target | Firestore Rules Emulator (real emulator, not mocked/reasoned-about) |
| Result | 47 tests passed, 0 failures, exit code 0 |
| Reproduced in this authoring session? | **No** — see provenance note above |

This satisfies the *quantitative* bar in Audit Plan Section 4 ("full
suite passes against the real Firebase Rules Emulator"), pending the raw
log attachment noted above for full reproducibility.

---

## 3. Findings Summary

| Area | Result | Notes |
|---|---|---|
| Tenant isolation (cross-business read) | PASS | Business B members denied `get()`/`list()` on Business A documents across all in-scope collections. |
| Cross-business write (create) | PASS | Business B members denied creating documents under Business A's `businessId`. |
| Cross-business write (update/delete) | PASS | Where update/delete exist at all, denied across the tenant boundary. |
| Query-based leakage | PASS | Collection-group / unfiltered queries denied at the rules layer, not left to client-side filtering. |
| Reference/nested cross-tenant access | PASS | Cross-references (e.g. batch→product, closing→expenses/withdrawals via `closingId`) do not allow pulling data across a business boundary. |
| Owner permissions | PASS | Owner-only operations (e.g. Closing reopen) inaccessible to Manager/Staff of the same business. |
| Manager permissions | PASS | `isOwnerOrGrantedManager` scoped correctly; no cross-business grant leakage. |
| Staff permissions | PASS | Access matches role; suspended members (`isSuspended()`) lose access immediately, not just at token expiry. |
| Closing Integrity protections | PASS | Closed-period backdated writes to `expenses`/`withdrawals` blocked per Amendment v1.0; future-dated entries unaffected; reopening remains Owner-only and logged. |

All 13 in-scope collections from the Audit Plan's Section 1 table are
covered by the 16 `describe` blocks referenced in `HANDOFF.md`
(up from 5 pre-audit). No scenario from Audit Plan Section 2 is recorded
as failing.

**No new findings requiring a follow-up rule-change task** were reported
alongside the 47/0 result. If any `PERMISSION_DENIED` case had instead
represented an *unexpected* allow (a real gap), Audit Plan Section 4
requires it be written up as a named finding — collection, scenario,
current behavior, risk — rather than fixed inline. None were reported.

---

## 4. Expected Permission Denials

Firestore emulator logs from this run reportedly contain numerous
`PERMISSION_DENIED` entries. **These are not failures.** The test suite
deliberately attempts forbidden operations (cross-tenant writes,
unauthorized reads, role-escalation attempts, suspended-member access)
using `assertFails(...)` — the correct, intended outcome for those
specific assertions is that Firestore rejects the operation and the
rejection is logged.

The correct read of the sequence is:

```
Unauthorized request attempted
        ↓
Firestore rules rejected it
        ↓
Test asserted the rejection (assertFails)
        ↓
PASS
```

A `PERMISSION_DENIED` log entry paired with a passing test is evidence
the rule is enforcing correctly — the opposite of a security defect. The
only pattern that would indicate a real problem is a scenario that
*should* have been denied but instead passed the operation through
(an `assertFails` that failed, or worse, silently succeeded) — no such
case is recorded in this execution.

---

## Appendix A: Execution Evidence

Following the provenance gap noted above, a screenshot of the actual
`cmd.exe` terminal session running `npm run test:rules:emulator` was
provided and reviewed. It shows real Firebase Rules Emulator log output
rather than a paraphrased summary. Observed directly in the screenshot:

- Suite summary: `tests 47`, `suites 16`, `pass 47`, `fail 0`,
  `cancelled 0`, `skipped 0`, `todo 0`, `duration_ms 20834.4539`.
- `Script exited successfully (code 0)`.
- Clean emulator teardown sequence: Firestore Emulator stopped on
  `SIGINT`, emulator hub stopped, logging emulator stopped — consistent
  with a real local emulator run rather than a mocked/short-circuited
  one.
- Scenario-level detail visible in the log, matching Audit Plan Section
  2 categories rather than generic output:
  - `query-based leakage`: a cross-business collection-group query
    against `expenses` denied to a caller who is not a member of every
    business it would span — the exact "query-based leakage" scenario
    class from Audit Plan Section 2, item 4.
  - `suspended member`: passed, consistent with Section 2, item 7.
  - `historical reopen → correct → re-close workflow`: confirms a second
    Closing stays locked while a first Closing is reopened for
    correction, then re-closes cleanly once the correction is made —
    Closing Integrity Amendment behavior, not merely a generic
    pass/fail.
  - Several `PERMISSION_DENIED` gRPC log lines with real timestamps
    (`2026-07-31T01:17:5x.xxxZ`) tied to specific rule-evaluation lines
    (`L293`/`L294`) for `create`/`update` — consistent with Section 4's
    interpretation: these are expected denials paired with passing
    `assertFails` assertions, not unhandled errors.

**This upgrades the record but doesn't fully close the evidence gap.**
A screenshot is materially stronger than a narrative claim — it shows
real tool output rather than a paraphrase — but it is still a partial,
manually-captured view (scrolled terminal buffer), not an attached raw
log file or CI artifact covering all 16 `describe` blocks end to end.
For full reproducibility per Audit Plan Section 4, the ideal follow-up
is the complete captured log (e.g. `npm run test:rules:emulator > run.log
2>&1`) committed alongside this document. Noted as a nice-to-have, not
a blocker — the reviewer evaluating Analyzed/Accepted should weigh this
appendix as strong supporting evidence, not as full first-hand
verification by this session.

---

## 5. Lifecycle Status

| Stage | Status | Detail |
|---|---|---|
| Designed | ✅ | Accepted architecture and security requirements (Architecture 12, Security Architecture doc; Audit Plan scope/scenarios). |
| Implemented | ✅ | Security rules and tests implemented — 16 `describe` blocks in `tests/firestore-rules.test.ts`, typechecked clean. |
| Executed | ✅ | 47/47 emulator tests passed, 0 failures, exit code 0 (see Appendix A for screenshot evidence review). |
| Analyzed | ✅ | Reviewed and marked complete by the Product Architect (2026-07-31), on the basis of this findings document plus Appendix A's evidence review. Not self-granted by the document's author. |
| Accepted | ⏳ Pending | Held pending completion of repository integration (push + review of the two documentation commits on `origin`). Not advanced by this edit. |

This document does not self-advance Accepted — that remains an explicit,
separate decision gated on the commits actually landing in the reviewed
repository, per the Product Architect's stated condition.
