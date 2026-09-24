Rule 8 Assessment

# PERIODIC CONTAGEM — STABLE MANUAL-ROW IDENTITY
# FORMAL RULE 8 ASSESSMENT

**Status:** 🟡 **DRAFT — awaiting Product Architect formal sign-off.** Not itself Implementation Authorization.

**Prepared by:** Claude (Lead Software Engineer role, this repository), synthesizing the full investigation and decision record from this engagement, against repository state `main` @ local HEAD `1acb00404d624504ee4c01cb4be27b59fa600272` (two commits ahead of `origin/main` @ `f3e9bdb`, unpushed at the time of drafting).

**Governing chain:**
```
Product Architect Acceptance — PA-01 through PA-16 (recorded)
        ↓
PA-01 Clarification Amendment (document-key identity, recorded)
        ↓
Migration-Timing Amendment (Option A, eager/resumable, recorded)
        ↓
Extended design investigation: Alternative C selected in principle;
tombstone semantics; deletion-redirect race proof; transactional
nextOrderIndex; writer/deletion-path closure audit
        ↓
THIS DOCUMENT — Formal Rule 8 Assessment
        ↓
Implementation Plan Amendment — NOT YET DRAFTED
        ↓
Implementation Authorization — NOT GRANTED
        ↓
Implementation — NOT AUTHORIZED
```

---

## 1. Scope of this assessment

Replacing Periodic Contagem's manual-row identity from position-derived keys (`manual:{index}`) to a stable, non-positional scheme, with resumable migration of existing drafts, coordinated deletion, and durable ordering — independent of catalog rows, Initial Stock Count, and the Business Worth Engine's own calculations, all confirmed unaffected throughout this engagement.

## 2. Findings — requirement by requirement

**Identity (PA-01, amended):** manual rows adopt Alternative C — deterministic destination keys for migrated legacy rows, random `crypto.randomUUID()` for genuinely new rows. Catalog rows (`catalog:{productId}`) unaffected. **Verified:** `crypto.randomUUID()` available natively, zero new dependency, given this project's ES2022 build target.

**Ordering (corrected from an initial, rejected timestamp-based design):** a durable integer `nextOrderIndex`, allocated transactionally against the periodic meta document — approved, replacing both the rejected synthetic-timestamp approach and the initially-considered but confirmed-insufficient local `useRef` counter precedent (`entrySequenceRef`/`sellingPriceEditSequenceRef`, `PeriodicStockCountView.tsx` L1715–1736, verified this engagement to provide no cross-client concurrency safety). Migrated rows: `orderIndex` = legacy numeric suffix. New rows: allocated via a genuine Firestore transaction, guaranteeing distinct values under concurrent clients — reasoned against documented Firestore transaction semantics, not yet emulator-executed. The counter is never reduced on row deletion.

**Migration:** eager, resumable, on draft resume (Migration-Timing Amendment, recorded). Each legacy row migrated via a single atomic transaction (read legacy → write destination with `migratedFromLegacyKey` provenance and derived `orderIndex` → delete legacy), self-correcting across interruption via existence-check-gated re-entry — reasoned against Firestore's documented atomicity guarantee.

**Deletion and tombstones:** `deleteManualRow` upgraded from today's fire-and-forget call to a coordinated transaction, with a corrected query-outside/verify-by-reference pattern (the client SDK, confirmed v12.16.0, does not support querying inside a transaction — the originally-proposed `tx.get(query(...))` design was invalid and has been replaced). Tombstones (`stockCountDrafts/periodic/tombstones/{key}`) provide deletion evidence and idempotency; five previously-open lifecycle items (repeated deletion, identity reuse, cross-row mistaken-identity, retention, malformed-tombstone handling) are resolved by this engagement's analysis, reproduced in §6.

**Writers, closed:** confirmed, repository-wide, by searching for every caller of the actual persistence functions and every reference to the collection path itself (not merely key-format patterns) — no Cloud Function, SuperAdmin tool, import/repair script, or other surface writes to this collection anywhere in this codebase. This repository has no `functions/` directory at all.

**Deletion paths, closed — three found, not two:** `recordStockCount`'s finalization cleanup (`AppContext.tsx` L6781–6782); `removePeriodicStockDraftItem` (L7765), single-row removal; and `clearPeriodicStockDraft` (L7960–7968), the "Começar de novo" bulk-discard action — newly discovered this engagement, confirmed key-format-agnostic but requiring a correction: it enumerates only the `items` subcollection, not a sibling `tombstones` subcollection, and must be extended to also delete tombstones, or orphaned tombstone records will accumulate whenever a draft is discarded mid-migration.

## 3. Affected files

| File | Change |
|---|---|
| `apps/tenant/src/types.ts` | Additive: `migratedFromLegacyKey`, `orderIndex` fields on `PeriodicStockDraftItem`; `nextOrderIndex` on the periodic meta document's type |
| `apps/tenant/src/context/AppContext.tsx` | New transactional `nextOrderIndex` allocation logic; upgraded `deleteManualRow` transaction; `clearPeriodicStockDraft` extended to also delete tombstones; `savePeriodicStockDraftItem` confirmed unaffected (key-format-agnostic) |
| `apps/tenant/src/components/PeriodicStockCountView.tsx` | 7 of the 18 previously-enumerated key-construction sites require a code change (the remainder already `sourceRowKey`-aware, structurally superseded by the new design, or confirmed unrelated); migration logic added to `handleResumeDraft`; `migrationStatus` gating added |
| `firestore.rules` | New tombstone subcollection rule (not yet drafted); optional key-format validation addition |
| Five identified test files | Two require substantive rework (their entire premise — position-derived identity mismatch — is superseded); three need minor fixture updates |

## 4. Implementation plan — staged, not authorized

1. **Phase 1 (defensive compatibility only):** update the 7 affected sites to tolerate `manual:{uuid}`-formatted keys without crashing or silently dropping data, with no UUID generation or migration active. Deploy and observe.
2. **Phase 1 acceptance:** 7-day observation period, zero reported defensive-tolerance failures.
3. **Phase 2 (full activation):** UUID generation for new rows; eager resumable migration with `orderIndex`/`migratedFromLegacyKey`; coordinated deletion with tombstones; `clearPeriodicStockDraft` extended for tombstone cleanup; `firestore.rules` updated.

## 5. Risks

| Risk | Status |
|---|---|
| Stale-array key collision (original root problem) | Resolved by design — position independent of key entirely |
| Reindex-save data loss | Eliminated structurally — no more reindex-save operation exists |
| Deletion/migration race | Design resolved in principle; pending emulator/concurrency verification — not yet proven by execution, only by reasoning against documented Firestore transaction semantics |
| Orphaned tombstones on draft discard | Identified this engagement, fix specified (§2), not yet implemented |
| Duplicate `migratedFromLegacyKey` provenance | A controlled integrity condition, not an accepted residual risk — requires fail-closed detection (already designed: the algorithm refuses to guess when more than one match is found) and a governed repair process for any instance that occurs, neither of which is itself optional or passively "accepted" |
| `nextOrderIndex` meta-document contention | Real but low-probability given this app's human-paced usage pattern — named, not hidden |
| Rollback after partial migration | Real, unmitigated by code reversal alone — Phase 1's defensive tolerance, deployed and verified before Phase 2, is the actual mitigation |

## 6. Test strategy

**Executable now, source-level, per this repository's established convention:** all 7 Phase 1 site fixes; migration transaction logic (idempotency, self-correction on interruption); deletion-redirect algorithm (retry-on-mismatch, retry-on-ambiguous — correcting a specific flaw found and fixed during this engagement); `orderIndex` derivation and legacy-suffix preservation; tombstone lifecycle idempotency; two of the five existing test files requiring substantive rework.

**Requires emulator (confirmed functional infrastructure, network-blocked in this sandbox specifically, not a repository gap):** genuine concurrent-transaction behavior for `nextOrderIndex` allocation and the deletion/migration race; real `firestore.rules` enforcement.

## 7. Rollback and recovery plan

Reverting application code does not reverse migrated Firestore data — stated plainly, not glossed over. Safe rollback requires Phase 1's defensive tolerance to already be live before Phase 2 ever begins — by that point, every client (old, Phase-1-floor, or Phase-2) already tolerates both key formats, so no draft becomes unreadable regardless of where a halt occurs. Interrupted migration self-corrects on next resume by design, requiring no separate recovery procedure.

## 8. Phase 1/Phase 2 boundaries

Phase 1: defensive tolerance only, no UUID generation, no migration. Phase 2: gated on Phase 1's 7-day, zero-failure observation window, and on the tombstone rules being drafted and reviewed.

## 9. Explicit authorization requirements — outstanding

An Implementation Plan Amendment (not yet drafted); `firestore.rules` drafting and security review for the tombstone subcollection; signed Implementation Authorization, scoped no broader than this Assessment. None of these exist. This Assessment does not grant any of them.

---

**This document is a Rule 8 Assessment, not Implementation Authorization.**
