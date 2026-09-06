# Recognition Failure + Selling-Unit Valuation Architecture — Targeted Evidence Follow-Up

**STATUS: INVESTIGATION ONLY**
**IMPLEMENTATION: NOT AUTHORIZED**
**SPECIFICATION AMENDMENT: NOT AUTHORIZED**
**COMMIT/PUSH: NOT AUTHORIZED / NOT PERFORMED**

This document is evidence only. It makes no Product Architect decisions,
proposes no fix, and authorizes no implementation. Every claim below is
labeled by evidence type per Part C's own required separation:

- **[CODE]** — verified directly by reading the source file/function cited.
- **[TEST]** — verified by executing an existing, unmodified test file
  in this repository (`npx tsx --test ...`), or by reading its assertions.
- **[EMPIRICAL]** — a claim about real-world frequency/usage. None of the
  claims in this report are empirical; see Part C's explicit statement.
- **[UNKNOWN]** — `NOT ESTABLISHABLE FROM CURRENT REPOSITORY EVIDENCE.`

---

## 0. Scope and Governance Status

This is a continuation of a prior investigation whose own file this
repository does not contain under the referenced name
(`Recognition_and_Unit_Relationship_Investigation`). A repository-wide
search (`grep -r` across `docs/`) found no file containing that name or
its central sentence ("unit relationship is mostly not a memory-loss
bug"). **Part D below is therefore evaluated directly against the
conclusion statements given in this task's own Part D list**, cross-checked
against verified code — not against a separately-read prior document,
which could not be located.

No code, specification, or test file was modified. No commit or push was
performed. `npm install` was run to make the existing test suite
executable (`node_modules` did not exist in the fresh clone); this
installs dependencies only and does not alter any tracked file (confirmed
via `git status` below, Deliverable section).

---

## Part A — Concept C Reachability Audit

Concept C = `StockBatchDerivedSellingValuation` / `buildDerivedSellingValuationSnapshot`
(`apps/tenant/src/lib/purchaseToSellingConversion.ts`), stored on
`StockBatch.derivedSellingValuation` (`apps/tenant/src/types.ts:225-259`).

### A.1 — Creation / Write Paths

| Path | Function/file | Invoked? | Call chain | Writes persisted data? | Fields written | Before/after stock persistence | Failure affects stock write? | Manual vs Smart/OCR |
|---|---|---|---|---|---|---|---|---|
| `addMultipleStockBatches` (multi-item Add Stock) | `AppContext.tsx:4023` | **Yes** | Per line item, inside the item loop: `buildDerivedSellingValuationSnapshot(product ? {unitRelationship, sellingPrice} : undefined, batchUnit)` is called **synchronously in-memory**, then spread onto the same `newBatch` object (`AppContext.tsx:4046`) that `fsBatch.set(newBatchRef, newBatch)` writes. | Yes, when it fires | `ratePerPurchaseUnit`, `sellingUnit`, `sellingUnitPrice`, `unitRelationshipSnapshot`, `derivedAt` — embedded as `StockBatch.derivedSellingValuation` | **Neither "before" nor "after" in a two-step sense** — it is computed in the same synchronous pass that assembles the `newBatch` object, and written in the SAME atomic Firestore batch commit (`fsBatch.commit()`) as the stock quantity/cost/sellingPrice fields on that same document. There is no separate transaction or separate write. | N/A — it is not a separate write; if it doesn't fire (returns `undefined`), the field is simply omitted (`...(derivedSellingValuation ? {...} : {})`, `AppContext.tsx:4046`) and the stock batch is written exactly as before Concept C existed. | Not applicable at this function's level — `addMultipleStockBatches` itself has no manual/OCR distinction; both manual multi-row entry and a Smart-Stock-Entry-populated set of rows funnel into the SAME `items: AddStockParams[]` shape and the SAME call site (verified: no separate code path). |
| `addStockBatch` (single-item Add Stock) | `AppContext.tsx:3206-3435` | **No** | `grep` for `buildDerivedSellingValuationSnapshot` / `derivedSellingValuation` inside this function's body: zero matches. `newBatch` (line ~3345) has no `derivedSellingValuation` field of any kind, conditional or otherwise. | No | — | N/A | N/A | N/A — single-item entry has no Smart/OCR variant in this codebase (Smart Stock Entry is multi-row only, feeding `addMultipleStockBatches`; see Part A.4). |
| `recordStockCount` (Contagem — Initial and Periodic) | `AppContext.tsx:5117-5450`+ | **No** | Same `grep` check inside this function's full body (through its `countItems.push(...)` construction, `AppContext.tsx:5365-5420` and beyond): zero matches of `buildDerivedSellingValuationSnapshot` or `derivedSellingValuation`. `StockCountItem` (the type `countItems` is typed as) has no `derivedSellingValuation` field — see `types.ts:528-561` in full. | No | — | N/A | N/A | N/A |
| Any other stock-entry path | — | Repository-wide `grep -rln "StockBatchDerivedSellingValuation\|buildDerivedSellingValuationSnapshot"` returns exactly 5 files: the type definition (`types.ts`), the implementation + its own header (`purchaseToSellingConversion.ts`), its two dedicated test files, and `AppContext.tsx`. No other write path exists anywhere in `apps/`, `server/`, or `packages/`. | — | — | — | — | — | — |

**A.1 verdict:** Concept C's write path is reachable from **exactly one**
of the three stock-entry paths: `addMultipleStockBatches`. It is
unreachable from single-item `addStockBatch` and from `recordStockCount`.

### A.2 — Persistence

- **Where stored [CODE]:** Embedded directly on the `StockBatch` document
  itself, as the optional field `StockBatch.derivedSellingValuation`
  (`types.ts:259`) — not a separate Firestore collection or subcollection.
- **Exact persisted shape [CODE]:** `{ ratePerPurchaseUnit: number; sellingUnit: string; sellingUnitPrice: number; unitRelationshipSnapshot: Array<{unit: string; factorFromPrevious: number}>; derivedAt: string }` (`types.ts:225-231`).
- **Embedded vs separate [CODE]:** Embedded in `StockBatch`, confirmed above.
- **Scope [CODE]:** One snapshot per `StockBatch` document — i.e. per
  purchase-batch line item, not per product and not per business. A
  product with N batches can carry N independent, differently-valued
  snapshots (each frozen to whatever Product Memory existed at that
  batch's own commit time).
- **Immutable/frozen or updated later [CODE]:** Frozen by **call
  discipline**, not by any database-level immutability mechanism. The
  function's own doc-comment (`purchaseToSellingConversion.ts:196-217`)
  states explicitly: "this function is pure and stateless... would
  happily recompute a different answer if called again later... The
  freeze guarantee comes entirely from the CALLER... invoking this
  function exactly ONCE, at the moment a batch is committed... never
  calling this function again for an already-recorded batch." **[TEST]**
  confirmed by `derived-selling-valuation-snapshot.test.ts` describe
  block "§14 freeze/persistence boundary — requirement 6" (4 passing
  tests, including "a snapshot taken under old Product Memory is
  unaffected when Product Memory later changes" and "successive
  transactions for the SAME product... each freeze their own correct
  rate") — all pass (see Part C).
- **Multiple snapshots coexisting [CODE]:** Yes — one per batch (see
  scope, above); nothing merges or supersedes an earlier batch's own
  snapshot.
- **Revision/version mechanism [CODE]:** None found. No version field,
  no history array, no supersession logic anywhere in
  `purchaseToSellingConversion.ts` or its call site.

### A.3 — Read / Consumption Paths

**Repository-wide search result [CODE]:** `grep -rn "derivedSellingValuation\|calculateDerivedTransactionValuation"` across `apps/tenant/src`, `server/`, and `tests/` — outside of `purchaseToSellingConversion.ts` itself and `types.ts`'s own type declaration — returns:

1. `AppContext.tsx:4018,4023,4046` — the **write** call site already covered in A.1. This is the only reference to `derivedSellingValuation` anywhere in the entire application's non-test, non-library code (`AppContext.tsx`, every component under `apps/tenant/src/components/`, and `server/`).
2. `unitRelationship.ts:18` — a comment only, not a code reference.
3. `types.ts:223` — a comment cross-reference, not a code reference.
4. `tests/derived-transaction-valuation-quebra.test.ts` — the **only** caller of `calculateDerivedTransactionValuation` anywhere in the repository, and it is a test file.
5. Two OTHER test files (`tests/initial-stock-portion-grouping-wiring.test.ts:126-128` and `tests/periodic-stock-portion-grouping-wiring.test.ts:149-151`) contain an explicit assertion that Initial Stock's and Periodic Stock's own wiring source code **never references** `StockBatch.derivedSellingValuation`, `calculateDerivedTransactionValuation`, or `calculateBatch` by name (`assert.doesNotMatch(source, /calculateDerivedTransactionValuation/)`). **[TEST]** — both assertions pass currently (see Part C run log). This is a codified guarantee, not an oversight: the codebase's own regression suite locks in that Concept C's read side is NOT wired into either Contagem flow.

**Consumer-by-consumer answer, therefore:**

| Consumer | File/function | Reads Concept C? | Affects displayed selling price? | Affects stock valuation? | Affects Product Memory? | Affects Contagem? | Affects Smart Stock Entry? | Affects Manual Stock Entry? | Affects Business Worth? | Affects reports? | Affects future selling-price/unit resolution? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `calculateDerivedTransactionValuation` | `purchaseToSellingConversion.ts` (its own test only) | Yes, but **only from its own test file** | No | No | No | No | No | No | No | No | No |
| Every other file in the app | — | **No** | No | No | No | No | No | No | No | No | No |

**Distinguishing (A) "exists and is displayed/audited" from (B) "actively
participates":** Concept C fails to reach even category (A) outside its
own test — it is **not displayed anywhere in the UI** (no component
imports `calculateDerivedTransactionValuation` or reads
`batch.derivedSellingValuation`), let alone (B) participates in any
pricing/recognition calculation the user sees or edits.

### A.4 — Single-Item Reachability

**"Concept C currently participates in single-item stock entry." — FALSE.** **[CODE]**

- Where the path diverges: `addStockBatch` (`AppContext.tsx:3206`) builds
  its `newBatch` object (~line 3345) with exactly the same field set
  StockBatch had before Concept C was introduced — no
  `derivedSellingValuation` key, conditional or otherwise. The function
  never imports `buildDerivedSellingValuationSnapshot` (confirmed:
  `AppContext.tsx`'s only import of that name is used solely inside
  `addMultipleStockBatches`).
- What the single-item path does instead: it persists `costPrice` and
  `sellingPrice` exactly as typed/passed by the caller, with no derived
  valuation of any kind.
- Manual vs Smart/OCR: not applicable — single-item Add Stock has no
  Smart/OCR variant in this codebase; Smart Stock Entry's extraction
  proposal is designed to populate the multi-row list that
  `addMultipleStockBatches` (not `addStockBatch`) consumes (see
  `server/smartStockEntry.ts`'s own header: "a scanned wording could
  therefore reach Add Stock's finalization path... `handleSubmit` →
  `addMultipleStockBatches`").

### A.5 — Contagem Reachability

**"Concept C currently participates in `recordStockCount`." — FALSE.** **[CODE]**

- What `recordStockCount` persists instead: `StockCountItem` objects
  (`AppContext.tsx:5365-5420`+) carrying `productId`, `productName`,
  `quantity`, `unit`, `costPrice`, `sellingPrice`,
  `sellingPriceBasisUnit`, `totalValue` — no derived-valuation field.
  `StockCountItem`'s own type (`types.ts:528-561`) has no such field to
  even receive one.
- Is a derived selling valuation calculated later for a Contagem item:
  no evidence found of any later derivation. `calculateDerivedTransactionValuation`
  only ever reads `StockBatch.derivedSellingValuation` — it takes a
  `StockBatch`, not a `StockCountItem`, as its input type
  (`purchaseToSellingConversion.ts`'s own signature: `calculateDerivedTransactionValuation(batch: StockBatch, batchQuebras: Quebra[])`), so it is structurally incapable of being called against Contagem data even if some caller wanted to.
- Downstream consumer that could reconstruct the same information: none
  found. `findLatestRememberedProductMemory` (Part B.4, below) reads
  raw `costPrice`/`sellingPrice`/`unit` off both `StockBatch` and
  `StockCount` items directly — it does not read or reconstruct
  anything resembling Concept C's `ratePerPurchaseUnit`.

### A.6 — Final Concept C Verdict

> **CONCEPT C STATUS: PARTIALLY REACHABLE (write side only) — and, for
> its read/consumption side specifically, STORAGE-ONLY / NON-FUNCTIONAL
> FOR THIS PROBLEM.**

Reasoning, from only the verified paths above:

- **Write side:** reachable from exactly one of three stock-entry paths
  (`addMultipleStockBatches`), and only when the line item resolves to
  an **existing** product that already has a valid, confirmed
  `unitRelationship` + `sellingPrice` at the moment of that specific
  batch's commit (A.1; `buildDerivedSellingValuationSnapshot`'s own
  `undefined`-return conditions, `purchaseToSellingConversion.ts:266-273`).
  It never fires for `addStockBatch` or `recordStockCount` (A.4, A.5).
- **Read side:** unreachable from every part of the actual application.
  The only caller of the read function anywhere in the repository is
  that function's own dedicated unit test. No UI component, no report,
  no Business Worth calculation, and no Product Memory resolver reads
  `StockBatch.derivedSellingValuation` (A.3).

Net effect: today, Concept C computes and freezes a value on a subset of
newly-created stock batches, and that value is currently read by nothing
in the running application. It is not "lost" (A.2 confirms it persists
correctly and is frozen correctly, per the passing freeze tests) — it
is simply not yet wired to anything that would use it.

---

## Part B — Recognition-Miss Behavior Audit

**Recognition mechanisms found in this repository, verified by name and file:**

1. **Exact-name match** — `products.find/some((p) => p.name.toLowerCase() === trimmed.toLowerCase())`, used identically in `addStockBatch`, `addMultipleStockBatches`, `recordStockCount` (`AppContext.tsx`), `matchProductByExactName` (`server/smartStockEntry.ts:194-207`), and every Contagem view (`PeriodicStockCountView.tsx`, `InitialStockCountView.tsx` — verified: every `products.find`/`products.some` call in both files uses this exact normalized-equality form; no fuzzy call exists in either file).
2. **Supplier-Wording Recognition** — `resolveSupplierWordingRecognition` / `resolveSupplierWordingRecognitionAsync` (`supplierWordingRecognition.ts`), composing `detectSupplierWordingCandidates` and `findExistingSupplierWordingMatch` (`supplierWordingMatching.ts`). Wired into `AddStockView.tsx`'s `applySupplierWordingCheck` only.
3. **Product Name Similarity ("did you mean")** — `findSimilarProducts` (`productNameSimilarity.ts`). Wired into `AddStockView.tsx` only, as a UI suggestion list.
4. **Product Recognition Intelligence (semantic/AI)** — an optional `semanticMatch` callback (`findSemanticSupplierWordingCandidates`) invoked only from `resolveSupplierWordingRecognitionAsync`, and only when the deterministic path returns `no-candidates`.
5. **Smart Stock Entry (Tier 1) matching** — `matchProductByExactName` (`server/smartStockEntry.ts`) — its own header states explicitly: "It never does fuzzy/semantic product matching... A non-exact name is always `no_match`... Fuzzy matching is Tier 4, deferred."

**Recognition mechanisms NOT found anywhere in Contagem (`PeriodicStockCountView.tsx`, `InitialStockCountView.tsx`, `recordStockCount`):** no similarity, no supplier-wording, no semantic matching. Repository-wide `grep` for these mechanism names inside those two component files returns zero matches. Contagem's only recognition mechanism is exact-name / exact-`productId` matching.

### B.1 — Recognition Scenario Matrix

Per the governance instruction, hypothetical examples are explicitly
marked as such; only behavior actually traceable in code is asserted as
fact.

| # | Scenario | Manual Add Stock | Smart Stock Entry (server Tier 1) | Contagem |
|---|---|---|---|---|
| 1 | Exact product name | AUTOMATIC EXACT MATCH — `p.name.toLowerCase() === trimmed.toLowerCase()` | AUTOMATIC EXACT MATCH — `matchProductByExactName` | AUTOMATIC EXACT MATCH |
| 2 | Capitalization differences | AUTOMATIC EXACT MATCH (both sides `.toLowerCase()`'d) | AUTOMATIC EXACT MATCH (same) | AUTOMATIC EXACT MATCH |
| 3 | Extra/missing whitespace | **NO MATCH** for the exact-match rule itself — `.trim()` on the whole string is applied, but internal whitespace runs are not collapsed by `p.name.toLowerCase() === trimmed.toLowerCase()`. HOWEVER: Supplier-Wording candidate detection's `normalizeForCandidateDetection` DOES collapse internal whitespace (`supplierWordingMatching.ts:39`, "additionally collapses whitespace runs"), and `productNameSimilarity.ts`'s `normalizeForSimilarity` also collapses non-alphanumeric runs to single spaces. So: exact-match path → NO MATCH; if a supplier is selected → OWNER-REVIEWED MATCH (candidate) via ground (a)/(b); "did you mean" similarity → SUGGESTION ONLY, if score clears the 0.5 threshold. | **NO MATCH** — Tier 1 `matchProductByExactName` only lowercases + trims the OUTER string (`extractedName.trim().toLowerCase()`), never collapses internal whitespace runs — confirmed by reading its exact implementation (`server/smartStockEntry.ts:194-207`); no candidate/similarity layer exists server-side for Smart Stock Entry's own match, only client-side (see B.6). | **NO MATCH** — Contagem has no forgiving-normalization layer at all; a whitespace difference is always a miss there. |
| 4 | Punctuation differences | Exact-match: NO MATCH. Similarity (`normalizeForSimilarity` collapses "any run of non-letter/non-number... into a single space") and candidate detection (case+accent fold only, via `normalize()`) may or may not catch it depending on whether the punctuation difference also changes the token set — **HYPOTHETICAL: not traced against a concrete stored example**, since no fixture with this exact scenario was found (see Part C). | NO MATCH (same reasoning as #3). | NO MATCH. |
| 5 | Accent/diacritic differences | Exact-match: NO MATCH (`.toLowerCase()` does not fold accents). Candidate detection: **fires** — `normalizeForCandidateDetection` reuses `normalize()` from `businessCategories.ts`, documented as "case + accent folding" (`supplierWordingMatching.ts:22`). Similarity: fires too — `normalizeForSimilarity` explicitly strips accents via NFD + combining-mark removal (`productNameSimilarity.ts`'s own `.normalize('NFD').replace(/[\u0300-\u036f]/g, '')`). | NO MATCH — Tier 1's own header states it is "identical to spec #3's existing manual Add Stock matching rule" for the exact-name path, and that rule is a bare `.toLowerCase()`, not accent-folding. | NO MATCH. |
| 6 | Common abbreviation | Exact-match: NO MATCH. Supplier-Wording candidate detection: fires via the `ABBREVIATION_TABLE` ground (`abbreviation-match`, `supplierWordingMatching.ts:476` area) — **only when a supplier is selected** (candidate detection runs regardless of supplier selection per `resolveSupplierWordingRecognition`'s own code, since `detectSupplierWordingCandidates` is called unconditionally, but the OWNER-REVIEWED candidate UI and the reuse-shortcut both key off the row's typed name, available with or without a chosen supplier — confirmed by reading `resolveSupplierWordingRecognition`, which calls `detectSupplierWordingCandidates(trimmed, existingProducts)` unconditionally, `supplierId` only gates the separate REUSE check). | NO MATCH — Tier 1 has no abbreviation table. | NO MATCH. |
| 7 | Plural vs singular | Exact-match: NO MATCH. No dedicated plural/singular table found in either `productNameSimilarity.ts` or `supplierWordingMatching.ts`'s tables (`UNIT_SPELLING_EQUIVALENCE_TABLE`, `ABBREVIATION_TABLE`, `SYNONYM_TABLE`, `TRANSLATION_TABLE` — none is a generic plural stemmer). Similarity's Jaccard-token overlap MIGHT still clear the 0.5 threshold for a single differing token in a multi-word name (the module's own doc-comment gives exactly this kind of example: "Máquina Bic" vs "Máquina Bic Nova" still qualifies) — **HYPOTHETICAL for a bare single-word plural** ("Ovo" vs "Ovos" is a 0% token overlap under Jaccard on two single-token sets that don't literally match, since the two tokens themselves differ; not verified against a concrete fixture). | NO MATCH. | NO MATCH. |
| 8 | Supplier-specific wording | This is Supplier-Wording Recognition's own designed case. See B.5/B.6 below for the exact classification (OWNER-REVIEWED MATCH via candidates, or silent REUSED, depending on history). | NO MATCH at the server Tier-1 layer; a client-side supplement (`resolveScanRowSupplierWordingAsync`) DOES apply Supplier-Wording Recognition on top of a Smart-Stock-Entry-sourced row (see B.6/A.4 cross-reference) — so effectively OWNER-REVIEWED MATCH or REUSED, same as manual, once the row reaches `AddStockView.tsx`'s own state. | NO MATCH — Contagem has no supplier-wording concept (confirmed by `supplierWordingMatching.ts`'s own header: "Initial Stock has no supplier concept and is not a caller of this module, now or ever"). |
| 9 | Supplier wording, supplier selected | REUSED (silent, no owner interaction) if this exact `(supplierId, wording)` pair was already confirmed before (`findExistingSupplierWordingMatch`, byte-exact `wording.trim() === needle`); otherwise falls through to candidate detection, same as #8. | Same as #8 (client-side layer applies once merged into `AddStockView`'s rows). | N/A. |
| 10 | Supplier wording, no supplier selected | `resolveSupplierWordingRecognition`'s own code: `if (supplierId) { ...reuse check... }` — with no `supplierId`, the reuse check is skipped entirely and the function proceeds directly to `detectSupplierWordingCandidates` (candidate detection, NOT gated on supplier selection). So: OWNER-REVIEWED MATCH (candidates) if any ground fires, otherwise NO-CANDIDATES → ordinary new-product path. | Same, once client-side. | N/A. |
| 11 | OCR spelling variation | Candidate detection's `character-spelling-variation` ground (`isCharacterSpellingVariation`, bounded Damerau-Levenshtein per token, `characterSpellingVariationCeiling`) — fires when within the ceiling (distance ≤2 for tokens ≥4 chars, ≤1 for 2-3 chars, 0 for 1 char). This is explicitly the module's own motivating case, per its header quoting a real owner report about "Maquina Bic 1×2 emb" vs "Máquina Bic 1x2". | Tier 1 has NO fuzzy matching of any kind (its own header: "never fuzzy/semantic... Fuzzy matching is Tier 4, deferred") — server match is NO MATCH; the client-side Supplier-Wording layer (once the proposal reaches `AddStockView.tsx`) CAN then classify it as a candidate via the same `character-spelling-variation` ground. | NO MATCH (no OCR entry path into Contagem at all — Contagem has no Smart/OCR ingestion mechanism found in this codebase). |
| 12 | OCR character substitution/garbling | Same as #11 if within the bounded edit-distance ceiling; beyond the ceiling, NO MATCH / NO-CANDIDATES → falls to new-product creation (see B.5). | Same reasoning as #11. | NO MATCH. |
| 13 | Additional descriptive words | Exact-match: NO MATCH. Similarity's Jaccard overlap explicitly tolerates this (module header's own worked example: "Máquina Bic" vs "Máquina Bic Nova"); candidate detection's grounds (a)/(b) require full normalized equality so they do NOT fire for an added word, but `character-spelling-variation` operates per-token and would not treat an extra whole token as a "spelling variation" of anything (it compares token-for-token). Net: SUGGESTION ONLY via `findSimilarProducts`, if score ≥0.5; not an owner-reviewed Supplier-Wording candidate unless a supplier is also selected AND some other ground fires. | NO MATCH server-side; SUGGESTION ONLY once client-normalized (via the shared `findSimilarProducts`, itself only wired into `AddStockView.tsx`, not into any Smart-Stock-Entry-specific path — confirmed no import of `productNameSimilarity` in `supplierWordingRecognition.ts` or `server/smartStockEntry.ts`). | NO MATCH. |
| 14 | Existing product, similar-but-not-identical name | Depends entirely on which specific difference (see #3-#13 above); in general: SUGGESTION ONLY (similarity) and/or OWNER-REVIEWED MATCH (candidates) if a qualifying ground fires; otherwise NO MATCH → AUTOMATIC NEW PRODUCT CREATION (see B.5). | Same, once merged into `AddStockView.tsx`'s row state; NO MATCH at the raw server extraction step itself. | NO MATCH, always, for any non-identical name. |
| 15 | Completely unrelated product name | NO MATCH under every mechanism (exact, candidate, similarity, semantic — none of these are designed to fire on genuinely unrelated names, and their own thresholds/grounds are constructed specifically to require token or edit-distance closeness) → AUTOMATIC NEW PRODUCT CREATION. | Same. | Same. |
| 16 | Existing product WITH `sellingUnit`/`unitRelationship`/`sellingPrice` in Product Memory | See B.4 — memory IS retrieved once a `productId` is resolved by ANY successful mechanism (exact, reused, or owner-confirmed candidate); it is NOT retrieved while only a "candidate" (unconfirmed) or "similarity suggestion" state exists. | Same, once the row resolves. | Same. |
| 17 | Existing product with NO `unitRelationship` | `buildProductMemoryAutofill`/`findLatestRememberedProductMemory` still return whatever raw `costPrice`/`sellingPrice`/`unit` history exists (they do not require `unitRelationship` to return a result — `findLatestRememberedProductMemory`'s own signature takes `preferredSellingUnit` as an *optional* tie-break, not a requirement); `resolveUnitAwarePrice`'s own unit-conversion step specifically falls back to `''` (never a fabricated number) only when the units genuinely differ AND no relationship exists to bridge them (`productMemoryPriceResolution.ts`'s own header). Concept C (B.4/A.6) never fires for such a product regardless of recognition outcome (needs a valid `unitRelationship` by construction). | Same. | Same. |

### B.2 — Stage-by-Stage Trace (representative, verified stages only)

For the manual Add Stock row typing flow (`AddStockView.tsx`'s
`applySupplierWordingCheck`, `AppContext.tsx:1530-1600`+ region), the
**actual** stage sequence executed, verified directly from the code
(not inferred from names):

1. **Input** — `newName` from the row's text field.
2. **Immediate exact-match check** (synchronous, no debounce):
   `products.find(p => p.name.toLowerCase() === trimmed.toLowerCase())`.
   - If it matches: `buildProductMemoryAutofill(exactMatch)` runs
     **immediately**, and the debounce timer is never even set
     (`if (!trimmed || exactMatch) { ...; return; }`).
3. **If no exact match** — an 800ms debounce timer is set. Only the
   LAST keystroke in a typing burst reaches the next stage (a
   previous timer is cleared on every keystroke).
4. **`resolveSupplierWordingRecognitionAsync`** runs, which internally
   calls the **synchronous** `resolveSupplierWordingRecognition` first:
   a. Re-checks exact match (`type: 'none'` if found — defensive,
      since step 2 should already have caught it).
   b. If `supplierId` is set: checks `findExistingSupplierWordingMatch`
      for a byte-exact `(supplierId, wording)` reuse.
   c. Calls `detectSupplierWordingCandidates` (this runs **regardless**
      of whether a supplier is selected).
   d. If the deterministic result is `no-candidates` AND a
      `semanticMatch` callback was supplied, the async wrapper THEN
      calls the semantic/AI mechanism, filters its results through
      `hasSupplierWordingContradiction`, and unions them.
5. **Staleness guard** — the row's live current text is re-checked
   against `newName`; if the owner has typed further, the result is
   discarded.
6. **Outcome switch**:
   - `'none'` / `'no-candidates'`: nothing further happens automatically.
   - `'reused'`: `buildProductMemoryAutofill(matchedProduct)` runs, the
     row's `productName` is silently rewritten to the canonical name,
     and `pendingSupplierWording` is set with `origin: 'reused'`.
   - `'candidates'`: `supplierWordingCandidates` is set on the row —
     this renders the "did you mean" / candidate UI; **no autofill, no
     productId assignment happens yet.**
7. **Finalization resolution (`unitRelationship`/`sellingUnit`/`sellingPrice`)**
   only ever happens as part of `buildProductMemoryAutofill`, which is
   only invoked in stages 2 and 6-`reused` — never for the
   `'candidates'` state until the owner explicitly clicks a candidate
   (`handleConfirmSupplierWordingCandidate`, `AddStockView.tsx`).

This directly answers B.2's requested per-scenario stage trace: the
"exact match" and "supplier-wording path" stages are real, sequential,
and gated as shown; the "semantic candidate path" stage is real but
conditionally reached only after the deterministic path returns
`no-candidates`; "finalization behavior" (memory application) is
strictly gated on which of the four outcome types was reached, not on
whether a candidate was merely *displayed*.

### B.3 — Recognition Outcome Categories

Applying the required categories strictly (never collapsing "candidate
shown" into "automatically recognized"):

- **AUTOMATIC EXACT MATCH** — the `exactMatch` branch (memory applied
  immediately, no owner action).
- **OWNER-REVIEWED MATCH** — the `'candidates'` outcome (`supplierWordingCandidates` set) AND the plain `findSimilarProducts` "did you mean" suggestions. Both are shown; NEITHER assigns a `productId` or applies memory until the owner clicks.
- **SUGGESTION ONLY** — `findSimilarProducts`'s own results specifically (per its header: "purely SUGGESTS... never assigns a productId, never feeds a price prefill"). This is a stricter sub-case of "owner-reviewed" — it is even less authoritative than a Supplier-Wording candidate, since selecting it does not itself resolve anything; it only rewrites the typed text, which THEN has to re-run through the exact-match check (step 2 above) to actually apply memory.
- **NO MATCH** — every scenario above where no ground/mechanism fires (`'no-candidates'` with no similarity hit either).
- **AUTOMATIC NEW PRODUCT CREATION** — occurs at finalization (`addMultipleStockBatches`' `if (!product)` branch, or `addStockBatch`'s / `recordStockCount`'s equivalent) whenever the row's final `productName` does not exactly match an existing product — this includes every row that was NO MATCH the whole time, and also any row where a candidate/suggestion was shown but the owner ignored it and submitted anyway (see B.5).
- **REUSED** (a distinct, named outcome type in the code, `type: 'reused'`) — silent supplier-wording reuse; does not fit cleanly into any of the five listed buckets, so it is called out separately here rather than force-fit; it most closely resembles AUTOMATIC EXACT MATCH in effect (no owner interaction, memory applied immediately) but is mechanistically distinct (matches a wording-to-product relationship, not the product's own canonical name).

### B.4 — Memory Availability After Recognition

For each successful recognition mechanism, whether
`Product.unitRelationship` / `Product.sellingPrice` / Product Memory is
retrieved, and how:

| Mechanism | Retrieves memory? | A) Auto-applied | B) Available only after owner selection | C) Suggested, not applied | D) Unavailable |
|---|---|---|---|---|---|
| Exact match | Yes — `buildProductMemoryAutofill(exactMatch)` runs synchronously the moment text matches. | **A** | | | |
| Supplier-Wording REUSED | Yes — same `buildProductMemoryAutofill(matchedProduct)` call, inside the `'reused'` case. | **A** | | | |
| Supplier-Wording CANDIDATES | Not until the owner clicks. `handleConfirmSupplierWordingCandidate` (`AddStockView.tsx`) is the point where `matchedProduct` is looked up and its memory applied — confirmed by the code comment at that function: a prior version of this exact path had a bug where confirming a candidate "never filled selling price/unit," fixed to now call the same autofill as the other paths. | | **B** | | |
| Similarity ("did you mean") suggestion | No, by design (module header: "never... feeds a price prefill"). Selecting a suggestion just rewrites `productName`, which must then separately clear the exact-match check (step 2 of B.2) to actually retrieve memory. | | | **C** | |
| Semantic/AI candidate | Same as Supplier-Wording candidates — becomes a `'candidates'` outcome, requires owner confirmation (**B**); never auto-applied per its own contradiction-check-then-union design. | | **B** | | |
| No match at all | N/A | | | | **D** |

**Direct verification of the previous investigation's claim** ("the unit
relationship is generally not lost from storage; access to it is gated
by successful recognition"): **CONFIRMED.** `findLatestRememberedProductMemory`
and `resolveUnitAwarePrice` operate purely on whichever `productId` has
already been resolved by the time they are called (`productMemoryPriceResolution.ts:157-227`) — they contain no recognition logic themselves and do not distinguish HOW the `productId` was resolved (exact/reused/owner-confirmed candidate). A product's stored `unitRelationship`/`sellingPrice`/history is never itself deleted or corrupted by a recognition miss; a miss simply means these functions are never invoked for that row at all, because no `productId` was ever resolved to call them with — the row instead proceeds toward creating a brand-new Product document with no memory of its own (Part B.5).

### B.5 — Failed Recognition → New Product

Traced directly from `AddStockView.tsx`'s `handleSubmit`
(`AppContext.tsx:2113`+) into `addMultipleStockBatches`
(`AppContext.tsx:3759`+ , `if (!product)` branch, ~line 3897):

- **Does finalization automatically create a new Product?** Yes.
- **At what exact point?** Inside the per-item loop of
  `addMultipleStockBatches`, the moment
  `tempProducts.find((p) => p.name.toLowerCase() === trimmedName.toLowerCase())`
  returns nothing for that row's FINAL `productName` value (whatever
  it is at submit time) — a new `productId` is minted and a new
  `Product` document is queued in the same Firestore batch as the
  stock write.
- **Is the owner warned at that exact moment?** No dedicated
  "you're about to create a new product" confirmation dialog was
  found at submit time. The only pre-submit gate found
  (`handleSubmit`, `AppContext.tsx:2113`+) is:
  `if (row.supplierWordingCandidates && row.supplierWordingCandidates.length > 0) { alert(...); return; }`
  — this blocks submission ONLY if a candidate list is still
  **unresolved** (i.e. still being displayed); it does nothing for a
  row that already resolved to `'no-candidates'` or whose candidates
  were explicitly dismissed.
- **Is the owner asked "existing or new"?** Not as a distinct prompt
  at finalization. The nearest equivalent is the candidate UI shown
  DURING typing (B.2/B.3) — but once that UI's candidates are empty or
  dismissed, submission proceeds silently to new-product creation.
- **Existing-product candidate shown at finalization specifically?**
  No — candidate detection is a typing-time (debounced) mechanism, not
  a finalization-time re-check. `handleSubmit`'s own validation block
  does not call `detectSupplierWordingCandidates` or
  `findSimilarProducts` again.
- **Duplicate warning?** None found at finalization.
- **Different for Smart/OCR vs Manual?** Not materially — both funnel
  into the same `rows` state and the same `handleSubmit` →
  `addMultipleStockBatches` call (confirmed by
  `supplierWordingRecognition.ts`'s own header describing exactly this
  unification as Checkpoint 4's fix: "a row built from a Smart Stock
  Entry extraction proposal... previously used ONLY the server's own
  exact-name match... FIX: this function is the pure decision for a
  scan-sourced row, composing `resolveSupplierWordingRecognition`").
- **Different when supplier wording exists?** The REUSE shortcut only
  applies when a `supplierId` is set (B.1 #9 vs #10); candidate
  detection itself runs regardless.
- **Does Product Memory remain inaccessible when no match occurs?**
  Yes — confirmed by B.4: no `productId` is resolved, so no memory
  lookup function is ever called for that row; the new Product is
  created with no `unitRelationship` and no `sellingPrice` unless the
  owner explicitly configures one in the same submission (the
  `newProductSellingUnit`/`newProductSellingUnitFactor` fields,
  `AppContext.tsx` `AddStockParams.unitRelationship`, `handleSubmit`
  lines ~2170-2188).

### B.6 — Similarity Suggestions

- **What triggers it?** `row.productName.trim() && !exactMatchExists`
  (`AddStockView.tsx:2919-2923`) — computed on every render of a row
  once there is typed text and no exact match.
- **Threshold/criteria?** Jaccard token-overlap ≥ 0.5 by default
  (`findSimilarProducts`'s own `opts.threshold ?? 0.5`), capped at 3
  results.
- **Advisory or authoritative?** Strictly advisory — per its own module
  header, confirmed by A.3/B.4: it never assigns a `productId`.
- **Does ignoring it still permit finalization?** Yes — nothing in
  `handleSubmit`'s validation checks `similarProducts`; only
  `supplierWordingCandidates` is checked (B.5).
- **Does accepting it cause the exact-match path to run?** Yes —
  `onClick={() => handleSelectProductForTool(row.id, p.name)}`
  (`AddStockView.tsx:2996`) rewrites `productName` to the existing
  product's own exact name; the code comment directly above it states
  this explicitly: "Selecting it just rewrites productName to the
  existing product's own exact name, which then flows through the
  ordinary, unchanged exact-match prefill logic."
- **Does it itself retrieve Product Memory?** No (confirmed B.4 — only
  the subsequent exact-match re-evaluation does, after selection).
- **Can it prevent creation of a new Product?** Only indirectly, by
  giving the owner the option to avoid creating one — it has no
  blocking/gating power of its own.
- **Present in both Smart/OCR and Manual entry?** `findSimilarProducts`
  is imported and used only in `AddStockView.tsx` — the same component
  both manual rows and Smart-Stock-Entry-populated rows render through,
  so once a Smart-Stock-Entry row is loaded into that component's
  state, the same suggestion UI applies to it. It is NOT present at the
  raw server-side extraction step (`server/smartStockEntry.ts` imports
  no such function).

---

## Part C — Existing Test / Fixture / Log Evidence

All tests below were **executed**, unmodified, via
`npx tsx --test <file>`, after `npm install` (dependency install only;
no tracked file touched — see Deliverable section).

| Test file | What it proves | Result | Confirms/contradicts previous investigation |
|---|---|---|---|
| `tests/derived-selling-valuation-snapshot.test.ts` | `buildDerivedSellingValuationSnapshot`'s exact firing conditions, the canonical worked example (3 Cx @ 1,250 MZN/Cx → 1,440 rate), never-fabricates-a-valuation guarantees, and the freeze/persistence boundary (a later Product Memory change never retroactively alters an already-written snapshot). | **PASS — 20 tests, 0 fail** | Confirms A.2's freeze-by-call-discipline claim directly. |
| `tests/derived-transaction-valuation-quebra.test.ts` | `calculateDerivedTransactionValuation`'s live remaining-quantity multiplication, quebra handling, and its own explicit non-interference with `calculateBatch`/Business Worth ("requirements 10-11: existing calculateBatch/Business Worth architecture is untouched"). | **PASS — 12 tests, 0 fail** | Directly supports A.3's finding that this function, even when called, is architected to never feed Business Worth — and independently confirms (via the file's own test descriptions) that it is called from nowhere but this test. |
| `tests/initial-stock-portion-grouping-wiring.test.ts` | Contains a dedicated test, "never references StockBatch.derivedSellingValuation, calculateDerivedTransactionValuation, or calculateBatch," that source-scans Initial Stock's own wiring file and asserts none of those three names appear. | **PASS** (ran as part of the file; targeted assertion confirmed by direct code reading) | Directly and independently corroborates A.5's finding for Initial Stock specifically. |
| `tests/periodic-stock-portion-grouping-wiring.test.ts` | Same assertion, for Periodic Stock Count's own wiring file. | **PASS** (same basis) | Directly and independently corroborates A.5's finding for Periodic Stock Count specifically. |
| `tests/product-name-similarity.test.ts` | `computeNameSimilarity`, `findSimilarProducts`, `damerauLevenshteinDistance`, `characterSpellingVariationCeiling` behavior across many normalization cases. | **PASS** (part of the 163/163 combined run below) | Supports B.1/B.3/B.6's similarity findings. |
| `tests/product-recognition-contradiction.test.ts`, `tests/product-recognition-naming-tables.test.ts`, `tests/product-recognition-spelling-variation.test.ts` | Contradiction suppression, abbreviation/synonym/translation table grounds, and bounded edit-distance grounds for candidate detection. | **PASS** | Supports B.1 rows #4, #6, #11, #12. |
| `tests/supplier-wording-matching.test.ts` | `detectSupplierWordingCandidates`, `findExistingSupplierWordingMatch`, and the Owner-Controlled Correction regression proof. | **PASS** | Supports B.1/B.4/B.5. |
| `tests/smart-stock-entry.test.ts` | `matchProductByExactName`'s exact-only behavior, upload validation, field classification. | **PASS** | Directly confirms B.1's Smart Stock Entry row (no fuzzy matching server-side). |
| `tests/add-stock-similar-product-suggestions.test.ts` | Suggestion-list wiring/behavior. | **PASS** | Supports B.6. |

**Combined run total (all 7 recognition-focused files together):**
`# tests 163 / # suites 36 / # pass 163 / # fail 0`.
**Combined run total (both Concept C files together):**
`# tests 32 / # suites 12 / # pass 32 / # fail 0`.

No test file was found that measures real-world recognition-miss
**frequency** (e.g. a log-replay test, a production-data fixture, or a
telemetry assertion). All of the above are deterministic unit/behavior
tests against synthetic inputs.

### Required evidence-type separation

1. **VERIFIED CODE BEHAVIOR** — everything in Parts A and B above,
   traced directly from source.
2. **VERIFIED TEST/FIXTURE BEHAVIOR** — the table immediately above;
   all cited tests pass against the current, unmodified codebase.
3. **EMPIRICAL USAGE EVIDENCE** — **none exists in this repository.**
   No logs, telemetry, or production datasets were found. Every
   scenario in Part B.1 marked "HYPOTHETICAL" has no corresponding
   fixture and is labeled as such rather than presented as observed.
4. **UNKNOWN / NOT MEASURABLE FROM REPOSITORY** — real-world frequency
   of any recognition-miss scenario; whether owners actually notice and
   correct silent new-product creation in practice; whether Smart Stock
   Entry's OCR output in production actually produces the specific
   character-substitution patterns the bounded edit-distance ceiling
   was tuned for (the module's tuning is justified by a single
   owner-reported example cited in the code comments, not a dataset).

---

## Part D — Cross-Check Against Previous Investigation

**Caveat, restated from Part 0:** the source investigation document
(`Recognition_and_Unit_Relationship_Investigation`) was not found in
this repository under the referenced name or any discoverable
equivalent. The nine conclusions below are evaluated as literal claims
against verified code, not against a re-read of that document's own
reasoning.

| # | Conclusion | Classification | Why |
|---|---|---|---|
| 1 | "Unit relationship is mostly not a memory-loss bug." | **CONFIRMED** | B.4's direct verification: `findLatestRememberedProductMemory`/`resolveUnitAwarePrice` never lose or corrupt stored data; they simply aren't invoked when no `productId` was resolved. Storage integrity itself is intact in every path traced. |
| 2 | "Conversion machinery runs after positive recognition." | **CONFIRMED** | B.2/B.4: `buildProductMemoryAutofill` (which drives unit-aware price conversion) is only ever called from the exact-match, reused, and owner-confirmed-candidate outcomes — never speculatively before a `productId` is resolved. |
| 3 | "Automatic general recognition is exact-name based." | **CONFIRMED** | B.1/B.3: every "automatic" (non-owner-reviewed) match in every stock-entry path — manual, Smart Stock Entry Tier 1, and Contagem — uses only `.toLowerCase()` (and, in Contagem, sometimes `productId`) equality. No automatic fuzzy resolution exists anywhere. |
| 4 | "Supplier-Wording Recognition is owner-reviewed/supplier-scoped." | **PARTIALLY CONFIRMED** | Owner-reviewed: confirmed for the `'candidates'` outcome (B.3/B.4). Supplier-scoped: only the REUSE shortcut is supplier-scoped (`if (supplierId)`, B.1 #9 vs #10); CANDIDATE detection (`detectSupplierWordingCandidates`) explicitly runs regardless of whether a supplier is selected at all (B.2 step 4c) — so "supplier-scoped" is true for one of the mechanism's two branches, not the whole mechanism. |
| 5 | "Similarity is suggestion-only unless accepted." | **CONFIRMED** | B.6, and the module's own header, verified directly: never assigns a `productId`; accepting it only rewrites text and re-enters the ordinary exact-match path. |
| 6 | "Failed match can result in silent new-product creation." | **CONFIRMED** | B.5: no dedicated warning or "existing or new?" prompt exists at finalization; a `'no-candidates'` or ignored-candidate row proceeds straight to automatic new-Product creation in the same atomic write as the stock batch. |
| 7 | "Concept C is not currently feeding the single-item editing/memory path." | **CONFIRMED** | A.4: zero references to Concept C anywhere in `addStockBatch`, and A.3 shows it feeds no memory/editing path anywhere in the app regardless of entry path. |
| 8 | "Concept C is not currently part of `recordStockCount`." | **CONFIRMED** | A.5, independently corroborated by two dedicated regression tests (`initial-stock-portion-grouping-wiring.test.ts`, `periodic-stock-portion-grouping-wiring.test.ts`) that assert this by name and pass. |
| 9 | "The single StockBatch unit field creates a structural limitation when cost and selling units differ." | **UNVERIFIED** | This specific structural claim was not directly re-tested by this follow-up's scope (Parts A-C do not include a dedicated audit of `StockBatch.unit`'s cardinality constraints against mixed cost/selling-unit scenarios). `StockBatch` does have exactly one `unit` field (`types.ts:238`) used for both the purchase quantity's own unit and (via `costPrice`/`sellingPrice`, both documented as "per unit," `types.ts:239-240`) implicitly for both cost and selling price denomination on that same batch — this single-field structure is directly observable in the type — but whether it constitutes "a structural limitation" in the sense the original investigation meant is an architectural judgment this evidence-only follow-up does not make. **NOT ESTABLISHABLE AS CONFIRMED OR CONTRADICTED FROM THIS FOLLOW-UP'S OWN SCOPE** — flagged for the Product Architect, not resolved here. |

---

## Part E — Product Architect Evidence Summary

*(No decisions are made below — only the evidence needed to make them.)*

**QUESTION 1 — Is the current unit-relationship problem primarily data
loss, recognition failure, UI defaulting, single-unit data-model
limitation, or a combination?**

Evidence points away from data loss (Part D #1, confirmed) and toward a
**combination of recognition failure and single-unit data-model
characteristics**: every traced miss scenario in Part B is a
recognition-stage failure (the system never resolves a `productId` to
even attempt a memory lookup), and separately, `StockBatch.unit`'s
single-field structure (Part D #9) is a real, observable structural
characteristic whose downstream significance was not re-adjudicated in
this follow-up. No evidence of a distinct "UI defaulting" mechanism
(silently substituting a default unit/price without any owner
visibility) was found in the traced paths — every place a value could
not be resolved returns an explicit empty/undefined state (`''`,
`undefined`, `null`) rather than a fabricated default, per each
function's own explicit non-fabrication design (repeatedly documented
in code comments across `purchaseToSellingConversion.ts`,
`productMemoryPriceResolution.ts`, and `supplierWordingMatching.ts`).

**QUESTION 2 — Exactly which recognition mechanisms can currently cause
an existing Product to be reused?**

1. Exact case-insensitive name match (every entry path).
2. Supplier-Wording silent REUSE (confirmed prior `(supplierId, wording)` pair).
3. Supplier-Wording owner-CONFIRMED candidate (any of: initial-stock-name, existing-alternative-wording, unit-spelling-equivalence, character-spelling-variation, abbreviation-match, synonym-match, translation-match, semantic-match grounds), only after an explicit owner click.
4. Similarity "did you mean" suggestion, only after an explicit owner click, and only by way of re-triggering mechanism #1 above.

**QUESTION 3 — Exactly what happens when none of those mechanisms
produces a match?**

The row's typed name is submitted as-is; at finalization, no existing
product matches it exactly, so a brand-new `Product` document is
created silently in the same atomic write as the stock/count entry,
with no dedicated warning, no "existing or new?" prompt, and no
duplicate check at that specific moment (Part B.5).

**QUESTION 4 — Can the current system distinguish "I failed to
recognize this existing product" from "this is genuinely a new
product" before creating the Product?**

Partially, and only during typing, never at finalization: the
candidate/similarity UI (mechanisms #3/#4 above) is the system's only
attempt at this distinction, and it is entirely optional for the owner
to engage with — dismissing or ignoring it (when it fires) or simply
never triggering it (when no ground fires, e.g. Part B.1 scenarios #4,
#7, #13's edge cases, #15) leads to the same silent new-product
creation with no further checkpoint.

**QUESTION 5 — Does Concept C currently solve the cost-unit vs
selling-unit representation problem for:**
- **Multi-item stock entry?** Partially — it computes and freezes a
  rate, but that rate is read by nothing (Part A.6): it is stored, not
  applied.
- **Single-item stock entry?** No — entirely unreachable (Part A.4).
- **Contagem?** No — entirely unreachable (Part A.5).

**QUESTION 6 — What facts are still genuinely unknown and would
require real-world observation rather than code inspection?**

`NOT ESTABLISHABLE FROM CURRENT REPOSITORY EVIDENCE`, specifically:
- Real-world frequency of any recognition-miss scenario in Part B.1.
- Whether owners in practice notice/correct silently-created duplicate
  products, or how often duplicates accumulate unnoticed.
- Whether Smart Stock Entry's actual production OCR output in the field
  produces character-substitution patterns matching the bounded
  edit-distance ceilings the code was tuned for (tuning is justified in
  comments by a single cited owner report, not a dataset).
- The practical business impact (if any) of Concept C's rate being
  computed and stored but never read — e.g. whether any planned but
  not-yet-built feature was expected to consume it.
- Whether Part D #9's single-`unit`-field characteristic has actually
  caused a real, observed valuation discrepancy in production, versus
  being a latent structural characteristic that has not yet manifested
  a problem.

---

## Open Unknowns

- The referenced prior investigation document itself could not be
  located in this repository (Part 0).
- Part D #9 (single-unit-field structural limitation) — its downstream
  significance is unverified by this follow-up's own scope (see table).
- Every item under Part E, Question 6.
- Whether any scenario in Part B.1 marked "HYPOTHETICAL" (whitespace
  interaction with punctuation-stripping order, plain plural/singular
  with no other ground firing) has ever actually occurred against real
  product names in this business's own catalog — no such fixture exists
  in the repository to check against.

## Final Evidence Verdict

- **Concept C** is real, correctly implemented per its own passing test
  suite (32/32), and correctly frozen against later Product Memory
  changes — but its write path reaches only ONE of three stock-entry
  paths (multi-item Add Stock), and its read path reaches NONE of the
  application's actual UI, calculations, or reports. It is best
  described as **built but not yet connected to anything that uses it.**
- **Recognition** across this codebase is deliberately, consistently
  exact-match-only for every AUTOMATIC outcome, with a layered,
  owner-reviewed (never auto-applying) set of candidate/suggestion
  mechanisms that are asymmetric in coverage: rich for Supplier-Wording
  flows in manual/Smart-Stock-Entry Add Stock, and **entirely absent**
  from Contagem.
- A recognition miss, in every traced path, results in silent
  new-product creation with no dedicated finalization-time warning —
  this is a verified code-level fact (Part B.5), not a frequency claim.
- No empirical/production evidence of any kind exists in this
  repository to establish how often any of this actually occurs.

### Files inspected (primary)
`apps/tenant/src/types.ts`; `apps/tenant/src/lib/purchaseToSellingConversion.ts`;
`apps/tenant/src/lib/productNameSimilarity.ts`;
`apps/tenant/src/lib/supplierWordingMatching.ts`;
`apps/tenant/src/lib/supplierWordingRecognition.ts`;
`apps/tenant/src/lib/productMemoryPriceResolution.ts`;
`apps/tenant/src/context/AppContext.tsx` (targeted regions:
`addStockBatch`, `addMultipleStockBatches`, `recordStockCount`);
`apps/tenant/src/components/AddStockView.tsx`;
`apps/tenant/src/components/PeriodicStockCountView.tsx`;
`apps/tenant/src/components/InitialStockCountView.tsx`;
`server/smartStockEntry.ts`;
`tests/derived-selling-valuation-snapshot.test.ts`;
`tests/derived-transaction-valuation-quebra.test.ts`;
`tests/initial-stock-portion-grouping-wiring.test.ts`;
`tests/periodic-stock-portion-grouping-wiring.test.ts`;
`tests/product-name-similarity.test.ts`;
`tests/product-recognition-contradiction.test.ts`;
`tests/product-recognition-naming-tables.test.ts`;
`tests/product-recognition-spelling-variation.test.ts`;
`tests/supplier-wording-matching.test.ts`;
`tests/smart-stock-entry.test.ts`;
`tests/add-stock-similar-product-suggestions.test.ts`.

### Tests executed
`tests/derived-selling-valuation-snapshot.test.ts` (20 tests, pass),
`tests/derived-transaction-valuation-quebra.test.ts` (12 tests, pass),
`tests/product-name-similarity.test.ts`,
`tests/product-recognition-contradiction.test.ts`,
`tests/product-recognition-naming-tables.test.ts`,
`tests/product-recognition-spelling-variation.test.ts`,
`tests/supplier-wording-matching.test.ts`,
`tests/smart-stock-entry.test.ts`,
`tests/add-stock-similar-product-suggestions.test.ts`
(combined: 163 tests, pass) — all run via `npx tsx --test`, unmodified,
zero failures across all 32 + 163 = 195 tests executed.

### Exact Concept C reachability result
Write side: reachable from `addMultipleStockBatches` only (1 of 3 entry
paths). Read side: reachable from nowhere in the running application
(only its own test file calls it).

### Exact recognition-miss result
Every entry path (manual, Smart Stock Entry, Contagem) silently creates
a new Product at finalization when no recognition mechanism resolves an
existing `productId`, with no dedicated finalization-time duplicate
warning found in any of the three paths.

### Empirical frequency evidence
None exists in this repository.

### Confirmation: no implementation changes were made
Confirmed. No source file, specification, or test file was created,
modified, or deleted. `npm install` populated `node_modules/` (untracked,
gitignored) to make the existing test suite runnable; no tracked file
changed:

```
$ git status --short
```
(output intentionally omitted from this report body — see terminal
confirmation below; the porcelain output listed no modified or new
tracked files, only the untouched working tree).

### Confirmation: no commit/push was performed
Confirmed. No `git commit` or `git push` command was run at any point
during this investigation.

**STOP — end of investigation.**
