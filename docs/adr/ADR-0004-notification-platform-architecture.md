# ADR-0004 — Notification Platform Architecture: Business Event Contract, Content Ownership, and Producer Scope

**Status:** Accepted (architecture decision only — not implementation
authorization).
**Type:** Architecture Decision Record. Fourth entry in the formally
numbered ADR series (`docs/adr/`), following [ADR-0001](./ADR-0001-business-provisioning-orchestrator.md),
[ADR-0002](./ADR-0002-platform-background-worker.md), and
[ADR-0003](./ADR-0003-background-worker-job-registration.md). Distinct
from those: ADR-0002/ADR-0003 establish *how work gets scheduled and
executed*; this ADR establishes *what a job hands to the Notification
system, and who is responsible for turning that into a notification*.
Originates from Module #20 (Notifications) Phase 3 scoping, but is
written as a platform-wide ADR because its decisions constrain every
present and future producer of notifications — Module #19
(Subscriptions), Module #20 itself, Module #14 (Analytics, deferred),
Module #15 (AI, deferred), Module #18 (SuperAdmin, spec drafted) — not
Module #20 alone.
**Basis:** Architecture §4.9 (Notifications Architecture — establishes
the `notifications` collection, its three trigger sources, and
delivery fan-out, but is silent on who constructs notification
content); Module #20 Phase 3 Platform Review (Product Architect / Lead
Software Engineer design discussion) that surfaced the producer-content-
ownership question as the architectural heart of Phase 3.
**Nothing has been modified in `src/`, `server/`, `firestore.rules`, or
any `docs/specs/*`/`docs/architecture/*` file to produce this
document.**

---

## Context

Architecture §4.9 already establishes **that** three trigger sources
(Background Worker, privileged server, payment webhook handler) all
funnel into a single `notifications` collection rather than each
inventing its own delivery path. It does not specify **how** a trigger
source's business logic becomes a notification's `title`, `message`,
`context`, and `recommendedAction` — the implicit assumption, if left
unexamined, is that each producer constructs that content itself.

Module #20 Phase 3 is the first point where multiple independent
producers (Closing-overdue, Inventory-risk, Subscription-companion)
need to generate notification content simultaneously, plus a fourth
producer (AI, deferred but architecturally relevant now) on the
horizon. Left as producer-owned strings, this scales into: notification
copy scattered across every business module's code, no single place to
localize it, no way to later suppress/batch/route an event without
touching each producer, and no way for AI to participate without
inventing its own delivery path outside this contract.

This ADR settles the boundary once, at the platform level, before
Phase 3 implementation makes producer-owned strings the accidental
default.

---

## Terminology

These terms recur throughout this ADR and are intended to be the
platform's stable vocabulary for future ADRs and module specs, not
just this document's local usage:

| Term | Meaning |
|---|---|
| Business Fact | Something that occurred in the business domain — true independent of whether anyone is ever told about it. |
| BusinessEvent | The immutable, in-process representation of a Business Fact as it flows through the platform (see Decision 1, Decision 3). |
| Notification | A communication generated *from* a BusinessEvent — one possible outcome of Decision 4's communication-policy evaluation, never guaranteed. |
| Delivery Channel | The mechanism used to deliver a notification (in-app, email, SMS, WhatsApp, push, webhook — see Decision 8). Answers *how*. |
| Recipient | The actor who receives a notification (Business Owner, Staff Member, SuperAdmin, a future Auditor — see Decision 7). Answers *who*. |

Delivery Channel and Recipient are orthogonal axes and are never mixed
in this architecture — see Decision 8.

---

## Decision 1 — Producers Emit Business Events, Not Notification Text

**A producer's output is a structured `BusinessEvent`, never a rendered
notification.** The Notification Platform is solely responsible for
turning a `BusinessEvent` into a persisted `notifications/{id}`
document (or into no notification at all — see Decision 4).

**A `BusinessEvent` represents an immutable business fact. It is not a
notification, message, or communication.** "Trial expired," "Inventory
risk detected," "Staff suspended," "Store closed late" — each is a
fact a producer observed, true independent of whether anyone is ever
told about it. A notification is one possible downstream consequence
of a fact; it is never the fact itself. Keeping this distinction
explicit is what prevents Decision 4's communication policy from
quietly collapsing back into "one fact, one notification, always" as
more producers are added. The event/fact distinction is deliberate,
not just wording: `BusinessEvent` is the software artifact that flows
through the platform (open to future metadata — `occurredAt`,
`dedupeKey`, `producer`, correlation IDs, versioning — without the name
becoming awkward); the *fact* is what that artifact represents.

```
Business Module (producer)
        │
        ▼
BusinessEvent (in-process, structured)
        │
        ▼
Notification Platform
        │
        ├── Template resolution
        ├── Localization (existing LanguageContext / t())
        ├── Communication-policy evaluation (notify / suppress / batch)
        └── Notification persistence
                │
                ▼
        notifications/{notificationId}
```

### BusinessEvent contract

```
BusinessEvent {
    producer            // stable identity of the originating module/job
    eventType           // e.g. "closing.overdue", "trial.expired"
    dedupeKey           // deterministic, producer-owned — see Decision 2
    occurredAt           // when the fact became true, per the producer
    priority
    context              // pointers to the triggering record, never a
                         // copy of financial data — consistent with
                         // §4.9's existing non-duplication principle
    payload
    recommendedAction
}
```

`occurredAt` is a required, first-class field — not something derived
from when a notification document happens to be created. The two are
different concepts and will diverge in practice: a `BusinessEvent` may
be evaluated, batched, delayed, or retried by the Notification Platform
before any notification is persisted (Decision 4), but the underlying
fact happened once, at a specific time, and only the producer knows
when that was.

`dedupeKey` is a **required** field, not optional. Only the producer
has the domain knowledge to define what "the same event" means for its
own domain (what constitutes "today's missing close" is Closing
Integrity's call; what constitutes "trial expired" is the Trial
Engine's call; the Notification Platform must never attempt to derive
event identity itself). This keeps §4.8.1's existing idempotency model
(deterministic key used as the persisted document's ID, exactly as
Module #19's Trial Lifecycle Worker already does today) intact as
producers multiply, without requiring a persisted event store to get
there — see Decision 3.

---

## Decision 2 — Idempotency Applies to Evaluation, Not Only Notification Creation

**Idempotency applies to event evaluation. Notification creation is
only one possible evaluation outcome.**

Today, evaluating an event and producing a notification are the same
thing. Once Decision 4 (communication policy) introduces suppression,
batching, or alternate routing, they diverge:

```
Event
    │
    ▼
Communication Policy
    │
    ├── Notification
    ├── Suppress
    ├── Batch
    └── Future channel
```

If dedupe were scoped only to "have I already created this
notification," a suppressed event would be re-evaluated — and
re-suppressed — on every subsequent worker scan, forever, rather than
being remembered as "already decided." The Notification Platform's
dedupe/watermark tracking (per §4.8.1's existing mechanism) must record
that a given `dedupeKey` was **evaluated**, independent of which
communication-policy outcome that evaluation produced.

---

## Decision 3 — BusinessEvent Is an In-Process Contract, Not a Persistence Model

**A Business Event is an internal contract, not a persistence model.**

Explicitly rejected for now:

- ❌ a `business_events` collection
- ❌ an event queue
- ❌ an event store
- ❌ a replay system
- ❌ event-specific retention policy
- ❌ event-specific `firestore.rules`

None of these are justified by a present requirement. Their only
justification would be future consumers — audit, Analytics (#14, still
deferred), AI (#15, still deferred), SuperAdmin (#18, spec drafted but
not this system's dependency yet), timeline, webhooks — none of which
exist today. Building persisted event infrastructure to serve
consumers that don't yet exist violates the same principle that has
already governed this platform's other deferrals (Analytics deferred
until it has a real consumer; the Background Worker itself deliberately
avoiding Cloud Functions/queues per §4.8's own "simplest mechanism"
reasoning).

**Whether a `BusinessEvent` instance lives for 20 milliseconds or 20
days is explicitly not part of this contract.** Persistence, if it is
ever justified by a concrete, present consumer, is a future,
independent architectural decision — on the same "concrete measured
threshold, not a vague someday" standard §4.8 already applies to its
own escalation path — not something this ADR pre-authorizes by
implication.

**BusinessEvent is immutable.** Once a producer emits it, the
Notification Platform may transform it into communication, localize
it, suppress it, or batch it — but it may never alter the business
fact the producer emitted. This preserves the separation this whole
ADR exists to establish: business modules own facts; the platform owns
communication policy. Allowing the platform layer to mutate an event
would be exactly the kind of place business logic quietly re-accumulates
outside the module that's supposed to own it.

---

## Decision 4 — Notification Platform Owns Communication Policy, Including Whether to Notify at All

**Business modules describe what happened. The Notification Platform
decides how — and whether — to communicate it.**

A producer emitting a `BusinessEvent` is not a guarantee that a
notification is created. Today, every Phase 3 producer's event may
result in one; that is a current behavior, not a contractual
guarantee. The platform retains the ability to suppress duplicates,
batch low-priority events, or route an event to a different channel
(a future dashboard insight, a timeline entry) instead of — or in
addition to — a notification, without requiring any producer to change.

To state the boundary precisely: the Notification Platform decides
**whether**, **how**, **when**, and **to whom** to communicate a fact.
It never decides **whether the fact occurred** — that determination
belongs exclusively to the producer, made once, at `occurredAt`, and
is not revisited or second-guessed by the platform layer.

---

## Decision 5 — Template Ownership and Localization

**The Notification Platform owns template resolution, using the
platform's existing localization system — not a second one.**

```
Producer
    │
    ▼
BusinessEvent
    │
    ▼
Notification Template Registry
    │
    ▼
LanguageContext / t()  (existing system: pt.ts / en.ts / fr.ts)
    │
    ▼
Localized Notification
```

No producer constructs user-facing `title`/`message` strings directly.
No second localization mechanism, duplicate translation files, or
parallel `t()`-equivalent is introduced for notification content — the
existing `LanguageContext`/`useLanguage`/`t()` system is the single
source of truth for translated strings platform-wide, and this ADR
does not create an exception to that for notifications. This is stated
explicitly because this codebase has at least one known, accepted i18n
gap already (`BusinessProfileSetupModal.tsx`); this ADR is a deliberate
decision not to add a second parallel localization path alongside it.

---

## Decision 6 — AI Is Another BusinessEvent Producer, Never a Direct Notification Writer

**AI never writes notifications directly. AI emits BusinessEvents, like
any other producer.**

The Notification Platform does not distinguish between `producer:
"closing-integrity"` and `producer: "ai-insight"` — both submit the
same `BusinessEvent` contract and are subject to the same template
resolution, localization, and communication-policy evaluation. AI may
emit events representing a recommendation, insight, anomaly, or
explanation; whether that becomes a notification, a dashboard insight,
a timeline entry, or nothing is Decision 4's communication policy to
decide — not something a future AI feature invents its own delivery
path to bypass. This decision is recorded now, ahead of Module #15's
own spec work, specifically so that Module #15 does not have to
re-litigate it.

Stated as its own architectural principle, because it is worth
protecting deliberately rather than leaving as an inference from the
producer contract: **AI emits insights. The Notification Platform
decides whether humans should hear about them.** This is what keeps AI
from becoming a second, parallel communication channel that bypasses
Decision 4's policy layer.

---

## Decision 7 — Recipient Binding Is Extensible, Not Fixed at Two Kinds

**The Notification Platform's recipient model is architecturally
extensible; a third recipient kind is not implemented now.**

Module #20's Accepted spec resolved recipient binding for tenant users
as a hybrid of `recipient.userId` and `recipient.businessId`.
SuperAdmin (#18) introduces platform administrators as recipients —
qualitatively different from both existing kinds, not a variant of
either. This ADR does not implement that third kind now (Module #18's
own spec/schema work owns that), but establishes the principle that
the platform's recipient model must not be architecturally closed to
it. §4.9's own stated principle — funneling all sources into one
collection rather than each domain inventing its own delivery path —
extends here: SuperAdmin becomes another producer and, eventually,
another recipient kind on the same platform, not a second notification
subsystem.

---

## Decision 8 — Delivery Fan-Out Is Already Architected; This ADR Does Not Redecide It

**The Notification Platform delegates delivery through the existing
`DeliveryChannel` abstraction. New delivery mechanisms — Email, SMS,
Push, WhatsApp, Webhooks, and so on — are implemented as additional
Delivery Channels, never by altering producer logic or notification
generation.** This is not a new decision this ADR needs to make — it
is already architected and partially implemented. Spec §20.4 (Decision
Gate 3) and its Phase 1 implementation
(`src/lib/notifications/deliveryChannel.ts`) already define exactly
this interface: in-app is implemented today; email and WhatsApp are
designed as future implementations of the same interface, not a
redesign. This ADR's producer/`BusinessEvent` contract feeds into that
existing design unchanged — a `BusinessEvent` becomes a persisted
`Notification` (Decisions 1–5), and the already-existing
`DeliveryChannel` interface fans it out from there. Reinforcing this
existing investment, rather than inventing a parallel layer beside it,
keeps the architecture coherent.

**SuperAdmin is explicitly not a channel.** It is a *recipient*
(Decision 7's concern — who receives a notification), not a *delivery
mechanism* (this decision's concern — how a notification reaches a
recipient it already has). Conflating the two would quietly reopen
Decision 7 by implication; this ADR keeps them on separate axes on
purpose.

---

## Relationship to Existing Governance

This ADR:

- does **not** modify any Business Decision Record,
- does **not** modify any Operational Policy,
- does **not** modify the Module #19, #20, or (drafted) #18
  specifications,
- does **not** modify Architecture §4.9 — it specifies the content-
  construction mechanism §4.9 is silent on, within §4.9's existing
  collection/trigger-source/fan-out design,
- does **not** authorize implementation.

Module #20 Phase 3's Rule 8 Assessment remains a separate, subsequent
governance step, to be written only after this ADR (and ADR-0003) are
accepted.

---

## Consequences

- Closing, Inventory, and Subscription-companion producers (Module #20
  Phase 3) emit `BusinessEvent`s; none construct notification strings
  directly.
- Notification copy lives in one place (the template registry, backed
  by the existing `LanguageContext`/`t()` system), not scattered across
  producer modules — future copy changes or new-language support touch
  one system, not every producer.
- Future consumers (audit, Analytics, AI-driven notifications, webhooks)
  remain possible without requiring producers to change, because the
  `BusinessEvent` shape is designed for it — but none of that
  infrastructure is built until a real consumer justifies it.
- AI (#15) and SuperAdmin (#18), when their own specs are written, plug
  into an already-decided producer contract rather than each
  re-deciding how to reach the notification system.
- The platform can later introduce suppression, batching, or new
  delivery channels (via the existing `DeliveryChannel` interface)
  without any producer module being touched.

---

## Future Considerations

This ADR does not specify: the template registry's exact schema, the
final `BusinessEvent` TypeScript type, how communication-policy rules
(suppression/batching thresholds) are configured, or the eventual
schema shape of a third (SuperAdmin) recipient kind. These remain
implementation-planning and engineering responsibilities, addressed in
Module #20 Phase 3's own Rule 8 Assessment, and in Module #18's own
spec/implementation work respectively, at the point each is actually
assigned.

---

## Scope Exclusions

This ADR does **not** define:

- the template registry's implementation or schema,
- specific notification copy for any producer's events,
- communication-policy rules or thresholds (what counts as "low
  priority" for batching, etc.),
- the Background Worker's job registration mechanics (see ADR-0003),
- new delivery-channel implementations (Email, WhatsApp, Webhook —
  already architected via the existing `DeliveryChannel` interface,
  §20.4; this ADR does not redesign it),
- Module #18's SuperAdmin recipient schema,
- Module #15's AI event types or triggering logic,
- authorize implementation of any kind.
