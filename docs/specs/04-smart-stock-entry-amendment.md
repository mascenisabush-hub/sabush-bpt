Business Domain Specification — Amendment

# Smart Stock Entry Amendment

Version 1.0
**Status:** Drafted, awaiting Product Architect approval. Not yet
approved. **Implementation status: NOT AUTHORIZED.**
**Amends:** [Purchase Batches (spec #4)](./04-purchase-batches.md) —
additively, alongside the [Durable Purchase Capture Amendment](./04-durable-purchase-capture-and-suppliers-amendment.md)
and the [Multi-Supplier Purchase Event Amendment](./04-multi-supplier-purchase-event-amendment.md).
Neither of those amendments, nor spec #4's own base text, requires any
edit — this amendment adds a new *entry point* into the exact review/
confirm/finalize flow those amendments already built.
**Depends on:** [BDR-0008](./BDR-0008-smart-stock-entry-ai-advisory-boundary.md)
for the governing business decision; the [Smart Stock Entry
ADR](../architecture/10-smart-stock-entry-adr.md) for the architectural
placement and integration-shape decisions this amendment builds on.
Neither dependency is yet approved — this document is not
implementation-ready until both are.
**Explicitly does not amend:** [Stock Batches (spec #5)](./05-stock-batches.md),
[Products (spec #3)](./03-products.md), the [Restock Observation
Amendment](./05-restock-observation-amendment.md), or [AI Intelligence
(spec #15)](./15-ai-intelligence.md) — see Part 9 (Restock Observation
compatibility) and the companion ADR's Decision 1 (why this is not an
AI Intelligence / spec #15 capability) for why each is named but left
untouched.

---

## A. Discovery Report

**Current architecture (confirmed by direct inspection, not assumed):**

- **Product** (`businesses/{id}/products`) already survives
  independently of stock quantity, already supports case-insensitive
  autocomplete matching during Stock Entry, and already prefills
  reference cost/sell price from the most recent batch — all
  documented in spec #3 and already implemented in `AddStockView.tsx`.
- **StockBatch** freezes `costPrice`/`sellingPrice` permanently at
  creation (spec #5) and, since the Restock Observation Amendment, may
  optionally carry a `restockObservation` — a physical-count field,
  never a document-extraction field.
- **PurchaseDraft** / **PurchaseDraftLineItem** (Durable Purchase
  Capture Amendment) already exist as exactly the kind of
  "not-yet-real, user-is-still-deciding" staging area Smart Stock
  Entry needs — a per-(business, user) draft, auto-saved, cleared only
  on finalization or explicit discard. **This is the correct landing
  spot for an AI proposal, verified — not merely assumed — compatible
  with its existing lifecycle; see Part C's dedicated finding and the
  companion ADR's Decision 2a for the full check.** One structural
  constraint this verification surfaced: `PurchaseDraft` carries at
  most **one supplier per draft** (matching spec #4's own "one
  PurchaseBatch = one supplier's delivery" model) — a document
  photographing a genuinely multi-supplier delivery in one image is
  therefore a data-model mismatch, not just an accuracy concern, and is
  correctly placed outside Tier 1 MVP scope for that structural reason,
  not only an image-quality one.
- **`addMultipleStockBatches`** (`AppContext.tsx`) is the existing,
  single finalization path that turns a set of line items (today,
  always human-typed) into real `PurchaseBatch`/`StockBatch` records,
  atomically, in one Firestore `WriteBatch`. Smart Stock Entry's
  confirmed output must flow through this **exact same function**,
  unmodified in its authorization/atomicity behavior — it must never
  gain a second, AI-specific write path.
- **AI infrastructure:** none exists. `@google/genai` is an unused
  dependency; `server/index.ts` has no AI route and no file-upload
  middleware; no Storage bucket is configured. Spec #15 (AI
  Intelligence) is fully drafted but entirely unbuilt, and — per the
  companion ADR — describes a different domain (predictive/diagnostic)
  than this capability (assisted transcription).
- **Subscription gating:** `subscriptionAllowsNewRecords(businessId)`
  already gates every stock-entry write (Firestore Rules, `/batches`,
  `/purchaseBatches`) — Smart Stock Entry's eventual confirmed write
  inherits this automatically, since it flows through the existing
  finalization path. Whether the *extraction step itself* should carry
  its own, separate gate is a business decision (Part 8, below), not
  something this amendment can resolve unilaterally.

**Exact integration point:** a new, optional entry into `AddStockView`
("Scan Document") that, on a successful extraction, merges proposed
line items into `AddStockView`'s existing local `rows` state — the
same state hand-typed rows already live in — never a direct write to
the `PurchaseDraft` Firestore document (see Part C's verified finding
below). No new Firestore collection, no new finalization function, no
new `StockBatch` field.

**Affected modules:** `AddStockView.tsx` (new entry point + review
UI), `AppContext.tsx` (a new client method to call the extraction
route and stage the result into the existing draft — no change to
`addMultipleStockBatches` itself), `server/index.ts` (one new route).

**Affected data models:** none, structurally. `PurchaseDraftLineItem`
may need optional, review-only metadata (e.g. a per-field
`source: 'ai' | 'manual'` / confidence marker) so the review screen can
visually distinguish AI-proposed fields — additive, never persisted
past draft finalization (the finalized `StockBatch`/`PurchaseBatch`
carry no trace that AI was involved, exactly as a Restock Observation
carries no trace of who typed the number).

**Security implications:** see the companion ADR's Decision 3 in full;
summarized: document is data not authority (prompt-injection
resistance), server-side file validation, tenant-scoped extraction
requests.

**Subscription implications:** the confirmed write is already gated
(inherited, no new rule needed). The extraction step's own
availability/limits is an open business decision — see Part 8.

**Cost implications:** every extraction call has a real, per-call AI
provider cost with no existing control surface (Section 11 doesn't yet
address per-request AI cost, since no prior AI feature was
per-request) — see Part 8 and the companion ADR's Decision 4.

## B. Governance Recommendation

Three artifacts, not one, because three genuinely different questions
are in play:

1. **BDR-0008** — the strategic "AI is advisory, human confirms"
   boundary. Required because this is a new, enduring product
   commitment in the same category as Section 10.1's "prediction never
   a fact" rule, just for a different AI output shape — it deserves the
   same durability, not a footnote inside a functional spec.
2. **Architecture ADR** ([10-smart-stock-entry-adr.md](../architecture/10-smart-stock-entry-adr.md))
   — required because Section 4.11/Section 10 do not, and structurally
   cannot, answer where this capability sits or how it's invoked
   without a deliberate placement decision; this is exactly what an ADR
   is for.
3. **This specification amendment** — required to turn 1 and 2 into
   the functional requirements, UX, and failure-mode behavior an
   engineer would actually build against, per this repository's
   existing BDR → Policy/ADR → Specification hierarchy.

No existing document is edited in place. Spec #3, spec #5, the Restock
Observation Amendment, spec #15, and Section 12 are each cited but left
untouched, because each already correctly describes the thing it
describes — this amendment adds a new capability alongside them, per
this repository's consistent "amend additively, never rewrite" pattern.

## C. Business Rules

**The BDR-0008 sequence is the law of this feature, restated
functionally:**
- No extracted field of any kind (`productName`, `quantity`, `unit`,
  `costPrice`, `sellingPrice`, supplier, date) reaches a
  `PurchaseDraftLineItem` marked as anything other than an
  unconfirmed, editable proposal, and no `PurchaseDraftLineItem` of any
  provenance is ever finalized into a real `StockBatch` without the
  same explicit confirmation gesture (`AddStockView`'s existing submit)
  that already governs every hand-typed entry today.

**Document types — explicit launch tiers, deliberately narrower than
the originating task's own document-type list, per direct
recommendation to protect against overengineering at MVP:**

- **Tier 1 — MVP, the only tier this amendment authorizes building
  toward first:** clear, photographed, printed purchase receipts or
  invoices containing structured, machine-legible line items (a
  reasonably legible printed table or list — not a photograph of a
  handwritten note). Extract, at most: product name, quantity, unit,
  purchase price, and — only where reliably detected, never forced —
  supplier name and document date. Everything else (selling price,
  ambiguous fields, anything not confidently detected) falls straight
  through to manual correction on the review screen. A document that
  doesn't fit this tier is not rejected outright — it simply produces
  a lower-confidence, more heavily "⚠ Review"-marked proposal, or no
  usable proposal at all, per the confidence rules below — but no
  engineering effort is spent specifically improving accuracy beyond
  this tier before MVP ships.
- **Tier 2 — deferred, not part of this amendment's build scope:**
  supplier sheets and tabular delivery notes that aren't simple
  receipts/invoices (e.g. a supplier's own multi-column stock sheet).
- **Tier 3 — deferred:** poor-quality, poorly-lit, or handwritten
  documents, where accuracy cannot be assumed reliable regardless of
  effort invested.
- **Tier 4 — deferred:** materially smarter product matching (e.g.
  fuzzy/semantic matching beyond Product Memory's existing exact
  case-insensitive rule) and complex packaging/quantity interpretation.

This tiering is a **build-order and scope-of-effort decision**, not a
hard technical block — the review screen's fallback behavior (Part D)
must still degrade gracefully for a Tier 2–4 document a user tries
anyway (treated as low-confidence, never a crash or a silent wrong
answer), but no Tier 2–4 accuracy work is authorized as part of this
amendment's MVP.

**A `PurchaseDraft`-compatibility finding, verified against the actual
code, not assumed (directly resolving the highest-risk open question
from the originating review):**
- `purchaseDrafts/{uid}` is confirmed, by direct inspection of
  `AppContext.tsx`, to be a **single, always-fully-overwritten**
  document per (business, user) — every `savePurchaseDraft` call
  replaces the entire document with whatever `items` it's given.
- **Consequence:** Smart Stock Entry must never write to
  `purchaseDrafts` directly (server-side or via any AI-specific client
  call) — doing so risks silently discarding whatever the user had
  already typed and not yet included in that write. Instead, the
  extraction route's proposal is merged into `AddStockView`'s existing
  local `rows` state (the same array manual typing already mutates),
  and the **already-existing, unmodified** debounced autosave effect
  persists the result — exactly as it does today for hand-typed rows.
  See the companion ADR's Decision 2a for the full verification.
- This means `PurchaseDraft`'s own meaning, lifecycle, and
  finalization behavior are **provably unchanged** by this feature,
  not merely assumed compatible because the fit looked convenient.

**Product Memory integration (Part 5 of the originating task):**
- An extracted product name is matched against existing Products using
  the **same case-insensitive matching Products already uses**
  (spec #3) — never a new, separate, fuzzier matching algorithm
  invented for this feature alone (that class of improvement is
  explicitly Tier 4, deferred). Where the extracted name is close but
  not an exact match (e.g. "Coca Cola 500ml" vs. "Coca-Cola 500ml"),
  the AI **may propose** the existing product as a suggestion — never
  select or attach it silently. The review screen must show this
  precisely as:

  > AI: "I think this is [Product A]" → User: Confirm / Choose a
  > different product / Create new — never AI → Product A →
  > automatic attachment.

- **Insufficient-confidence state, required, not optional:** where the
  extracted name has no exact match and the AI's own proposed match
  (if any) falls below a reliable-enough threshold, the review screen
  must show an explicit, distinct state — e.g. *"We couldn't
  confidently match this product. Choose an existing product or create
  a new one."* — rather than silently pre-selecting its best guess or
  leaving the field looking identical to a confident match. This is a
  required UI state, not a stretch goal, precisely because a
  low-confidence guess presented with the same visual weight as a
  confident one is the single easiest way this feature could
  accidentally attach a purchase to the wrong Product.
- `handleSelectProductForTool`'s existing prefill behavior (cost/sell
  price from the most recent batch) applies identically once a match
  is accepted, with no new prefill logic invented for the AI path.

**Prices:**
- AI proposes `costPrice`/`quantity` values the existing workflow
  already asks for; it never invents a `sellingPrice` the document
  doesn't contain (Part 7 of the originating task) — an absent selling
  price is shown as "Not detected," never defaulted to 0, never
  defaulted to the product's own reference price without the user
  seeing that substitution happened (if Product Memory's existing
  prefill is used to fill the gap, the review screen must show that
  value as *prefilled from history*, not *extracted from this
  document* — the two provenances must remain visually distinct).
- Historical `StockBatch.costPrice`/`sellingPrice` immutability
  (spec #5) is untouched — this amendment only ever proposes values
  for a *new* batch, never edits an existing one.

**Quantity/units:**
- The AI proposes whatever quantity/unit it detects, preserving
  uncertainty rather than inventing a conversion (Part 8) — e.g. a
  document saying "2 cartons" is proposed as `quantity: 2, unit:
  "carton"` (flagged for review if "carton" isn't a unit this business
  has used before), never silently converted to an assumed bottle
  count. Unit-of-measure conversion is explicitly **not** part of this
  amendment (Part 8's own instruction) — a future, separate capability
  if ever pursued.

**Restock Observation compatibility (Part 9):**
- Smart Stock Entry **never** populates
  `previousRemainingQuantity`/`restockObservation`. A purchase document
  is evidence of a purchase, never evidence of physical remaining
  stock — the Restock Observation field, where shown (existing
  product with a prior batch), remains exactly as it is today: a
  separate, optional, user-entered physical observation, entirely
  outside AI's involvement.

**Confidence/uncertainty (Part 10):**
- Every proposed field is shown in one of three states: **✓ Detected**,
  **⚠ Review** (detected but low-confidence, ambiguous, or an unusual
  value for this product/business), or **— Not found**. No numeric
  "confidence percentage" is shown unless a future, separate decision
  determines the provider's own score is both genuinely meaningful and
  product-justified (Part 10's own instruction) — this amendment
  authorizes none.

## D. Proposed UX — User Journey

```
Add Stock
  → [new] "Scan Document" button, alongside existing manual entry
  → Camera/upload picker
  → Processing (spinner; explicit "this may take a moment" — no
    fabricated progress percentage)
  → Review Extraction screen:
      - One card per detected line item:
          Product: [editable, autocomplete against existing Products,
                    pre-selected if AI proposed a confident match]
          Quantity: [editable] Unit: [editable]
          Purchase Price: [editable] ✓/⚠/— indicator
          Selling Price: [editable] ✓/⚠/— indicator (near-always "—"
                    unless Product Memory prefilled it, labeled as such)
          [Remove this line]
      - [+ Add a line the scan missed]
      - Supplier/date, if detected, shown and editable the same way
      - Explicit "Reject and enter manually instead" escape hatch,
        always visible, never buried
  → User edits as needed
  → User explicitly confirms ("Add to Purchase" / equivalent to the
    existing Add Stock submit)
  → Line items land in the EXISTING PurchaseDraft, on the EXISTING
    AddStockView, exactly as if the user had typed them
  → Existing finalization flow (supplier resolution, batch creation,
    success screen) proceeds completely unchanged
```

**Empty/error/fallback states:**
- **Camera permission denied:** clear message, immediate fallback to
  manual entry — never a dead end.
- **Upload fails / network drops mid-processing:** clear retry option;
  manual entry remains available the entire time, never gated behind a
  retry.
- **Poor image quality / AI cannot read the document:** explicit "we
  couldn't read this clearly" state, immediate manual-entry fallback —
  never a spinner that quietly times out with no explanation.
- **AI returns malformed/unparseable data:** treated identically to
  "cannot read the document" from the user's perspective — the server
  validates the extraction response's shape before ever returning it
  to the client (never trust the provider's output shape blindly,
  extending Principle 2.9 to a third-party response, not just a client
  one).
- **AI misses a line / duplicates a line:** "Add a line the scan
  missed" and "Remove this line" cover both directly — no
  auto-deduplication logic is proposed (Part 18's "do not build a
  broader analytics" discipline applied here: a simple removable list
  is sufficient, not a smart dedup algorithm).
- **Product cannot be matched:** shown as a normal "create new
  product" case, identical to today's manual-entry behavior when a
  typed name has no match — no new product-creation logic invented.
- **Price/quantity/currency ambiguous:** shown as ⚠ Review, editable,
  never silently resolved by a guessed default.
- **User rejects the entire extraction:** returns directly to normal
  manual Add Stock, with zero residue (no draft line items left behind
  from the rejected attempt unless the user explicitly kept some).
- **User closes the screen before confirming:** identical to today's
  existing Purchase Draft behavior — nothing is written, and if any
  line items had already been staged into the draft, they persist as a
  normal, resumable draft (spec #4's existing autosave), not as
  something silently confirmed.
- **Subscription blocks the eventual write:** the *existing*
  `SubscriptionBlockedNotice` gate (already shown in `AddStockView` via
  `subscriptionBlocksNewRecords`) applies identically — Smart Stock
  Entry does not bypass it, and does not need its own separate check
  for the confirmed-write step (it may need its own check for the
  *extraction* step, per Part 8's open business decision).

## E. Proposed Technical Architecture (Design Level Only)

See the companion ADR in full. Summary:
- New route: `POST /api/smart-stock-entry/extract` on the existing
  privileged Express server, `requireAuth`-gated like every other
  privileged route, re-verifying the caller's business membership
  server-side (never trusting a client-asserted `businessId`).
- Request: an image (validated file type/size server-side before any
  AI call). Response: a structured proposal (product/quantity/unit/
  price line items + per-field confidence state), never a Report or
  Notification.
- Internally, the route's pipeline keeps document reading/OCR,
  structured extraction, and product matching as distinct stages
  (ADR Decision 2b) — not one opaque "AI understood the receipt" call
  — specifically so no single provider/model choice gets locked in
  before that choice is made deliberately.
- Client merges the proposal into `AddStockView`'s existing local
  `rows` state — **never** a direct write to `purchaseDrafts` (Part C's
  verified finding, ADR Decision 2a) — after which the existing,
  unmodified debounced autosave persists it. No new Firestore
  collection, no new finalization function.
- AI provider call happens entirely server-side; no provider
  credential ever reaches the client bundle (Section 12.5's existing
  control, restated as applying here too).
- No Storage bucket decision made by this amendment — recommend
  ephemeral, in-memory handling of the uploaded image for MVP (see the
  ADR's Decision 2).

## F. Explicit Out-of-Scope List

- Autonomous posting of any extracted data without human confirmation.
- Automatic Product merging without user confirmation.
- Automatic selling-price invention.
- Automatic Restock Observation / previous-remaining-stock inference
  from a purchase document.
- Sales tracking or any POS-adjacent capability.
- Automatic accounting / bookkeeping.
- Any change to Business Worth, Embedded Profit, or Stock Value
  calculations.
- Any change to Restock Observation semantics (the field remains
  purely a physical, user-entered observation).
- Any edit to a historical/already-created `StockBatch`.
- Unit-of-measure conversion (carton→bottle, sack→kilogram, etc.).
- Persistent storage of the original uploaded document (deferred, not
  decided).
- Numeric "confidence percentage" UI (deferred, not decided).
- Subscription-tier gating specifics for this feature (deferred to a
  module #19 business decision).
- A "Fix #11" framing, a refactor of unrelated modules, or any change
  to `addMultipleStockBatches`'s existing authorization/atomicity
  behavior.

## G. Failure Modes — Explicit Table

| # | Failure | Expected behavior |
|---|---|---|
| A | Camera permission denied | Clear message; immediate manual-entry fallback |
| B | Image upload fails | Retry option; manual entry remains available throughout |
| C | Poor image quality | "Couldn't read clearly" state; manual-entry fallback |
| D | AI cannot read document | Same as C |
| E | AI returns malformed data | Server validates response shape before returning to client; treated as failure, same as C |
| F | AI misses a line | User adds the missing line manually via "Add a line" |
| G | AI duplicates a line | User removes the duplicate via "Remove this line" |
| H | Product cannot be matched | Falls through to existing "create new product" behavior |
| I | Price is ambiguous | Shown as ⚠ Review, editable, never defaulted |
| J | Quantity is ambiguous | Same as I |
| K | Currency is ambiguous | Same as I; MZN assumed only where the document itself doesn't contradict it, always editable |
| L | User rejects extraction | Returns to manual Add Stock, no residue |
| M | User edits extraction | Fully supported — every field is always editable |
| N | Network drops during processing | Existing retry/draft-persistence behavior; no partial/ambiguous write ever occurs, since nothing is written until confirmation |
| O | AI provider unavailable | Same as C — graceful fallback, never a hard error blocking Add Stock |
| P | AI timeout | Same as O, with a bounded, explicit timeout on the server route (specific value: implementation detail, not fixed here) |
| Q | User closes screen before confirmation | Nothing written; any staged draft lines persist via existing Purchase Draft autosave |
| R | Subscription blocks the eventual write | Existing `SubscriptionBlockedNotice` gate applies unchanged |

## H. Open Business Decisions (Not Resolved by This Amendment)

1. Should the *extraction step itself* (distinct from the confirmed
   write, which is already gated) be available to all subscription
   tiers, a premium tier only, or usage-limited? — Recommend deferring
   to a module #19 decision, staged via Feature Flags (9.5) once that
   exists.
2. Should the original document be retained at all, and if so, for how
   long, under what tenant-isolation and deletion guarantees? —
   Recommend deferring; MVP should not retain it beyond the extraction
   call.
3. Which AI/vision provider, and its specific cost-per-call — not an
   architecture or specification question per Section 10.10's "do not
   build AI" discipline; a later, narrowly-scoped implementation
   decision once A–G above are approved.

## Acceptance Criteria (for this document, not for the unbuilt feature)

- [ ] BDR-0008 is approved before this amendment is treated as
      implementation-ready.
- [ ] The companion ADR is approved before this amendment is treated
      as implementation-ready.
- [ ] No functional requirement above contradicts spec #3, spec #5, or
      the Restock Observation Amendment — verified by direct
      cross-reference, not assumed.
- [ ] Every failure mode in Part G has a defined, non-blocking
      behavior.

**IMPLEMENTATION STATUS: NOT AUTHORIZED.**
