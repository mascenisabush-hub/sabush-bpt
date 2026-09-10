Business Decision Record

# BDR-0018 — SuperAdmin Agent Attended Support Session: Rendering Mechanism and Support Authority Boundary

**Status:** Approved (business decision — not a specification, not an
implementation authorization). **BDR number confirmed by explicit
Product Architect decision as `BDR-0018`**, following a governance
correction pass that verified, by direct repository inspection, that
`BDR-0001`–`BDR-0017` are all accounted for with no gap, that
`BDR-0018` was not already assigned to anything (including not to
Customer Communication Architecture, which is `BDR-0004`,
`docs/specs/BDR-0004-customer-communication-architecture.md`), and
that `BDR-0018` collides with no existing BDR, filename, or
cross-reference — per `19-governance-bdr-policy-framework.md`'s
Numbering Ledger assignment-authority rule and `BDR-0016`'s own
compliance statement, requiring exactly this explicit,
verified-against-the-repository assignment before use.
**Type:** Business Decision Record — a strategic decision about
whether SuperAdmin should gain a customer-assisting "Agent" capability,
what authority boundary governs it, and which rendering mechanism the
architecture should use to let a Support-tier operator see a
customer's actual tenant experience without ever gaining write
authority over it. Not a Policy (the specific operational parameters —
code length, lockout thresholds, exact session duration, the Support
View State schema — are explicitly left open below, §7) and not a
Business Domain Specification (no functional requirement or acceptance
criterion for implementation is fixed here).
**Location note:** Filed in `docs/specs/`, unprefixed — this
capability is cross-cutting (SuperAdmin platform-operator authority,
Architecture §9.7's Support Session concept, the tenant SPA's own
rendering, and Module #20's customer-communication boundary), no
single module owns it, following the same unprefixed pattern already
established for `BDR-0004`, `BDR-0008`, `BDR-0009`, `BDR-0012`,
`BDR-0013`, `BDR-0014`, `BDR-0015`, and `BDR-0016`.
**Depends on:**
[`docs/architecture/09-superadmin-architecture.md`](../architecture/09-superadmin-architecture.md)
§9.7 (Support Session, as originally specified — the architectural
foundation this decision extends, not replaces) and §9.10
(Impersonation — named explicitly below, §5, as the concept this
decision does **not** build);
[`18-superadmin-v1-architecture-gap-resolutions.md`](../engineering/18-superadmin-v1-architecture-gap-resolutions.md)
Gap 2 (the prior decision that deferred Support Session in favor of
the narrower, already-built Business Visibility model — this BDR
directly revisits that specific deferral, per Gap 2's own terms, and
records the outcome in §4); the three investigation documents produced
in this session that ground every factual and technical claim below:
[`SUPERADMIN_AGENT_CAPABILITY_AND_AUTHORITY_INVESTIGATION.md`](../engineering/SUPERADMIN_AGENT_CAPABILITY_AND_AUTHORITY_INVESTIGATION.md),
[`SUPERADMIN_AGENT_ASSISTANCE_LEVEL_HYBRID_MODEL_INVESTIGATION.md`](../engineering/SUPERADMIN_AGENT_ASSISTANCE_LEVEL_HYBRID_MODEL_INVESTIGATION.md),
[`SUPERADMIN_AGENT_VIEW_ONLY_IMPERSONATION_INVESTIGATION.md`](../engineering/SUPERADMIN_AGENT_VIEW_ONLY_IMPERSONATION_INVESTIGATION.md),
and
[`SUPERADMIN_AGENT_ATTENDED_SUPPORT_COBROWSING_IMPLEMENTATION_INVESTIGATION.md`](../engineering/SUPERADMIN_AGENT_ATTENDED_SUPPORT_COBROWSING_IMPLEMENTATION_INVESTIGATION.md).
**Does not amend:** `BDR-0011` (SuperAdmin Subscription Operations —
"Monitor first," unaffected; nothing in this BDR grants any
subscription/billing authority to any Agent capability); Architecture
§9.10 (Impersonation) itself remains exactly as deferred as it already
was — this BDR explicitly does not build it, and explicitly does not
treat this decision as a step toward building it (§5); `ADR-0005`
(SuperAdmin Payment Operations Boundary); the existing, already-
implemented Business Visibility/Suspend-Reactivate/Audit
Center/Recovery Authorization capabilities (Gap 2's own Phase B/C/D
work) — all remain exactly as built, untouched by this decision.
**Followed by:** Per the established sequence (`Business Philosophy →
BDR → Policy → Module Specification → Rule 8 → Implementation
Authorization → Implementation`) — a Policy (or policies) fixing the
operational parameters this BDR explicitly leaves open (§7: code
length/format, lockout thresholds, exact session duration, consent-
capture mechanics) and a Specification (fixing the Support View State
schema for the mobile rendering path, the exact audit event shapes,
and the SuperAdmin-side UI flow) are the next artifacts. Rule 8
Assessment and Implementation Authorization remain future, separately-
gated steps not performed here.

---

## 1. The Business Reality

SABUSH BPT's SuperAdmin panel, as it exists today, gives a
`platformRole: 'superadmin'` operator a curated, read-only view of a
business (Business Visibility) and four narrow, already-audited
bounded actions (payment confirm/reject, business reactivate, two
Recovery Authorizations). This is sufficient for the clear majority of
realistic customer-support scenarios — confirmed across a 20-row
problem matrix in the Assistance-Level Investigation, where 13 of 20
mapped scenarios resolve fully at that existing capability level.

It is not sufficient for a real, evidenced minority of scenarios,
concretely two: (1) a customer mid-way through OCR-assisted purchase-
receipt entry (Smart Stock Entry), where the system's own review
screen renders per-field status indicators (`detected`/`review`/
`not_found`) that are never persisted to Firestore anywhere — traced
directly to `AddStockView.tsx`'s `renderFieldStatusBadge` and
`PurchaseDraftLineItem`'s own schema, which confirms these indicators
exist nowhere except the customer's live, rendered screen; and (2) a
customer reporting "what you're describing doesn't match what I see,"
where the actual question — is this a genuine product defect or a
misunderstanding — is, by its nature, unanswerable by any amount of
data access, curated or raw, because it is a question about rendering
correctness itself, not about any stored value.

Both of these are documented with concrete, traced evidence in
`SUPERADMIN_AGENT_VIEW_ONLY_IMPERSONATION_INVESTIGATION.md` §4–§5,
including a real, already-fixed historical bug in this exact
territory (a documented code comment describing an OCR-read cost price
being silently miscalculated after a unit correction — the "2 Un @
1,000/Un → Cx → silently-computed 24,000" failure).

## 2. What This BDR Decides

**SABUSH BPT will provide a customer-support capability structured as
a customer-initiated, single-use-code-gated, time-boxed Attended
Support Session, granting a Support-tier operator exactly three
capabilities against one specific, explicitly identified business:
VIEW, POINT, and GUIDE — and never any write authority, by any
mechanism, under any circumstance.**

This is a narrower, safer resolution of the same underlying need
Architecture §9.7 (Support Session) and §9.10 (Impersonation) were
both originally trying to address — but it is neither of those
concepts exactly as originally specified. It is closest in kind to
Support Session (read-only, no write authority ever), extended with a
genuinely new rendering-consumption model neither original concept
anticipated.

### 2.1 The absolute support-authority boundary (fixed, not reopened by this BDR)

The Support Agent has exactly three capabilities:

- **VIEW** — see the customer's actual tenant experience, for the one
  business/session the customer explicitly authorized.
- **POINT** — a non-interactive visual overlay indicating where on the
  screen the Agent is referring to.
- **GUIDE** — communicate with the customer through whatever channel
  is in use for the conversation (voice, or a future in-product
  channel — §8 below).

The Support Agent must never be able to click, type, submit, create,
edit, delete, or perform any tenant write of any kind on the
customer's behalf — including every specific action already named as
prohibited in the governing product decision: adding/editing stock,
changing products, changing prices, performing stock counts, changing
settings/subscription, payment operations, or account/security
changes. There is no "Request Control" feature and no second
permission tier. This boundary is not reopened, revisited, or argued
against anywhere in this BDR or its supporting investigations.

### 2.2 The rendering mechanism — hybrid, device-appropriate

`SUPERADMIN_AGENT_ATTENDED_SUPPORT_COBROWSING_IMPLEMENTATION_INVESTIGATION.md`
identified two technically valid paths for letting the Agent see the
customer's actual rendered experience, and found this codebase has
zero existing WebSocket/WebRTC/realtime-collaboration infrastructure —
the only existing realtime primitive anywhere in this stack is
Firestore's own `onSnapshot` listener, already used pervasively
throughout the tenant SPA.

A follow-up verification of current browser support data (September
2026) found that `getDisplayMedia()` — the browser-native screen-
share API — has broad desktop support but **no support on the major
mobile browsers** (Chrome for Android, Firefox for Android, Safari on
iOS, Samsung Internet, Opera Mobile all confirmed unsupported; MDN
independently marks the API "Limited availability," not Baseline).
Given SABUSH BPT's actual customer base and this product's mobile-
first orientation (already established throughout this codebase — the
quick-login PIN pairing flow exists specifically for shared shop
devices), a desktop-only rendering mechanism is not an acceptable
foundation for this capability.

**Decision: the rendering mechanism is device-appropriate and hybrid.**

- **Desktop-capable browsers** use native browser screen-sharing
  (`getDisplayMedia()` + `RTCPeerConnection`, both browser-native Web
  APIs requiring no new npm dependency for the media/transport layer
  itself) to give the Agent a direct view of the customer's actual
  rendered pixels — automatically including every piece of transient,
  never-persisted UI state (the OCR field-status badges and any
  comparable state elsewhere), with no per-component instrumentation
  required, and the strongest possible structural read-only guarantee
  found anywhere across all four investigations: the Agent's viewer
  never holds any tenant credential, never has a live Firestore
  connection to the business's data, and never loads the tenant SPA's
  own code — there is no code path from the viewer to any write
  action, because the viewer application has no dependency on the
  tenant SPA at all.
- **Mobile browsers**, where `getDisplayMedia()` is unavailable, use a
  purpose-built, read-only **Support View State**, published by the
  customer's own already-authorized tenant SPA session to a new,
  session-scoped Firestore location and consumed by the Agent via
  `onSnapshot` — the same existing realtime primitive already proven
  throughout this codebase, requiring zero new dependency, but
  requiring deliberate, ongoing engineering to publish whichever
  pieces of transient state matter for diagnosis (the exact schema is
  explicitly deferred to the Specification stage, §7 below — this BDR
  fixes *why* it is needed and *that* it is the mobile path, not its
  field-by-field content).

**The session/consent/code/audit foundation is identical regardless of
which rendering path is active** — only the customer-to-agent viewing
transport differs. This separation is deliberate and is itself part of
the decision: it means the harder, more consequential architectural
question (session lifecycle, tenant isolation, audit) is answered once,
not twice.

### 2.3 The pointer

The Support Agent's POINT capability is common to both rendering
paths — a small, independent coordinate channel (the Agent's browser
publishes `{x, y, timestamp}`; the customer's browser renders a
non-interactive overlay, styled with `pointer-events: none` so it is
structurally incapable of receiving or dispatching any DOM event, by
browser-native design, not by application-level discipline alone).
This is unaffected by the desktop/mobile rendering split.

### 2.4 Customer transparency, consent, and disconnect

Per the governing product decision (not reopened here): the customer
deliberately initiates the session (there is no operator-initiated
path — a material difference from Architecture §9.7's original text,
which specified no customer-consent requirement at all; this BDR's
decision explicitly overrides that specific aspect of §9.7 for this
capability, per §4 below); a single-use code, read aloud by the
customer to the Agent, establishes the session; the customer sees a
persistent, unmissable indicator for the session's entire duration
(directly modeled on the existing `BusinessSuspendedBanner.tsx`
pattern — a real, evidenced precedent for a persistent, `AppContext`-
driven, app-wide banner already built in this codebase); either party
may end the session at any time, enforced server-side, not merely
hidden client-side (following the same "the effect happens at the
data layer, not at the next reload" discipline this codebase already
applies to business suspension).

## 3. Reused Architecture — What This Decision Builds On, Not Invents

Per the investigations' own findings, every piece of this decision
except the rendering-consumption mechanism itself has a direct,
already-proven precedent in this codebase:

- **The `requireAuth → requirePlatformOperator → [role]` authorization
  chain** — unchanged, reused exactly as-is for whichever
  platform-operator tier is ultimately permitted to hold an Attended
  Support Session (§6, below, leaves this specific tier question
  open).
- **The "current"-fixed-id-document + `expiresAt` + transactional-
  write pattern**, directly evidenced in
  `server/initialStockRecoveryAuthorization.ts` and its
  `firestore.rules` counterpart (`request.time < ...expiresAt`,
  enforced at the rules layer itself) — the direct architectural model
  for the one-time code's own lifecycle (generation, single
  consumption, expiry, replay protection).
- **The `crypto.scrypt` + salt + `timingSafeEqual` + failed-attempt
  lockout pattern**, built and committed in this same session for the
  Clear-Data Password feature (`server/index.ts`,
  `/api/business/clear-data-password/*`) — the direct precedent for
  hashing the one-time code and rate-limiting guesses against it,
  which matters more here than it did there, since a 6-digit code has
  meaningfully less entropy than a chosen password.
- **The existing `platform_audit_log` schema** (`actorUid`,
  `actorRole`, `actionType`, `targetBusinessId`/`targetUid`,
  `justification`, server timestamp) — reused as-is, with new
  `actionType` values only (session invitation, connection,
  termination, expiry), following the exact shape every existing
  audited action in this codebase already uses.
- **The existing SuperAdmin nav/click-through UI pattern** — the
  Agent-side entry point fits within the existing structure without
  requiring any redesign of the SuperAdmin application, per
  `18-superadmin-v1-architecture-gap-resolutions.md`'s and this
  session's own investigation's shared finding.

## 4. This BDR's Relationship to Gap 2

`18-superadmin-v1-architecture-gap-resolutions.md` Gap 2 evaluated
building the full Support Session mechanism (Architecture §9.7 as
originally drafted) against a narrower, curated read model, and chose
the narrower option — explicitly noting this "does not block building
[the full mechanism] later if/when Support/Developer tiers are
actually unblocked for read access — a decision explicitly deferred,
not made here."

**This BDR is that deferred decision, now made — but for a narrower,
differently-shaped capability than what Gap 2 originally declined to
build.** Gap 2 evaluated a raw-collection-read credential returned to
the SuperAdmin app. This BDR authorizes a rendering-consumption model
instead (screen-share or Support-View-State-mirroring), driven by
concrete evidence (the OCR field-status-badge case, the defect-vs-
misunderstanding case) that did not exist, and was not evaluated, at
the time Gap 2 was decided. Gap 2's own stated reasoning for choosing
the narrower path at the time — no operational incident data existed
to justify a broader read surface — is not contradicted by this BDR;
new, concrete evidence has since been gathered and is the basis for
this decision, not a reversal of Gap 2's own reasoning process.

Gap 2's Business Visibility model itself (curated read, owner email
exposure bounded to single-business justified reads, etc.) is
**entirely unaffected** by this BDR and continues exactly as built.

## 5. Explicit Non-Goals

Restated directly from the governing product decision, and
independently supported by every investigation in this session's
series:

- No write, no click, no typing on the customer's behalf, no delete,
  no submit, no product/price/settings/subscription/payment/account
  change performed by the Agent.
- No "Request Control" or "Allow Control" feature, no second
  permission tier.
- **No full, write-capable Impersonation (Architecture §9.10).** This
  BDR does not build it, does not extend toward it, and does not treat
  Attended Support Session as a stepping stone toward it. §9.10
  remains exactly as deferred as it already was.
- No unrestricted remote control.
- No background or passive monitoring — every session is customer-
  initiated, explicit, and time-boxed; there is no standing or
  passive access of any kind.
- No permanent access of any kind.

## 6. What This BDR Does NOT Decide

Consistent with keeping this a business decision, not an operational
or implementation one:

- **Which platform-operator tier(s) may hold an Attended Support
  Session** — Architecture §9.7 originally specified Support,
  Developer, or SuperAdmin; today, every SuperAdmin route is hardcoded
  to `'superadmin'` only, with `'support'`/`'developer'` functionally
  inert everywhere (confirmed,
  `SUPERADMIN_AGENT_CAPABILITY_AND_AUTHORITY_INVESTIGATION.md` §12).
  Whether this capability widens that reach is left to the Policy
  stage.
- **The exact Support View State schema** for the mobile rendering
  path — deliberately left to the Specification stage. This BDR fixes
  *why* it's needed (transient UI state genuinely unreachable any
  other way on mobile) and *that* it exists as the mobile-path
  mechanism; not its field-by-field content.
- **The one-time code's exact length, format, and lockout
  thresholds** — the 6-digit numeric shape is this codebase's own
  existing UX convention (the staff quick-login PIN), and the
  Clear-Data Password's lockout shape is a directly reusable
  precedent, but the exact numbers (attempt threshold, lockout
  duration) are a Policy-level decision, not fixed here.
- **The exact session duration** — Architecture §9.7's original
  60-minute figure is the best-evidenced default (shorter than
  Impersonation's 30 minutes would be wrong, since this capability
  carries less risk than Impersonation, not more; §9.7's own 60-minute
  figure is the closer analog), but this BDR does not fix the final
  number.
- **Whether sensitive fields should be masked even during a view-only
  session** — an open question the investigations found no existing
  precedent for anywhere in this codebase (no field-masking convention
  exists at all today). Left entirely to the Specification stage.
- **The exact audit `actionType` string values** — the shape (session
  invitation/connection/termination/expiry, mapped onto the existing
  `platform_audit_log` schema) is fixed; the literal string values are
  a Specification-level detail.
- **How the customer and Agent actually talk to each other during the
  session** (voice, phone, or a future in-product channel) — this BDR
  fixes that the Attended Support Session's own data channel (screen
  view, pointer) is separate from whatever communication channel
  carries the conversation itself, consistent with
  `SUPERADMIN_AGENT_VIEW_ONLY_IMPERSONATION_INVESTIGATION.md`'s own
  finding that no agent-to-customer communication channel exists
  anywhere in this codebase today (Module #20's Notifications are
  system-triggered/templated only) — building one, if ever needed, is
  separate, larger governance work this BDR does not authorize or
  scope.

## 7. Governance Sequence From Here

Per `19-governance-bdr-policy-framework.md`'s established chain, and
consistent with how `BDR-0015`/`POL-0008` and `BDR-0016`/`POL-0009`
each paired a BDR with its own operational Policy:

1. **This BDR** (`BDR-0018`) — the business decision (this document).
2. **A Policy** (or policies) — fixing the operational parameters
   named as open in §6: code format/lockout, session duration, tier
   eligibility, audit `actionType` values.
3. **A Specification** — fixing the Support View State schema, the
   exact server routes, the SuperAdmin-side UI flow, and the tenant-
   side consent/banner UI, informed by but not limited to
   `SUPERADMIN_AGENT_ATTENDED_SUPPORT_COBROWSING_IMPLEMENTATION_INVESTIGATION.md`'s
   §17 ("Recommended Implementation Boundary" — the session/code/audit
   foundation can be specified independently of, and does not need to
   wait for, any remaining rendering-path detail work).
4. **Rule 8 Assessment**, then **Implementation Authorization** —
   both remain mandatory, separately-gated steps, not performed here
   and not implied to be simplified or skipped by anything in this
   BDR.

---

## Governance Notes

This BDR resolves the rendering-mechanism question the three
supporting investigation documents left open as a Product-Architect
decision point (per
`SUPERADMIN_AGENT_ATTENDED_SUPPORT_COBROWSING_IMPLEMENTATION_INVESTIGATION.md`
§19's own recommendation: "a focused Product Architect decision
specifically on Path 1 vs. Path 2... only after that, proceed to
BDR/Policy/Specification drafting"). That decision — hybrid,
device-appropriate rendering — is now made and recorded here. Nothing
in this BDR authorizes code, schema, or `firestore.rules` changes; the
governance sequence in §7 remains the required path to implementation.

## Product Architect Acceptance

**Status:** Accepted. BDR number `BDR-0018` explicitly confirmed by
Product Architect decision, following a governance-numbering
correction pass that verified this number against the repository
directly (no collision with any existing BDR, filename, or
cross-reference — including confirming `BDR-0004`, not `BDR-0018`, is
the existing Customer Communication Architecture decision). The
substantive business/product decisions recorded in §§1–6 above were
not changed, broadened, reinterpreted, or otherwise touched by this
numbering correction.
