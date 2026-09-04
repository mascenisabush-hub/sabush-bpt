TECHNICAL EVIDENCE RECORD — REAL-ENVIRONMENT VERIFICATION — NOT A GOVERNANCE DECISION, NOT A RULE 8 UPDATE

# Finding K — Real-Environment Verification Evidence Record

**Type:** Durable engineering evidence artifact. Records the completed
Finding K real-environment verification run for citation by a future
Rule 8 reassessment. Does **not** itself change Finding K's Rule 8
classification, does not authorize implementation, does not modify the
Implementation Authorization, and does not create a Product Architect
decision.

**Status of Finding K after this evidence, as recorded here:**
**PARTIALLY VERIFIED — NOT FULLY RESOLVED.** This document does not
mark Finding K RESOLVED. The Rule 8 Assessment's own classification of
Finding K is unchanged by this document and remains a separate,
future, deliberate step.

**Governing chain (for future citation):**
[Decision 51](../specs/stock-count-data-loss-resilience-decision-51-amendment.md)
(Shared-Device/Cache Isolation Requirements) → [Finding K — Cache/Session
Isolation Mechanism Analysis](./finding-k-isolation-mechanism-analysis.md)
→ [Technical Design for Decisions 44–55](./periodic-contagem-decisions-44-55-technical-design.md)
§12 (finalized mechanism) → [Rule 8 Assessment](./periodic-contagem-shared-live-data-decision-44-rule8-assessment.md)
§IV.O-k (Finding K reclassified CONFIRMED FAIL — HIGH, mechanism
finalized, not yet implemented) → [Implementation Authorization](./periodic-contagem-shared-live-data-decisions-44-56-implementation-authorization.md)
(`67d60a7`) → Implementation (`d3b8d9b`, `aefaf65`) → **THIS evidence
record** → *(next, separately: a second independent run, then a
deliberate Rule 8 reassessment — neither performed by this document)*.

**Repository state at this revision:** working tree clean immediately
before this document was added. No application code, `firestore.rules`,
schema, UI, Implementation Authorization, or Rule 8 Assessment was
modified to produce this record.

---

## 1. What Was Verified and How

### 1.1 Environment (real, not simulated)

| Component | Detail |
|---|---|
| Backend | Real Firestore Emulator **and** real Firebase Auth Emulator — not mocked, not simulated, not the `@firebase/rules-unit-testing` shortcut context used by this repository's other emulator suite |
| Firebase SDK | `firebase@12.16.0` — the exact version this repository pins in `package.json` |
| Persistence | `persistentLocalCache` with `persistentSingleTabManager` — a documented, deliberate Node-compatible substitute for production's `persistentMultipleTabManager` (Node has no real browser `window`/cross-tab coordination primitives). This substitution is stated explicitly in the harness's own header and applies uniformly to every scenario below. |
| Authentication | Real, distinct Firebase Auth Emulator UIDs, created via `createUserWithEmailAndPassword`, for each tested role (Owner, Staff, currently-delegated Editor) |
| `firestore.rules` | The actual, current repository file, loaded **verbatim** into the emulator — not a rewritten, simplified, or hand-copied subset |
| Execution location | The developer's own Windows/PowerShell environment. **This sandbox cannot reach the emulator infrastructure at all** (network egress allow-list does not include `storage.googleapis.com`, confirmed repeatedly, empirically, across this entire verification arc) — every run reported in this document was executed by the user, not by the assistant, and the assistant could not independently confirm the raw emulator output beyond what was reported back. |
| Harness | `tests/finding-k-real-environment-verification.mjs` (commit `c8fb505` and its history) |

### 1.2 What was NOT exercised — stated explicitly, not by omission

- **No real browser or page lifecycle.** `persistentSingleTabManager` stood in for production's `persistentMultipleTabManager` throughout every scenario. A real page `reload()`, real cross-tab lock coordination, and real `pagehide`/`visibilitychange` timing were **not** tested — Node has no faithful equivalent for any of these.
- **The harness does not import or execute `AppContext.tsx` or `PeriodicStockCountView.tsx` directly.** React components with hooks are not runnable headless. Every gating decision exercised below is a hand-written re-implementation of the same pattern (`if (isOwner) { attach } else { setX(safe) }`, fail-closed first-emission handling, the flush-gated logout sequence), using the same real SDK calls those files make — not the production files themselves. A clean result is strong evidence the **pattern** is sound; it is not, by itself, proof that every actual call site in those files applies the pattern identically or is free of an unrelated implementation defect. This is a distinct claim from the source-text pattern-matching test
  (`tests/periodic-contagem-shared-live-data-decisions-44-56.test.ts`), which confirms the pattern's **presence** in the real files — the two together are stronger evidence than either alone, but neither substitutes for the other.
- **This was one independent, clean run**, arrived at after three prior rounds each found and fixed a real bug in the harness itself (see §3 below). One clean run following a history of real bugs found by execution is good evidence, not yet the strongest available evidence — a second independent clean run (ideally after some elapsed time, to rule out any residual order-dependency or flakiness in the harness) has not yet been performed.

---

## 2. Results — All Twelve Scenarios

| # | Scenario | Result | What it demonstrates |
|---|---|---|---|
| 1 | K1 — Business A → logout → Business B | **CONFIRMED PASS** | A real, dynamically-gated listener (driven by a real fetched profile, not a hardcoded value) correctly withheld Owner's privileged `withdrawals` data from a genuinely different, non-authorized real Auth session signing in on the same device afterward |
| 2 | K2 — offline business-context switch | **CONFIRMED PASS** | Same Owner, two real businesses; while offline, a read of Business A's own path still correctly returns only Business A's own content, and Business B's path returns only Business B's — no cross-business substitution |
| 3 | K3 — User A → logout → User B | **CONFIRMED PASS** | Same underlying mechanism and result as K1 (same code path in this harness, by design — see the harness's own comments) |
| 4 | K4 — same user, two real businesses, online | **CONFIRMED PASS** | No cross-business content mix-up at the SDK/cache layer |
| 5 | K5 — offline pending write across a real identity change | **CONFIRMED PASS** | Both client- and server-side evidence. (This result changed from an earlier `CONFIRMED HIGH` across two prior rounds — that earlier result was traced to a genuine bug in the verification harness itself, not a product defect; see §3.) |
| 6 | K6/K7 — delegated-Editor revocation while offline | **CONFIRMED PASS** | Both client- and server-side evidence, against the real, current `contagemAuthority`/`firestore.rules` mechanism. Previously **not yet testable** in any form — this is the first direct evidence for this scenario in the entire governance chain |
| 7 | Fail-closed — gate applied | **CONFIRMED PASS** | Covered by K1/K3's own result above |
| 8 | Fail-closed — gate deliberately removed | **CONFIRMED HIGH — intentional control condition, not a defect** | This scenario exists specifically to prove the underlying danger the gate protects against is real, not theoretical, by testing what happens *without* the gate. Its `CONFIRMED HIGH` result, read alongside scenario 7's `CONFIRMED PASS`, is exactly the pairing that demonstrates the fix is doing real work, not passing vacuously |
| 9 | Listener error / permission-denied reset | **CONFIRMED PASS** | A modeled `AppContext.tsx` success/error callback pair (real SDK calls, real emulator, real non-authorized identity) correctly reset to a safe empty state after a genuine permission-denied response — not merely a console error |
| 10 | Shared Contagem — not a leak | **CONFIRMED PASS** | The currently-assigned delegate genuinely receives a live row an Owner-context write produced — confirms the isolation mechanism does not incorrectly suppress legitimate, intended collaborative visibility (Decision 46/52) |
| 11 | Logout cleanup — safe branch (flush succeeds) | **CONFIRMED PASS** | `terminate()` then `clearIndexedDbPersistence()`, in that required order, genuinely emptied the cache, confirmed against a freshly re-initialized Firestore instance |
| 12 | Logout cleanup — unsafe branch (flush fails / pending write) | **CONFIRMED PASS** | Cleanup was correctly skipped; the pending write survived and reached the server once reconnected — no data destroyed, consistent with Decision 44's no-silent-loss requirement |

**Summary: eleven of twelve scenarios CONFIRMED PASS on genuine, real evidence. The twelfth (item 8) is an intentional control condition whose `CONFIRMED HIGH` result is itself the expected and required outcome — it is not counted as a failure or a defect.**

---

## 3. Harness Defects Found and Fixed During This Verification Arc — Recorded for Transparency, Not Hidden

This clean result was reached only after three real bugs were found by actually executing the harness (not caught by code review alone), each fixed and explicitly documented in the harness's own commit history and header comments:

1. **A credential-propagation misdiagnosis** (later found to be wrong) that led to a real but different root cause: the `contagemAuthority/current` write rule requires `assignedAt == request.time` (a server-timestamp sentinel), and the harness was writing a client-computed ISO string, which could never satisfy that check — causing a 100%-reproducible rejection misdiagnosed at first as a timing issue. Fixed by using the real `serverTimestamp()`, matching what `AppContext.tsx`'s own `assignDelegatedEditor()` has always done for this field.
2. **A return-value propagation bug in the harness's own `adminRead()` ground-truth helper**, which silently returned `undefined` instead of real document data or an explicit `null` in at least one code path. This was more serious than a single-scenario bug: K5's own ground-truth check used a comparison (`!== null`) that `undefined` also satisfies in JavaScript, meaning this bug could have silently produced K5's earlier `CONFIRMED HIGH` result for the wrong reason. Fixed by switching to a proven-correct pattern already used elsewhere in this repository's own emulator test suite, and by making the helper throw loudly rather than silently return an ambiguous value.

**Direct consequence for this record:** K5's `CONFIRMED PASS` (item 5 above) is the result obtained **after** this specific bug was fixed and the scenario re-run — the earlier `CONFIRMED HIGH` from before the fix is superseded by this corrected result and is not treated as a valid finding.

---

## 4. Explicit Status of Adjacent Governance Items — Unaffected by This Record

- **Decisions 47, 50, and 55** — technical mechanisms remain exactly as previously recorded (Rule 8 Assessment `326dc46`, 26/26 real rules-engine tests). This record does not add to, narrow, or re-verify that evidence — it tests a different layer (client SDK + persistence + real Auth), not additional `firestore.rules` coverage of those decisions.
- **Decision 56's `update`-immunity mechanism** — unchanged, previously verified (same commit).
- **Decision 56 §7 (Clear-All-Data `delete` path)** — remains explicitly unresolved and untouched by anything in this entire verification arc, including this record.
- **Stage 2 (genuine per-row live-adoption UI mechanism)** — remains not started.
- **No new Product Architect decision was created.** No existing decision was reopened, reinterpreted, or amended.
- **The Implementation Authorization (`67d60a7`) was not modified.**
- **No application code, `firestore.rules`, schema, or UI was modified** to produce this evidence or this record.

---

## 5. Recommendation for the Future Rule 8 Reassessment (Not Enacted Here)

Based on the evidence in §2, a future, separate, deliberate Rule 8
reassessment may find grounds to move Finding K from its current
`CONFIRMED FAIL — HIGH, NOT RESOLVED` classification (§IV.O-k) toward
something reflecting `PARTIALLY VERIFIED` status — the mechanism is
now confirmed working end-to-end in a real (non-browser) environment,
across every named scenario, with one intentional control condition
behaving exactly as required. **This document does not make that
change.** A defensible full `RESOLVED` classification would still
reasonably wait on: a second independent clean run (§1.2), and/or
direct confirmation of the specific browser-only substitutions named
in §1.2 (`persistentMultipleTabManager`, real page reload, real
`pagehide`/`visibilitychange` timing).

---

## 6. Verification of This Record's Own Introduction

The relevant repository test suites were re-run after adding this
document, to confirm it introduces no regression:

- `npm run test:all` (the full non-emulator suite, including
  `tests/periodic-contagem-shared-live-data-decisions-44-56.test.ts`)
- `node --check` was not applicable (this is a Markdown document, not
  executable code) — confirmed instead by direct proofreading against
  the source final report this document transcribes from.

See the accompanying commit message for the exact command output.

---

**FINDING K STATUS AS OF THIS RECORD: PARTIALLY VERIFIED — NOT FULLY
RESOLVED. RULE 8's OWN CLASSIFICATION IS UNCHANGED BY THIS DOCUMENT.
IMPLEMENTATION REMAINS GOVERNED EXCLUSIVELY BY THE EXISTING,
UNMODIFIED IMPLEMENTATION AUTHORIZATION (`67d60a7`).**
