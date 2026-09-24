Amendment Record

# Amendment — PA-01 Clarification: Manual Row Identity Is the Firestore Document Key

**Status:** ✅ **ACCEPTED AND RECORDED**, per Product Owner decision delivered
directly in conversation. Amends the interpretation of PA-01 as recorded
in [`periodic-contagem-data-protection-decisions-product-architect-acceptance.md`](./periodic-contagem-data-protection-decisions-product-architect-acceptance.md)
(the "original acceptance record," preserved below, unaltered, in full).
This amendment resolves an identified ambiguity in PA-01's original
wording; it does **not** reopen, alter, or reinterpret PA-02, PA-03,
PA-06 through PA-16, or any other decision in the original record.

**Prepared by:** Claude (Lead Software Engineer role, this repository),
recording a clarification the Product Owner delivered directly, against
repository state `main` at local HEAD `8d4b1d1fbdfb5d841b2c88b28d5d0fd84d16666a`
(one commit ahead of `origin/main` at the time of this amendment — not
yet pushed).

## 1. Original wording, preserved unaltered for reference

> **PA-01 (original):** "Client-generated, unique, immutable row
> identity, independent of display position/name/array index. Retry
> preserves original identity rather than generating a new one on
> uncertain outcome."

This wording was genuinely ambiguous between two designs: a stable
identity stored as a *field* within a position-keyed document (this
repository's existing precedent, `sourceRowKey` on
`StockCountWorkingRow`, `apps/tenant/src/utils/stockCount.ts` L292), or
a stable identity used *as the document's own Firestore key*. The
original acceptance record did not specify which.

## 2. Clarification, as decided

**PA-01 is clarified as follows:** the stable, client-generated,
unique, immutable identifier is **the manual row's actual Firestore
document key** — replacing the current `manual:{arrayIndex}` scheme
(`PeriodicStockCountView.tsx` L3598) entirely. It is not merely an
additional field alongside a position-based key. **This is the
intended long-term persistence model.**

This brings manual-row identity into alignment with the
position-independent model catalog rows already use and have always
used — `catalog:{productId}`, verified stable and never derived from
array position or display order (`PeriodicStockCountView.tsx` L2627
and elsewhere). Catalog-row identity is unaffected by this amendment;
it already met this standard.

**Direct consequence, recorded:** once implemented, ordinary display
reordering and removal of a row will not require rewriting any
unaffected row's document — a row's document key no longer changes
when its position in the list does.

## 3. PA-04 — scope clarified, not narrowed today

PA-04's general safety principles — preferring atomic operations where
platform limits allow, requiring visible per-row outcomes and explicit
partial-completion reporting for any necessary independent writes, and
never silently swallowing failure — **remain fully applicable** to:
migrations (specifically, the one-time move of a legacy
position-keyed row's content to its new stable key), any genuinely
multi-document operation Contagem still performs, and partial or
uncertain writes generally.

**PA-04's reindex-specific obligations may be narrowed, but only for
operations that no longer perform a reindex write under the
implemented design** — and only once that design is actually
implemented and verified, not merely decided. This amendment does not
itself narrow PA-04; it records the condition under which a future,
separate narrowing would become appropriate.

## 4. PA-05 — general protections preserved, reindex-specific wording conditionally narrowable

PA-05's protections for rows holding meaningful partial data,
unresolved or uncertain rows, and legacy content are **entirely
unaffected by this amendment** and remain in full force regardless of
key scheme. Safe handling of genuinely empty rows likewise remains
required.

**PA-05's reindex-specific sub-rule may be narrowed once the stable-key
design is implemented and verified** — not before, and not merely upon
this decision being recorded.

## 5. Explicitly preserved, unaltered by this amendment

PA-02, PA-03, and PA-06 through PA-16 are not reopened, reinterpreted,
or altered in any way by this amendment. The original acceptance
record's RISK-01 through RISK-04 remain recorded as originally written;
RISK-01 specifically is understood as resolved by this clarification
(the document-key interpretation was the open question it identified),
without this amendment rewriting RISK-01's own original text.

## 6. Outstanding technical design and governance dependencies — not resolved by this amendment

The following require further technical design and their own
governance review before implementation, and are explicitly not
decided by this amendment:

- Exact stable-ID generation mechanism (e.g., UUID v4 or another
  scheme).
- The legacy-draft migration sequence — reading a legacy
  `manual:{index}` document, writing its content to a new
  `manual:{stable-id}` document, and removing the old one, with its
  own atomicity and collision-safety design, not yet specified.
- Whether `firestore.rules` should validate anything about the stable
  identifier's shape or unique generation, beyond the existing `rev`
  and `isActiveContagemEditor` checks.
- A formal Rule 8 Assessment covering the clarified PA-01 together with
  PA-04's and PA-05's conditional narrowing — not yet prepared.

## 7. Status

```
Original PA-01 (ambiguous) — ACCEPTED AND RECORDED
        ↓
Read-only clarification investigation (identified the ambiguity)
        ↓
Product Owner decision (resolved the ambiguity, delivered directly)
        ↓
THIS AMENDMENT — ACCEPTED AND RECORDED
        ↓
Rule 8 Assessment — NOT YET PREPARED (must cover §6's open items)
        ↓
Implementation Plan Amendment — PENDING
        ↓
Implementation Authorization — PENDING
        ↓
Implementation — NOT AUTHORIZED
```

**This amendment does not itself authorize implementation, complete a
Rule 8 Assessment, or create an Implementation Authorization.** No
application code, test, schema, or `firestore.rules` file was modified
to produce this record.
