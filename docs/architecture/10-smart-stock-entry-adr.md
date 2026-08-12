# Architecture Decision Record — Smart Stock Entry's AI Integration Shape

**Status:** Drafted, awaiting Product Architect approval. Not yet
approved. This document authorizes no implementation.
**Amends, without editing in place:** [Section 4 — System
Architecture](./04-system-architecture.md) (specifically 4.11) and
[Section 10 — AI Architecture](./10-ai-architecture.md) — both remain
exactly as approved for the domain they already cover (per-business
predictive/diagnostic AI insights). This ADR does not change a word of
either; it resolves a placement question those sections did not
anticipate and could not have answered, since Smart Stock Entry is a
materially different kind of AI capability than either section was
designed around.
**Depends on:** Sections 1–12 (all approved) for every principle and
control cited below; [BDR-0008](../specs/BDR-0008-smart-stock-entry-ai-advisory-boundary.md)
for the business decision this ADR gives an architectural shape to.
**Companion document:** [Smart Stock Entry Amendment](../specs/04-smart-stock-entry-amendment.md)
(spec #4) — the functional specification built on the decisions this
ADR fixes.

---

## Why an ADR, Not Just a Spec Amendment

Per this repository's own governance discipline (module #19's BDR/
Policy/Specification hierarchy, applied by analogy here), a
specification amendment answers "what must this module do." It cannot
by itself answer an unresolved **architectural** question — one Section
3/4/10 didn't settle and can't be settled by inference from existing
text. Smart Stock Entry raises exactly one such question, addressed
below, before the companion spec amendment can responsibly build on
top of it.

## Decision 1 — Domain Placement

**Question:** Section 3.15 defines the AI domain as "predictive and
diagnostic intelligence... an AI output is a labeled prediction, never
a fact." Smart Stock Entry's AI output is neither predictive nor
diagnostic — it is an **extraction/transcription proposal** about a
document that already exists. Does it belong to the 3.15/Section 10 AI
domain, or is it something else?

**Investigation finding:** It genuinely does not fit 3.15's domain
definition as written. Every Section 10 feature (10.2–10.7) reads
*existing Sabush data* (Closings, Stock Batches, Quebras) and produces
a *forward-looking or diagnostic signal* about that business, surfaced
as a Report or Notification, computed asynchronously (Background
Worker, per 10.1/13's own sequencing). Smart Stock Entry reads a
*newly-uploaded external document* and produces a *proposed literal
transcription* of it, synchronously, within the same interactive
session the user is already in, and its output feeds directly into an
existing **write path** (Add Stock) rather than a Report/Notification.
These are opposite shapes on nearly every axis that matters
architecturally (data source, timing, output destination, output
type).

**Decision:** Smart Stock Entry is **not** part of the Section 3.15/
Section 10 AI domain. It is an **assisted input method for the
existing Purchase Batches domain (Section 3.5/spec #4)** — the AI
model is a component *inside* that domain's existing capture flow, the
same conceptual role a barcode scanner or OCR library would play if
Sabush integrated one, not a new predictive/diagnostic capability
sitting alongside Reports and Notifications. Concretely:

- Section 3.15's domain definition is **unchanged** — it continues to
  mean exactly "predictive and diagnostic," and Section 10's seven
  features (10.2–10.8) remain its complete, unbuilt scope. Smart Stock
  Entry does not become 10.9, 10.10, etc.
- Smart Stock Entry's specification lives as an **amendment to spec #4
  (Purchase Batches)**, using this repository's own established
  pattern for extending that spec's capture flow (the Durable Purchase
  Capture Amendment, the Multi-Supplier Purchase Event Amendment) —
  not as a new module, and not folded into spec #15 (AI Intelligence).
- Any future person reading "AI Intelligence" (spec #15) should find
  exactly the seven prediction/diagnostic features it already
  describes and nothing about document scanning; anyone reading spec
  #4 should find Smart Stock Entry alongside the other ways a purchase
  gets captured.

## Decision 2 — System-Level Integration Shape

**Question:** Section 4.11 designs AI's system-level placement
specifically for the domain Section 10 covers: "invoked from the
privileged server (4.4) **or the Background Worker (4.8)**... writes
the result back as a clearly-labeled Report entry (3.9) or Notification
(3.12)." Smart Stock Entry needs a synchronous, request/response call
triggered by a live user action (upload a photo, wait, review), with
an image as input and a structured proposal as output — not a
periodic job, and not a Report/Notification as output. Does 4.11
already cover this, or does it need its own placement?

**Investigation finding, confirmed by direct inspection:**
- `server/index.ts` (1,444 lines, read in full) exposes exactly nine
  routes today — five staff-management actions, business provisioning,
  trial activation, a client-error sink, and a health check. **No
  file-upload middleware exists** (`express.json()` only — no
  `multer`, `formidable`, or equivalent for `multipart/form-data`).
  **No AI route exists.**
- `firebase.json` configures **Firestore only** — no Storage bucket is
  declared anywhere in this repository. There is nowhere today for an
  uploaded image to land even transiently.
- `@google/genai` is present in `package.json` but has zero import
  sites anywhere in `src/` or `server/` — confirmed by direct search
  (this matches spec #15's own confirmed-absence finding).
- The one place 4.11 anticipates the AI provider being called — "the
  privileged server (4.4) or the Background Worker (4.8)" — is still
  correct in shape for Smart Stock Entry's server-side call itself, but
  4.11's own stated *reason* the Background Worker is an option
  ("computed... as a periodic job rather than a per-request cost," per
  10.9/13's forward note) does not apply here: Smart Stock Entry is
  inherently a **per-request, user-waiting, synchronous** call. The
  Background Worker path is architecturally wrong for it.

**Decision:**
- Smart Stock Entry's AI call is invoked **only from the privileged
  server (Section 4.4's existing Express process)**, as a new
  synchronous request/response route (e.g. `/api/smart-stock-entry/
  extract`) — never the Background Worker, and never directly from
  the client to the AI provider (the exact 4.11/10.1 rule, restated
  because it is the one part of 4.11 that *does* transfer directly:
  "never a client-side call to the AI provider, since that would
  require shipping an API key to every browser session").
- The image itself travels **client → privileged server → AI
  provider**, never client → AI provider directly, and never persisted
  to a database field the client can read/write unmediated — the same
  "privileged server re-verifies, never trusts the client" posture
  (Principle 2.9) already governing every other privileged route in
  `server/index.ts`.
- The route's **output** is not a Report entry or Notification (4.11's
  anticipated shapes) — it is a **transient proposal returned directly
  in the request/response**. Critically, per a direct code-level
  compatibility check (Decision 2a below), the client **never** writes
  this proposal to the `purchaseDrafts` Firestore document itself —
  it merges the proposal into the same local, in-memory `rows` state
  `AddStockView` already uses for hand-typed entry, and the **existing,
  unmodified** debounced autosave effect persists it from there. This
  is the smallest correct extension of 4.11, and it is the only
  integration shape that doesn't risk `PurchaseDraft`'s own invariants
  — see Decision 2a.

### Decision 2a — Verifying `PurchaseDraft` Compatibility (Not Assumed)

The originating review correctly identified this as the single
highest-risk assumption in the initial draft of this ADR: is
`PurchaseDraft` actually safe to stage an AI proposal into, or does
that quietly change what `PurchaseDraft` means? This was **not**
re-assumed — it was checked directly against `AppContext.tsx`'s actual
`savePurchaseDraft`/`clearPurchaseDraft`/`onSnapshot` implementation.

**Finding:** `purchaseDrafts/{uid}` is a **single document per
(business, user)**, always **fully overwritten** via `setDoc` — never
patched, never appended to, never merged server-side. Every call to
`savePurchaseDraft` replaces the entire document with whatever `items`
array the caller passes at that moment. This has a direct, load-bearing
consequence for Smart Stock Entry:

- **If a server-side "stage the AI proposal" write called
  `savePurchaseDraft` (or wrote to `purchaseDrafts` directly) with only
  the AI-extracted items, it would silently discard any items the user
  had already typed and not yet included in that call** — a real
  data-loss bug, not a hypothetical one, given the full-overwrite
  semantics just confirmed.
- **Decision:** Smart Stock Entry therefore **never** writes to
  `purchaseDrafts` directly, from the server or from any AI-specific
  client code path. The extraction route returns its proposal to the
  client; the client merges the proposed line items into
  `AddStockView`'s existing local `rows` array (the same array
  `updateRow`/`handleAddRow`/manual typing already mutate) via the
  same `setRows` call shape already used for restoring a draft; and
  the **already-existing, entirely unmodified** debounced autosave
  effect (`AppContext.tsx`, unchanged) persists the resulting full
  `rows` array to `purchaseDrafts` exactly as it does for hand-typed
  rows today.
- **Consequence:** `PurchaseDraft`'s meaning and lifecycle are
  **provably unchanged** by this feature — not "probably fine because
  it looks convenient," but structurally guaranteed, because Smart
  Stock Entry is never given a write path to that collection at all.
  Every write to `purchaseDrafts` remains exactly what it is today:
  the client's current, full, in-progress `rows` state, autosaved.
  AI's only touchpoint is contributing rows into that same client
  state, indistinguishable at the persistence layer from a fast typist.
- This also directly answers the review's Point 2 (AI must not become
  a new source of truth): because `PurchaseDraft` itself carries no
  concept of "this row came from AI," and the finalized `StockBatch`/
  `PurchaseBatch` records carry no AI provenance at all (per the
  companion spec amendment's Business Rules), AI is architecturally
  incapable of becoming a parallel source of truth — it has no
  document, field, or write path of its own to be one.

## Decision 2b — Separating "Reading the Document" from "Interpreting It"

The originating review's Point 3 is architecturally correct and
important enough to fix explicitly here, not leave implicit in a
future provider choice. The naive framing — "AI reads the receipt and
understands it" — collapses several genuinely distinct stages that
this ADR keeps separate on purpose, precisely so no single provider
choice gets locked in prematurely (Section 10.10's "do not build AI"
discipline, applied to *this* AI capability too):

```
Image
  → Document reading / OCR (pixels → raw text + rough layout)
  → Structured extraction (raw text/layout → candidate line items:
    product name, quantity, unit, price)
  → Product matching (candidate name → existing Product, or "no match")
  → Validation (server-side shape/sanity check, per Decision 3 below)
  → Human confirmation
```

**Decision:** this ADR fixes the *pipeline shape* above as the
contract the `/api/smart-stock-entry/extract` route's internals must
respect — but deliberately does **not** fix which stage(s) are served
by which specific provider or model, whether OCR and structured
extraction are one API call or two, or whether product matching runs
as a second pass against Sabush's own data (necessarily local, since a
third-party OCR/vision provider has no knowledge of this business's
Product catalog) versus something the same call proposes. That
remains implementation detail, decided when a provider is actually
selected — a decision explicitly deferred, per Section 10.10 and Part
H of the companion amendment. Keeping the stages named and separate
here is what protects that deferral from becoming an accidental,
unreviewed lock-in the first time someone writes the extraction route.
- **Image/document storage:** deliberately **not decided by this
  ADR**. No Firebase Storage bucket exists today, and per Section
  4.1's "no Blaze plan assumed" constraint and the connectivity
  realities named in the originating task (weak/unstable internet,
  low-end devices), introducing a new storage product is a decision
  with its own cost/privacy/retention tradeoffs that deserves its own
  review, not a side effect of this ADR. **Recommendation (non-binding
  here):** the image should be held only as long as the extraction
  call needs it (in-memory / short-lived temp storage on the privileged
  server, deleted immediately after the response is returned) for the
  MVP, with persistent document retention deferred as a named, staged
  future decision — see the companion spec amendment's own storage
  section for the full evaluation this ADR summarizes.

## Decision 3 — Security Controls Specific to This Capability

Section 12 (Security Architecture) is approved and unchanged, but two
of its existing controls need an explicit, checkable restatement for
this specific capability, since Section 12 was written before any
untrusted-document-as-AI-input capability existed anywhere in this
system:

**Control — the document is data, never authority.** Extending
Principle 2.9 ("never trust a client-supplied value") to its
document-specific form: any text, instruction, or formatting inside an
uploaded document is **content to be extracted from, never an
instruction to the AI system or the application**. A document
containing text engineered to look like a system instruction (a classic
prompt-injection vector) must be treated identically to a document
containing a picture of a receipt with a strange watermark — inert
data, nothing more. This must be enforced at the extraction call's
prompt design (implementation detail, not architecture) but the
*requirement* is architectural and belongs here, not left implicit.

**Control — file validation before any AI call.** The privileged
server must validate file type, size, and basic structural sanity
(per 12.5's "no secrets in client-reachable code" neighbor-control
precedent: validation is a server-side gate, never a client-side-only
check) before ever forwarding a file to the AI provider — closing off
oversized-file and unsupported-file-type abuse at the same layer that
already gates every other privileged action (Principle 2.9).

**Control — tenant isolation extends to transient proposals.** A
Smart Stock Entry proposal, even though it is never a Firestore write
until confirmed, must still never be computed, cached, or returned
across a business boundary — the request must carry (and the server
must re-verify) the same `businessId`-scoped authorization check
(Section 12.3) as every other privileged route, even though nothing
persists yet.

## Decision 4 — Cost/Abuse Control (Recommendation, Not a Binding Design)

Section 11 (Scalability Strategy) does not yet name per-request AI
cost controls, since Section 10's entire design assumed periodic,
Background-Worker-scheduled AI computation with no equivalent
per-click cost surface. Smart Stock Entry introduces exactly that
surface for the first time. **Recommendation for a future, separate
decision** (explicitly not decided here, per the originating task's
own "do not implement billing changes" instruction):
- A simple per-business or per-day usage ceiling on extraction calls,
  enforced server-side (the same layer that already checks
  `subscriptionAllowsNewRecords` for other gated writes), so a single
  runaway client (retry loop, abuse) cannot generate unbounded provider
  cost.
- Whether Smart Stock Entry is available to all subscription tiers,
  gated to a higher tier, or usage-limited per tier is a **Section 9/
  module #19 business decision**, not an architecture decision — this
  ADR takes no position beyond flagging that Section 9's Feature Flags
  (9.5), already named in spec #15 as "the AI rollout mechanism," is
  the correct staging tool if/when that decision is made.

## Summary Table

| Question | Section 10's existing answer | Smart Stock Entry's answer (this ADR) |
|---|---|---|
| Domain | Predictive/diagnostic (3.15) | Assisted input method, Purchase Batches domain (3.5) |
| Trigger | Periodic (Background Worker) | Synchronous, per user action |
| Input | Existing Sabush data | A newly-uploaded external document |
| Output | Report entry / Notification | Transient proposal → merged into client's local `AddStockView` rows state → existing autosave persists it, unchanged |
| `PurchaseDraft` write path | N/A | None — Smart Stock Entry never writes `purchaseDrafts` directly, by design (Decision 2a) |
| Where computed | Privileged server or Background Worker | Privileged server only |
| Pipeline stages | N/A | OCR/reading, structured extraction, product matching, validation, confirmation — kept separate, not provider-locked (Decision 2b) |
| Storage of input | N/A | Not decided here — recommend ephemeral-only for MVP |
| Client/provider boundary | Server-only, never client-direct | Same — unchanged |

## What This ADR Does Not Decide

- The specific AI/vision provider or model.
- Whether/how the original document is retained beyond the extraction
  call.
- Subscription-tier gating or usage limits (Section 9/module #19's
  job).
- Any functional requirement, UX detail, or failure-mode behavior —
  entirely the companion spec amendment's job.

**This ADR requires explicit Product Architect approval before the
companion spec amendment's functional requirements can be treated as
implementation-ready.**

**IMPLEMENTATION STATUS: NOT AUTHORIZED.**
