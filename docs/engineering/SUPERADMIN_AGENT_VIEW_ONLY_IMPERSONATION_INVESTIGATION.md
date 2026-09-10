# View-Only Impersonation & Customer Support Necessity Investigation

**STATUS: FOCUSED DISCOVERY INVESTIGATION ONLY.** No code was written or
modified. No BDR, Policy, Specification, Rule 8 Assessment, or
Implementation Authorization was created or altered. No architecture
was redesigned. Nothing committed or pushed — this document, like the
one before it, lives entirely outside the repository.

This document does not simply accept or reject the Product Architect's
position. It tests the OCR scenario and the "what you see is
different" scenario directly against the actual Smart Stock Entry
implementation — not against the curated read model alone — and
reaches a more precise conclusion than either "impersonation is
unnecessary" or "impersonation is necessary" as a blanket statement.

This builds on, and does not repeat, `docs/engineering/SUPERADMIN_AGENT_CAPABILITY_AND_AUTHORITY_INVESTIGATION.md`
(the Capability Investigation) and the prior Hybrid Model investigation
(the Assistance-Level Investigation, delivered outside the repository).

---

## 1. The New Evidence, Tested Against the Actual Implementation

The Product Architect's scenario is investigated below at the code
level, not accepted or dismissed at face value.

---

## 2. Architecture §9.10, §6.5, §6.7, §6.8 — Read in Full, Reported Precisely

Re-quoted directly from `docs/architecture/09-superadmin-architecture.md`
and `docs/architecture/06-user-architecture.md`, with no paraphrase
that would loosen the original meaning.

**1. Who can initiate it?** "Support, Developer, or SuperAdmin" — any
platform-operator tier (§9.10). Not SuperAdmin-exclusive, since "the
audit requirement (logging) is what makes it safe, not restricting it
to the top tier alone."

**2. What access does it provide?** "A full, read/write session acting
*as* a specific Admin" (§9.10's own opening line) — this is the
**traditional, full** impersonation concept, explicitly **not** what
the Product Architect is now proposing. The existing architecture text
does not contain a separately-named "view-only impersonation" concept
anywhere — this is confirmed by direct search of the full §9.1–§9.13
text; the word "impersonation" appears only in the context of the
full read/write session.

**3. Is it read-only or read/write?** As specified: **read/write**
("a full, read/write session"). The Product Architect's proposed
capability is a **narrower variant of this same named concept**, not
an existing, separately-specified thing.

**4. What customer authorization is required?** "Requires the Admin to
have explicitly requested help... the request flow captures a
reference to that request (a support ticket ID, or a simple in-app 'I
need help' flag the Admin sets) as part of the impersonation record" —
explicit, and tied to a captured reference, not a verbal/assumed
consent.

**5. How is the customer identified?** Not separately specified beyond
"a specific Admin" — the mechanism for *finding* that Admin/business is
the same lookup path named throughout §9.3 (search by `businessCode`,
email, or name — `businessCode` itself unbuilt, per the Capability
Investigation §3).

**6. How is tenant scope enforced?** Not detailed at the credential
level in §9.10's text beyond "the session is scoped down to what the
Admin themself could do, nothing more" — this is a **permission-scope**
statement (what the session can *do*), not a stated mechanism for
*which business* the session is locked to. By contrast, Support
Session (§9.7) is explicit about this: "single-`businessId`-scoped
credential." Impersonation's text does not repeat this phrase, though
it is reasonable to assume the same discipline was intended, since it
scopes to "a specific Admin," who by definition belongs to one
business (or, for a multi-shop Owner, one `businessId` at a time,
consistent with how every other part of this codebase scopes
multi-shop access — this is an inference from the surrounding
architecture's consistent pattern, not a direct quote, and is flagged
as such).

**7. How long does it last?** "30 minutes, shorter than a Support
Session (9.7), since impersonation carries write authority."

**8. How does it end?** Time-box expiry; "the operator can request a
fresh session if more time is genuinely needed, each request
independently logged" — same non-renewable-without-a-fresh-request
shape as Support Session.

**9. What is audited?** Issuance (with the captured consent reference)
and — per §9.6's schema table — the same `actionType`/`targetBusinessId`/
`targetUid`/`justification`/`timestamp` shape every other audited
action uses; §9.10 additionally requires "a persistent, unmissable
banner during any active impersonation session" visible to the Admin,
which is itself a transparency control, not merely an audit-log entry.

**10. How does it differ from Support Session?** Explicitly, on three
axes stated directly in the text: **write authority** (impersonation
has it, Support Session categorically does not — §9.7's own business
rule: "cannot be escalated to a write... from within the same
credential"), **consent** (impersonation requires an Admin-initiated
request; Support Session's text does not state this requirement — a
real, evidenced asymmetry, not an inference), and **time-box** (30 vs.
60 minutes — impersonation is *shorter*, specifically because it
carries more risk).

**11. How does it differ from Business Visibility?** Business
Visibility (as actually built, per Gap 2) is a **curated, server-
shaped response** — name, category, owner identity, staff summary,
subscription status, recent payments — never a session, never raw
collection access, never any form of "seeing the customer's screen."
Impersonation, as specified, is the opposite: a full session with
access to whatever the Admin's own permissions reach, via the tenant
SPA itself (implied by §9.10's mention of a banner appearing "in the
tenant SPA").

**12. How does it differ from the customer actually logging in?** The
architecture does not state this explicitly as a comparison, but the
distinction is structurally clear from what *is* stated:
impersonation is **server-issued, time-boxed, logged** (§4.6, restated
at §9.10) — "never a raw Firebase Auth identity swap." The customer
logging in themselves involves no platform-operator credential, no
time-box, and no impersonation-specific audit trail at all. This is
the one comparison point the architecture is explicit about
specifically to rule out a naive implementation (a literal shared-
credential or Auth-token-swap approach), not merely a difference of
degree.

---

## 3. Business Visibility vs. Support Session vs. View-Only Impersonation

| Capability | Business Visibility | Support Session (§9.7, as specified) | View-Only Impersonation (as newly proposed) |
|---|---|---|---|
| Curated business information | ✅ Yes — this is its entire shape | Not applicable — different access model entirely | Not its purpose, though the Admin's own screens would incidentally show similar summary data |
| Customer's actual tenant UI/context | ❌ No — server-shaped JSON only, never the tenant SPA itself | UNRESOLVED — §9.7's text describes raw *collection* access via a credential, not explicitly "the tenant SPA's actual UI" — these could be the same or different depending on how a future implementation renders the session's data | ✅ Yes — this is the entire point of the newly proposed capability, and the one property neither existing concept provides |
| Product-level detail | ❌ Explicitly excluded (Gap 2) | ✅ Implied — `products` is one of the "raw collections" (7.2) the session grants read access to | ✅ Yes, as part of seeing the actual UI |
| OCR-entry state (in-progress draft) | ❌ No | ⚠️ Partial — `purchaseDrafts/{uid}` is a real Firestore document (§6, below) a raw-collection session *could* read, but the field-status badges (detected/review/not_found) are never persisted anywhere (§6) — no read-only mechanism, including a hypothetical raw-collection Support Session, could show those specifically | ✅ Yes, for the live, in-progress state — this is the one thing genuinely unreachable any other way (§6) |
| Customer-specific screen/state | ❌ No | ❌ No — a raw collection read is not "the screen," even if it contains the same underlying values | ✅ Yes — this is the defining property |
| Read tenant data | ❌ Only the curated shape | ✅ Yes, raw collections, single-`businessId`-scoped | ✅ Yes, via the customer's own view |
| Write tenant data | ❌ No | ❌ Explicitly, categorically no (§9.7's own stated business rule) | **Per the Product Architect's own framing: must be No** — this is the entire point of "view-only" |
| Act as customer | ❌ No | ❌ No (this is exactly what distinguishes it from Impersonation, per §9.7) | ⚠️ **This is the conceptual tension the Product Architect's proposal needs to resolve** — "view-only impersonation" borrows the word "impersonation" (full session acting *as*) while explicitly wanting Support Session's read-only property. See §12 below. |
| Requires customer authorization | Not required (audited via `justification` only) | Not stated as required in §9.7's text | UNRESOLVED — if this capability is closer to Support Session in spirit (read-only), the existing precedent (Support Session) does **not** require it; if it's closer to Impersonation in mechanism (rendering the actual tenant SPA as that user), the existing precedent (§9.10) **does**. See §9 below. |
| Tenant scope | Single `businessId` per call | Single `businessId`-scoped credential (explicit) | Would need the same explicit scoping — not automatic merely by analogy, since this is a new mechanism |
| Session duration | No session — per-call | 60 minutes | Not specified anywhere — a new decision, see §17 |
| Audit | ✅ `business.viewed`, per call | Specified: issuance/expiry (§9.7) | Not specified anywhere — a new decision, see §11 |
| Primary purpose | Curated diagnostic summary for common support scenarios (Gap 2's own stated scope) | Broader raw-data diagnosis without write risk | Reproducing the customer's *actual rendered experience*, specifically for scenarios where the underlying data alone (however complete) doesn't explain a UI-level discrepancy |

**The precise distinction this table surfaces, not previously named in
either prior investigation:** Support Session (as specified) and the
newly proposed View-Only Impersonation are **not** the same thing even
though both are read-only. Support Session grants access to
**Firestore's raw collections** — the *data*. View-Only Impersonation,
as the Product Architect describes it ("the Agent needs to see the
customer's actual tenant experience"), is about the **rendered
application** — the *UI*, including client-side-only, never-persisted
state (§6 below demonstrates this distinction is not academic — it is
exactly where the OCR scenario's hardest case actually lives).

---

## 4. The OCR Support Scenario — Traced Through the Actual Implementation

**Server-side extraction shape** (`server/smartStockEntry.ts`,
confirmed by direct reading, not inferred): the AI provider's raw
response is parsed into a `SmartStockEntryProposal`, containing, per
line item, exactly four fields — `productName`, `quantity`, `unit`,
`costPrice` — each wrapped in a `FieldState<T>` with a status of
`'detected' | 'review' | 'not_found'`, plus a separate `productMatch`
result (`'confident' | 'no_match'` — `'uncertain'` is a reserved type
value, never actually emitted by Tier 1, confirmed by the function's
own doc comment). **No receipt "total" field is extracted or parsed
anywhere in this module** — `RawExtractionResponse` has only
`lineItems`, `supplierName`, `documentDate`. This is directly relevant:
the system does not even attempt to capture "what the receipt says the
total is" as a discrete, comparable value — a total mismatch, if it
exists, is never machine-checked against anything; it can only be
noticed by a human (customer or Agent) manually summing the line
items.

**Client-side persistence** (`apps/tenant/src/components/AddStockView.tsx`,
`apps/tenant/src/context/AppContext.tsx`, `apps/tenant/src/types.ts`):
the operator reviews the OCR proposal in the UI, where each field
renders a visible badge (`renderFieldStatusBadge`, confirmed at line
~2674) showing `detected`/`review`/`not_found`. As the operator
edits/confirms rows, the in-progress state is auto-saved to a real
Firestore document, `businesses/{businessId}/purchaseDrafts/{uid}`
(`PurchaseDraft`/`PurchaseDraftLineItem`, `apps/tenant/src/types.ts`
line ~1568). Confirmed by direct reading of that type: it persists
`productName`, `quantity`, `unit`, `costPrice`, `sellingPrice`, and
`costPriceAutoFilled` — **but not the field-status badges themselves**
(`detected`/`review`/`not_found` never appears in `PurchaseDraftLineItem`'s
schema). Once finalized, the same core fields (plus
`costPriceBasisUnit`) persist to the real `batches`/`stockBatches`
collections.

**A real, already-documented historical bug directly on point,
confirmed by reading the code comment at `AddStockView.tsx` ~line
1850–1858** (not paraphrased, quoted): *"the exact '2 Un @ 1,000/Un' ->
'Cx' -> silently-computed '24,000' failure this Track A change exists
to close."* This describes exactly the class of problem the Product
Architect's OCR scenario names — a purchase unit gets corrected by the
operator after OCR read a cost price in a different unit, and an
earlier version of this code used to silently recompute a new cost
through the unit-relationship conversion, producing a total that no
longer matched the receipt. The fix (already shipped, per the
comment) was to **stop** auto-converting an OCR-sourced cost on a unit
change, and instead leave it "visibly unconverted... the operator
sees it, notices it no longer matches the receipt, and retypes it from
the receipt directly." This is direct, concrete evidence that **this
exact failure mode has already occurred in this product**, and that
its root cause is precisely the interaction between OCR-read values,
operator-made unit corrections, and the unit-relationship conversion
system (`apps/tenant/src/lib/unitRelationship.ts`,
`resolveUnitAwarePrice`) — not a hypothetical.

**Modeling the Product Architect's exact example — "the receipt total
is 50,000 MZN but SABUSH is showing a different total":**

What an Agent would need to inspect, restricted to fields **actually
supported by the code** (confirmed above, nothing invented):
- Per line item: `productName` (and whether `productMatch` was
  `'confident'` or `'no_match'` — a wrong match would silently apply a
  different product's context), `quantity`, `unit`, `costPrice`,
  `costPriceAutoFilled` (was this value OCR-original or operator-typed?),
  `costPriceBasisUnit` (which unit is this cost actually expressed
  in?).
- The matched Product's own `unitRelationship` (the multi-level
  purchase-unit-to-selling-unit conversion chain) — since a
  misapplied or misunderstood relationship is exactly the documented
  bug's root cause.
- Whether the row in question is still an in-progress `purchaseDrafts`
  document or an already-finalized `batches`/`stockBatches` entry —
  materially changes what's persisted and where.

**Can Business Visibility diagnose this?** **No.** Confirmed directly:
Gap 2's own excluded list names `products`, `batches` explicitly — none
of the fields above are present in Business Visibility's curated
response shape under any circumstance.

**If not, can a Support Session (as currently specified) diagnose it?**
**Yes, for an already-finalized batch, and largely yes for an
in-progress draft too** — both `batches`/`stockBatches` and
`purchaseDrafts/{uid}` are real Firestore documents containing every
field named above **except** the field-status badges
(`detected`/`review`/`not_found`), which are never persisted anywhere,
confirmed. A raw-collection read (the mechanism §9.7 specifies) would
let an Agent reconstruct the actual numbers, the unit relationship in
play, and whether a value was OCR-original or operator-edited
(`costPriceAutoFilled`) — **enough, in most cases, to explain a total
mismatch after the fact**, without needing to see the customer's live
screen at all.

**Would View-Only Impersonation solve it, where Support Session
doesn't?** **Only in one specific, narrower circumstance than the
Product Architect's framing implies:** while the customer is **still
actively in the OCR review step, before confirming the rows** —
because that is the one window in which the field-status badges exist
at all, and they exist only as transient client-side render state, not
in `purchaseDrafts` or any other Firestore document. If the customer
is describing a receipt they entered **yesterday** (an
already-persisted batch), a read-only raw-data session already
contains everything needed — live impersonation adds nothing a
Support Session wouldn't already show. If the customer is **live, on
the phone, mid-OCR-review**, and specifically confused about *which
fields the system is flagging as uncertain* (as opposed to what the
final numbers are), that specific piece of information genuinely does
not exist anywhere except the render itself.

---

## 5. The "What You See Is Different" Scenario

Tested against actual repository evidence for what could plausibly
differ between what the Agent expects and what the customer reports:

- **Active business** — a multi-shop Owner (`businessIds[]`,
  `activeBusinessId`) could be looking at a different shop than the one
  the Agent has in mind. This is a real, evidenced possibility — the
  app's own shop-switch-guard logic (`apps/tenant/src/lib/shopSwitchGuard.ts`)
  exists precisely because switching context is a real, handled case
  in this product. Business Visibility's single-`businessId`-scoped
  read cannot detect this mismatch on its own — the Agent would need
  to already know, from the customer, which business they believe
  they're looking at, then verify that specific `businessId`.
- **Feature/subscription-dependent UI** — confirmed directly: `AddStockView.tsx`
  itself contains a comment referencing `firestore.rules`' own
  `subscriptionAllowsNewRecords()` check (~line 3108) — meaning what a
  customer can even *attempt* on this exact screen is subscription-
  state-dependent. Business Visibility's curated read *does* include
  subscription status, so this specific divergence **is** diagnosable
  without impersonation, provided the Agent thinks to check it.
- **Unsaved, in-progress draft state** — covered in §4: real,
  persisted (`purchaseDrafts`), mostly diagnosable via raw-collection
  read, except for the ephemeral field-status badges specifically.
- **Genuine UI/product defect vs. user misunderstanding** — this is
  the one category where **no amount of data access, curated or raw,
  resolves the ambiguity**, because the question is precisely "is the
  screen rendering correctly." Only actually seeing the rendered
  screen (impersonation, in some form) — or a screenshot/screen-share
  obtained through some channel outside this codebase entirely —
  can settle this class of question. This is the strongest, most
  defensible case for View-Only Impersonation found in this entire
  investigation, and it is **not** OCR-specific — it applies to any
  "is this a bug or am I confused" report.

**Determination:** curated Business Visibility is **sufficient** for
the multi-shop-context and subscription-state sub-cases. It is
**insufficient** for the two remaining sub-cases (in-progress OCR
review state; genuine UI-rendering questions) — and of those two, a
raw-collection Support Session closes most, but not all, of the first
one, and closes **none** of the second one.

---

## 6. What "View-Only Impersonation" Must Mean — A Strict Model

### READ
Per the evidence above, a defensible strict model would permit:
- Viewing the customer's actual rendered tenant experience — the one
  thing §4/§5 establish as genuinely unreachable by any existing or
  specified mechanism.
- Navigating within the tenant to reproduce the reported context — a
  necessary consequence of "seeing what they see," not a separate
  capability.
- This necessarily includes reading the same underlying data the
  customer's own screens already read (products, batches, drafts,
  etc.) — there is no way to render the tenant SPA without loading the
  data it depends on. This is **structurally the same raw-collection
  reach Support Session (§9.7) already specifies**, just consumed
  through the tenant SPA's own rendering rather than returned as raw
  JSON to a SuperAdmin screen.

### WRITE
Per the Product Architect's own explicit framing (§1, §8 of the
source material): **must be No**, unless a future, separate decision
changes this. Every specific write action named in the source
material's exclusion list (add stock, edit/create/delete products,
submit Contagem, change prices/settings/subscription, confirm
payments, submit forms, any tenant-authorized write) is **not
evidenced as necessary for any diagnostic scenario found in this
investigation** — every example in §4/§5 is about *seeing*, never
*doing*, on the customer's behalf. This is consistent, not merely
assumed: nowhere in §4's OCR trace or §5's UI-mismatch trace did
resolving the customer's confusion require the Agent to actually
change a value — in every case, the resolution was either an
explanation (Level 1) or a bounded, already-existing action performed
through the **existing**, separate SuperAdmin action set (Level 2),
never a write performed *as* the customer inside their own tenant
context.

**A structural implication worth naming precisely:** "view-only
impersonation must not inherit the customer's write permissions" is
achievable, but it is not free — it requires the underlying mechanism
to actively **strip** write capability from a session that would
otherwise, by rendering the real tenant SPA as that user, carry
exactly the same permissions the customer has. This is a materially
different (and more involved) requirement than Support Session's
design, which never grants write capability *to begin with* because it
never renders the tenant SPA at all — it returns curated or raw data
to a *different* application (SuperAdmin), which has no write paths to
tenant collections built into it. **View-Only Impersonation, if built
as "render the tenant SPA, but disable its write paths," is a
genuinely new kind of technical guarantee this repository has no
existing precedent for** — Support Session's read-only guarantee comes
from "the mechanism simply doesn't offer writes," not from "writes
are offered but blocked." This distinction matters for how rigorously
any future Rule 8 Assessment would need to test the boundary, but is
named here only as an architectural characteristic, not a design
decision.

---

## 7. Customer Consent / Authorization

Testing directly against what's stated, not assumed:

- Architecture §9.10 (full Impersonation): **explicit consent
  required** — "requires the Admin to have explicitly requested help,"
  captured as a reference in the impersonation record.
- Architecture §9.7 (Support Session): **no consent requirement
  stated** — the text specifies a required `justification` from the
  *operator*, not authorization from the *customer*.
- Nothing in the repository defines a customer-generated code, link,
  or approval mechanism of any kind for either concept — confirmed by
  search; no such flow exists anywhere in `apps/tenant/src` or
  `server/`.

`UNRESOLVED — NOT DEFINED BY CURRENT ARCHITECTURE`: whether View-Only
Impersonation, specifically, should require customer consent. The two
existing precedents point in different directions depending on which
one View-Only Impersonation is judged closer to (§3's table already
surfaces this as the central open question).

**Why customer authorization would matter here, reasoned from the
evidence rather than asserted:** View-Only Impersonation, as this
document's §6 analysis establishes, technically **renders the actual
tenant application as the customer** — this is categorically different
from Support Session's "return some JSON to a different app," and
closer in kind (though not in write-capability) to full Impersonation.
A customer whose screen is being reproduced by an operator, even
read-only, is having their live session effectively mirrored — the
same transparency principle Architecture §9.10 already applies to full
Impersonation ("an Admin must never be unaware that a platform
operator is currently acting as them... applied to transparency, not
just access control") applies with comparable force to a *viewing*
session, not only a *writing* one. This is a reasoned inference from
an existing, stated principle — not an invented new requirement.

---

## 8. Security Boundary — Architectural Requirements Only

Per the target principle ("one Agent session → one explicitly
identified customer/business context → read-only access → expires →
cannot be reused for another tenant"), tested against what the
repository already establishes as its pattern for *every* comparable
mechanism:

- **`businessId` scoping** — every existing privileged action in this
  codebase (Business Visibility, Suspend/Reactivate, both Recovery
  Authorizations, and Support Session/Impersonation as specified) is
  scoped by an explicit `businessId`, re-verified server-side. A View-
  Only Impersonation session would need the identical discipline — no
  architectural reason found to deviate from this repository's one
  consistent pattern.
- **User identity / Owner identity** — Business Visibility already
  distinguishes the target business from the target user cleanly
  (`ownerUid` vs. `businessId` are separate concerns in
  `businessVisibility.ts`). A View-Only session impersonating a
  specific *user* (which could be the Owner or a Staff member,
  multi-shop-aware) needs the same clean separation.
- **`platformRole`** — the existing `requireAuth → requirePlatformOperator
  → [role check]` chain already generalizes correctly to a new route;
  no new authorization *shape* is implied.
- **Tenant isolation** — the same reasoning the Capability Investigation
  already applied to Support Session (§11 there) applies here with
  more force, not less: because this mechanism would render the actual
  tenant SPA, a stale or incorrectly-scoped session credential carries
  *more* real-world consequence (the operator literally sees a live,
  navigable application) than a stale raw-JSON read would.
- **Credential/session lifetime, stale-session risk, switching
  businesses** — Architecture already establishes the *pattern* (time-
  boxed, non-renewable-without-a-fresh-request, per both §9.7 and
  §9.10) — applying the same pattern here is architecturally
  consistent, though the *specific* duration is undecided (§17).
- **Multiple businesses owned by one user** — the existing
  `businessIds[]`/`activeBusinessId` model already handles this for
  the tenant app itself; a View-Only session would need to pin to
  exactly one `businessId` for its duration, the same discipline
  Support Session's text already states explicitly ("single-
  `businessId`-scoped").

No new architectural principle is required here beyond consistently
applying what this repository already does everywhere else — the
requirements above are a restatement of the existing pattern, not new
invention.

---

## 9. Auditability

Per the four sub-categories requested:

**Session start** — "who accessed whose tenant and why" is exactly the
shape Support Session's and Impersonation's own specified audit
entries already carry (`actorUid`, `targetBusinessId`/`targetUid`,
`justification`, per §9.6's schema table) — no new event type is
needed conceptually; a View-Only session would use the identical
shape.

**Session scope** — "which business/user context was authorized" is
the same `targetBusinessId`/`targetUid` fields already in the existing
schema.

**Session expiry/end** — both existing specified mechanisms (§9.7,
§9.10) already log expiry as its own event, "even though nothing
'happens.'" Same applies here by direct analogy.

**Actions attempted** — this is the one genuinely new question this
capability introduces that neither existing mechanism needs to answer
the same way: Support Session never offers writes at all (nothing to
attempt); full Impersonation *is* write-capable, so there's nothing to
"attempt and reject." A **View-Only** session, per §6's finding that it
would need to actively strip write capability from an otherwise-
write-capable rendering, creates a real question: should an attempted
write be **technically impossible** (the safer, recommended
default, consistent with Support Session's "cannot be escalated...
never an implicit upgrade" principle) or merely **rejected and
logged**? `UNRESOLVED — NOT DEFINED BY CURRENT ARCHITECTURE` — neither
existing mechanism's design directly answers this, because neither
one has ever needed to. **Recommendation, explicitly labeled as such,
not as an existing decision:** technically impossible is the more
conservative, more consistent-with-existing-precedent choice (Support
Session's own stated rule is exactly this shape), and should be the
default position pending Product Architect confirmation.

**Support reason** — both existing mechanisms already require a
`justification`; there is no reason evidenced to treat this one
differently.

**Compared with existing convention:** every piece of this section
maps cleanly onto the *already-specified* audit shape for Support
Session/Impersonation — the only genuinely open question is the
attempted-write handling, which is new precisely because "view-only"
is a new combination of properties neither existing mechanism has had
to reconcile before.

---

## 10. Support Session vs. Impersonation — Are They Duplicates, or Does One Contain the Other?

Testing the three possible relationships against the evidence:

- **Should they remain separate?** The evidence in §3 supports this:
  Support Session (raw data, returned to a *different* application) and
  Impersonation (rendering the *actual* tenant application) are
  mechanically different enough that collapsing them would lose a real
  distinction — specifically, the field-status-badge case in §4 that
  only a rendering-based mechanism can ever show, versus the "explain
  a finalized batch's numbers" case that raw data alone already
  solves.
- **Should one contain the other?** Testing this directly: could
  "View-Only Impersonation" simply *be* "Support Session, but the raw
  data is rendered through the tenant SPA's own UI instead of returned
  as JSON to a SuperAdmin screen"? **This framing is architecturally
  coherent and directly supported by the evidence** — it would mean
  View-Only Impersonation is not a third, independent mechanism, but a
  specific *rendering mode* of the same underlying session concept
  Support Session already specifies (same `businessId` scoping, same
  time-box family, same audit shape, same read-only guarantee), simply
  consumed differently. This reframing would also directly resolve the
  write-capability-stripping problem named in §6: if the underlying
  mechanism is Support Session's (which never had write paths to begin
  with, rather than full Impersonation's write-capable paths with
  writes disabled after the fact), there is nothing to "strip" — the
  session simply never had write authority in the first place, which
  is a materially safer property than actively suppressing an
  otherwise-present one.
- **Is one redundant?** Full, write-capable Impersonation (§9.10 as
  originally specified) is **not** made redundant by this — nothing in
  this investigation's evidence base identifies a scenario requiring
  write-on-behalf-of-the-customer, but the Prior Investigation's own
  finding stands: full Impersonation remains a real, separately-
  specified, higher-risk capability that this document does not find
  reason to build, reject, or merge with anything else.
- **Did the existing architecture already intend this relationship?**
  Not explicitly — §9.7's text never mentions rendering the tenant SPA;
  §9.10's text never mentions a read-only variant. This reframing is a
  **reasoned synthesis of the evidence gathered in this investigation**,
  not a rediscovery of something the architecture already stated. It
  is offered as the most internally consistent way to understand what
  the Product Architect is now describing, not as a settled
  architectural fact.

**Conclusion:** the most defensible reading of the evidence is that
**View-Only Impersonation is best understood as Support Session's
underlying access mechanism, consumed through a different rendering
surface (the actual tenant SPA) rather than a curated/raw JSON
response** — not a duplicate of either existing concept, and not
requiring a third, independently-invented credential type. This
document does not decide this; it is the strongest-evidenced
hypothesis for the Product Architect to confirm or redirect.

---

## 11. Real Use Cases for View-Only Impersonation, Beyond OCR

| Customer problem | Why Business Visibility insufficient | Why ordinary guidance insufficient | Why View-Only Impersonation helps |
|---|---|---|---|
| OCR purchase-total mismatch, customer mid-review | `products`/`batches`/drafts explicitly excluded (Gap 2) | Field-status badges are never persisted anywhere (§4) — verbal relay is the only alternative, and is exactly what the Product Architect's own transcript example shows failing | Only live rendering shows the badge state; nothing else can |
| "The screen doesn't match what you're describing" — possible UI defect | Not a data question at all — a rendering question | No amount of correct verbal description resolves "is this a bug," since the customer may not know what correct rendering looks like | Directly observing the actual render is the only way to distinguish defect from misunderstanding (§5) |
| Product identity/unit-relationship confusion the customer can't articulate clearly | `products`, including `unitRelationship`, explicitly excluded | The customer may not have the vocabulary to describe a multi-level unit chain correctly over a phone call | Seeing the actual configuration screen, as the customer sees it, removes the description-accuracy dependency entirely |
| Contagem completion difficulty (already flagged as a Level-3 candidate in the Assistance-Level Investigation, §6 there) | `stockCounts` explicitly excluded | Multi-step, stateful flow — hard to relay accurately over several verbal exchanges | Live view lets the Agent see exactly which step/state the customer is stuck on |
| Subscription-dependent UI confusion (a feature is greyed out/hidden and the customer doesn't understand why) | Business Visibility *does* include subscription status — this row is included to show a **negative case**, where impersonation would be overkill | An explanation referencing the subscription status already visible to the Agent is sufficient | **Not needed** — flagged here specifically to contrast with the genuine cases above |

---

## 12. Cases Where View-Only Impersonation Should NOT Be Used

- **Anything Business Visibility's curated read already answers** —
  payment status, subscription state, suspension state/reason (once
  the small gap identified in the prior investigations is closed),
  owner/staff identity. Using impersonation here would be convenience,
  not necessity, directly contradicting §16's own stated test.
- **Anything one of the four existing Level 2 actions already
  resolves** — payment confirmation, business reactivation, either
  Recovery Authorization. None of these require *seeing* the customer's
  screen; they are bounded server actions against known documents.
- **Genuine data-correctness disputes about an already-finalized,
  immutable record** (a Closing, a historical Business Worth
  snapshot) — Principle 2.10 governs this territory; seeing the
  customer's screen does not change the fact that these records are
  not editable in place by design, and the narrow Recovery
  Authorization mechanisms remain the only sanctioned exception,
  unrelated to whether the Agent can *see* the screen.
- **Any scenario where the customer should perform the action
  themselves** — e.g. the actual product-identity confirmation flow
  (`BDR-0012` Decision 12's Owner-confirmation-only design) — seeing
  the customer's screen to *observe* them doing this is defensible
  diagnostically; the Agent doing it *for* them, even if "view-only"
  somehow blurred into action, would directly contradict an existing,
  explicit governance decision that this remains Owner-authority-only.
- **Engineering-territory issues** — "something isn't working," where
  the actual root cause is a platform-wide defect rather than a
  customer-specific data/UI question — System Health (§9.11, unbuilt)
  is the more relevant, still-missing capability here, not
  impersonation of one specific customer's tenant.
- **Subscription/billing state correction** — `BDR-0011` already
  governs this; seeing the customer's screen does not change that
  standing decision.

---

## 13. The Revised Hybrid Model — Tested Against the Evidence

**Level 1 — Guided Support.** Unchanged, fully supported by existing,
built capability (Business Visibility).

**Level 2 — Assisted Resolution.** Unchanged, fully supported by four
existing, already-audited actions.

**Level 3 — View-Only Impersonation.** **Supported by the evidence, but
narrower than the Product Architect's own framing might first
suggest.** §4/§5/§11 together identify a real, non-convenience-only
need — but only for a specific subset of scenarios (live, in-progress,
UI-rendering-dependent diagnosis), not as a general-purpose "see
anything the customer sees" tool for every hard case. Most of what
raw data access alone would answer (an already-finalized batch's
numbers, most product/unit-relationship questions) does not need live
rendering at all — a data-only Support Session, per §10's synthesis,
would already resolve those, with View-Only Impersonation reserved for
the genuinely irreducible remainder (§11's table, and specifically
the "is this a defect" class of question, which is categorically
unanswerable by data access of any kind).

**Level 4 — Escalation.** Confirmed, as the prior Assistance-Level
Investigation already found (§9 there): no fourth platform-operator
role or capability exists anywhere in this repository; this remains
organizational, not architectural, and this investigation finds no
reason to revise that finding.

**Conclusion on the revised model as a whole:** the four-level
structure is supported, provided Level 3 is understood precisely —
not as "impersonation whenever Levels 1–2 fail," but specifically for
the subset of failures that are irreducibly about *rendering* rather
than *data*, per §10's finding that most of the raw-data subset is
better served by (the still-unbuilt) Support Session in its original,
non-rendering form.

---

## 14. Critical Question — Convenience or Diagnostic Necessity?

Tested directly against the two named examples, using the task's own
distinction:

**The OCR scenario, specifically the field-status-badge case (live,
in-progress review): diagnostic necessity, not convenience.** No
amount of raw data access changes the fact that the field-status
badges (`detected`/`review`/`not_found`) are never persisted anywhere
(§4, confirmed by direct reading of `PurchaseDraftLineItem`'s schema).
This is not "faster with impersonation" — it is **structurally
impossible without it**, for this one specific sub-case.

**The OCR scenario, for an already-finalized batch: convenience, not
necessity.** Every field needed to diagnose a stale-total complaint
about a purchase entered yesterday is already persisted and
raw-data-readable (§4) — a Support Session (never built, but
architecturally sufficient) would answer it without needing to render
anything. Impersonation would make this *faster* (one screen instead
of reading several raw fields and reconstructing the math mentally),
which is a real benefit, but not the "materially different causes,
cannot be reliably distinguished otherwise" bar the task itself sets
for "necessity."

**The "what you see is different" scenario: diagnostic necessity, for
the genuine-defect-vs-misunderstanding sub-case specifically.**
Confirmed in §5 — this is the one category in this entire two-document
investigation series where no data access of any kind, curated or raw,
resolves the ambiguity, because the question is about rendering
correctness itself, not about any value.

**Overall answer:** the evidence supports **diagnostic necessity for a
specific, narrower slice of the problem space than "impersonation
generally"** — live, in-progress, UI-state-dependent diagnosis, and
genuine defect-vs-misunderstanding triage. For the broader remainder
of what the Product Architect's examples gesture at (explaining an
already-saved purchase's numbers), the evidence more precisely
supports **convenience on top of an already-sufficient, still-unbuilt
Support Session**, not a standalone necessity for impersonation
specifically.

---

## 15. Minimum Safe View-Only Impersonation Boundary

*(Recommendations, explicitly labeled — not existing decisions, except
where a citation is given.)*

### Agent CAN
- View the customer's rendered tenant experience, for the single,
  explicitly identified `businessId`/user context the session was
  opened for — *supported directly by §4/§5/§11's evidence of genuine
  need.*
- Navigate within that tenant context as a necessary consequence of
  viewing it — *same basis.*

### Agent CAN SEE
- Everything the customer's own account would render, including
  transient, never-persisted UI state (the field-status badges, and
  any comparable in-progress, unsaved render state elsewhere in the
  product) — *this is the entire justification for the capability,
  per §4/§14; without this, the capability adds nothing over a data-
  only Support Session.*

### Agent CANNOT
- Perform any write action, including every item explicitly named in
  the source material's exclusion list (add/edit/delete stock or
  products, submit Contagem, change prices/settings/subscription,
  confirm payments, submit any form, or any other tenant-authorized
  write) — *directly required by the Product Architect's own framing,
  and independently supported: no scenario in this investigation
  evidenced a need for the Agent to write on the customer's behalf
  (§6, §12).*
- Act on behalf of the customer in any way that produces a persisted
  change — *same basis.*

### Customer MUST AUTHORIZE
`UNRESOLVED — NOT DEFINED BY CURRENT ARCHITECTURE`, per §7 — this
document does not decide it, but recommends (given §6/§10's finding
that this capability renders the actual live tenant experience, a
materially more consequential property than Support Session's raw-JSON
return) that the **Impersonation precedent's consent requirement is
the more defensible default to inherit**, not Support Session's
absence of one — because the mechanism's actual behavior (rendering a
live session) is closer in kind to Impersonation than to a data API
call, regardless of its write-capability difference.

### Session MUST BE
- **Time-limited** — supported by existing precedent (§9.7/§9.10's
  identical pattern); specific duration is a new decision (§17), not
  an existing one.
- **Tenant-scoped** — supported directly by §8's analysis; single
  `businessId`, no exception found anywhere in this repository's
  existing pattern.
- **Read-only, enforced structurally rather than by convention** —
  supported by §6's finding that "technically impossible" is the more
  conservative, precedent-consistent choice for handling attempted
  writes.
- **Auditable**, using the existing session-issuance/expiry shape
  already specified for Support Session/Impersonation (§9) — no new
  event type needed, per the task's own instruction.
- **Distinct from full Impersonation in its write authority**, while
  potentially **sharing its underlying session/credential mechanism
  with Support Session**, per §10's synthesis — this is the specific,
  reasoned recommendation this investigation offers for how the
  Product Architect might resolve the "is this a new third mechanism,
  or a rendering mode of an existing one" question, not a settled fact.

---

## 16. Governance Impact

**Existing architecture that can be reused:**
- The `requireAuth → requirePlatformOperator → [role]` authorization
  chain.
- The existing `platform_audit_log` event shape (`actorUid`,
  `actorRole`, `actionType`, `targetBusinessId`/`targetUid`,
  `justification`, `timestamp`).
- Support Session's own specified `businessId`-scoping and time-box
  pattern, if §10's synthesis (View-Only Impersonation as a rendering
  mode of Support Session) is confirmed.

**Existing architecture that needs explicit Product Architect
reaffirmation:**
- Gap 2's original deferral of Support Session itself — this
  investigation's findings (§4/§5/§11) provide new, concrete evidence
  that did not exist when Gap 2 was decided; the Product Architect
  should explicitly reaffirm or revise that deferral in light of it,
  rather than have it silently superseded by a new capability being
  layered on top of an un-reaffirmed prior decision.
- Architecture §9.10's full, write-capable Impersonation concept —
  this investigation finds no evidence requiring it to be built, and
  recommends it remain exactly as deferred as it already was; this
  should be stated explicitly, not left ambiguous now that a
  differently-named, related concept is under active consideration.

**Existing capability that needs extension:**
- None identified — View-Only Impersonation, per §10's finding, is
  better understood as a new consumption mode of an already-specified-
  but-unbuilt mechanism (Support Session), not an extension of
  anything currently *built*.

**New capability requiring BDR/Policy/Specification/Rule 8:**
- The View-Only Impersonation mechanism itself, however it is
  ultimately specified — genuinely new, whether framed as a third
  concept or as Support Session's rendering-mode variant.
- The write-suppression/technical-impossibility guarantee named in §6
  and §9 — a real, non-trivial technical property this repository has
  no existing precedent for, and which any Rule 8 Assessment would
  need to treat as a first-class security requirement, not an
  incidental detail.
- The customer-authorization mechanism, whichever direction §7's open
  question resolves.

**Decisions that must be made before implementation:**
- Whether View-Only Impersonation is a new, third mechanism or a
  rendering mode of Support Session (§10).
- Whether customer authorization/consent is required (§7, §15).
- Session duration (§8's pattern applies; specific number undecided).
- Whether attempted writes must be technically impossible or merely
  rejected-and-audited (§9).
- Whether Gap 2's original Support Session deferral is being
  reaffirmed, revised, or effectively superseded by this new proposal
  (§16, first bullet under "reaffirmation").

---

# VIEW-ONLY IMPERSONATION — PRODUCT ARCHITECT DECISION INPUT

**1. Why is impersonation important for customer support?**
Not for the majority of support scenarios (§13/§14) — but for a real,
specific, evidenced subset: diagnosing live, in-progress, never-
persisted UI state (the OCR field-status-badge case), and
distinguishing genuine product defects from user misunderstanding — a
question no amount of data access, curated or raw, can ever resolve on
its own.

**2. Does the OCR purchase-receipt scenario genuinely require it?**
**Partially, and precisely.** For an already-finalized purchase entry,
no — raw data access (a Support Session, if built) already contains
everything needed, confirmed against the actual persisted schema
(§4). For a customer actively mid-review, describing what they
currently see, yes — the field-status badges genuinely exist nowhere
else, confirmed by direct reading of `PurchaseDraftLineItem`'s schema.

**3. Does the "customer sees something different" scenario genuinely
require it?**
**Yes, specifically for the defect-vs-misunderstanding sub-case** —
this is the single strongest, least-arguable piece of evidence in this
entire investigation for a genuine necessity, not a convenience (§5,
§14).

**4. What can Business Visibility diagnose?**
Everything it was designed for, unchanged from the Prior/Capability
Investigations: payment status, subscription/trial state, suspension
state (pending the small `justification`-surfacing fix already
identified), owner/staff identity.

**5. What can it NOT diagnose?**
Anything involving `products`, `batches`, `stockCounts`, or
`purchaseDrafts` — explicitly excluded by Gap 2's own reasoning, and
reconfirmed here as still the correct boundary for that specific,
curated mechanism.

**6. What can Support Session provide?**
Per its original specification (§9.7): raw, read-only access to those
excluded collections, single-`businessId`-scoped, time-boxed — enough
to resolve the *majority* of the OCR scenario (any already-persisted
purchase entry) without needing to render anything at all.

**7. What can View-Only Impersonation provide that those cannot?**
Exactly two things, both evidenced concretely: (a) transient,
never-persisted UI state — the field-status badges specifically, and
by extension any comparable ephemeral render state elsewhere in the
product; (b) the ability to observe rendering behavior directly, which
is the only way to distinguish a genuine defect from user
misunderstanding.

**8. Is impersonation required for any write operation?**
**No** — not evidenced anywhere in this investigation. Every scenario
examined resolves through observation/explanation or through the
existing, separate, already-bounded Level 2 action set — never
through a write performed as the customer.

**9. Should the Agent ever receive customer write authority?**
**No**, per the evidence gathered and per the Product Architect's own
explicit framing — this document finds independent, converging support
for that boundary, not merely deference to the stated instruction.

**10. Should View-Only Impersonation require explicit customer
authorization?**
`UNRESOLVED — NOT DEFINED BY CURRENT ARCHITECTURE`, with a reasoned
recommendation (§7, §15) that the Impersonation precedent's explicit-
consent requirement is the more defensible default, given that this
mechanism renders a live session rather than returning curated data —
a Product Architect decision, not a finding this document can settle
on its own.

**11. How should tenant isolation work conceptually?**
Identically to every other privileged mechanism this repository
already has — explicit `businessId` scoping, server-re-verified per
session, time-boxed, non-renewable-without-a-fresh-request, single-
tenant per session (§8) — no new isolation principle is required,
only consistent application of the existing one.

**12. What should be audited?**
Session issuance (actor, target business/user, justification),
session expiry, and — as a new question this specific capability
introduces — whether attempted writes are logged as anomalies even
though they should be technically impossible to execute (§9,
recommended, not yet decided).

**13. When should View-Only Impersonation NOT be used?**
Whenever Business Visibility or an existing Level 2 action already
answers the question (§12) — the majority of the full problem space
mapped across both prior investigations remains correctly served
without it.

**14. Should Support Session and View-Only Impersonation be separate
concepts?**
The evidence most strongly supports treating **View-Only Impersonation
as a rendering-mode variant of Support Session's own underlying
access, not a fully independent third mechanism** (§10) — this is
this document's central synthesis, offered for confirmation, not
imposed as settled fact.

**15. What is the minimum safe View-Only Impersonation boundary?**
As detailed in §15 above: render-only, structurally write-incapable
(not merely write-restricted), single-tenant-scoped, time-boxed,
fully audited on the existing event shape, with customer authorization
recommended but not yet decided.

**16. Does this materially revise the previous conclusion that
impersonation was unnecessary?**
**Yes, precisely and narrowly.** The prior conclusion — "zero
scenarios across the full problem space evidenced a genuine need for
write-capable, act-as-the-customer access" — **remains true and is not
revised**: nothing in this investigation found a need for *write*
capability. What *is* revised is the narrower, previously-unexamined
question of *read-only* rendering access: the OCR field-status-badge
case and the defect-vs-misunderstanding case are genuinely new
evidence, not present in either prior investigation's problem-space
mapping, and they do shift the conclusion for that specific, narrower
slice from "not evidenced as necessary" to "evidenced as necessary,
for a bounded subset of scenarios."

**17. What governance decision should the Product Architect make
next?**
Confirm or redirect three things, in this order, since each depends on
the one before it: (a) whether to reaffirm, revise, or supersede Gap
2's original Support Session deferral, given the new evidence in this
document; (b) whether View-Only Impersonation is a rendering mode of
that same mechanism or a genuinely separate third concept (§10); (c)
only then, whether customer authorization is required (§7) and what
the session's specific duration/audit details should be (§17 in the
body above) — since both of those depend on which mechanism shape is
chosen in (b).

---

**NO IMPLEMENTATION PERFORMED. NO CODE WRITTEN. NO BDR, POLICY,
SPECIFICATION, RULE 8 ASSESSMENT, OR IMPLEMENTATION AUTHORIZATION
CREATED OR ALTERED. NO ARCHITECTURE REDESIGNED. GAP 2 AND `BDR-0011`
REMAIN STANDING DECISIONS, EXPLICITLY FLAGGED FOR REAFFIRMATION WHERE
RELEVANT, NEVER SILENTLY REOPENED OR BYPASSED. NOTHING COMMITTED.
NOTHING PUSHED. THIS DOCUMENT IS NOT PART OF THE REPOSITORY.**
