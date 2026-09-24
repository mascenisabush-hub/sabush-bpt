Amendment Record

# Amendment — Legacy Manual-Row Migration Timing

**Status:** Decision delivered directly in conversation, recorded here.
Resolves the sole remaining open item left by
[`periodic-contagem-data-protection-decisions-pa-01-clarification-amendment.md`](./periodic-contagem-data-protection-decisions-pa-01-clarification-amendment.md)
§6, which explicitly named migration-timing strategy as unresolved.
Does not reopen, alter, or reinterpret PA-01 through PA-16 or the PA-01
clarification amendment in any other respect.

**Prepared by:** Claude (Lead Software Engineer role, this repository),
recording a decision delivered directly in conversation, against
repository state `main` at local HEAD `1acb00404d624504ee4c01cb4be27b59fa600272`
(two commits ahead of `origin/main` at the time of drafting — not yet
pushed).

**Identifier:** no PA-number, BDR number, or POL number is assigned by
this document. A working reference of PA-17 would be consistent with
this session's own established numbering convention, but assignment of
any identifier intended to carry formal weight beyond this session is
left to whoever holds that authority in the repository's actual
governance process — not established by source-code inspection.

## 1. Selected strategy

Eager, resumable migration on draft resume. When a legacy Periodic
Contagem draft is resumed, the application must migrate its legacy
positional manual-row document keys (`manual:{index}`) to stable
UUID-based manual-row keys (`manual:{uuid}`) before ordinary editing or
finalization is permitted to proceed.

## 2. Required safeguards

The implementation must be designed to:

1. Preserve every legacy manual row's contents and meaning during migration.
2. Preserve the intended row order independently of document identity.
3. Avoid duplicate rows, double-counting, silent overwrites, and unintended data loss.
4. Detect and safely handle destination-key collisions.
5. Handle interrupted migration and uncertain persistence outcomes through reconciliation.
6. Prevent ordinary editing and finalization while migration remains incomplete or its outcome is unresolved.
7. Preserve the existing catalog-row identity format (`catalog:{productId}`) and avoid unnecessarily rewriting unaffected catalog rows.
8. Maintain the applicable data-protection, conflict-handling, and authorization safeguards already recorded elsewhere in PA-01 through PA-16.

## 3. Scope limitation

This decision addresses migration timing only. It does not, by itself:

- Authorize implementation.
- Approve changes to `firestore.rules`.
- Approve a schema change or a particular row-ordering mechanism.
- Approve weakening any existing data-protection safeguard.
- Approve unrelated Contagem changes.
- Replace the required Rule 8 Assessment, Implementation Plan
  Amendment, or Implementation Authorization.

## 4. Relationship to existing decisions

Directly resolves PA-01 clarification amendment §6's named open item.
Consistent with, and does not alter, PA-04's and PA-05's existing
conditional-narrowing scope. Does not touch PA-02, PA-03, or PA-06
through PA-16.

## 5. Status

```
PA-01 clarification amendment (migration timing left open)
        ↓
This decision, delivered directly in conversation
        ↓
THIS AMENDMENT — RECORDED
        ↓
Rule 8 Assessment — NOT YET PREPARED
        ↓
Implementation Plan Amendment — PENDING
        ↓
Implementation Authorization — PENDING
        ↓
Implementation — NOT AUTHORIZED
```

**This amendment does not itself authorize implementation.** No
application code, test, schema, or `firestore.rules` file has been
modified to produce this record.
