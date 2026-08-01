# ADR-0001 — Business Provisioning Orchestrator Architecture

**Status:** Approved (architecture decision only — not implementation
authorization).
**Type:** Architecture Decision Record. First of a new, formally
numbered ADR series (`docs/adr/`), distinct from the informal single
decision record already in `docs/engineering/`
([Registration & Subscription Creation Architecture
Decision](../engineering/registration-subscription-creation-architecture-decision.md)).
That record identified the underlying atomicity problem and evaluated
five options at a system level (§5 there); this ADR resolves a fork
inside its own Option 2b/5 that its Responsibilities list (§8) did not
fully anticipate — see "Relationship to Existing Governance," below.
It is not superseded, contradicted, or replaced by this ADR.
**Basis:** [Module #19 Implementation Plan](../engineering/19-subscriptions-implementation-plan.md)
§14 (Rule 8 Assessment) — where this fork was first surfaced during
Phase 1 engineering planning, against the actual current state of
`src/components/AuthView.tsx` (both registration entry points already
perform Firebase Auth account creation **client-side**, a fact the
prior architecture decision's Responsibilities list did not have
visibility into) and `server/index.ts` (the existing `requireAuth`
pattern, already proven across five `/api/staff/*` endpoints).
**Nothing has been modified in `src/`, `server/`, `firestore.rules`, or
any `docs/specs/*` file to produce this document.**

---

## Context

Module #19 Business Rule 4 requires that no Business ever exist without
a subscription document. Phase 1 (Foundations) implementation planning
identified two technically valid ways to close the gap between
"Firebase Auth account created" and "business fully provisioned,
including its subscription record":

### Option A — Full server-side orchestration

Move Firebase Authentication account creation, in addition to business
provisioning, entirely to the server.

- **Advantage:** a single orchestration point covering Auth creation
  and every Firestore write in one place.
- **Disadvantages:** a materially larger architectural change; requires
  the server to manage authentication account creation directly, which
  diverges from Firebase's intended client-managed authentication
  model; introduces additional security surface and ongoing maintenance
  complexity for a capability (Auth account creation) Firebase already
  provides safely on the client.

### Option B — Client-managed Auth, server-managed provisioning

Keep Firebase Authentication entirely client-managed, exactly as it
already works today in both registration entry points. Move **all
business provisioning responsibilities** — business record, owner
membership, initial subscription record, and default configuration —
to a single authenticated server endpoint, called immediately after
client-side Auth succeeds.

- **Advantages:** aligns with Firebase's own intended authentication
  model; reuses the existing `requireAuth` pattern already proven in
  production (five `/api/staff/*` endpoints), rather than introducing a
  new unauthenticated-endpoint pattern; minimizes disruption to
  authentication flows that already work correctly; reduces
  implementation risk relative to Option A; keeps every provisioning
  write centralized in one place regardless of how the caller
  authenticated.
- **Disadvantage:** a narrow window remains between successful client
  Auth and successful server-side provisioning (e.g., the client loses
  network immediately after Auth succeeds, before the provisioning call
  completes). This residual risk is already addressed by the
  reconciliation strategy the prior architecture decision already
  approved — the Background Worker's periodic sweep for any `businesses`
  document missing a matching `subscriptions` document — and is
  therefore an accepted, covered risk, not an open one.

---

## Decision

**Phase 1 shall adopt Option B.**

Firebase Authentication remains client-managed, unchanged from how
`AuthView.tsx` already performs it in both the email/password and
Google Sign-In flows. Business provisioning — creating the business
record, owner membership, and initial subscription record together —
becomes server-managed, through a single authenticated endpoint called
after client-side Auth succeeds.

---

## Architectural Principle

**Business provisioning is a platform capability, not a registration
capability.**

Provisioning exists independently of the registration method that
triggers it. The same provisioning workflow is expected to support
every future onboarding mechanism, not only today's two registration
paths:

- Email/password registration.
- Google Sign-In.
- Invitation-based onboarding.
- SuperAdmin-created businesses.
- Partner onboarding.
- Future platform integrations.

Each of these authenticates or is authorized differently; none of them
should require their own, separate provisioning logic.

---

## Business Provisioning Orchestrator

The **Business Provisioning Orchestrator** is the server-side
responsibility this ADR establishes: given an already-authenticated
caller, it creates a complete and internally consistent business
environment in one place. Its responsibilities include coordinating
creation of:

- Business record.
- Owner membership.
- Initial subscription record (Module #19).
- Default business configuration.
- Other future provisioning tasks, as approved by architecture.

This ADR intentionally does not describe how the Orchestrator does any
of this — see "Scope Exclusions," below.

---

## Relationship to Existing Governance

This ADR:

- does **not** modify any Business Decision Record (BDR-0001–0004),
- does **not** modify any Operational Policy (POL-19-001–008),
- does **not** modify the Module #19 Specification (`19-subscriptions.md`),
- does **not** authorize implementation.

Its purpose is solely to document an engineering architecture decision
made during implementation planning — specifically, resolving the one
fork the [Registration & Subscription Creation Architecture
Decision](../engineering/registration-subscription-creation-architecture-decision.md)
left open. That record's own §8 "Responsibilities" listed Auth-user
creation as server-owned; this ADR clarifies, with the benefit of
checking the actual current code, that Auth creation is already
client-managed today and stays that way — only provisioning (business
record, membership, subscription) moves server-side. This is a
refinement made *within* that record's already-Approved architecture
(its Option 2b/5, "existing Railway server orchestration" plus Worker
reconciliation as a genuine safety net, never the primary path), not a
reversal of it. §9 of that record explicitly left "exact rollback
mechanics" as an unresolved implementation-planning detail — this ADR
resolves the specific fork that detail turned out to contain; it does
not resolve every remaining implementation-planning question that
record deferred.

---

## Consequences

- Registration logic in `AuthView.tsx` becomes simpler — Auth creation
  stays as-is; the two-to-three sequential Firestore writes it performs
  today are replaced by one authenticated server call.
- Provisioning logic becomes centralized in one Orchestrator
  responsibility, regardless of which onboarding path triggered it.
- Future onboarding methods (invitation-based, SuperAdmin-created,
  partner onboarding) reuse the same provisioning workflow rather than
  each reimplementing business/subscription creation.
- Engineering consistency improves — one provisioning path to test,
  audit, and reason about instead of one per onboarding method.
- Future maintenance effort is reduced accordingly.

---

## Future Considerations

Future implementation may extend the Business Provisioning Orchestrator
with additional provisioning responsibilities as new modules are
introduced (for example, default notification preferences once Module
#20 exists). **This ADR does not authorize those future extensions** —
each would need its own review at the point it's proposed.

---

## Scope Exclusions

This ADR does **not** define:

- endpoint contracts,
- authentication implementation,
- database schema,
- Firestore structure,
- transaction logic,
- rollback mechanics,
- reconciliation implementation,
- billing integration,
- notification logic.

These remain implementation-planning and engineering responsibilities,
to be addressed in a Rule 8 pass at the point implementation is
actually assigned.
