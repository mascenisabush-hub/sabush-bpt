# Phase 0 Stage 3 — Backfill Migration Execution Plan

**Type:** Migration execution plan. Not code, not a script, not
authorization to run anything against real data.
**Lifecycle status:** Stage 3 of
`docs/engineering/phase0-owner-admin-migration-implementation-plan.md`
is **Planned and Product-Architect-reviewed** as of this document (plan
content approved; one addition required — §11 — before implementation;
implementation itself still requires separate, explicit authorization
per Rule 8). Not Designed-in-detail beyond what follows, not
Implemented, not Executed, not Analyzed.
**Basis:** Stage 3's one-paragraph description in the parent plan
("a one-time, idempotent script... updates every existing
`users/{uid}` document with `role: 'owner'` to `role: 'admin'`"),
expanded here per the Product Architect's explicit request, before any
implementation begins.
**Nothing has been built, run, or modified in `src/`, `server/`,
`firestore.rules`, or any data to produce this document.**

---

## 1. Objective

Turn Stage 3's one-line description into a concrete, reviewable
execution plan — method, idempotency, logging, rollback, partial-
failure handling, verification, and rollout procedure — so that once
approved, implementation is a direct translation of an already-agreed
plan rather than a series of new decisions made mid-script.

## 2. Migration Method

**Recommendation: a standalone one-time Admin SDK script, not a batch
process framework and not a Cloud Function.**

- **Not Cloud Functions:** ruled out for the same reason `server/index.ts`
  already avoids them — Cloud Functions requires the Blaze billing
  plan, which the project deliberately does not depend on (Architecture
  §4.1).
- **Not a new batch-processing framework:** there is no Background
  Worker yet (confirmed 0% built by the Platform Infrastructure
  readiness assessment this session), and standing this up specifically
  for a one-time migration would be scope creep — the Worker's real job
  starts in Phase 1, not here.
- **Reuse the existing credential pattern.** `server/index.ts` already
  has a working, tested pattern for authenticating to Firestore via
  `firebase-admin` using a base64-encoded service account key
  (`FIREBASE_SERVICE_ACCOUNT_BASE64`). The migration script reuses this
  exact pattern (same env var, same `initializeApp`/`cert` call shape)
  rather than inventing a second credential-loading mechanism —
  consistent with the project's "reuse existing services/patterns"
  discipline. It is a separate, standalone script (e.g. run via
  `tsx scripts/migrate-owner-to-admin.ts`), not wired into the Express
  app or any request path — it has no reason to be reachable over HTTP
  and shouldn't be.
- **Query shape:** `users` collection, `where('role', '==', 'owner')`,
  processed in bounded batches (Firestore batched writes cap at 500
  operations — the script pages through results rather than assuming
  the whole collection fits in one batch).

## 3. Idempotency

- The script's only side effect is: for each document currently
  `role: 'owner'`, write `role: 'admin'`.
- Running it twice is a no-op the second time by construction: the
  query (`role == 'owner'`) simply returns zero documents once the
  first run completes successfully — there is no separate "already
  migrated" flag to maintain or get out of sync.
- No document is ever read as `'owner'` and written as anything other
  than `'admin'` — the transformation has exactly one direction and one
  outcome, which is what makes re-running safe rather than merely
  harmless.

## 4. Progress Logging and Audit Trail

Two distinct things, kept separate:

- **Operational script logging (in scope for this migration):**
  structured log lines to stdout/a log file — one line per batch
  (`Migrated batch N: X documents, ids [...]`), a final summary line
  (`Total migrated: X. Remaining role=='owner' documents: 0.`), and any
  per-document error logged with the document id and error detail
  (never silently swallowed). This is standard operational logging, not
  a new data-model decision.
- **A permanent, queryable Firestore audit-log entry per migrated
  document: decided out of scope for this script — Product Architect
  decision, resolved.** The project's audit-log surface
  (`platform_audit_log`, per Architecture §9 / Module #18) does not
  exist in code yet — Module #18 is Accepted at the documentation stage
  only, with no runtime implementation. Writing into a collection that
  hasn't been architected for this purpose would be inventing
  schema/business rules unilaterally, which is exactly what this
  project's process forbids. Reasoning adopted by the Product
  Architect: this migration is one-time, administrator-initiated,
  operational, and outside the normal application workflow, so a
  committed script plus operational logging is an adequate audit trail
  without introducing new platform infrastructure for a one-off
  migration. **Decision: do not block Stage 3 on a platform audit log.**
  The operational log (§ above) must additionally capture, at minimum:
  execution timestamp, Git commit hash of the script being run,
  operator identity, total documents scanned, total migrated, failures
  (with document ids), and rerun count if applicable. If the platform
  later gains a general-purpose audit-logging capability, future
  operational migrations may integrate with it — this decision does not
  expand Stage 3's scope to build that now.

## 5. Rollback Strategy

- **During the compatibility window (Stages 1–5, before Stage 6 closes
  it):** rollback is symmetric and low-risk. `firestore.rules` still
  accepts both `'owner'` and `'admin'` (Stage 1), so a migrated document
  reverted back to `'owner'` (or left as `'admin'` if rollback isn't
  needed) behaves identically either way from the app's perspective.
  A rollback script would run the same query in reverse
  (`where('role', '==', 'admin')`, excluding any document confirmed to
  have been created natively as `'admin'` post-Stage-2 — see the
  distinction in §6) and write `role: 'owner'` back.
- **The one genuine risk:** once Stage 2 has shipped, some documents
  will be `'admin'` *natively* (created that way at registration, never
  migrated). A naive rollback that reverts every `'admin'`-valued
  document to `'owner'` would incorrectly roll back those, too. §6
  addresses how the migration script itself must distinguish these.
- **After Stage 6 closes the compatibility window:** rollback of the
  *data* migration is no longer safe to do casually, because rules no
  longer accept `'owner'` at all — reverting data at that point would
  actively lock accounts out. This is exactly why the parent plan
  sequences Stage 6 last and treats it as the one stage whose revert
  restores a safety net rather than merely undoing a naming change.
  Practically: don't consider rolling back Stage 3's data migration
  once Stage 6 has shipped; roll back Stage 6 first if a problem is
  discovered, which restores tolerance, then address the data.

## 6. Distinguishing Migrated vs. Natively-Created `'admin'` Documents

This is the one real design decision Stage 3 needs that the parent
plan's one-paragraph description doesn't resolve, and it matters for
both idempotency-adjacent correctness and rollback (§5):

- The migration script's query is `role == 'owner'` — it only ever
  touches documents still holding the legacy value, so it never
  touches a natively-created `'admin'` document (created via Stage 2's
  registration path) in the first place. No document is "double-
  counted" or reprocessed.
- This means the distinction in §5 resolves itself as a natural
  consequence of the query shape, *not* something that needs a new
  field or marker — the migration script never has to tell the two
  cases apart at write time, only avoid ever selecting a document that
  isn't `'owner'`.
- Recommendation: no new field (e.g. `roleMigratedAt`) is needed for
  this reason alone. If a permanent record of *which* documents were
  migrated vs. natively created is wanted for other reasons (analytics,
  support tooling), that's a separate, explicit product decision — not
  assumed here.

## 7. Handling of Partial Failures

- **Batch-level:** if a batch commit fails partway through (network
  error, quota, etc.), the script logs the failure with the batch's
  document ids and does not proceed to the next batch automatically —
  it stops, so a human can inspect the logged error before deciding
  whether to re-run. Because the operation is idempotent (§3), simply
  re-running the whole script after a partial failure is always safe:
  already-migrated documents are excluded by the query on the next run,
  and only the genuinely-still-`'owner'` documents (including any from
  the failed batch) are retried.
- **Document-level:** if an individual document write fails inside an
  otherwise-successful batch (e.g. a concurrent write conflict), that
  document is logged individually and simply remains `role: 'owner'` —
  still fully functional under the Stage 1 dual-read rules — and gets
  picked up by the next run of the script.
- **No partial failure ever leaves an account non-functional.** This is
  the direct benefit of doing Stage 3 only after Stage 1's tolerance is
  live: every document, whether migrated, not-yet-migrated, or
  failed-and-retried, is valid under `firestore.rules` at every point in
  this process.

## 8. Post-Migration Verification Queries

Run after every execution (including re-runs), before considering the
migration "done" for that run:

1. **Completeness check:** `users` collection,
   `where('role', '==', 'owner')` — must return zero documents. If not
   zero, the run is incomplete; re-run rather than proceeding to Stage
   4/5/6.
2. **Non-corruption spot-check:** sample N migrated documents (e.g. 20,
   or 5% of the total, whichever is larger) and confirm every other
   field (`businessId`, `businessIds`, `activeBusinessId`, `email`,
   `name`, `createdAt`, `suspended`, `staffTier` where present) is
   byte-identical to before migration — the script's write must be a
   single-field update (`role` only), never a full-document overwrite,
   specifically to make this guarantee structurally true rather than
   something that has to be separately verified for every field.
3. **Functional check:** for a small sample of migrated accounts,
   confirm (via the existing `test:rules` suite pattern, or a manual
   check against a real/staging project) that every previously-`isOwnerOf`-gated
   operation still succeeds — this is the same category of check
   Stage 1's additive test already performs for a synthetic `'admin'`
   profile; running it here confirms it also holds for a *real*,
   migrated one.

## 9. Production Rollout Procedure

1. **Staging/emulator dry run first**, if a staging Firebase project or
   working emulator is available in whatever environment eventually
   executes this (this sandbox's own emulator access is blocked by
   network egress — see the Stage 1/Stage 2 verification notes — so
   this dry run necessarily happens outside this sandbox).
2. **Take note of the pre-migration document count** (`role == 'owner'`
   count) before running, for later reconciliation against the
   post-migration completeness check (§8.1).
3. **Run during low-traffic hours** — not because the operation is
   unsafe under load (each write is a single-field update, no read-
   modify-write race with app-level logic), but because it minimizes
   any observability noise while confirming behavior for the first
   production run of a new script.
4. **Run `--dry-run` against production immediately before the real
   run** (§11) — confirm the reported count matches the pre-migration
   count from step 2, and spot-check the logged sample ids look
   correct. Only then run without `--dry-run`.
5. **Run once (write mode), observe the full log output and
   completeness check.** Do not proceed to Stage 4 (identifier rename)
   until §8.1's completeness check returns zero.
6. **Keep the compatibility window open (do not begin Stage 6) for an
   agreed observation period** after Stage 3 completes in production —
   long enough to catch any account that logs in rarely and might
   surface an edge case the initial run didn't (e.g. a document with an
   unusual/legacy shape not seen in the sample check). The parent
   plan's Stage 5 (full verification) and Stage 6 (close the window)
   remain separate, explicitly-authorized stages regardless.

## 10. What This Plan Does Not Do

- Does not write the migration script itself — that's Stage 3
  implementation, still separately authorized.
- Does not change the parent plan's stage boundaries, commit
  discipline, or governance model in any way.

## 11. Dry-Run Mode (required addition, Product Architect review)

Added as a required part of the plan, not optional, before Stage 3
implementation is authorized:

- The script supports a `--dry-run` flag as its default review path.
  In dry-run mode it performs the read query (`role == 'owner'`),
  reports the total count of documents that would be updated, and logs
  the first N document ids (N configurable, small default e.g. 20) —
  and performs **zero writes**.
- A second, separate invocation without `--dry-run` performs the actual
  migration (writes), using the same query and batching logic already
  specified in §2/§3.
- This does not change §2 (method), §3 (idempotency), §7 (partial
  failure handling), or §8 (post-migration verification) — dry-run is
  an additional safety gate before the write path runs, not a
  replacement for any of them. §9's rollout procedure step 1
  ("staging/emulator dry run") and this flag are complementary: the
  flag is what makes a dry run possible against production data itself,
  not only staging/emulator, immediately before the real run.
- Rationale: reduces operator error and provides a final, concrete
  confirmation (exact count and sample ids) immediately before an
  irreversible-in-practice production write, at negligible
  implementation cost (the query and read path are already required by
  the script; dry-run mode only gates whether the write step executes).

---

**Product Architect review (this update):** Plan approved as written —
method, idempotency, partial-failure handling, rollback, verification,
and rollout procedure all approved without change. Audit-log open
question (§4) resolved: no platform audit-log dependency, operational
logging only, with the specific fields listed in §4. One addition
required and now incorporated: dry-run mode (§11), wired into the
rollout procedure (§9 step 4).

**Next step, if and when authorized:** Stage 3 implementation — the
migration script itself (including `--dry-run` per §11), built per this
plan, as its own commit, verified per §8, and stopping at Analyzed for
review before Stage 4. **This review approves the plan document only —
it does not authorize Stage 3 implementation.** That remains a
separate, explicit go-ahead per Rule 8.
