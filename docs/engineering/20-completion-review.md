# Module #20 (Notifications) — Completion Review

**Type:** Project record — a module-level review, distinct from and
broader than any single phase's Close-Out. Does not itself approve,
redefine, or re-derive any BDS, Amendment, POL, ADR, or plan; it
independently re-verifies whether the module, taken as a whole, matches
what its architecture and governance chain describe. Explicitly does
**not** authorize what comes next (Governance Standard, Non-Negotiable
Principle 6).
**Scope:** All of Module #20 — Phases 1, 2, and 3 together — not a
re-statement of the three phase Close-Outs, an independent
cross-check against them.
**Basis for this review:** direct inspection of the current repository
state at `f882330` (fresh `git fetch`, not assumed from any close-out's
own claim about itself), cross-referenced against
[`20-notifications.md`](../specs/20-notifications.md) (v1.2),
[ADR-0002](../adr/ADR-0002-platform-background-worker.md),
[ADR-0003](../adr/ADR-0003-background-worker-job-registration.md),
[ADR-0004](../adr/ADR-0004-notification-platform-architecture.md),
[BDR-0005](../specs/20-bdr-0005-notification-language-resolution-policy.md),
[BDR-0006](../specs/20-bdr-0006-notification-communication-policy.md),
[BDR-0007](../specs/20-bdr-0007-businessevent-creation-policy.md) +
[Closing Cadence Amendment](../specs/20-bdr-0007-closing-cadence-amendment.md),
[Priority Reconciliation Amendment](../specs/20-notifications-priority-reconciliation-amendment.md),
and the three phase Close-Outs
([1](./20-phase1-closeout.md), [2](./20-phase2-closeout.md),
[3](./20-phase3-closeout.md)).

---

## 1. Does Module #20 Fully Implement the Approved Architecture?

**Yes, for everything V1 scopes as in-authorized-scope. No, and
correctly so, for everything explicitly deferred.**

| Architecture element | Status | Evidence |
|---|---|---|
| `notifications` collection, three trigger sources funneling into one (Architecture §4.9) | ✅ Implemented | Background Worker (3 producers), privileged server (5 staff endpoints), payment webhook (not yet built — Phase 5, correctly unbuilt) |
| `BusinessEvent` contract, producer/platform content-ownership split (ADR-0004) | ✅ Implemented | `server/notificationPlatform.ts`; verified below, §3 |
| Job registration abstraction (ADR-0003) | ✅ Implemented | `server/backgroundWorker.ts`, four jobs registered |
| Dedupe mechanism (ADR-0004 Decision 2, Architecture §4.8.1) | ✅ Implemented, used | `platform_event_dedupe`, called by every `evaluateBusinessEvent()` invocation |
| Watermark mechanism (Architecture §4.8.1) | ⚠️ Built, unused | See §4, below — a real finding, not a violation |
| Delivery Channel abstraction, in-app implemented (ADR-0004 Decision 8) | ✅ Implemented, unchanged since Phase 1 | `src/lib/notifications/deliveryChannel.ts`, zero Phase 3 diff |
| Recipient model — hybrid Business/User scope | ✅ Implemented | Decision Gate 1, unchanged since Phase 1 |
| AI-as-producer principle (ADR-0004 Decision 6) | N/A — correctly unbuilt | Module #15 (AI) not yet started; this ADR decision exists ahead of that module specifically so it doesn't have to re-litigate it |
| Third recipient kind (ADR-0004 Decision 7) | N/A — correctly unbuilt | Module #18 (SuperAdmin) owns this; not Module #20's scope |
| Stock Counts Inventory Risk | N/A — explicitly deferred | BDR-0007 §4.2; confirmed absent by direct grep, §2 below |

**Conclusion:** the architecture Module #20 was designed against is
fully implemented for every element V1 actually calls for. The gaps
that exist (Phase 4–6, SuperAdmin/AI recipient-producer integration,
Stock Counts) are gaps by design, not gaps by omission — each has its
own named, un-triggered future governance step, not a silently skipped
one.

## 2. Are All Authorized Producers Present?

**Yes — independently re-confirmed, not assumed from the Phase 3
Close-Out's own claim.**

Direct grep against the current repository, this session:

```
server/breakageNotificationProducer.ts:   'inventory.risk.breakage'
server/closingNotificationProducer.ts:    'closing.approaching', 'closing.due', 'closing.overdue'
server/trialNotificationProducer.ts:      'trial.ending_soon', 'trial.ending_tomorrow'
```

Six eventTypes, exactly matching BDR-0007 §4's six decisions — no
fewer (nothing missing), no more (no undeclared eventType exists
anywhere in `server/`). Cross-checked: every `registerCommunicationPolicy`
call has a matching `registerTemplate` call for the same eventType (six
pairs, confirmed 1:1, no orphaned policy or orphaned template). Every
producer is registered exactly once at startup
(`server/index.ts`), against the single shared `notificationPlatform`
instance (§3, below) — not a per-producer instance.

**Stock Counts inventory risk:** confirmed absent. Zero matches for any
`inventory.risk.stock*`, discrepancy, or variance eventType/detection
logic anywhere in `server/` or `src/utils/calculations.ts`, per
BDR-0007 §4.2's explicit deferral.

## 3. Are ADR-0002, ADR-0003, and ADR-0004 Fully Respected?

**Yes, on every decision each ADR makes — checked individually, not
assumed as a block.**

**ADR-0002 (Platform Background Worker):** one shared worker instance
(`export const backgroundWorker = new PlatformBackgroundWorker()`),
confirmed singleton by direct grep — no second `new
PlatformBackgroundWorker()` anywhere. Four jobs registered against it
(one pre-existing from Module #19, three from Phase 3); each isolated
by the worker's own try/catch — a thrown error in one job's `execute`
is caught, logged, and never stops another job's own scheduled tick
(confirmed in `backgroundWorker.ts`'s own `runOnce` implementation, not
just claimed in a comment).

**ADR-0003 (Background Worker Job Registration Model):**
`registerJob({ jobType, scheduleMs, execute, retryPolicy })` exists and
is the sole registration path — `runTrialLifecycleSweep()` (Module
#19's own pre-existing job) was migrated onto it in Checkpoint 1, byte-
for-byte unchanged business logic, confirmed by that checkpoint's own
diff. No job anywhere drives its own `setTimeout`/`setInterval`
directly outside this abstraction.

**ADR-0004 (Notification Platform Architecture)** — checked
decision-by-decision:

| Decision | Respected? | How verified |
|---|---|---|
| 1 — Producers emit BusinessEvents, never notification text | ✅ | All three producers' `build*Event()` functions return a `BusinessEvent`; none constructs a `title`/`message` string directly |
| 2 — Idempotency on evaluation, not only notification creation | ✅ | `hasBeenEvaluated()`/`markEvaluated()` called for every outcome (notify/batch/suppress), confirmed in `evaluateBusinessEvent()`'s own control flow |
| 3 — BusinessEvent is in-process only, never persisted as its own document | ✅ | No `businessEvents` collection exists anywhere in `firestore.rules`, `firestore.indexes.json`, or any producer |
| 4 — Platform decides whether/how to communicate, not the producer | ✅ | Every producer calls `evaluateBusinessEvent()`; none inspects or short-circuits the communication-policy outcome itself |
| 5 — Template ownership via existing `LanguageContext`/`t()`, no second localization system | ✅ | `notificationPlatform.ts` imports the exact same three locale files (`src/i18n/locales/{pt,en,fr}.ts`) `LanguageContext.tsx` imports — confirmed by direct import-path comparison, not assumed |
| 6 — AI is another producer, never a direct writer | N/A | Module #15 not built; nothing to violate yet |
| 7 — Recipient binding extensible, third kind not implemented now | ✅ | No SuperAdmin recipient kind exists in `NotificationScope`/`recipient` shapes anywhere in `server/` or `src/types.ts` |
| 8 — Delivery fan-out via existing `DeliveryChannel`, not redecided | ✅ | Zero-line diff on `deliveryChannel.ts` across all of Phase 3, confirmed this session |

**No ADR was reopened, reinterpreted, or violated by any Phase 1–3
implementation decision.**

## 4. Is Notification Platform Ownership Still Clean?

**Yes, with one genuine, worth-naming finding: the watermark mechanism
is built and tested but never actually consumed by any producer.**

**Ownership boundary — confirmed clean:**

- `writeNotification()` has exactly two classes of caller: the five
  Phase 2 staff endpoints (direct legacy path, `server/index.ts`) and
  `evaluateBusinessEvent()`'s own internal call (the Phase 3 pipeline
  path) — no Phase 3 producer calls `writeNotification()` directly,
  confirmed by direct grep.
- `evaluateBusinessEvent()` has exactly three callers: the three Phase
  3 producers, no more — confirmed by direct grep. No Phase 2 endpoint
  calls it (matches the Implementation Plan's own "Legacy
  Compatibility" decision: Phase 2 stays a separate, supported
  direct-producer pattern, not retrofitted onto the BusinessEvent
  contract).
- Client code (`NotificationContext.tsx`) never writes a notification —
  confirmed: only `onSnapshot` (two `where`-scoped listeners) and one
  `updateDoc` (`status` field only, via `markAsRead`). `firestore.rules`
  independently enforces the same boundary (`allow create: if false`),
  so this isn't merely a client-code convention — a malicious or buggy
  client cannot bypass it.
- `firestore.rules`' `importance` field (added by the Priority
  Reconciliation Amendment) is covered by the same
  `request.resource.data.X == resource.data.X` immutability pattern as
  every other notification field — confirmed present, not merely
  claimed in the Amendment's own text.

**The one real finding:** `getWatermark()`/`setWatermark()`
(`server/notificationPlatform.ts`, backed by `platform_worker_state`)
were built in Checkpoint 2 as part of Architecture §4.8.1's mechanism,
are unit-tested (`tests/notification-platform.test.ts`), and are fully
functional — but **zero producers call either function.** All three
producers rely entirely on `platform_event_dedupe` (per-event dedupe,
which they do use, correctly) for correctness; none uses the watermark
for scan-window narrowing. This is not a correctness gap — dedupe alone
is sufficient for correctness, exactly as ADR-0004 Decision 2 requires
— but it is genuinely dead infrastructure from a usage standpoint.
Carried forward explicitly, §6 below, rather than left as an implicit
assumption that "the mechanism is used because it exists."

## 5. Test Coverage and Verification Status (Module-Wide)

Re-run fresh, this session, against `f882330`:

| Suite | Result |
|---|---|
| `calculations.test.ts` | ✅ 12/12 |
| `notification-platform.test.ts` | ✅ 20/20 |
| `staff-notifications.test.ts` | ✅ 58/58 |
| `trial-notification-producer.test.ts` | ✅ 9/9 |
| `closing-notification-producer.test.ts` | ✅ 14/14 |
| `breakage-notification-producer.test.ts` | ✅ 13/13 |
| **Total** | **✅ 126/126** |
| `tsc --noEmit` | ✅ Clean |
| **`firestore-rules.test.ts`** (emulator) | ❌ Execution-blocked by this sandbox's standing network limitation — unchanged status across all three phases, not newly introduced |

## 6. Remaining Technical Debt — Explicitly Carried Forward

Named here so it is not lost between this review and whichever module
or phase picks it up next:

1. **Watermark mechanism unused** (§4, above). Either a future
   high-volume producer should adopt it for scan-window narrowing, or,
   if no producer ever needs it, its continued existence should be
   revisited — not urgent, not blocking, but should not be silently
   forgotten as "already handled" just because it was built.
2. **Closing and Breakage producers both perform unfiltered
   collection-group scans** every tick (flagged in each producer's own
   file header and in the Phase 3 Close-Out §6) — acceptable at current
   SME scale, a real scaling limitation if either collection grows
   large.
3. **Template copy for all six Phase 3 eventTypes, and Phase 1/2's own
   five staff-notification strings, remain first-draft engineering
   wording** — flagged at every checkpoint, never Product-Architect-
   reviewed. Functional, not final.
4. **`isQuebraExceedingWarning`'s adapted trigger has a known dedupe
   limitation** (Breakage producer's own header): a Quebra deletion
   followed by a new one re-crossing the same batch's threshold would
   not re-fire, since the dedupeKey has no date component. Low-probability
   given Quebras are effectively append-only, not a defect, but a real,
   named limitation.
5. **The Firestore emulator rules suite remains execution-blocked** in
   this sandbox across all three phases — a standing manual-verification
   step owed before any production deploy touching `firestore.rules` or
   `firestore.indexes.json`, not resolved by this review.
6. **Phase 2's five staff endpoints remain hardcoded-Portuguese**, never
   retrofitted onto the BDR-0005 language-resolution pipeline — a
   known, previously-flagged i18n gap (Checkpoint 2's own header),
   unchanged by this module's completion.

None of the six items above is a Required Future Governance
item — none needs a new BDR/ADR/spec decision to resolve, each is
either an engineering-scheduling question or an already-scoped future
phase's own concern (Governance Standard's three-tier classification
model, per the Phase 3 Rule 8 Assessment v2's own precedent).

## 7. Declaration

**Module #20 (Notifications) is complete for V1 scope, as authorized
through Phase 3.** Phases 1, 2, and 3 are each independently closed;
this review's own independent re-verification (not a re-statement of
those closures) found the architecture fully implemented for everything
in scope, all six authorized BusinessEvent producers present and
correctly wired, all three referenced ADRs respected on every
individual decision, and Notification Platform ownership boundaries
clean apart from one named, non-blocking piece of unused infrastructure.

**This declaration does not authorize Phase 4, 5, or 6.** Each remains
its own separate governance milestone, gated on its own Rule 8
Assessment and its own explicit Product Architect authorization,
unaffected by this review reaching a favorable conclusion — per the
Governance Standard's own Non-Negotiable Principle 6 ("a governance
artifact records; it does not decide") and Principle 7 ("numbering is
not authorization").

---

## Governance Notes

- This record does not modify `20-notifications.md`, any Decision Gate,
  any ADR, any BDR/Amendment, any Implementation Plan, any Rule 8
  Assessment, any Implementation Authorization, or any phase Close-Out.
- This record does not authorize any future phase of Module #20, any
  work on Module #15 or Module #18's own eventual integration with this
  module, or any Stock Counts governance work.
- **Lifecycle:** Implemented (Phases 1–3) → Verified (this review) →
  **Complete for V1 scope.** Phase 4 begins as its own, separate
  engineering milestone.
