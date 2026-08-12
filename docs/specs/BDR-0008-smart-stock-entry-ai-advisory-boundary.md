Business Decision Record

# BDR-0008 — Smart Stock Entry: AI-Assisted, Human-Confirmed Data Capture

**Status:** Drafted, awaiting Product Architect approval. Not yet
approved. Nothing in this document authorizes implementation.
**Type:** Business Decision Record — a strategic, long-lived decision
about why this capability exists and what boundary it may never cross,
per the category the Governance Decision Record
([19-governance-bdr-policy-framework.md](./19-governance-bdr-policy-framework.md))
establishes. Not a Policy (no "how, specifically" operational rule is
fixed here) and not a Business Domain Specification (no functional
requirement or acceptance criterion is fixed here — see the
companion [Smart Stock Entry Amendment](./04-smart-stock-entry-amendment.md)
for that).
**Location note:** Filed without a module prefix, following
`BDR-0004`'s precedent — this decision is cross-cutting (touches
Purchase Batches/Stock Batches, spec #4/#5; AI Intelligence, spec #15;
Security Architecture, Section 12) rather than belonging to a single
existing module.
**Depends on:** Architecture Principle 2.4 (Data Integrity Over
Convenience — "must never be blurred, merged, or approximated for the
sake of a simpler UI, a faster feature build, **or an AI shortcut**"),
Principle 2.2 (Worth-First Scope), Section 10.1 ("an AI output is a
labeled prediction, never a fact") — this decision applies that same
governing discipline to a structurally different kind of AI output
(a data-entry proposal, not a prediction) that Section 10 did not
anticipate.
**Followed by:** The [Smart Stock Entry Amendment](./04-smart-stock-entry-amendment.md)
(spec #4) operationalizes this decision into functional requirements;
a companion Architecture ADR
([10-smart-stock-entry-adr.md](../architecture/10-smart-stock-entry-adr.md))
resolves the domain-placement and integration-shape questions this
decision surfaces but does not itself answer.

---

## 1. The Business Decision

**SABUSH BPT may use AI/document-vision capability to help a user
convert a photographed purchase document (receipt, invoice, supplier
sheet, delivery note) into a proposed Stock Entry. AI extraction is
advisory only. No AI-extracted quantity, price, product identity,
supplier, date, or any other financially consequential field ever
becomes an authoritative record until an authorized human has
reviewed, optionally edited, and explicitly confirmed it through the
existing Add Stock workflow.**

This is the validated form of the business-level instruction that
originated this task, checked against — and found consistent with —
the repository's existing governing language rather than adopted
verbatim.

**The central framing this decision protects, stated as plainly as
possible:** Smart Stock Entry does not make SABUSH BPT an AI
accounting system. It makes the existing, already-approved stock-entry
process faster. The user's own experience of this feature must be "I
don't have to type all this myself" — never "the AI manages my
purchases." Every design decision downstream of this BDR (the ADR, the
spec amendment, and eventually the code) is checked against this
framing the same way every feature in this codebase is checked against
Principle 2.2's Worth-First test: if a design choice would make a user
feel like SABUSH is doing their bookkeeping *for* them rather than
saving them typing, that choice is wrong, regardless of how much more
"automatic" it would feel.

## 1a. AI Disappears After Confirmation

The only objects that are ever authoritative, before or after this
feature exists, are **Product** and **StockBatch** — governed entirely
by the business rules spec #3 and spec #5 already fixed. AI's entire
involvement is confined to the proposal stage and must leave no trace
once a user confirms:

```
Supplier document
      ↓
AI extraction (advisory, transient)
      ↓
Extracted proposal (visible, editable, never persisted as "AI's answer")
      ↓
Human correction (the user's own typing, indistinguishable from typing manually)
      ↓
Existing Product / PurchaseDraft (unchanged mechanisms, spec #3/#4)
      ↓
Existing Add Stock logic (unchanged — addMultipleStockBatches, spec #4/#5)
      ↓
StockBatch (the same authoritative record it has always been)
```

Concretely: a finalized `StockBatch` or `PurchaseBatch` carries **no
field, flag, or marker** recording that AI was involved in proposing
its values — the same way today's records carry no marker recording
whether a fast typist or a slow one entered them. This is deliberate,
not an oversight: it is the structural guarantee that AI cannot become
a second, parallel source of truth sitting alongside Product/
StockBatch, because it has no persistent object of its own to be one.

## 1b. The Trust Test — "Found" vs. "Guessed"

Added at the Product Architect's explicit direction during governance
review, and elevated here rather than left as a review comment,
because it is exactly the kind of enduring, hard-to-reverse-later
principle a BDR exists to hold:

**Every design and implementation decision for this feature must be
judged against one question: does this make recording a legitimate
stock purchase materially faster, without making the business owner
less certain about what SABUSH actually recorded?**

If yes, the decision belongs. If a design choice would let the system
say, or imply, **"I found this"** when what actually happened is
**"I guessed this,"** that choice violates this BDR regardless of how
much smoother it would make the flow feel. Concretely, this means:

- The three confidence states fixed in the companion spec amendment
  (✓ Detected / ⚠ Review / — Not found) exist specifically so the
  system is never forced to choose between silence and a false claim
  of certainty — "⚠ Review" is the honest middle state a two-state
  design (found/not-found) would not have room for.
- Any future change to this feature that would make an uncertain
  extraction *look* certain — a UI simplification that drops the
  indicator, a "smart default" that pre-fills a low-confidence guess
  with the same visual weight as a typed value — is a violation of
  this BDR, not a legitimate UX improvement, and requires this BDR to
  be explicitly reopened before it ships.

## 2. Why This Decision Is Necessary

SABUSH BPT's core differentiator is a trustworthy Business Worth
number (Principle 2.4). Every prior module in this series has
protected that trust by keeping a hard line between "what actually
happened" (an immutable Stock Batch, a locked Closing) and "what the
system is showing as a courtesy" (a reference price, a prediction).
Section 10.1 already drew this exact line for one kind of AI output
(a forecast). Smart Stock Entry introduces a second, different kind of
AI output — not a forecast about the future, but a **guess about what
a photographed document says** — and that guess is one accidental
default-checkbox away from becoming the same kind of unearned
authority a forecast would be if it silently overwrote a real figure.
This BDR exists to name that risk explicitly, before any UI or server
code invites it accidentally.

## 3. The Boundary, Stated Precisely

**Required sequence, with no shortcut permitted at any stage:**

```
DOCUMENT (photo/upload)
  → EXTRACTION (server-invoked AI vision call)
  → PROPOSAL (a draft, never a record)
  → HUMAN REVIEW (every field visible, uncertainty visible)
  → HUMAN EDIT (optional, but always possible)
  → EXPLICIT CONFIRMATION (an affirmative user action)
  → STOCK RECORD (via the existing Add Stock write path, unchanged)
```

**Never permitted, under any framing (efficiency, "smart defaults,"
staff time pressure, subscription tier, or otherwise):**

```
DOCUMENT → AI → AUTOMATIC STOCK RECORD
```

This is not a UI preference. It is the one rule every downstream
design decision (server route shape, review-screen layout, error
handling) must be checked against, the same way Section 10.1 already
functions for prediction-type AI output.

## 4. What "Confirmation" Must Mean

Confirmation is not the same action as "opening the review screen" or
"the extraction completed successfully." It is the same explicit,
user-initiated act that already exists at the end of the current Add
Stock / Purchase Draft finalization flow (`AddStockView`'s submit,
`addMultipleStockBatches`) — Smart Stock Entry reuses that exact
confirmation gesture rather than inventing a second, weaker one. A
user closing the app, losing connectivity, or navigating away before
that gesture leaves nothing recorded — the existing Purchase Draft
persistence mechanism (spec #4's Durable Purchase Capture Amendment)
is the correct home for an in-progress, unconfirmed proposal, not a
new "pending AI record" concept.

## 5. What This Decision Explicitly Does Not Authorize

- It does not authorize any specific AI provider, model, prompt
  design, or cost structure — those are implementation details for a
  later, separate decision, consistent with Section 10.10's "do not
  build AI" discipline applied here too.
- It does not authorize storage of the original uploaded document —
  that is a distinct data-retention decision requiring its own
  privacy/security review (see the companion ADR).
- It does not authorize any change to Business Worth, Embedded Profit,
  Stock Count, Quebra, or Restock Observation semantics. Smart Stock
  Entry is a new **input method** into the existing Add Stock write
  path — it is not a new financial concept.
- It does not authorize automatic Product matching/merging without
  user confirmation, nor invention of a selling price the document
  does not contain, nor inference of "previous remaining stock" from
  a purchase document (a receipt is evidence of a purchase, never
  evidence of physical remaining inventory) — each restated precisely
  in the companion spec amendment's Business Rules.
- It does not authorize implementation. Per Part 20 of the originating
  task and this repository's own governance discipline, this BDR (and
  its companion ADR/spec amendment) require explicit Product
  Architect approval before any production code is written.

## 6. Acceptance Criteria for This Decision

- [ ] No code path exists, or is ever proposed, in which an
      AI-extracted value reaches a `StockBatch`, `Product`, or
      `PurchaseBatch` write without having passed through an explicit,
      human-initiated confirmation step identical in kind to the
      existing Add Stock submission.
- [ ] Every review-screen field sourced from AI extraction is visibly
      distinguishable from a field the user typed themselves, for as
      long as it remains unconfirmed.
- [ ] A failed, ambiguous, or rejected extraction never blocks the
      user from completing a normal, manual Add Stock entry.
- [ ] This decision is cited by name in the companion spec amendment's
      Business Rules section, not re-derived independently there.
- [ ] No confidence state ever collapses "detected with confidence"
      and "guessed/low-confidence" into a visually identical
      presentation (the Trust Test, §1b).

## 7. Status

**Drafted. Awaiting approval. IMPLEMENTATION STATUS: NOT AUTHORIZED.**
