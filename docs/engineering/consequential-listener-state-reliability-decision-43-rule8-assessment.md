Rule 8 Assessment

# Rule 8 Assessment — Decision 43: Consequential Listener State Reliability

**Type:** Rule 8 architectural assessment of the accepted governance
decision recorded in [`consequential-listener-state-reliability-decision-43.md`](../specs/consequential-listener-state-reliability-decision-43.md).
Read-only architectural analysis — this document, at the time its
findings (§1–§16 below) were produced, authorized no code change,
Firestore rule change, index change, test change, or governance
artifact change beyond its own recording. §17, appended below,
records the Product Architect's subsequent resolution of this
assessment's two open decision points — that resolution likewise
authorizes no implementation; an Implementation Plan and a signed
Stage 8 Implementation Authorization remain separate, subsequent,
not-yet-created gates.

**Status:** ✅ **READY.** Originally concluded READY AFTER DECISIONS
(§16, original assessment); both identified decision points were
resolved by Product Architect acceptance on 3 September 2026 (§17).
No other finding in this assessment remains open.

**Governing chain:** [`consequential-listener-state-reliability-decision-43.md`](../specs/consequential-listener-state-reliability-decision-43.md)
(✅ Accepted, governance decision stage — SABUSHIMIKE MASCENI, 3
September 2026, commit `130a5db`) → **THIS Rule 8 Assessment** (✅
READY, decision points resolved — SABUSHIMIKE MASCENI, 3 September
2026) → *(next: Implementation Plan — not yet created)*.

---

## Rule 8 Assessment Result

**Status:** READY AFTER DECISIONS *(as originally concluded — see §17
for the subsequent resolution and final status)*

### 1. Verified Baseline

- **HEAD:** `130a5db` — "docs(governance): Decision 43 -- Consequential Listener State Reliability, ACCEPTED"
- **Branch:** `main`
- **Working tree:** clean
- **origin/main:** confirmed synced to `130a5db` via `git fetch`
- **Decision 43 artifact:** `docs/specs/consequential-listener-state-reliability-decision-43.md`, confirmed present, §12 confirmed containing the acceptance record (Status: ACCEPTED; Product Architect: SABUSHIMIKE MASCENI; Date: 3 September 2026)
- **Decisions 41A–41E:** confirmed implemented in the commit history (`bbfb4dc`, `d8e0ee3`, `2491d7a`, `de2972e`, `3e3b384`), all ancestors of current HEAD
- **Existing Rule 8 standard:** the format and discipline established by `docs/engineering/periodic-contagem-data-protection-hardening-decision-41-rule8-assessment.md` (READY/READY AFTER DECISION/NOT READY verdicts, per-finding evidence, explicit non-goals) is the template followed below.
- All application source code referenced in this assessment was independently re-verified at this HEAD via direct file inspection during this pass; no code has changed since the forensic audit that produced Decision 43, since only a governance document was added in the interim.

### 2. Accepted Decision Being Assessed

Verbatim from `docs/specs/consequential-listener-state-reliability-decision-43.md` §5 and §12:

> A consequential operation must not treat an unconfirmed, failed-listener-derived state as authoritative evidence that a dataset is empty, absent, or safe to proceed against, when that dataset materially affects: (1) financial calculations, (2) permanent historical records, (3) integrity-sensitive write decisions, (4) authorization/recovery decisions, or (5) business-period locking/gating.

**Accepted direction:** Option B — Consequential-operation boundary. **Option C** (fresh-read boundary) is accepted only as a **candidate mechanism**, to be evaluated per operation — not mandated. No universal mechanism, UI, rules change, offline architecture, or concurrency resolution is mandated by the accepted decision.

### 3. Consequential Operations Verified

| Operation | File:Line | Listener inputs | Classification |
|---|---|---|---|
| `addStockBatch` (create-vs-reuse + supersession) | AppContext.tsx:2788 | `products`, `batches` | A — Integrity risk |
| `deleteProduct` (cascade) | AppContext.tsx:6842 | `batches`, `quebras` | A — Integrity risk |
| `recordClosing` | AppContext.tsx:6504 | `expenses`, `withdrawals`, `products`, `batches`, `quebras`, `closings` (duplicate-period check via `closedPeriods`) | A + B — Integrity + financial calculation, feeding a permanent record |
| `reopenClosing` | AppContext.tsx:6638 | `closings`, `expenses`, `withdrawals` | A + C — Integrity + action/gating |
| `recordStockCount` (finalization) | AppContext.tsx:4641 | `businessWorthSnapshots`, `cashPositionDeclarations` (caller-side), `voidRecords` | A + B |
| `recordOwnerDeclaredBusinessWorth` | AppContext.tsx:4431 | `businessWorthSnapshots`, `batches`, `quebras`, `expenses`, `withdrawals`, `payables`, `cashLedgerEntries` | B — Incorrect business calculation (idempotency alone is D-protected; the calculation inputs are not) |
| `voidInitialStockConfirmation` eligibility | AppContext.tsx:1428 (`initialStockAuthorizedRecoveryEligibility`) | `initialStockRecoveryAuthorization` | C — Action/gating/recovery risk |
| Shared-device PIN pad refresh (`pairDevice` auto-refresh effect) | AppContext.tsx:1340–1349 | `staffMembers` | C — Action/gating |
| Subscription payment-status gate | SubscriptionContactModal.tsx:69 | `payments` | C — Action/gating |
| `recordReceivablePayment` / `recordPayablePayment` | AppContext.tsx:4202, 4340 | `receivables`/`payables` (payment-write role only) | D — Already protected (fresh `tx.get()`) |
| Supplier-wording relationship functions (×3) | AppContext.tsx:3042, 3148, 3236 | `suppliers` | D — Already protected |

No collection-level uniformity assumed — `payables` and `businessWorthSnapshots` each appear in both the D (protected) and A/B (material-risk) rows above, in their distinct roles, exactly as Decision 43 §9 requires.

### 4. Protected Operations

Re-verified directly: `recordReceivablePayment` (line 4221) and `recordPayablePayment` (line 4340) both open with `await runTransaction(db, async (tx) => {` and perform `tx.get()` on the specific document before any write — this is a **fresh, server-confirmed read inside the write's own atomic unit**, structurally immune to the listener-staleness mechanism regardless of what the client's ambient `receivables`/`payables` array holds. Same confirmed for the three supplier-wording functions (lines 3042, 3148, 3236).

**Critical distinction, per Decision 43 §12's own instruction:** these transactions protect **the write itself** — they do **not** re-fetch `cashLedgerEntries`/`batches`/`expenses`/`withdrawals`/other arrays that the *same calling function* may separately use for a **calculation**. `recordOwnerDeclaredBusinessWorth` (line 4451) is the clearest evidence: its own `runTransaction` block correctly does `tx.get(snapshotRef)` for idempotency, but the Business Worth calculation immediately below it (lines 4474–4501) is fed the **ambient client-side arrays**, not a transactional re-read. The transaction guarantees "this submission is applied at most once"; it does not guarantee "the number being applied is correct."

### 5. Material Risk Operations

**`recordClosing`** (AppContext.tsx:6504–6556): computes `report = generateReportSummary(startDate, endDate, products, batches, quebras, expenses, withdrawals)` (line 6511) and separately computes `expensesToLock`/`withdrawalsToLock` (lines 6538–6539) — both from ambient client arrays, no transaction, no fresh read anywhere in this function. The resulting `Closing` document is **permanent** (`allow delete: if false`, `firestore.rules`). A listener failure at the moment of closing can freeze an incorrect total into an immutable record.

**`reopenClosing`** (AppContext.tsx:6638–6665): `target = closings.find(...)` (line 6642) and `lockedExpenses`/`lockedWithdrawals = expenses/withdrawals.filter(closingId===id)` (lines 6657–6658) — same ambient-array pattern, no transaction.

**`addStockBatch`** (AppContext.tsx:2788–2938): `products.find(...)` for create-vs-reuse (ambient array, no protection); separately, `candidateOpenBatchIds` (line 2914) is ambient-array-derived but feeds INTO a `runTransaction` (line 2938) with its own `lockRef` (`openBatchLocks/{productId}`) and `tx.get()` — **the transaction protects against concurrent writes correctly, but the code's own comment explicitly documents that a stale/empty candidate list can still leave a legacy batch un-superseded.** This is the already-accepted residual risk — not reopened by this assessment.

**`deleteProduct`** (AppContext.tsx:6842–6858): `batches.filter(...)`/`quebras.filter(...)` (ambient arrays) determine cascade-delete scope; no transaction, no fresh read.

**`recordOwnerDeclaredBusinessWorth`**: see §4 — idempotency protected, calculation inputs not.

**Action/gating cluster:** `initialStockAuthorizedRecoveryEligibility` (AppContext.tsx:1428): ambient `initialStockRecoveryAuthorization`, no fresh read. Shared-device PIN pad (AppContext.tsx:1340–1349): ambient `staffMembers`, writes to `localStorage` — not a Firestore write, out of scope for a Firestore-fresh-read mechanism. Subscription payment gate (SubscriptionContactModal.tsx:69): ambient `payments[0]`, no fresh read.

### 6. Candidate Protection Per Operation

Per Rule 8 Question #1 ("what does the operation actually need to know?") and Question #2 (mechanism selection) — evaluated individually, no universal mechanism assumed:

| Operation | What it actually needs | Candidate mechanism | Rationale |
|---|---|---|---|
| `addStockBatch` create-vs-reuse | Existence of one specific document (product by normalized name) | **C — Firestore transaction read** (extend the existing `runTransaction` already present two lines later in the same function, or add a preceding `tx.get`/query) | Single-document-shaped need; the function already has transaction infrastructure immediately adjacent |
| `addStockBatch` supersession candidates | A bounded query: open batches for one specific product | **B/C — fresh read or extended transaction** | Already partially uses this pattern; the residual risk is scope, not mechanism — extending the existing transaction's own read set is the most architecturally consistent option |
| `deleteProduct` cascade | A bounded query: batches/quebras for one specific product | **B — fresh read** (`getDocs` with a `where('productId','==',id)` filter) before the existing delete-chunk loop | Bounded, single-field-filtered query; no identified race requiring a transaction |
| `recordClosing` totals | An aggregate over a date range across 5 collections | **F — requires case-by-case evaluation; not a simple fresh read** | Qualitatively different in cost from the single-document cases — see §7 |
| `recordClosing` duplicate-period guard | Existence check within `closings`/`closedPeriods` | **B/C** — a targeted existence query is plausible (`closedPeriodKey`-derived document id already exists per the code's own computation) | Document-keyed, unlike the totals calculation in the same function |
| `reopenClosing` target lookup | Existence of one specific document (`closings/{id}`) | **B — fresh `getDoc`** | Single-document need |
| `reopenClosing` unlock scope | A bounded query: `expenses`/`withdrawals` where `closingId === id` | **B — fresh, filtered read** | Bounded by an equality filter on an indexed-by-default field |
| `recordOwnerDeclaredBusinessWorth` calculation inputs | An aggregate across 6 collections, "as of" a date | **F — same class of difficulty as `recordClosing`'s totals** | Same aggregate-across-many-collections shape |
| `initialStockAuthorizedRecoveryEligibility` | Existence + field check of one fixed-id document | **B/C — fresh `getDoc`** | Simplest case: single document, fixed id, already known at call time |
| Shared-device PIN pad refresh | N/A — not a Firestore operation | **E — operation-level guard** | Firestore mechanisms do not apply; this is a client-side caching issue, not a read-staleness issue |
| Subscription payment gate | Existence/status of the most recent payment for this user | **B — fresh, single-field-sorted query, limit 1** | Bounded, cheap |

**No universal mechanism is indicated by this analysis** — confirming Decision 43's own instruction that Option C not be treated as mandatory.

### 7. Fresh-Read Feasibility

**Document-keyed operations:** single document or small, id-bounded set. No composite index required — a single-document `getDoc`/`tx.get()` never needs an index. Read cost: 1 document read each, negligible, comparable to what `recordReceivablePayment`/`recordPayablePayment` already do successfully in production.

**Bounded-query operations:** single-field equality filters (`productId ==`, `closingId ==`) on collections that are already plain, unfiltered `onSnapshot` listeners today. Firestore does not require a composite index for a single-field equality filter — current indexes are sufficient for these specific query shapes; a future implementation combining two filters may require a new composite index, to be checked per exact query shape during Implementation Planning.

**Aggregate operations** (`recordClosing` totals, `recordOwnerDeclaredBusinessWorth` calculation inputs): qualitatively different — these functions are called today with the *entire* ambient arrays for several collections. **This assessment could not determine, from repository evidence alone, whether these collections are small enough per business for a full re-fetch to be cheap, or large enough for this to become a real cost concern.** Flagged as unmeasured rather than estimated, per Rule 8's own instruction not to fabricate performance numbers. **This is one of the two decision points resolved in §17.**

**Race between read and write, for aggregate operations specifically:** a real race was identified between a fresh read of (e.g.) `expenses` and the eventual `fsBatch.commit()` of the new Closing. No equivalent lock-document mechanism exists today for Closing creation (only `openBatchLocks`, scoped to batch supersession, was found). **This is the other of the two decision points resolved in §17.**

### 8. Transaction / Atomicity Findings

| Operation | Existing transaction? | Extendable? | New infra needed? |
|---|---|---|---|
| `addStockBatch` | Yes (`runTransaction`, line 2938) | Yes | No |
| `recordClosing` | No (`fsBatch`, plain batch) | Would require converting to `runTransaction` or adding a preceding lock-document check | Yes — no existing Closing-scoped lock document exists |
| `reopenClosing` | No | Feasible for the document-keyed part; harder for the aggregate unlock-scope part | No, for the document-keyed part |
| `recordOwnerDeclaredBusinessWorth` | Yes, but only for idempotency | The calculation inputs are outside the transaction's own read set today | Effectively yes, for the calculation-input portion |
| `initialStockAuthorizedRecoveryEligibility` | No | A single `getDoc`/`tx.get()` addition is straightforward | No |
| `deleteProduct` | No | A plain `getDocs` before the existing delete loop is straightforward | No |

### 9. Security / Tenant Isolation

Every candidate operation already operates within existing `businesses/{businessId}/...` path scoping. No candidate mechanism requires or implies any `firestore.rules` change — a fresh read is simply an additional client-initiated read against the same collection the existing listener already reads, subject to the exact same `allow read` rule already in force.

### 10. Performance / Read-Cost Findings

Document-keyed and bounded-query candidates: negligible, comparable to existing proven patterns. Aggregate-calculation candidates: unmeasured — genuinely unknown from repository evidence, flagged explicitly. **Resolved in §17.**

### 11. 41A–41E Compatibility

Full compatibility confirmed for all five decisions (41A business-switch flush, 41B Initial Stock unmount flush, 41C bounded draft-save retry, 41D four-state draft listener model — not extended, 41E subscription-blocked read-only recovery). No override or duplication of any 41A–41E mechanism found.

### 12. 41F / 41G Boundary

Both remain untouched and un-absorbed. The read-write race identified for the two aggregate operations is within Decision 43's own scope, not 41G's concurrent-editing scope.

### 13. Scope Assessment

- Consequential operations identified: 10
- Distinct listeners/collections involved: 13
- Existing transactions that could be extended: 2
- Operations likely requiring a genuinely new fresh-read addition: ~5
- Operations requiring deeper, unresolved technical evaluation before a mechanism can be chosen: 2 (`recordClosing`, `recordOwnerDeclaredBusinessWorth`) — **resolved in §17**
- Operations requiring a non-Firestore mechanism: 1 (shared-device PIN pad)

The work should logically proceed as multiple phases, not one increment — mirroring the Decision 41A–41E series' own precedent.

### 14. Rule 8 Findings A–I

- **Finding A — Architectural compatibility: READY.**
- **Finding B — Tenant isolation: READY.**
- **Finding C — Security-rule compatibility: READY.**
- **Finding D — Data-integrity safety: READY WITH CONDITIONS.** Condition specific to `recordClosing`/`recordOwnerDeclaredBusinessWorth`'s read-write race — **resolved in §17.**
- **Finding E — Financial-calculation safety: READY WITH CONDITIONS.** Same condition as Finding D — **resolved in §17.**
- **Finding F — Transaction/atomicity safety: READY WITH CONDITIONS.** Same two operations — **resolved in §17.**
- **Finding G — Performance/read-cost feasibility: READY WITH CONDITIONS.** Aggregate cases unmeasured — **resolved in §17.**
- **Finding H — Scope boundedness: READY.**
- **Finding I — Governance consistency: READY.**

### 15. Remaining Product Architect Decisions

Two genuinely open technical questions were identified, both scoped narrowly to `recordClosing` and `recordOwnerDeclaredBusinessWorth`'s own calculation-input protection mechanism:

1. For these two operations specifically: should the eventual mechanism be a date/scope-bounded fresh read, a full transaction with a new lock-document mechanism, or an explicitly accepted, documented tolerance for the identified race?
2. Does real per-business data volume make a full fresh-collection-read approach acceptable, or does it require a bounded/scoped approach?

Everything else identified in this assessment does not require further decision before Implementation Planning.

### 16. Final Rule 8 Status (as originally concluded)

**READY AFTER DECISIONS.** The large majority of Decision 43's identified scope had a clear, boundable, low-risk implementation path. The two aggregate-calculation operations — also the two with the most severe consequence identified across the entire forensic investigation — carried a genuine, unresolved read-write race and an unmeasured performance question. This assessment declined to resolve those on the Product Architect's behalf.

---

## 17. Product Architect Resolution of the Remaining Decision Points

**Date:** 3 September 2026

The Product Architect has reviewed §15's two open decision points and resolves them as follows, without reopening any other finding in this assessment (§1–§16 above stand exactly as originally recorded) and without reopening Decision 43 itself, Decisions 41A–41E, the existing Void & Redo authorization, or the already-accepted batch-supersession residual risk.

### 17.1 Resolution — Aggregate Financial Calculations (§15, item 1)

For `recordClosing` and `recordOwnerDeclaredBusinessWorth`, and any other consequential aggregate financial calculation identified by this or a future assessment:

- The implementation **must not** treat a failed/unconfirmed Firestore listener state as authoritative evidence that a source collection is empty or absent.
- The implementation **must** use the **narrowest authoritative fresh-read mechanism that completely supplies the required calculation inputs** — this rules out both extremes identified in §7/§8: it rules out continuing to rely on the ambient, potentially-stale listener arrays as-is, and it rules out defaulting to an unscoped full-collection re-fetch merely because it is the simplest mechanism to describe, if a narrower bounded read (e.g., date-range-scoped, matching the existing `isDateInRange` pattern already used in `recordClosing`) can be shown to completely satisfy the operation's own correctness requirement.
- Where a race between the authoritative read and the resulting permanent write could affect correctness (§8's identified read-write race for both operations), the implementation **must** use an atomic mechanism capable of protecting the calculation/write relationship — a `runTransaction` extension or an equivalent lock-document mechanism (per the existing `openBatchLocks` precedent, §5) rather than an explicitly-accepted, undocumented tolerance for the race. This closes the "document the race and accept it" option that §15 had left open as a possibility; it is not selected.

This resolution does not select between a date-bounded read and a full transaction as the *only* permissible shape — it establishes the *correctness and narrowness constraints* the eventual mechanism, chosen per operation during Implementation Planning, must satisfy. It does not redesign the Closing or Business Worth calculation formulas themselves (§14 of `stock-count-data-loss-resilience-decision-41-amendment.md`'s own non-goals discipline, mirrored here) — only the reliability of the inputs those formulas consume.

### 17.2 Resolution — Performance / Data Volume (§15, item 2)

- The implementation **must evaluate the actual data-volume and read-cost implications** of whichever fresh-read/atomic mechanism is selected, for each of the aggregate operations, before that mechanism is finalized — this evaluation is Implementation Planning's task, not performed by this resolution.
- A full fresh collection read **must not be assumed automatically acceptable.** The narrowest bounded/scoped authoritative read that completely satisfies the operation's correctness requirement is preferred.
- **If a bounded approach cannot be shown to guarantee correctness for a given operation, that fact must be documented, and the appropriate stronger atomic mechanism used instead of weakening the correctness boundary.** Correctness is never to be traded for a cheaper read.

### 17.3 Effect on Findings D, E, F, G (§14)

With §17.1 and §17.2 recorded, the conditions attached to Findings D, E, F, and G in §14 are resolved: each now has an explicit, binding constraint (narrowest-sufficient authoritative read; atomic protection where a race exists; documented justification if a bounded approach is insufficient) governing how the eventual Implementation Plan must address `recordClosing` and `recordOwnerDeclaredBusinessWorth`, rather than leaving the mechanism entirely open. No finding's underlying evidence (§1–§13) is altered.

### 17.4 Updated Final Rule 8 Status

**READY.**

Both decision points identified in §15 are resolved (§17.1, §17.2). No finding in §14 remains open. Findings A, B, C, H, and I were already READY without condition; Findings D, E, F, and G are now READY, their conditions satisfied by the binding constraints recorded in §17.1–§17.2. This assessment does not itself select a specific implementation mechanism for any operation, does not create an Implementation Plan, and does not authorize any code, test, Firestore rule, or index change — those remain separate, subsequent gates.

**Product Architect Decision Record**

**Decision:** ACCEPTED

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 3 September 2026

**Signature:** SABUSHIMIKE MASCENI

This signature accepts the resolution recorded in §17 of this Rule 8
Assessment for Decision 43, in full. It does not constitute an
Implementation Plan or a Stage 8 Implementation Authorization — both
remain separate, subsequent, not-yet-created gates. No code, test,
Firestore rule, or index has been written, modified, or authorized by
this acceptance.

**Next governance gate:** Implementation Plan (separate, not yet
created).
