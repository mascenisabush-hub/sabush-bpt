# Rule 8 Assessment — Contagem Draft Data-Durability and Interruption Resilience (Decision 38)

**Status:** Assessment complete. **Verdict: READY FOR IMPLEMENTATION** (§13) — no remaining Product Architect decision. Governance action only — does not authorize implementation. An Implementation Task Amendment, and then a signed Implementation Authorization, remain the required next gates, per this document's own governing chain (§4) and `19-governance-bdr-policy-framework.md` §3.
**Governed by:** [`BDR-pending-business-worth-evolution-measurement-model.md`](../specs/BDR-pending-business-worth-evolution-measurement-model.md), Decision 38 ("Contagem Draft Data-Durability and Interruption Resilience — Extension of Decision 29"); [Stock Count Data-Loss Resilience Specification](../specs/stock-count-data-loss-resilience-specification.md), as amended (commit `781fbfc`, operationalizing Decision 38 at §5, §6, §12, §13, §14).
**Structural precedent:** [`initial-stock-accidental-confirmation-recovery-rule8-assessment.md`](./initial-stock-accidental-confirmation-recovery-rule8-assessment.md) (section structure, findings/verdict format), [`business-worth-evolution-rule8-assessment.md`](./business-worth-evolution-rule8-assessment.md) (verdict terminology: READY FOR IMPLEMENTATION / READY AFTER DECISIONS / NOT READY).
**This document does not:** modify Decision 38, the amended Specification, the current Implementation Task, `firestore.rules`, `firestore.indexes.json`, or any application code. It does not create an Implementation Task Amendment, Implementation Plan, or Implementation Authorization. It assesses technical feasibility only.

---

## 1. Fresh Repository Baseline

Verified directly, this session, before any assessment work:

- **Branch:** `main`
- **HEAD:** `781fbfc775c93b05a9e5b158c5858ee63e1cf8d9`
- **`origin/main`:** identical to HEAD after `git fetch origin main`
- **Working tree:** clean, no unrelated changes
- **Decision 38:** confirmed present exactly once in `BDR-pending-business-worth-evolution-measurement-model.md` (`grep -c` = 1), read in full.
- **Amended Specification:** confirmed present and committed at `781fbfc`, read in full, fresh — not from conversation summary.
- **Current Implementation Task** (`stock-count-data-loss-resilience-implementation-task.md`, 585 lines, §0–§9): read in full, fresh — its own §0 self-review discipline is the direct structural precedent this assessment's own verification follows.
- **Current implementation re-verified directly, not from memory:** `apps/tenant/src/lib/firebase.ts` (`getFirestore(app)`/`getFirestore(app, databaseId)`, no persistence configured), `PeriodicStockCountView.tsx`'s `scheduleDraftSave` (no await-before-issue serialization), `newProductInfo` (transient `useState`, absent from the draft schema), zero `visibilitychange`/`pagehide`/`beforeunload` usage outside `InitialStockCountView.tsx` (fresh `grep -rln`, this session). Nothing in application code has changed since the amendment was recorded — only governance documents have been touched in the intervening commits.
- **Firebase SDK versions and APIs verified directly against the installed package, not assumed:** `package.json` pins `"firebase": "^12.16.0"`; `node_modules/firebase/package.json` confirms **`12.16.0`** installed; `node_modules/@firebase/firestore/package.json` confirms **`4.16.0`**. Direct inspection of `node_modules/@firebase/firestore/dist/index.d.ts` confirms `initializeFirestore(app, settings, databaseId?)`, `persistentLocalCache(settings?)`, `persistentMultipleTabManager()`, and `FirestoreSettings.localCache?: FirestoreLocalCache` all exist in the installed version — the current, non-deprecated API (distinct from the older `enableIndexedDbPersistence`, which the amended Specification's §12 text names but does not mandate as the implementation). **Correction to a detail from the prior investigation:** the settings field is `localCache`, not `cache` — some of the SDK's own JSDoc comments say `.cache`, but the actual `FirestoreSettings` interface field, confirmed by direct grep, is `localCache`.

No reliance on conversation memory — every governance and code claim below was re-read or re-grepped fresh from disk this session.

## 2. Governance Inputs (Re-read Fresh)

- Decision 38, full text — items (a)–(f), the "What this Decision is not" paragraph, and the Recording note naming the required governance sequence (Specification Amendment → Rule 8 Assessment → Implementation Plan → Implementation Authorization).
- The amended Specification — §1a (governing distinction), §4 (draft state model), §5 (draft content, including the Decision 38 addition for `newProductInfo`), §6 (recovery/resurrection, including the two Decision 38 additions: interruption-durability outcome, and stale/out-of-order write protection), §7/§8 (submission identity/idempotent finalization, unchanged), §12 (Non-Goals, including the two mechanism-exclusion bullets reframed by the amendment), §13 (Explicitly Left Open, including the two new Decision 38 items), §14 (acceptance criteria, including the two new Decision-38 items).
- The current Implementation Task, in full, as the baseline this assessment evaluates gaps against (not itself amended by this document).

The amended Specification is treated as the authoritative functional-scope source throughout. Where current code evidence conflicts with a requirement, it is recorded as a finding, not resolved by reinterpreting the Specification.

## 3. Scope of This Assessment

Whether, and how, the amended Specification's new requirements (§5's `newProductInfo` content, §6's interruption-durability outcome and stale-write protection) can be safely implemented against the actual current codebase — without deciding any new business rule, and without touching code, rules, indexes, or tests in this session.

## 4. Governing Chain

```
Decision 38 (BDR, recorded 24 Aug 2026)
   ↓
Amended Specification (781fbfc) — operationalizes Decision 38 into
   required outcomes: §5 (newProductInfo content), §6 (interruption-
   durability outcome; stale-write protection)
   ↓
THIS Rule 8 Assessment — assesses whether/how those outcomes are
   achievable against the actual current codebase
   ↓
Implementation Task Amendment (not started)
   ↓
Implementation Plan, if required (not started)
   ↓
Signed Implementation Authorization (not started)
   ↓
Implementation (not started)
```

## 5. Findings — Requirement-by-Requirement Assessment

### A. Every catalog/manual row and portion recoverable after the full interruption list

**Finding A1 — MAJOR (resolvable within Rule 8 authority, with an explicitly bounded residual risk that is not itself a governance gap).** Architectural response: a combined mechanism — navigation/unload flush + Firestore persistent local cache — layered onto the existing 800ms-debounce draft architecture, which is otherwise unchanged. Risk: neither half of the combined mechanism alone closes every scenario Decision 38 names (§7 below). Mitigation: state the residual risk explicitly rather than implying an absolute guarantee, matching the amended Specification's own "required outcome, not required mechanism" framing (§6) and Decision 38 item (c)'s own authorization of a mechanism combination, not a specific loss-probability target.

### B. `newProductInfo` durable draft content

**Finding B1 — PASS.** Architectural response: add an optional `newProductInfo` field to the `stockCountDrafts/periodic` document, mirroring the existing in-memory shape verbatim — confirmed JSON-serializable, no restructuring needed. No structural risk; direct, low-risk extension of an already-proven draft-persistence pattern (§9 below).

### C. Existing invariants remain intact (draft/confirmed separation, resume, finalization/resurrection)

**Finding C1 — MAJOR (resolvable, but load-bearing — must be designed correctly at the Task stage, not assumed automatic).** None of the proposed changes touch `recordStockCount`, the finalization batch, `normalizeStockCountItems`, or any Business Worth calculation path. The flush mechanism only accelerates *when* the same draft document gets written, never *what* it means; offline persistence only affects local caching/queuing of writes to the same collection, never what data is treated as confirmed. Risk: a naive implementation could let the flush mechanism or offline-cache replay fire *after* finalization has already deleted the draft — the exact resurrection defect this Specification exists to prevent, applied to a new write path. Mitigation: the flush function must be included in the same §4a/§4b cancel/await discipline `handleConfirmSave` already enforces for the ordinary debounce — a third kind of pending-write handle, not an untracked side channel. This is a design requirement for the Implementation Task Amendment, not a new invariant.

### D. Stale/out-of-order autosave-write protection, single session

**Finding D1 — PASS.** Architectural response: serialize writes — await any prior in-flight write before issuing the next one, no new schema field. No structural risk: the write pattern is already full-document-overwrite, so strict issue-order serialization is sufficient by itself; this is a pure ordering fix within existing code.

### E. Multi-user/multi-device concurrency remains explicitly out of scope

**Finding E1 — PASS, with an explicit terminology caveat that must be carried into the Implementation Task Amendment.** None of the proposed mechanisms touch this. `persistentMultipleTabManager` is a Firestore SDK feature governing **the same user's own multiple browser tabs**, not multiple users/devices — this distinction must be stated explicitly wherever the mechanism is documented so it is never mistaken for a concurrency feature (§10 below).

## 6. Findings Summary (Requirement Traceability)

| Area | Decision 38 item(s) | Verdict | Summary |
|---|---|---|---|
| A — Interruption durability | (a) | MAJOR → resolvable, bounded residual risk | Combined flush + offline-persistence mechanism; no literal zero-loss claim |
| B — `newProductInfo` content | (b) | PASS | Additive optional field, backward-compatible |
| C — Draft/confirmed invariants | (e) | MAJOR → resolvable, load-bearing | New write paths must join the existing §4a/§4b cancel/await discipline |
| D — Stale-write protection | (d) | PASS | Await-before-issue serialization, no new schema field |
| E — Multi-user/multi-device exclusion | (f) | PASS, with terminology caveat | `persistentMultipleTabManager` is same-user/multi-tab, never multi-device |

No finding required inventing a requirement beyond Decision 38's own items (a)–(f); every finding above corresponds to a genuine, evidence-based technical question the amended Specification's outcome-not-mechanism framing leaves open for this assessment to resolve.

## 7. Mechanism Assessment

| Mechanism | Covers | Does not cover | Verdict |
|---|---|---|---|
| **Navigation/unload flush only** (`visibilitychange`/`pagehide`, mirroring `InitialStockCountView.tsx`'s proven pattern, design precedent only — see §11) | Accidental navigation away, tab/app closure, refresh/reload — every case where the browser gives JavaScript any opportunity to run before teardown | Hard power/battery loss, blackout, computer shutdown (no JS execution opportunity exists at all), and any loss occurring while the network write itself is still pending with no connectivity | **Insufficient alone** for Decision 38's full list |
| **Offline persistence only** (`persistentLocalCache` + `persistentMultipleTabManager`) | Content already locally enqueued (debounce already fired, `setDoc` already called) before a crash — this is what survives connection loss and, if the device itself survives and reopens the app, a hard power loss too, because the mutation is durably queued in IndexedDB before being sent | Content still sitting inside the *un-fired* debounce window at the moment of the crash — nothing is enqueued yet, so there is nothing for the local cache to persist | **Insufficient alone** — closes a different, complementary gap than the flush |
| **Combined (flush + offline persistence)** | The union of both — navigation/closure/refresh cases via flush; connection-loss/device-survives-a-crash cases via offline persistence, for anything already enqueued | The genuinely irreducible case: JavaScript never runs at all (instantaneous power cut) *and* the debounce/flush had not yet fired for that specific edit | **The strongest achievable option with this stack — recommended** |
| **Shorter debounce interval alone** | Narrows the un-fired-edit window for every mechanism above | Nothing structurally new; more frequent writes, more Firestore usage; does not by itself close any scenario the combined mechanism doesn't already partially address | Not a substitute; a legitimate tuning addition on top of the combined mechanism, already left open at Specification §13, not assessed as a requirement here |
| **Safer alternative discovered?** | A service-worker-based background-sync approach was considered and rejected: no service worker exists anywhere in this codebase today (confirmed absent), and adopting one would be a materially larger architectural/operational-complexity increase than the amended Specification's own "smallest coherent amendment" instruction permits, with no evidence it is necessary given the combined mechanism already closes every scenario a client-side web app can technically close | — | Rejected — disproportionate to the requirement |

**Why the combined mechanism wins:** it is the only option, among those investigated, whose *union* of coverage matches the *union* of scenarios Decision 38 names, using APIs already verified present and compatible in this codebase's installed SDK (§1), without introducing an architectural layer this codebase doesn't already have a precedent for (the flush mechanism has direct design precedent in `InitialStockCountView.tsx`; offline persistence is a documented, first-party Firestore SDK feature, not a bespoke build).

**No claim of zero data loss is made anywhere in this assessment.** If instantaneous power/battery/blackout occurs before JavaScript executes and before that edit has been locally enqueued, no client-side web mechanism can guarantee recovery. This is a physical client limitation, not a governance failure — the combined mechanism reduces the loss window to this physically irreducible case, stated plainly rather than implied away.

## 8. Data Model Assessment

- **Periodic draft document (`stockCountDrafts/periodic`):** gains one new optional field, `newProductInfo`. No existing field's shape, meaning, or presence requirement changes.
- **`newProductInfo`:** structurally identical, serialized as-is, to the current in-memory `Record<string, { purchaseUnit: string; purchaseCost: string; relationshipSteps: { unit: string; factor: string }[] }>` shape (confirmed by direct inspection of the current `useState` declaration). No restructuring, no new nested types.
- **Backward compatibility:** a draft written before this amendment simply lacks the field. The existing resume path already treats absent optional fields as empty/default — the same discipline the codebase already applies to every other optional draft field (e.g. `label`, `submissionId`). No migration script, no backfill, is required. This satisfies the amended Specification §5's own "additive, not narrowing" framing verbatim.
- **`firestore.rules`/`firestore.indexes.json`: no change required.** The existing `stockCountDrafts/{draftId}` block (already confirmed generic and Owner-only, no field-level restrictions) already covers a document with an additional field with zero modification — the rule authorizes the *document*, not an enumerated field set. Confirmed by direct reading of the existing rule text, re-verified this session.
- **Offline persistence's own storage footprint:** `persistentLocalCache` writes to the browser's IndexedDB — a genuinely new client-side storage surface for this app (confirmed: zero IndexedDB usage exists anywhere in the codebase today). This is a real, if standard, operational surface-area increase, flagged explicitly rather than silently absorbed, though it is not itself a schema or rules change. **`persistentLocalCache` is initialized once, on the single shared `db` instance in `lib/firebase.ts`, which every Firestore read/write in the entire tenant app uses — this makes it an app-wide setting by construction, not something scopable to Periodic Contagem alone at the SDK level.** This is the one point where full scope containment to Contagem is not technically possible, disclosed here rather than asserted away (§12 below).

## 9. Race-Condition Analysis

- **Debounce vs. in-flight write:** resolved by Finding D1's serialization fix — await before issuing.
- **Flush vs. ordinary save:** the flush must supersede (not race against) a pending ordinary debounce — firing a flush should cancel the pending debounced timer and issue its own immediate write instead, mirroring how `handleConfirmSave` already cancels the pending §4a timer before its own write. Naturally covered by the same serialization discipline as Finding D1, not a separate mechanism.
- **Resume vs. pending write:** the resume banner reads `periodicStockDraft` from the existing `onSnapshot` listener (unaffected by this amendment) — a pending local write does not block or race the resume read, since resume only happens on fresh mount, before any new write in that session has been scheduled. No new risk.
- **Finalization vs. draft write:** governed by the existing §4a/§4b discipline, which must be extended (not replaced) to also cancel/await the new flush's own write handle before `recordStockCount` is called — Finding C1's mitigation, restated.
- **Multi-tab/multi-device exclusion:** **the point requiring the most explicit care.** `persistentMultipleTabManager` synchronizes the *local cache* across multiple tabs *of the same browser, same user, same device* — it is not, and must not be represented as, multi-device or multi-user collaborative editing support. Using `persistentSingleTabManager` instead would force-fail persistence in any second tab, a worse outcome for the ordinary case of an Owner accidentally opening Contagem in two tabs on their own device — `persistentMultipleTabManager` is correct specifically *because* it avoids that failure mode, not because it introduces any concurrency feature. This distinction must be carried into the eventual Implementation Task Amendment so it is never mistaken for authorization to build multi-user editing, which Decision 38 item (f) and the amended Specification §5 both continue to explicitly exclude.

## 10. Failure-Mode Analysis

| Scenario | Flush helps? | Offline persistence helps? | Residual risk |
|---|---|---|---|
| Refresh | Yes — `pagehide` fires | N/A (network still available) | None beyond the un-fired-edit window |
| Back/navigation (in-app tab switch) | Not needed — a pending debounce timer already survives an in-app unmount today (confirmed: no cleanup cancels it); an actual browser-level Back leaving the app entirely is covered by the flush like any other navigation | N/A | None beyond the un-fired-edit window |
| Tab close | Yes — `pagehide` fires | Only if network was already down when the flush's write was attempted | None beyond the un-fired-edit window, or a flush write that fails silently over a bad connection |
| App/browser close | Yes | Same as above | Same as above |
| Battery failure | No — no JS execution opportunity | Yes, for anything already enqueued before failure | Anything not yet enqueued at the instant of failure — irreducible |
| Blackout | No | Yes, for anything already enqueued, *if* the device itself survives and the app is reopened | Same as above, plus total data loss if the device itself does not survive |
| Network loss | No (flush's own write cannot reach the server) | **Yes — offline persistence's primary purpose:** the write is durably queued locally and syncs automatically on reconnection | None once the write has been locally enqueued; the un-fired-edit window still applies if the edit hadn't yet triggered a write attempt |
| Network restoration | N/A | Automatic — queued mutations sync without explicit reconnection-handling code | None |
| Browser lifecycle event not firing (a known, documented risk — some browsers, especially older mobile Safari, do not reliably fire `beforeunload`, which is why `visibilitychange`/`pagehide` are preferred over it, matching `InitialStockCountView.tsx`'s own already-proven choice) | Degrades to "no better than today" for that specific browser/scenario | Still helps for anything already enqueued via the ordinary debounce, independent of whether the flush fired | The combined mechanism's floor is never worse than today; its ceiling depends on browser reliability, stated honestly rather than assumed uniform |
| Firestore local cache unavailable/full/initialization failure (e.g. private browsing mode, which commonly disables or restricts IndexedDB) | N/A | The SDK's documented behavior for this condition is to fail open — falling back to memory-only/network-only operation rather than throwing and blocking the app | Reduces to "no worse than today" for that session — must be explicitly, manually verified, not assumed (§11 below) |

## 11. Test Strategy

Extending the existing two-tier discipline (source-level regression guards; Firestore-emulator-backed tests) the Specification and Task already establish — no new test harness authorized or required:

1. Source-level guard: flush wired to both `visibilitychange` and `pagehide` for the periodic view specifically (own assertion, distinct from `InitialStockCountView.tsx`'s existing, unmodified equivalent — design precedent only, never shared code).
2. Source-level guard: the flush cancels any pending ordinary debounce and issues its own write, mirroring the existing `handleConfirmSave` cancel-before-write pattern.
3. Source-level guard: `scheduleDraftSave`'s write path awaits any in-flight write before issuing the next one (Finding D1).
4. Firestore-emulator-backed test: a draft including `newProductInfo` round-trips unchanged through write/read.
5. Firestore-emulator-backed test: a pre-existing draft written *without* `newProductInfo` is read back with the field correctly absent/empty, not erroring — proving backward compatibility, not merely assuming it.
6. `lib/firebase.ts`: verify `initializeFirestore` is called with `localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })`, and that this does not throw or regress any existing Firestore call site — run the full existing test suite (both tiers) unmodified as a regression gate.
7. Manual/documented verification (not automatable at either existing tier): private-browsing/IndexedDB-restricted behavior does not crash the app — confirmed by direct manual testing during implementation, flagged as a required verification step rather than a new automated-test requirement, since no existing test infrastructure in this repo can simulate a real browser's private-browsing storage restrictions.
8. `tests/initial-stock-confirmation.test.ts` unaffected — unchanged regression gate.

## 12. Scope Boundaries (Explicit Preservation, Checked Against the Amended Specification)

- **No Business Worth changes:** confirmed — nothing proposed touches `recordStockCount`, `normalizeStockCountItems`, `productValuationTotal`, or `measuredBusinessWorth`. FR-34's "never read while unconfirmed" invariant is untouched.
- **No change to confirmed `StockCount` semantics:** confirmed — every proposed change is scoped to the pre-confirmation draft path only.
- **No multi-user/multi-device collaboration:** confirmed and explicitly re-flagged (§9, Finding E1) given `persistentMultipleTabManager`'s easily-misread name.
- **No Initial Stock redesign:** confirmed — `InitialStockCountView.tsx` receives zero code changes under this assessment's proposal; its existing flush implementation is design precedent only, never shared code, matching the amended Specification's own standing §12 exclusion, unchanged.
- **No unrelated Firestore architecture changes:** the one genuine exception, flagged rather than silently absorbed — enabling `persistentLocalCache` on the shared `db` instance is, by the nature of the Firestore Web SDK's initialization API, an app-wide setting; there is no way to scope it to Contagem alone at the SDK level (§8). This is disclosed explicitly as the one point where full scope containment is not technically possible, not something this assessment resolves by asserting it away.

## 13. Final Rule 8 Verdict

**READY FOR IMPLEMENTATION.**

Every finding in this assessment (A–E, §5–§6) is either PASS or MAJOR-resolvable entirely within Rule 8 authority — none requires reopening or reinterpreting Decision 38 or the amended Specification, and none surfaced a new Product Architect decision. The one item genuinely worth a Product Architect's explicit awareness — that enabling Firestore's persistent local cache is necessarily app-wide, not Contagem-scoped, given the SDK's own initialization API — is a disclosed technical consequence of an already-authorized mechanism choice (Decision 38 item (c) explicitly authorizes "durable local/offline persistence... without limitation"), not an undecided business question requiring a new decision before an Implementation Task Amendment can proceed.

No STOP condition was triggered:
- No contradiction between Decision 38 and the amended Specification, or within the amended Specification itself.
- No new Product/business decision required.
- No change to the draft/confirmed model.
- No change to multi-user/multi-device scope (explicitly re-verified and re-flagged, not silently expanded).
- No change to Business Worth behavior.
- No change outside the Contagem durability boundary, except the one disclosed, unavoidable app-wide Firestore-initialization consequence noted above.
- No authorization beyond what Decision 38 already grants.
- No conflict found with any other existing governance artifact.

**No remaining Product Architect decision.** This assessment identifies no remaining blocker to drafting an Implementation Task Amendment.

## Verification Performed for This Assessment

- Re-read Decision 38 and the amended Specification completely and fresh from disk, this session.
- Re-read the current Implementation Task completely, fresh, as the direct structural precedent for this assessment's own verification discipline.
- Directly inspected: `apps/tenant/src/lib/firebase.ts`, `apps/tenant/src/components/PeriodicStockCountView.tsx` (`scheduleDraftSave`, `newProductInfo` declaration), and confirmed zero `visibilitychange`/`pagehide`/`beforeunload` usage outside `InitialStockCountView.tsx` (fresh `grep -rln`, this session).
- Verified `persistentLocalCache`/`persistentMultipleTabManager`/`initializeFirestore`/`FirestoreSettings.localCache` all exist in the actually-installed `firebase@12.16.0`/`@firebase/firestore@4.16.0` package, by direct inspection of `node_modules/@firebase/firestore/dist/index.d.ts` — not assumed from general SDK familiarity. Corrected one imprecise detail from the prior investigation: the settings field is `localCache`, not `cache`.
- Confirmed this document introduces no application code, `firestore.rules`, `firestore.indexes.json`, or test changes.
- Confirmed Decision 38 and the amended Specification remain byte-for-byte unmodified by this assessment (`git diff --stat` against each, run this session, empty).
- Confirmed no Implementation Task Amendment, Implementation Plan, or Implementation Authorization file was created.
- Confirmed only this Rule 8 Assessment file was created (`git status --porcelain`, run this session).
