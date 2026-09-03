# SABUSH BPT — SPECIFICATION REFINEMENT

## Decision 44 Refinement — Single Active Editor + Live Read-Only Viewers Model

**Status:** ✅ ACCEPTED AS GOVERNANCE DECISION — REQUIREMENTS ONLY.
Technical mechanism for editing authority (lease, lock, heartbeat,
takeover, deterministic identity, or otherwise) NOT selected. A fresh
Rule 8 Reassessment against this specific refined model is REQUIRED
before any Implementation Plan or Implementation Authorization. See the
formal acceptance record: [`docs/engineering/periodic-contagem-decision-44-refinement-single-editor-viewers-product-architect-acceptance.md`](../engineering/periodic-contagem-decision-44-refinement-single-editor-viewers-product-architect-acceptance.md).
**Accepted by:** SABUSHIMIKE MASCENI, 3 September 2026
**Refines:** Decision 44 — Contagem Shared Live Data & No-Silent-Loss Architecture (`stock-count-data-loss-resilience-decision-44-amendment.md`, ✅ Accepted — requirements only — SABUSHIMIKE MASCENI, 3 September 2026)
**Informed by:** Rule 8 Reassessment for Decision 44 (`docs/engineering/periodic-contagem-shared-live-data-decision-44-rule8-assessment.md`), verdict READY AFTER DECISIONS, four CRITICAL and two HIGH findings
**Affected Area:** Periodic Contagem
**Decision Authority:** Product Architect
**Implementation Status:** NOT AUTHORIZED

---

# 1. Relationship to Decision 44

This is a **refinement**, not a replacement. Decision 44 remains the
governing amendment in full. This document narrows exactly one
assumption Decision 44 left open — how concurrent authorized access is
structured — and does not reopen, weaken, or reinterpret anything else
Decision 44 already established.

**Decision 44 provisions this refinement explicitly preserves,
unchanged:**

* business ownership of the unfinished Periodic Contagem state (Decision 44 §4);
* durable local persistence, offline queueing, interruption flush, draft recovery, classified retry, and same-session finalization idempotency (§8);
* the no-silent-data-loss invariant (§9);
* stale-write protection as a required property (§11);
* the prohibition on blind last-write-wins where it can destroy a valid observation (§12);
* finalization integrity — no duplicate finalization, no draft resurrection, no active-edit loss, no post-finalization mutation (§13);
* offline/reconnect safety (§14);
* shared-device/logout isolation as a required, unresolved investigation (§15);
* tenant isolation (§17, and Decision 44's own non-goals in §25);
* recovery after interruption (§20);
* the requirement for a Rule 8 pass before any Implementation Plan or Implementation Authorization (§23, §26).

**Exactly what this refinement narrows:** Decision 44 §3's superseded
assumption ("Periodic Contagem does not need to support concurrent
multi-user editing") was replaced by an open-ended shared-editing model
in Decision 44 §6 ("Operator B must be able to observe and continue
from the same authoritative Contagem state"). This refinement narrows
that open-ended model to:

> **At most one active editing authority may modify the unfinished
> Periodic Contagem at a time; other authorized users/devices may
> observe the same authoritative state live, without write access.**

This is a genuine narrowing of Decision 44's own §6, not an
unauthorized departure from it — Decision 44 §6 itself already stated
the exact authorization tier for Staff access "is not determined by
this amendment alone," leaving room for exactly this kind of
follow-on refinement. Nothing in Decisions 38–43's durability
mechanisms is touched.

---

# 2. Single Active Editor Invariant

> **INV-44-S01 — Single Editing Authority.** At most one active editing
> authority may hold write access to a business's unfinished Periodic
> Contagem at any given time.

Terminology, deliberately distinguished (conflating these was a real
risk in Decision 44's original open-ended framing):

* **User** — an authenticated identity (Owner/Admin or Staff account).
* **Device** — a physical phone, tablet, laptop, or desktop.
* **Browser** — a browser installation on a device.
* **Tab** — one open browser tab/window within a browser.
* **Session** — one live, connected instance of the app (one tab, one
  active listener set, one `submissionIdRef`-equivalent local state).
* **Editing authority** — the specific, singular capability to write
  quantity changes to the active Periodic Contagem. Editing authority
  is held by exactly one **session** at a time, not by a user or device
  in the abstract — the same user can hold it on one device and not
  another; the same device can hold it in one tab and not another.

**The architecture must not allow two independent sessions to
simultaneously possess valid editing authority**, including two
sessions belonging to the same authenticated user (§4 below).

---

# 3. Viewer Invariant

> **INV-44-S02 — Shared State.** Editor and Viewers operate against the
> same business-owned Contagem state — never an independent per-Viewer
> copy.
>
> **INV-44-S03 — Viewer Read-Only.** A session in Viewer mode cannot
> modify Contagem quantity state, regardless of what authorization tier
> the underlying user otherwise holds.

Viewers:

* open the same Periodic Contagem;
* see the same business-owned draft state (not a separate read model);
* receive live authoritative updates, per the existing listener
  infrastructure already confirmed present (Rule 8 §E);
* observe the Contagem's current editing-authority status (who/which
  session currently holds it, to the extent that is knowable — see §6);
* **must not** write quantity changes, and must not create an
  independent local draft copy that could later be mistaken for
  authoritative content.

---

# 4. Same User — Multiple Devices

```text
User A
Phone     → could be Editor OR Viewer
Laptop    → could be Editor OR Viewer
Tablet    → could be Editor OR Viewer
```

**The same user does not automatically become Editor on every device
they open.** Opening the app on a second device while already holding
editing authority on a first device places the second device in Viewer
mode by default — it does not silently transfer, share, or duplicate
editing authority. This directly closes a gap the Rule 8 assessment
named concretely: today, `submissionId` is generated independently per
session with no cross-session awareness at all (Rule 8 §H) — this
refinement requires that the *editing authority itself*, not just the
finalization identity, be a single, trackable, cross-session concept.

The exact mechanism by which a user explicitly moves editing authority
from one of their own devices to another (§6) is **not decided by this
refinement** — only the requirement that it cannot happen silently or
by accident.

---

# 5. Multiple Users — Same Business

```text
Manager/authorized user  → could become Editor (if permitted)
Staff member              → Viewer (tier TBD)
Another authorized device → Viewer
```

This refinement formally separates two previously-conflated
authorizations that Decision 44 §6/§16 and its own Decision 44-A left
as a single open question:

* **Authorization to VIEW** the unfinished Periodic Contagem live.
* **Authorization to ACQUIRE EDITING AUTHORITY** over it.

These may legitimately differ — e.g. a business might reasonably want
every Staff member able to *watch* a count in progress, while
restricting who may *become* the Editor to a narrower tier. **Neither
tier is selected by this refinement** — both remain open (§13, and the
renumbered Decisions 44-S-A/44-S-B below), narrowing but not replacing
Decision 44-A.

---

# 6. Editor Acquisition / Takeover

Editing authority must be **explicitly acquired or otherwise
authoritatively established** — never inferred merely from opening the
Contagem screen. Product-level scenarios, each requiring a defined
(not yet decided) behavior:

### Scenario A — No Editor exists
An authorized user (per whatever tier Decision 44-S-B resolves to) may
acquire editing authority and become the Editor.

### Scenario B — Another Editor is active
A second authorized user/device opening the same Contagem must enter
Viewer mode, not silently become a second Editor and not silently queue
behind the first with no visibility into that fact.

### Scenario C — Editor closes the browser
Editing authority must eventually become available to another
authorized user again. The exact release condition/timing is **not
decided here** (§18/§19-D).

### Scenario D — Editor loses network
The system must **not** immediately treat a network-lost Editor as
having released authority, because doing so could allow a second
session to acquire authority while the original Editor still holds
valid, not-yet-synced durable local work — a premature takeover here
would recreate exactly the kind of data-loss risk Decision 44 exists to
prevent, just relocated to the authority-transition boundary instead of
the write-conflict boundary. The specific grace period/detection
mechanism is **not decided here**.

### Scenario E — Editor device dies
Recovery/takeover must be possible without destroying the dead Editor's
already-durable local/server-synced work — this is where INV-44-S05
(Authority Transition Safety, §17) is load-bearing.

### Scenario F — Editor offline for a long time
Another authorized user may eventually need to take over. **Critically:
the old, now-offline-for-hours device must not later reconnect and
blindly overwrite the new Editor's authoritative state** merely because
its own queued writes finally reach the server — this is precisely the
stale-write risk the Rule 8 assessment already confirmed has no
protection today (Rule 8 §E, §F, finding CRITICAL-1), now reframed as a
stale-*Editor* problem specifically, rather than a general
concurrent-writer problem (§11 below).

### Scenario G — Same user opens a second device
Must not silently create a second Editor (§4). Must present as Viewer
by default.

**No lease duration, timeout, lock implementation, or takeover algorithm
is chosen by this refinement.** These are explicitly deferred to Rule 8
and a subsequent Product Architect decision (44-S-D, 44-S-E).

---

# 7. Offline Editor

All existing durability guarantees remain fully required and are
**not** weakened by the single-Editor model:

* durable local persistence;
* offline queueing;
* interruption-triggered flush;
* draft recovery;
* the existing autosave/debounce/generation-token protections.

**The specific new question this refinement surfaces, and does not
answer:** what happens when the sole Editor is offline and another
authorized user wants to continue the count? This is recorded as a
required architectural/Rule 8 question (§18, Decision 44-S-E), not
solved here. Any candidate answer must be evaluated against Scenario F
above before selection.

---

# 8. Live Viewer Synchronization

```text
Editor:                    Viewer:
Produto X = 20      →      Produto X = 20
Produto X = 25      →      Produto X = 25
```

Because Viewers cannot write, this refinement **structurally
eliminates** the specific failure mode of two *simultaneously active,
both-writing* sessions racing on the same row under normal operation —
this is the direct, material reduction in the risk surface produced by
the model, not a claim that every conflict scenario disappears (§21
addresses this precisely).

**What this does not solve, and must not be claimed to solve:** stale
former-Editor sessions (§9), authority-transition safety (§6), and
cross-device finalization uniqueness (§10) are all independent of
whether writes were ever simultaneous — they are about *sequencing*
authority correctly over time, which a read-only Viewer restriction
does not by itself address.

---

# 9. Editor Staleness

> **INV-44-S06 — Stale Former Editor Protection.** A session that has
> lost, released, or been superseded in its editing authority must not
> be able to write to the Periodic Contagem merely because its local
> state still believes it holds authority.

This is the precise reframing of Decision 44-B's original scope. Two
sub-cases must both be covered by whatever mechanism Rule 8 eventually
evaluates:

* **A Viewer who later becomes Editor** (Scenario A/B transition) — no
  stale-write risk from this direction, since the Viewer never had
  write access to begin with.
* **A previous Editor whose authority has moved to someone else, who
  then reconnects** (Scenario F) — this is the actual remaining risk,
  and it is not automatically closed by the single-Editor model; it is
  *narrowed* to specifically stale-authority writes rather than
  general concurrent-writer conflicts.

---

# 10. Finalization

Decision 44 §13's requirement is unchanged and explicitly **not**
solved by this refinement alone:

> One logical Periodic Contagem must produce at most one finalized
> `stockCounts` result.

The Rule 8 assessment confirmed this gap is reachable **today**, not
merely theoretical (Rule 8 §H, CRITICAL). The single-Editor model does
**not** automatically close it, because:

* a former Editor may still hold stale local draft state even after
  authority moved elsewhere;
* a takeover may occur mid-finalization-attempt;
* a Viewer promoted to Editor may race against a not-yet-detected
  former Editor's own late write;
* two sessions could theoretically both believe, briefly, that they
  hold authority during a transition window, if the authority mechanism
  itself has any race in it;
* an offline former Editor may reconnect after a new Editor has already
  finalized.

**Cross-device finalization uniqueness (Decision 44-D) remains a fully
required, unresolved Rule 8 question under this refinement** — it is
not downgraded, narrowed, or assumed-solved by adopting Single Editor +
Viewers.

---

# 11. Conflict Resolution — Narrowing, Not Deleting, Decision 44-B

This refinement does **not** delete Decision 44-B. It narrows its
scope:

**Before this refinement**, Decision 44-B needed to answer: "how do we
detect/preserve a conflict between two simultaneously-writing authorized
sessions on the same row, under normal expected operation?"

**After this refinement**, Decision 44-B narrows to: **"how do we
detect and reject a write from a session that no longer holds valid
editing authority — i.e., stale-editor / authority-transition conflict
protection — since simultaneous active-Editor writes are no longer an
intended normal workflow."**

This is a genuine simplification of scope (fewer legitimate concurrent
writers to reason about under normal operation), but it does **not**
reduce the correctness bar — a stale-write can still occur (§6 Scenario
F, §9), and the mechanism protecting against it still needs the same
kind of technical property (some form of staleness/version detection)
the original Decision 44-B candidates already evaluated in Rule 8 §F.
**No mechanism is selected here.**

---

# 12. Conflict UI — Reassessing Decision 44-C

The UI surface becomes meaningfully simpler under this model, because
most states are now about *authority*, not per-row content conflicts:

```text
EDITING BY ANOTHER DEVICE      (Viewer, someone else holds authority)
VIEW ONLY                      (Viewer, no authority held by this session)
YOU ARE THE ACTIVE EDITOR      (this session holds authority)
EDITING AUTHORITY LOST         (this session held authority, no longer does)
TAKEOVER AVAILABLE             (Editor believed stale/offline/gone)
CONFLICT / STALE STATE         (a stale write was rejected or a transition raced)
```

**This refinement does not select which of these states are actually
built, nor their exact copy/behavior.** It does establish that a full
row-level collaborative conflict interface (the more elaborate end of
Decision 44-C's original option set, Rule 8 §G) is **less clearly
necessary** under this model than it was under open-ended multi-editor
sharing — but Rule 8 must still confirm this, not assume it, especially
given §9's residual stale-write case still needs *some* visible signal
when it's caught.

---

# 13. Staff Authorization — Reassessing Decision 44-A

This refinement formally splits what Decision 44-A originally treated
as one question into three, none of which are decided here:

1. **Who may VIEW** the unfinished Periodic Contagem? (44-S-A)
2. **Who may ACQUIRE EDITING AUTHORITY** (become Editor)? (44-S-B)
3. **Who may FINALIZE**? (44-S-C — note: Decision 44 §13 and the
   original specification already established finalization as
   Owner-only at the rules layer independent of any of this; this
   refinement does not disturb that unless the Product Architect
   explicitly revisits it)

These need not resolve to the same tier. A plausible (not decided)
shape: all Staff can view; only Owner/elevated Staff can become Editor;
only Owner can finalize — but this refinement explicitly declines to
assume that shape, per the task's own instruction not to assume all
Staff should edit or that all Staff should view.

---

# 14. Shared Device / Cache Isolation

Decision 44-F is **not resolved, weakened, or assumed-solved** by this
refinement. Specifically:

```text
User A → Editor  → logout
User B → logs in on same browser/device → Viewer
```

Viewer mode does **not** by itself address whether `persistentLocalCache`
retains User A's protected Contagem data in a form User B's session
could read before a server round-trip evicts/overwrites it — this is
exactly the same unresolved SDK-behavior question the Rule 8 assessment
flagged as needing dedicated technical verification (Rule 8 §J), not
something the Editor/Viewer distinction touches. **No cache-clearing
behavior is recommended or authorized by this refinement**, consistent
with Decision 44 §15's own caution.

---

# 15. Initial Stock Count

Unchanged. Initial Stock Count remains outside both Decision 44 and this
refinement. Decision 44-G (now unaffected by this document) remains
separately governed. No scope expansion is made or implied here.

---

# 16. No-Silent-Data-Loss Requirement — Explicitly Preserved

> No valid operator-entered value that has reached durable local or
> server persistence may be silently discarded or made unrecoverable.

**The Single Editor model is a concurrency simplification. It is not,
and must not be read as, permission to weaken this invariant.** Every
durability mechanism named in Decision 44 §8 remains required
regardless of how the Editor/Viewer/authority questions are eventually
resolved.

---

# 17. Required New Product-Level Invariants

> ⚠️ **SUPERSEDED IN PART — [Decision 46 — Dual Active Editor
> Authority](./stock-count-data-loss-resilience-decision-46-amendment.md)
> was accepted 3 September 2026 (SABUSHIMIKE MASCENI).** INV-44-S01 is
> now superseded and INV-44-S04 is now narrowed, exactly as shown below.
> **The technical mechanism for enforcing the dual-editor model —
> concurrent legitimate edits, conflict handling, stale writes,
> finalization protection, offline/reconnect behavior, and cache
> isolation — remains UNDECIDED and requires a fresh Rule 8
> reassessment, not yet performed.** This acceptance does not authorize
> implementation.

### INV-44-S01 — Single Editing Authority *(superseded)*
~~At most one active editing authority exists for a business's
unfinished Periodic Contagem at any given time.~~

**Superseded by Decision 46, in effect since 3 September 2026:** At
most two active editing authorities may exist for an unfinished
Periodic Contagem: the permanent Owner/Admin authority and at most one
explicitly delegated Editor authority.

### INV-44-S02 — Shared State
Editor and Viewers operate against the same business-owned Contagem —
never independent copies.

### INV-44-S03 — Viewer Read-Only
A Viewer-mode session cannot modify Contagem quantity state.

### INV-44-S04 — No Dual Editor *(narrowed)*
~~Two independent sessions — including two sessions of the same
user — cannot simultaneously hold valid editing authority.~~

**Narrowed by Decision 46, in effect since 3 September 2026:** Two
independent sessions cannot simultaneously hold the *delegated* Editor
authority — no gap in which two sessions both believe they are the
delegated Editor. This no longer prohibits the legitimate Owner/Admin +
delegated Editor combination, which is now an intended, governed dual-
authority state, not a violation.

### INV-44-S05 — Authority Transition Safety
A takeover of editing authority cannot silently destroy durable work
already committed by the previous Editor.

### INV-44-S06 — Stale Former Editor Protection
A former Editor cannot reconnect and blindly overwrite the new Editor's
authoritative state merely because its local state still believes it
holds authority.

### INV-44-S07 — Live Viewer Synchronization
Viewer sessions receive authoritative updates live, via the existing
listener infrastructure, without requiring the Viewer to act.

### INV-44-S08 — Finalization Uniqueness
One logical Periodic Contagem produces at most one finalized result,
regardless of how many authority transitions occurred beforehand.

### INV-44-S09 — No Draft Resurrection
Neither an authority transition nor a finalization can be undone by a
delayed write from a former Editor.

### INV-44-S10 — Existing Durability Preserved
Every durability mechanism established by Decisions 38–42 remains
intact and unweakened.

### INV-44-S11 — Tenant Isolation
No cross-business access, under any authority state.

### INV-44-S12 — Logout Isolation
No protected cached Contagem data is exposed across two different
authenticated users on the same device.

No additional invariants were found necessary beyond this set during
drafting; Rule 8 may surface more.

---

# 18. Rule 8 Questions Created By This Refinement

This refinement narrows some of the original Decision 44 Rule 8 scope
(§11 above) but **adds** new questions Rule 8 must now separately
evaluate:

* How is exclusive editing authority technically established (claim,
  lease, transaction, or another mechanism)?
* How is authority state persisted, and where (a field on the existing
  draft meta document, or a new artifact)?
* How does authority survive the Editor going offline, without
  triggering a premature takeover (Scenario D)?
* What mechanism, if any, allows takeover, and under what condition?
* How does stale authority expire or get invalidated (Scenario C/F)?
* How is a former Editor actually *prevented* from writing — not just
  discouraged — once authority has moved (§9, §11)?
* How does a new Editor safely acquire authority without a race against
  a simultaneously-acquiring second session (INV-44-S04)?
* How does finalization interact with authority state — must a session
  hold current editing authority to finalize, or is finalization
  authorization independent (§13, item 3)?
* How exactly do Viewer permissions differ from Editor permissions at
  the Firestore rules layer — can this be expressed within the existing
  `stockCountDrafts` rule shape, or does it require a new field/rule
  branch?
* How does cache isolation (§14) interact with a session's authority
  state — could stale cached authority-claim data itself become a new
  kind of leaked/stale signal?
* Does the architecture remain viable at 300–500+ products under
  whatever authority-tracking mechanism is chosen (unlikely to be
  materially different from the existing per-row cost profile, but not
  yet confirmed)?
* Does the narrowed conflict-resolution scope (§11) allow a
  meaningfully smaller mechanism than the original Decision 44-B
  candidate set, or does the stale-Editor case still require the same
  class of solution (version/precondition check) regardless?

**None of these are answered by this refinement.**

---

# 19. Open Product Architect Decisions

### 44-S-A — Viewer Authorization
Who may view the unfinished Periodic Contagem live? **Still open.**

### 44-S-B — Editor Authorization
~~Who may acquire editing authority?~~ **✅ RESOLVED by [Decision 45](./stock-count-data-loss-resilience-decision-45-amendment.md),
2026-09-03 (SABUSHIMIKE MASCENI).** The Owner/Admin has exclusive
authority to determine who may be the Active Editor; explicit
assignment only, never obtained merely by opening the Contagem or by a
second session. The technical enforcement mechanism remains open, per
Decision 45 §2 requirement 7, and is folded into 44-S-D below.

### 44-S-C — Finalizer Authorization
Who may finalize? (May already be settled as Owner-only by prior
governance — to be confirmed, not assumed, during Rule 8.) **Still
open.**

### 44-S-D — Editing Authority Model
What product-level behavior governs acquisition, release, and takeover
of editing authority? **Still open** — narrowed in shape by Decision 45
(acquisition and every reassignment are now always explicit Owner/Admin
actions, never automatic), but the technical design brief enforcing
this is not yet decided.

### 44-S-E — Offline Editor Takeover
~~When and how may another authorized user take over from an offline
Editor, without risking premature takeover (Scenario D) or data
loss?~~ **✅ RESOLVED by [Decision 45](./stock-count-data-loss-resilience-decision-45-amendment.md),
2026-09-03 (SABUSHIMIKE MASCENI).** No automatic takeover of any kind
(timeout-based, presence-based, or otherwise) is authorized. Every
reassignment — including recovering from an offline/unreachable
Editor — requires an explicit Owner/Admin decision; until then, other
users remain Viewers. If the Owner/Admin themselves is the offline
Editor, the count simply stops rather than transferring. The technical
enforcement mechanism remains open, per Decision 45 §3 requirement 7,
and is folded into 44-S-D/44-S-F.

### 44-S-F — Former Editor Reconnection
What should happen when a previous Editor reconnects after authority
has already moved elsewhere? **Still open** — narrowed by Decision 45
(a reconnecting former Editor must never silently regain authority),
but the technical mechanism enforcing that is not yet decided.

### 44-S-G — Conflict Handling
What minimum stale/conflict-detection mechanism is required under the
narrowed Single Editor + Viewers scope? **Still open** (substantially
narrowed in framing by the corrected Rule 8 Reassessment, Part III
§III.5 — a stale-write rejection, not a collaborative merge — but not
formally decided by a Product Architect record).

### 44-S-H — Initial Stock Count
Confirmed: remains separately governed, unchanged from Decision 44-G,
unless explicitly revisited later. **Still open** (by design — no
change intended).

**Resolved by this session's Decision 45:** 44-S-B, 44-S-E.
**Remaining open, blocking Implementation Planning per the Rule 8
Reassessment:** 44-S-D, 44-S-F, plus the editor-model-independent 44-D
(finalization guard) and 44-F (cache isolation).
**Remaining open, non-blocking:** 44-S-A, 44-S-C, 44-S-G.

---

# 20. Governance Status

**STATUS: ✅ ACCEPTED — REQUIREMENTS ONLY** (3 September 2026, SABUSHIMIKE
MASCENI). See the formal acceptance record in
`docs/engineering/periodic-contagem-decision-44-refinement-single-editor-viewers-product-architect-acceptance.md`
for the complete scope of what is and is not covered by this
acceptance.

* Decision 44 remains accepted, in full, as a requirements-level
  decision (3 September 2026).
* This document is now the accepted refinement of Decision 44 §6's
  previously open-ended shared-editing framing, narrowing it to the
  Single Active Editor + Live Read-Only Viewers model.
* No implementation is authorized by this document.
* Rule 8 has **not** yet been rerun against this refined model — the
  existing Rule 8 assessment (Decision 44, unrefined) remains the most
  recent Rule 8 artifact on file, and its four CRITICAL / two HIGH
  findings still stand except where explicitly narrowed above (§11).
* No Implementation Plan amendment is authorized.
* No Firestore rule change is authorized.
* No code change is authorized.
* No file outside `docs/` was modified to produce this document.

---

# 21. Assessment — Does This Model Materially Simplify Decision 44?

**Yes, partially — and the honest boundary of that "partially" matters
more than the headline.**

**Risks that materially reduce or disappear under normal operation:**

* Same-row concurrent-write silent overwrite between two *simultaneously
  active, both-authorized-to-write* sessions (Rule 8 CRITICAL-1) —
  structurally prevented under normal operation, since only one session
  ever holds write access at a time. This was the single most expensive
  item in the original Decision 44-B comparison (Rule 8 §F), and it
  becomes close to moot for the common case.
* The conflict-UI surface (Decision 44-C) plausibly shrinks from
  "row-level collaborative conflict interface" to "authority-status
  indicator," a meaningfully smaller design/build problem.
* The general multi-writer offline-reconnect-ordering risk (Rule 8
  HIGH-6, confirmed exploitable *today*) is narrowed from "any two
  writers" to "a stale former Editor specifically" — still a real risk,
  but a smaller and more specifically characterizable one.

**Risks that remain fully required, unreduced:**

* **Cross-device finalization uniqueness (Decision 44-D) — still
  CRITICAL, still open, still reachable regardless of the Editor model**
  (§10). This was and remains the highest-priority unresolved item.
* **Draft resurrection / post-finalization mutation (Rule 8 CRITICAL-3,
  CRITICAL-4)** — unaffected by who was allowed to write; these are
  about timing of writes relative to finalization, not about how many
  writers exist.
* **Stale-write protection is still required** — merely re-scoped from
  general multi-writer to former-Editor-specific (§9, §11); the
  underlying technical property needed (some form of authority/version
  staleness detection) is not obviously simpler to build than the
  original Decision 44-B candidates, since a former Editor's stale write
  looks, at the Firestore-document level, exactly like any other stale
  write did before this refinement.
* **Shared-device/logout cache isolation (Decision 44-F) — entirely
  untouched by this refinement**, as explicitly stated in §14; still
  needs its own dedicated technical verification before it can be
  soundly decided.
* **Tenant isolation, durability, recovery** — unaffected either way,
  as they always were orthogonal to the editor-count question.

**Which Rule 8 decisions become simpler:** 44-C (Conflict UI) most
clearly; 44-B (Conflict Resolution) is narrowed in scope but not
obviously reduced in required technical rigor.

**Which decisions remain fully mandatory, unreduced by this
refinement:** 44-D (Finalization Guard) and 44-F (Cache Isolation) —
explicitly, plainly, and by name, per §10 and §14 above.

**This refinement does not declare the architecture approved, does not
declare Rule 8 passed, and does not authorize implementation.** A fresh
Rule 8 pass against this specific refined model — evaluating 44-S-A
through 44-S-H — remains required before any Implementation Plan.
