# Firestore Tenant Isolation Audit — Plan

**Status:** Plan only. No implementation, no rule changes, no new test
code in this document or its authoring commit. This defines *what* the
audit will check and *how* completion will be judged; running it is a
separate, later step.

**Why this exists:** Tenant isolation is a load-bearing SABUSH BPT
principle (Architecture 12, Security Architecture doc). `firestore.rules`
already encodes isolation intent throughout, and the existing suite in
`tests/firestore-rules.test.ts` proves out the Closing Integrity
Amendment thoroughly — but that suite has exactly one cross-tenant
assertion in it (`expenses`, "a user from another business cannot read
or write this business's expenses"). Every other business-scoped
collection has zero cross-tenant test coverage today. This plan closes
that gap systematically instead of ad hoc.

---

## 1. Scope — collections reviewed

Every subcollection under `/businesses/{businessId}`, taken directly
from `firestore.rules`, plus the top-level `/users/{userId}` collection
since it gates membership for everything else:

| Collection | Current isolation primitive | Cross-tenant test exists today? |
|---|---|---|
| `users/{userId}` | `isSignedIn`, owner-of-staff read clause | No |
| `businesses/{businessId}` | `isMemberOf` | No |
| `products/{productId}` | `isMemberOf` / `isOwnerOf` | No |
| `batches/{batchId}` | `isMemberOf` / `isOwnerOf` | No |
| `purchaseBatches/{purchaseBatchId}` | `isMemberOf` / `isOwnerOf` | No |
| `quebras/{quebraId}` | `isMemberOf` / `isOwnerOf` | No |
| `expenses/{expenseId}` | `isMemberOf` / `isOwnerOf` + closed-period gate | **Yes** (existing) |
| `stockCounts/{stockCountId}` | `isMemberOf` / `isOwnerOf` | No |
| `withdrawals/{withdrawalId}` | `isOwnerOf` only + closed-period gate | No |
| `closings/{closingId}` | `isOwnerOrGrantedManager` | No |
| `closedPeriods/{periodKey}` | `isMemberOf` / `isOwnerOrGrantedManager` | No |
| `staff/{staffId}` | `isOwnerOrGrantedManager` | No |
| `timelineEvents/{timelineEventId}` | `isMemberOf` / `isOwnerOf` | No |

Out of scope for this audit: `server/index.ts` Admin-SDK code paths
(Admin SDK bypasses rules by design — that's a separate server-side
authorization review, not a rules audit), and UI-layer access control
(covered by component-level review, not Firestore rules).

---

## 2. Attack scenarios tested per collection

For every collection in the table above, the audit runs each scenario
that's structurally possible for it (not every scenario applies to
every collection — e.g. a collection with no `update` rule has no write
paths to escalate):

1. **Cross-tenant read** — Business B's authenticated member attempts
   `get()` and `list()`/query on a specific Business A document ID they
   know or can guess.
2. **Cross-tenant write (create)** — Business B's member attempts to
   create a document under Business A's `businessId` path.
3. **Cross-tenant write (update/delete)** — where the collection allows
   update/delete at all, Business B's member attempts it against a
   Business A document.
4. **Query-based leakage** — a collection-group or broad query that
   omits a `businessId` filter is attempted, to confirm rules deny it
   at the security-rule layer rather than relying on the client to
   always filter correctly.
5. **Reference/nested cross-tenant** — for documents that reference
   another entity by ID (e.g. a `batch` referencing a `product`, a
   `closing` implicitly covering `expenses`/`withdrawals` via
   `closingId`), confirm a reference can't be used to pull or associate
   data across a business boundary.
6. **Admin/role boundary escalation** — where a rule distinguishes
   Owner vs. Staff vs. Manager (`isOwnerOf`, `isOwnerOrGrantedManager`),
   confirm a lower-privilege member of the *same* business cannot act
   as a higher one, and that this holds independently of the
   cross-tenant checks above.
7. **Suspended-member bypass** — confirm a member with `suspended: true`
   loses read/write access immediately (per `isSuspended()`), not just
   after their ID token naturally expires.

---

## 3. Method

- Extends `tests/firestore-rules.test.ts` (same `@firebase/rules-unit-testing`
  harness already in use) rather than introducing a new tool or pattern.
- Each collection gets one `describe` block; each attack scenario that
  applies to that collection gets one `it`.
- Tests run against the Firebase Rules Emulator — this is exactly the
  `npm run test:rules:emulator` command already blocked in the current
  sandbox (network egress doesn't reach Firebase's emulator infra) and
  documented as Priority 1 in `HANDOFF.md`. Writing these tests can
  happen now; **running them cannot happen in this environment** and
  requires the unrestricted environment mentioned there.
- No `firestore.rules` changes are made as part of writing the tests.
  If a test reveals a real gap, that becomes a separate, explicitly
  reviewed rule-change task — not a silent fix bundled into the audit.

---

## 4. Acceptance criteria

The audit is complete when, for every collection in the Section 1
table:

- Every applicable scenario from Section 2 has a corresponding
  passing test.
- Every test that *should* deny access asserts denial explicitly
  (`assertFails`), not merely the absence of a thrown error.
- The full suite passes against the real Firebase Rules Emulator (not
  just locally reasoned about) — this is the same bar already set for
  the Closing Integrity Amendment tests, applied uniformly.
- Any gap the audit finds is written up as a named finding (collection,
  scenario, current behavior, risk) rather than fixed inline, and
  handed back for an explicit decision before any rule change.

---

## 5. Deliverables

1. This plan document.
2. `tests/firestore-rules.test.ts` extended with the new `describe`
   blocks per Section 1/2 (separate task from this plan — plan first,
   then implementation, per the Architect's sequencing).
3. `docs/security/firestore-tenant-isolation-audit-findings.md` — written
   only once the emulator run is actually executed somewhere with
   network access to Firebase's emulator infrastructure. Lists pass/fail
   per scenario and any findings requiring follow-up.
