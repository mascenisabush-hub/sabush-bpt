# Module #17 (Owner Portfolio) — v0.2 Addendum — Close-Out

**Type:** Project record — a closure checkpoint, not a governance
document. Does not itself approve, redefine, or re-derive any
specification, amendment, or authorization; it records that the
authorized implementation has been delivered, verified, and merged.
Stage 11 of the [Platform Engineering Governance Standard](./platform-engineering-governance-standard.md).
**Feature:** Owner Portfolio v0.2 — explicit per-shop `currentWorth`
refresh, grounded in [`17-owner-portfolio.md`](../specs/17-owner-portfolio.md)
(v1.0, ✅ Approved) and its
[`17-multi-shop-addendum-owner-portfolio.md`](../specs/17-multi-shop-addendum-owner-portfolio.md)
(v0.2, ✅ Concept/Specification Approved, later amended), specified in
detail by the accepted
[`17-owner-portfolio-addendum-currentworth-refresh-amendment.md`](../specs/17-owner-portfolio-addendum-currentworth-refresh-amendment.md),
planned by
[`17-owner-portfolio-addendum-implementation-plan.md`](./17-owner-portfolio-addendum-implementation-plan.md)
(Planned, Amended, Corrected), assessed by
[`17-owner-portfolio-addendum-rule8-assessment.md`](./17-owner-portfolio-addendum-rule8-assessment.md)
(`READY AFTER DECISIONS`), and authorized by
[`17-owner-portfolio-addendum-implementation-authorization.md`](./17-owner-portfolio-addendum-implementation-authorization.md).
**Commits:** `8111a0b` (implementation), `10c6dfe` (AC #11 corrective
fix — this close-out's own predecessor commit).

---

## 1. Closeout Status

**Status: CLOSED.**

**Owner Portfolio v0.2 — `currentWorth` explicit per-shop refresh.**

---

## 2. Historical Governance Record

**This section is preserved exactly as established by the governance
chain that produced it — this close-out does not soften, reinterpret,
or walk back any part of it:**

- The v0.2 addendum was Concept/Specification Approved (`115c94c`),
  later amended (merged) to add the explicit per-shop refresh
  mechanism and five additional Acceptance Criteria — twelve in total.
- The Stage 2 Specification Amendment
  (`17-owner-portfolio-addendum-currentworth-refresh-amendment.md`)
  was Accepted, 2026-08-17.
- The Implementation Plan was Planned, then Amended (§5.5, §5.6, §5.8,
  §5.10, §5.11, §5.16) following the Product Architecture Decision,
  then separately Corrected after a feasibility check found an earlier
  "active-shop-only" reading of the refresh mechanism to be an
  erroneous inference — a refresh may target any owned shop, not only
  the active one.
- The Rule 8 Assessment concluded `READY AFTER DECISIONS`.
- The Stage 8 Implementation Authorization
  (`17-owner-portfolio-addendum-implementation-authorization.md`)
  records the Product Architect's review and authorization, dated
  2026-08-17, scoped by its own §2 (What Is Authorized) and §3 (What
  Is Not Authorized).
- Implementation followed authorization, at `8111a0b`.
- Fresh Stage 10 verification against the signed Authorization's §2/§3
  and all twelve accepted Acceptance Criteria found the implementation
  satisfied eleven of twelve; AC #11 (visible fresh/stale/missing
  freshness distinction) was not met by the initial implementation —
  recorded honestly, not silently, at the time it was found.
- A narrowly-scoped corrective fix, `10c6dfe`, resolved AC #11 using
  the already-authorized `calculatedAt` field and an
  engineering-level freshness threshold — a choice the governance
  chain had itself explicitly deferred to engineering discretion (Plan
  §5.16 item 4; Authorization §2's "Explicitly-deferred implementation
  choices" list) rather than a reopened product decision. No
  governance document was amended to produce this fix.

**This close-out does NOT rewrite that historical sequence.** Nothing
in this document alters the base specification, the addendum, the
accepted Amendment, the Rule 8 Assessment, the Implementation Plan, or
the signed Authorization.

---

## 3. Scope Fidelity

Re-verified fresh this session, against current repository state
(`main` HEAD `10c6dfe` at drafting time, confirmed via independent
`git fetch` immediately before this document was written), not reused
from an earlier session's claim:

| Governed requirement (Authorization §2/§3) | Evidence | Result |
|---|---|---|
| Explicit, per-shop refresh only — never automatic, never bulk | `OwnerPortfolioModal.tsx`: exactly one call site, `refreshShopWorth(b.id)`, from a per-row button `onClick` | ✅ Confirmed |
| No background job, scheduled recompute, or write-triggered hook | Grepped for `onSnapshot`, `setInterval`, `setTimeout`, cron-style triggers in the touched files | ✅ None found |
| Existing Business Worth Engine as sole calculation path | `refreshShopWorth`'s formula (`totalMarketValue - shopTotalExpenses - shopTotalWithdrawals`) is byte-identical to the pre-existing active-shop `businessWorth` calculation at `AppContext.tsx:740` | ✅ Confirmed |
| `currentWorth` at `businesses/{businessId}.currentWorth`, shape `{ value, calculatedAt, sourceRevision? }` | `types.ts` diff | ✅ Confirmed |
| `calculatedAt` client-supplied (`new Date().toISOString()`), not `serverTimestamp()` | `AppContext.tsx` diff | ✅ Confirmed |
| Per-shop isolation via existing, unmodified `isOwnerOf`/`isMemberOf` | `firestore.rules` — zero lines changed anywhere in this feature | ✅ Confirmed |
| Failed refresh preserves prior cached value and `calculatedAt` | `updateDoc` only reachable after all reads and calculation succeed inside the `try` block; `catch` never re-throws, never writes | ✅ Confirmed |
| No `firestore.rules` or `firestore.indexes.json` change | `git diff` across the full feature, both commits | ✅ Zero changes, either file |
| No cross-business aggregation | No `.reduce`/sum/average logic anywhere in `OwnerPortfolioModal.tsx` | ✅ Confirmed |
| `currentWorth` never consumed outside this feature (Dashboard, Reports, Engine, Closings, Modules #3–13) | Repository-wide grep for `currentWorth` outside the three authorized runtime files | ✅ Zero matches |
| No `ShopSwitcher` or subscription-related change | `OwnerPortfolioModal.tsx` neither imports nor calls `switchShop`/`ShopSwitcher`; no subscription-related reference anywhere in the touched files | ✅ Confirmed |
| Visible fresh/stale/missing distinction (AC #11) | `OwnerPortfolioModal.tsx`: `isStale()`, `FRESHNESS_THRESHOLD_MS`, amber/clock-icon stale styling, distinct "Ainda não calculado" missing state | ✅ Confirmed (post-`10c6dfe`) |

**No scope deviation identified.**

---

## 4. Implementation Delivered

Two commits — combined diff `c775503^..10c6dfe`:

```
apps/tenant/src/components/Header.tsx              |  26 ++-
apps/tenant/src/components/OwnerPortfolioModal.tsx | 184 ++++++++++++++++++
apps/tenant/src/context/AppContext.tsx             |  86 +++++++++
apps/tenant/src/types.ts                           |  22 +++
package.json                                       |   1 +
tests/owner-portfolio-currentworth.test.ts         | 207 +++++++++++++++++++++
6 files changed, 525 insertions(+), 1 deletion(-)
```

**No `firestore.rules` or `firestore.indexes.json` change anywhere in
this feature** — confirmed both by this diff (neither file appears in
it) and independently, repeatedly, at every verification pass across
both commits.

**What was built, by commit:**

| Commit | Delivered |
|---|---|
| `8111a0b` | `apps/tenant/src/types.ts` — `Business.currentWorth?` field, additive. `apps/tenant/src/context/AppContext.tsx` — `refreshShopWorth(businessId)`: one-time `getDocs()` reads scoped to a single `businessId`, reuses the existing calculation path, writes a client-supplied `calculatedAt`, never throws. `apps/tenant/src/components/OwnerPortfolioModal.tsx` (new) — one row per owned shop, per-row refresh, per-row independent state. `apps/tenant/src/components/Header.tsx` — entry point gated on `ownedBusinesses.length > 1`, inside the `isOwner` branch only. `tests/owner-portfolio-currentworth.test.ts` (new). |
| `10c6dfe` | `apps/tenant/src/components/OwnerPortfolioModal.tsx` — AC #11 corrective fix: a named `FRESHNESS_THRESHOLD_MS` constant and `isStale()` helper, using the already-authorized `calculatedAt` field; visually and textually distinct fresh / stale ("desatualizado", amber, clock icon) / missing ("Ainda não calculado") states. `tests/owner-portfolio-currentworth.test.ts` — 7 additional tests covering the fix and confirming no new automatic-refresh call site was introduced. No other file touched by this commit. |

---

## 5. Verification Evidence

### Automated verification

**Non-emulator (source-level, executed and independently reproducible
in this environment — most recently confirmed against a fresh,
independent clone of `main` at `10c6dfe`, not the working checkout
used during implementation):**

- 35 of 40 test files run cleanly end-to-end in this sandbox.
- **Total: 639/639 passing, 0 failures.**
- `tsc --noEmit` — clean, exit 0.
- `vite build` (production) — clean, exit 0.

**Emulator-dependent (Firestore emulator required — this sandbox's
network egress does not reach Google's emulator infrastructure, the
same standing, documented limitation as every prior emulator-dependent
verification in this repository):**

- `tests/firestore-rules.test.ts` — 121/121 pass
- `tests/open-batch-concurrency.test.ts` — 22/22 pass
- `tests/periodic-stock-finalization.test.ts` — 5/5 pass
- `tests/superadmin-audit-log-firestore-query.test.ts` — 14/14 pass
- `tests/superadmin-business-directory-firestore.test.ts` — 18/18 pass
- **Total: 180/180 pass, 0 fail.**

**These 180 results were obtained and supplied by the Product
Architect, running each suite's corresponding `*:emulator` script on a
local machine with unrestricted network access — not executed or
independently reproduced within this Claude environment.** Reviewed
here against the actual terminal output supplied (test names, specific
`firestore.rules` line numbers cited in evaluation errors, and timing
values distinctive to each suite, cross-checked against this
repository's own source to confirm each screenshot corresponded to the
suite it was claimed to be), consistent with how this repository has
always treated results this sandbox cannot itself obtain. This is
externally-executed, reviewed evidence — not this session's own
execution — and is recorded as such rather than folded silently into
a single "all tests pass" claim.

**Combined total: 819/819 tests passing across the full suite (639
executed directly in this environment + 180 executed externally and
reviewed here), 0 failures, 0 unexplained gaps.**

### Repository state verification

- Fast-forward merge, `main`: `c775503` → `10c6dfe`. No merge commit —
  nothing to reconcile.
- Pushed to `origin/main`, confirmed via independent `git fetch`
  (not the push command's own reported output) both immediately after
  the push and again at the start of this Close-out's own drafting.
- `feature/owner-portfolio-currentworth` remains at `10c6dfe`,
  untouched by the merge.
- `docs/spec-17-owner-portfolio-addendum` remains at `8ea2459`,
  untouched throughout implementation, correction, merge, and this
  Close-out's drafting.
- Working tree clean at every checkpoint.

---

## 6. Known Limitations / Non-Blocking Notes

- **The five emulator-dependent suites' 180/180 result is externally
  supplied, not independently executed in this environment** —
  recorded as such in §5, not overstated as this session's own
  execution.
- **A documentation inconsistency in the signed Authorization was
  identified during Stage 10 verification and is recorded here rather
  than silently resolved.** The Authorization document
  (`17-owner-portfolio-addendum-implementation-authorization.md`)
  contains a completed §5 signature block (`Product Architect:
  SABUSHIMIKE Masceni`, `Date: 2026-08-17`), but its header, the intro
  to its "Governance requirements" section, and its closing Lifecycle
  line all still read "signature pending" — all four locations
  originate from the document's single authoring commit; no later
  commit ever reconciled them. Implementation proceeded on the basis
  of a separate, direct, conversational Product Architect authorization
  independent of the document's own wording, per the Product
  Architect's own account. This close-out does not resolve or take a
  position on which reading of the document's signature status is
  correct — that remains an open question about the historical record,
  named plainly rather than left implicit, and is not altered by this
  document.
- **The addendum's own stale `17-multi-shop.md` references** (the
  "Depends on:" line, Purpose's first sentence), named as explicitly
  out-of-scope by the Authorization's own §3, remain outstanding —
  a pre-existing addendum documentation matter, not something this
  feature's implementation was ever scoped to fix. Recorded here for
  continuity with §6/§8 of the original session handoff that first
  flagged it, not newly discovered by this document, and not resolved
  by this close-out.
- No other limitations specific to this feature were identified during
  this close-out beyond what §2 already records as historical fact.

---

## 7. Closure Decision

**Owner Portfolio v0.2 (`currentWorth` explicit per-shop refresh) is
CLOSED.**

The implementation is accepted into the governed baseline, live on
`main` at `10c6dfe`.

Closure is based on:
- Signed Stage 8 Implementation Authorization (§2, above; see §6 for
  the recorded, unresolved documentation note on that record's own
  internal wording).
- Scope-fidelity verification (§3, above) — no deviation found.
- All twelve accepted Acceptance Criteria satisfied — eleven at
  initial implementation (`8111a0b`), the twelfth (AC #11) by the
  corrective fix (`10c6dfe`), each independently re-verified against
  the final merged code, not assumed carried forward.
- 819/819 passing tests (§5): 639 executed directly in this
  environment, 180 executed externally and reviewed here.
- Clean typecheck and production build, both independently reproduced
  against a fresh clone of the merged `main`.
- Fast-forward merge to `main`, pushed, and independently
  re-verified via fresh `git fetch` rather than trusted from the merge
  or push commands' own reported output.

---

## 8. Historical Integrity Statement

**This close-out does not retroactively resolve the signature-wording
inconsistency named in §6, and does not retroactively make AC #11 have
been satisfied from the start.** The implementation genuinely shipped
with only eleven of twelve Acceptance Criteria met; that gap was
identified, reported, and corrected in a separate, narrowly-scoped
commit rather than folded silently into the original implementation
commit's history. Both facts remain part of the permanent record,
unaltered by this document. Closure records that the outcome —
including the correction — was verified and accepted; it does not, and
cannot, make the process itself have gone differently than it did.

---

## 9. Post-Closeout Status

**This feature requires no further engineering work for closure.** Any
future change to Owner Portfolio's freshness threshold value, entry-
point placement, `sourceRevision` inclusion, or any functionality
beyond what the signed Authorization's §2 describes is a **new
initiative** and must not reopen this feature's completed governance
status unless explicitly authorized as new, separately-scoped work,
following the Governance Standard's Stages 1–8 in order.

---

## Governance Notes

- This record does not modify the base specification, the addendum,
  the accepted Specification Amendment, the Rule 8 Assessment, the
  Implementation Plan, or the signed Authorization — it sits
  downstream of all of them, closing based on their already-settled
  content.
- This record does not authorize any future extension of Owner
  Portfolio functionality — any such extension requires its own
  governance record, per the Governance Standard's Non-Negotiable
  Principle 6 ("a governance artifact records; it does not decide").
- This record does not modify `apps/tenant/src/types.ts`,
  `apps/tenant/src/context/AppContext.tsx`,
  `apps/tenant/src/components/OwnerPortfolioModal.tsx`,
  `apps/tenant/src/components/Header.tsx`, `tests/owner-portfolio-currentworth.test.ts`,
  `firestore.rules`, or `firestore.indexes.json`. None were touched to
  produce this close-out.
- **Lifecycle:** Concept Approved → Planned → Assessed → Product
  Architecture Decision → Specification Amendment Accepted →
  Implementation Plan Amended and Corrected → Authorized →
  Implemented (`8111a0b`) → Verified (AC #11 gap found) → Corrected
  (`10c6dfe`) → Re-Verified (12/12, 819/819) → Merged to `main` →
  **Closed** (this document). Any future extension of Owner Portfolio
  functionality begins as its own, separate engineering milestone,
  gated on its own Rule 8 Assessment and its own explicit Product
  Architect authorization.
