Product Architect Decision Proposal

# Periodic Contagem — Interruption/Re-Entry Recovery, Authoritative-State Synchronization, and False-Conflict Prevention (Decision 60)

**Status:** ✅ ACCEPTED — GOVERNANCE REQUIREMENTS ONLY — 5 September 2026 (see §12 for the recorded signature). Acceptance authorizes progression to a dedicated Rule 8 Assessment only — it does **not** authorize any code, `firestore.rules`, test, or governance-document change, and does not itself amend any document it names below.
**Revision note:** this replaces the prior circulated draft of this same proposal in full, and is renumbered from Decision 59 to **Decision 60** — Decision 59 has since been claimed, in the actual repository, by a separate, smaller, already-shipped fix (the CONFLICT-backlog silent-edit-refusal bug reported live and fixed ahead of this proposal being signed; see `docs/specs/stock-count-data-loss-resilience-decision-59-amendment.md`, commit `4e56521`/`b0c1713`/`f6126f6` on `main`). That fix does **not** satisfy this proposal's own §7 (existing-backlog bulk cleanup) — it only stops the backlog from silently blocking ordinary edits in the meantime; it does not clear the backlog itself, which remains exactly as open as before. The prior draft addressed only same-writer false-conflict prevention and existing-backlog cleanup; the Product Architect has since clarified the actual requirement is broader (§0 below).
**Prepared by:** Lead Software Engineer session, from direct repository investigation (read-only; working tree verified clean before and after).
**Repository state investigated:** `main` @ `333d3051359e7ca4579b0b106ee12c3ec0c0d0c1` (Decision 58's own final commit — confirmed identical to `HEAD` at drafting time. Decision 58 confirmed ✅ Accepted, ✅ Rule 8 Final, ✅ Plan Accepted, ✅ Implementation Authorized and merged — **not reopened by this decision**).
**Governing basis this decision sits on top of, without amending in place:** `stock-count-data-loss-resilience-specification.md` (Decision 38, frozen), Decisions 39, 41, 44–56 (shared-live-data/conflict semantics), Decision 45/46/48/54 (editing authority model), Decision 55 (Same-Row Concurrent Observation Conflict Semantics — the governing "no automatic winner" text every section below is tested against), Decision 57, Decision 58 (interruption-flush persistence/retry parity), Decision 59 (already-shipped, separate fix — see Revision note, above).
**Does not reopen:** Decisions 38–59's own already-accepted content, including Decision 55's genuine-concurrent-observation conflict semantics and Decision 58's own scope.
**Next Decision number:** confirmed by direct repository search at drafting time — no Decision 60 artifact existed; this is **Decision 60**.
**Implementation Status:** NOT AUTHORIZED. This acceptance authorizes a dedicated Rule 8 Assessment only — no Implementation Plan, no Implementation Authorization, and no implementation of any kind exists yet for this decision.

---

# 0. Scope Correction — What This Proposal Now Covers

The Product Architect has clarified that the requirement is not limited to same-writer false conflicts. It is the full lifecycle of an operator leaving an active Periodic Contagem (for any reason) and later returning to it, while the Contagem remains a **shared, concurrently-editable, live** resource per Decisions 44–56. This proposal now states, as governance-level product requirements (WHAT must be guaranteed), each of the following, leaving HOW to Rule 8 / Implementation Planning:

1. Leave-and-return continuity — no forced restart.
2. Latest authoritative shared state is what the returning user sees.
3. Same-writer correction is never a conflict (carried over from the prior draft, now framed as one instance of §1–2 rather than the whole proposal).
4. The complete product list remains visible on return, not only recently-touched rows.
5. The user's last working position (which product they were on) is recoverable, as navigation information only — never a second source of truth for quantity/state.
6. User-controlled sorting (entry/edit time, name, value; each ascending/descending) that does not alter underlying data.
7. Shared editing authority (Decisions 45/46/48/54) governs continued editing after return; no automatic takeover.
8. Stale local state is never treated as newer merely because it exists locally; reconciliation on return must not discard durable legitimate observations, and must not become blind last-write-wins.
9. Decision 55's genuine-two-person-conflict semantics are the explicit boundary this proposal does not cross.

This proposal deliberately does **not** select a technical mechanism (no commitment to a specific persistence layer, listener design, or storage technology) — that determination belongs to Rule 8, informed by the existing-mechanism findings in §1.3 below.

---

# 1. What Was Found, Confirmed Directly Against Current Code

## 1.1 Root Cause #1 (historical, cleanup-only — carried over unchanged from the prior draft)

Before Decision 58, `flushPeriodicStockDraftRows`'s interruption flush wrote every catalog row unconditionally, including untouched products, as a blank `quantity: '', state: 'ACCEPTED'` placeholder, which later collided with the operator's real entry and produced a `CONFLICT`. Decision 58 already closes the flush that produced these; this proposal's §7 (Existing Backlog Cleanup) addresses only the already-created backlog, unchanged from the prior draft.

## 1.2 Root Cause #2 (active, same-writer false conflict — carried over, now framed as one case of the broader requirement)

Confirmed directly in `apps/tenant/src/context/AppContext.tsx`, `savePeriodicStockDraftItem`'s `runTransaction` callback (line ~6588–6716): the "genuine collision" branch (line ~6686) compares only `current.quantity` vs. `content.quantity`; it never inspects `current.lastWriterUid`. A value change from the same authenticated person (self-correction) is indistinguishable, in this branch, from a genuine two-person disagreement. Confirmed this scenario is not addressed in Decisions 44, 46, 47, or 55's own text.

## 1.3 Existing mechanisms directly relevant to the broader requirement (confirmed by direct trace — this is not a greenfield problem)

Several pieces of the broader requirement are **already substantially built**, which materially narrows what Rule 8 needs to design from scratch:

- **Live per-row shared-state adoption already exists.** `PeriodicStockCountView.tsx` (~line 1308 onward) already reconciles each row against the live Firestore listener while the component is mounted, in exactly three states: (a) an unsaved local edit on that row — remote snapshot is never overwritten into the visible field, true reconciliation happens at that row's own next save inside `savePeriodicStockDraftItem`'s transaction; (b) the row is already `CONFLICT` — left entirely to the existing conflict panel; (c) neither — the remote value is adopted directly. This is close to what §0 item 2 (latest authoritative shared state) and item 8 (stale-local-state protection) already ask for, **while the component stays mounted**. What is not yet confirmed is whether this same guarantee holds across a full unmount/remount (the actual "leave the screen and come back" case) — flagged in §8.
- **A draft-resume decision banner already exists.** `draftDecisionPending` (line ~5377) surfaces a resume/discard choice on load whenever meaningful prior content exists and hasn't yet been dismissed this session — the existing precedent for "never silently auto-load, but never force a restart either."
- **Working position tracking exists today, but is not durable.** `activeWorkspaceKey` (line ~1002) tracks which product's workspace is currently open — but it is a plain, non-persisted `useState`, explicitly documented as ephemeral (same comment pattern as `activeNewManualRowIndex`, `reopenedExistingProductKey`). It is lost on unmount, i.e., today, leaving and returning to the Contagem does **not** restore the last-edited product's working position. This is a genuine, confirmed gap against §0 item 5.
- **Sorting exists today, but not in the shape requested.** `validatedSortMode` (line ~1061) already supports `name-asc/desc`, `value-desc/asc`, and `entry-order` — but two confirmed mismatches against §0 item 6: (a) it is explicitly ephemeral/session-only ("never persisted," same discipline as the workspace-key state above), so the chosen sort mode itself does not survive a leave-and-return; and (b) `'entry-order'` is deliberately **not** a wall-clock timestamp — it sorts by `entrySequence`, an in-session integer counter (a prior, signed decision, referenced in-line as "Periodic Contagem Entry-Order Sort Mode — Implementation Authorization §1 item 7," deliberately chose this over a timestamp). §0 item 6 explicitly asks for "time of entry/edit... based on the appropriate authoritative timestamp representing the product's latest valid edit," which an in-session counter cannot correctly provide across a leave/return cycle (a fresh session's counter restarts, and rows entered in a prior session interleave incorrectly against it). A real per-row server timestamp already exists in the schema, however: `lastWriteAt`, set on every `savePeriodicStockDraftItem` write — a serious Rule 8 candidate for the authoritative timestamp this requires, but Rule 8 must confirm it actually represents "latest valid edit" correctly in every case (e.g., whether a same-writer correction under §2's fix should update `lastWriteAt`, and whether a bulk-cleanup resolution under §7 should as well) before adopting it.
- **Authorization is already live, not cached.** `isActiveContagemEditor` (`isOwner || isCurrentDelegatedEditor`, AppContext.tsx ~line 1302) is derived from `contagemAuthority`'s own live listener, not a value captured once at mount — so a delegation change that happens while an operator is away is already reflected the moment the authority document's listener delivers its next snapshot. What Rule 8 must still confirm is the exact UX at the specific moment of return (e.g., does a workspace that was open under authority the user no longer holds close automatically, or only block the next save attempt) — flagged in §8.

None of the above is a full solution the way §0 requires — each is a partial, existing building block Rule 8 should account for before proposing new mechanism, per the Product Architect's explicit instruction not to assume new mechanism is necessary.

---

# 2. Same-Writer False Conflict — Options Considered (carried forward, framing corrected)

This section is unchanged in substance from the prior draft, now explicitly scoped as **one instance** of the broader "genuine vs. non-genuine conflict" distinction (§0 item 3/9), not the whole of Decision 60.

1. **No change.** Rejected — leaves the reported bug exactly as-is.
2. **Suppress the conflict whenever `current.lastWriterUid === currentUser.uid`**, advancing rev/state/writer/timestamp with the new value exactly as the existing same-value branch already does. **Proposed direction**, subject to Rule 8 confirming interaction with §0's broader reconciliation model (a same-writer correction detected at re-entry/reconciliation time, not only at the moment of an immediate second save, must resolve the same way — see §8).
3. **Suppress based on `lastWriterRole` instead of UID.** Rejected — role is not identity; two different delegated Editors across a shift change can share the same role label, and this would silently discard a genuine second person's observation, which Decision 55 prohibits.
4. **Suppress based on UID with an additional role-match requirement.** Rejected as unneeded complexity — a matching UID already means the same authenticated person regardless of role label at either point in time.

**Identity-spoofing check (confirmed, not assumed):** `firestore.rules` (lines 1456, 1469) already enforces `request.resource.data.get('lastWriterUid', null) == request.auth.uid` for every write to this collection — a server-verified check against Firebase Auth, so a client cannot claim a UID that is not its own. A same-writer comparison keyed on `lastWriterUid` is therefore not spoofable.

**Decision 55 boundary, restated per the Product Architect's explicit requirement:** this distinction applies exclusively to telling genuine two-person disagreement apart from cases that were never a disagreement at all (same writer, or one side a data-loss artifact). It does not change what happens once a genuine two-writer collision is confirmed — Decision 55's "no automatic winner... by any rule" continues to govern that case exactly as today, untouched.

---

# 3. Leave-and-Return Continuity, Authoritative State, and Complete Product List (§0 items 1, 2, 4)

**What must be guaranteed (WHAT, not HOW):**
- An operator who leaves the active Contagem screen, for any reason, and later returns, must be able to continue working without restarting the count from scratch.
- On return, the operator must see the **current authoritative state** of every row — including rows another authorized editor changed while the first operator was away — not a stale snapshot the returning device happened to hold locally before it left.
- The **complete product list/catalog** must remain visible and navigable on return, not merely the subset of rows the returning operator personally last touched.

**Options for how "return" is detected/handled — deliberately not resolved here, listed as the shape of the question Rule 8 must answer:**
- (a) Treat every component mount as a fresh load from the authoritative source, with no reliance on anything the client held in memory from before the mount.
- (b) Treat certain interruptions (e.g., brief tab switch without full unmount) differently from others (e.g., full app restart, multi-day absence) — investigated, not assumed to be necessary; adds complexity that may not be justified if (a) already satisfies every case.
- (c) Some explicit reconciliation step between whatever the client held before leaving and what the server holds now, distinct from a plain reload.

**This proposal does not select among (a)/(b)/(c).** It requires only that whichever mechanism Rule 8 proposes, the result the operator sees on return is the authoritative shared state, and that the complete product list is part of that state — never a partial view assembled only from what the returning device happens to remember.

**Confirms:** this is not a license to overwrite legitimate concurrent observations. A row already in `CONFLICT` when the operator returns remains in `CONFLICT`, exactly as Decision 55 requires, regardless of how "return" is technically detected.

---

# 4. Working Position Recovery, Without a Second Source of Truth (§0 item 5)

**What must be guaranteed:** the system should let a returning operator identify and return to the last product they were working on, as a **navigation convenience**.

**What must not happen:** the recovered working-position information must never become a second place quantity/state data can live or disagree with the authoritative Contagem data model (`periodicStockDraftItemsByKey`, server-authoritative). If the two ever disagree, the authoritative data model wins, unconditionally — the working-position pointer is only "where to look," never "what the value is."

**Confirmed gap, not yet a proposed mechanism:** `activeWorkspaceKey` already exists as exactly this kind of pointer today, but is explicitly ephemeral and does not survive a real leave/return. Whether the fix is to persist this pointer somewhere, derive it from an existing authoritative signal (e.g., `lastWriteAt` ordering — see §5), or something else, is a Rule 8 question, not decided here.

---

# 5. Sorting Requirements (§0 item 6)

**What must be guaranteed:**
- Explicit user-controlled sorting of the product list, with these modes: time of entry/edit (newest→oldest, oldest→newest), name/alphabetical (A→Z, Z→A), value/quantity (high→low, low→high).
- Changing sort mode must never alter underlying Contagem data.
- Sorting must apply consistently across the displayed list.
- "Time of entry/edit" must be based on an authoritative timestamp of the product's latest valid edit — not incidental render order.

**Confirmed tension Rule 8 must resolve, not silently override:** the existing `validatedSortMode`'s `'entry-order'` mode was a prior, signed decision (referenced in-line as "Periodic Contagem Entry-Order Sort Mode — Implementation Authorization §1 item 7") that deliberately chose an in-session counter (`entrySequence`) **over** a wall-clock timestamp for this exact purpose. Decision 60's broader requirement (§0 item 6) now explicitly asks for a genuine timestamp-based "newest/oldest" mode that survives across sessions — which that prior decision's own chosen mechanism cannot provide. Rule 8 must treat this as an explicit, signed amendment to that prior sort-mode decision (following this repository's own discipline for amending rather than silently reversing prior decisions), not something this proposal quietly overrides. `lastWriteAt` (already present on every row, set by `savePeriodicStockDraftItem`) is a serious existing candidate for the authoritative timestamp this requires, but Rule 8 must confirm it actually represents "latest valid edit" correctly in every case (e.g., whether a same-writer correction under §2's fix should update `lastWriteAt`, and whether a bulk-cleanup resolution under §7 should as well) before adopting it.

**Also confirmed:** the current sort-mode choice itself is explicitly non-persisted ("never persisted... a pure display-order preference"). Whether Decision 60 requires the chosen sort mode to survive a leave/return, or whether resetting to a default on each return is acceptable, is not stated by the Product Architect's requirement text above and should be confirmed at Rule 8 or flagged back for a quick Product Architect clarification rather than assumed either way.

---

# 6. Shared Editing Authority Interaction With Return (§0 items 7, 8)

**What must be guaranteed:**
- Decisions 45/46/48/54's authority model (Owner/Admin and the currently delegated Editor as equally legitimate active editors) is not altered by this proposal.
- If another authorized editor made valid edits while the first operator was away, the returning operator sees those newer edits (already covered by §3).
- If the returning operator's own editing authority was revoked or reassigned while they were away, current authoritative authorization — not whatever authority they held when they left — governs whether they may continue editing.
- No automatic takeover of editing authority is introduced by this proposal.

**Confirmed, not assumed:** `isActiveContagemEditor` is already derived live from `contagemAuthority`'s own listener (AppContext.tsx ~line 1302), not captured once at mount, so a delegation change is already reflected as soon as that listener delivers its next snapshot — this is not a new mechanism Decision 60 needs to invent. What Rule 8 must still determine is the exact returning-operator experience at the specific moment authority no longer holds (e.g., an open workspace for a product they can no longer edit) — a UX/timing question, not an authority-model question, and is listed in §8 below.

**Stale-local-state boundary, restated:** a stale local copy — whether of a single row's quantity, the sort mode, or the working-position pointer — must never be treated as authoritative merely because it exists locally. This must not, however, be read as license for blind last-write-wins over another editor's legitimate observation; reconciliation always defers to Decision 55 for any row that is a genuine two-writer disagreement.

---

# 7. Existing Backlog Cleanup (unchanged in substance from the prior draft)

`resolvePeriodicConflict` (`AppContext.tsx:6743`) remains the single resolution mechanism, reused unmodified. The proposed one-time bulk action, invoked from the existing "Conflitos por resolver" panel (`PeriodicStockCountView.tsx` ~line 5787), auto-resolves only:
- (a) same-writer backlog rows (`observationA.writerUid === observationB.writerUid`) — resolved to the later `at` timestamp, and
- (b) blank-vs-real backlog rows (exactly one observation blank) — resolved to the non-blank value.

Any row failing both — two different writers, both non-blank, genuinely differing — is left for manual resolution exactly as today. This remains explicitly a one-time cleanup tool, not a permanent background feature (Fix A/§2 above, once live, prevents new same-writer conflicts; Decision 58 already prevents new blank-placeholder conflicts — the backlog this targets cannot regrow once both are in place).

---

# 8. Rule 8 Technical Questions and Open Findings (to be answered with evidence, not speculation, at the Rule 8 stage)

1. How does re-entry determine the latest authoritative state — is every mount a fresh load with no reliance on client memory from before, or is some other mechanism needed? (§3)
2. How is local durable recovery state (if any is kept) reconciled with server/shared state on return, and does the existing three-state live-adoption effect (§1.3) already cover the full unmount/remount case, or only the stay-mounted case?
3. How does another editor's newer edit made during the first operator's absence actually surface to the returning operator — confirm whether the existing per-row live-adoption effect already handles this once remounted, or whether a gap exists specifically at remount time.
4. What exact mechanism prevents a stale local edit from overwriting newer authoritative state on return, distinct from the in-flight-edit protection the existing live-adoption effect already provides while mounted?
5. Confirm the proposed `lastWriterUid` same-writer check (§2) behaves identically whether triggered by an immediate second save or by a reconciliation that happens specifically at re-entry/return.
6. How is the last-edited product / working position persisted and recovered safely, without becoming a second source of truth for quantity or state (§4) — does it need to be durable across a full app restart, or only across an in-session interruption?
7. How is the complete product list restored on return — confirm whether the existing catalog-loading mechanism already always loads the complete list regardless of what was recently touched, or whether some filtering currently narrows it.
8. How is sorting implemented without changing authoritative data, and specifically: does adopting `lastWriteAt` as the "time of entry/edit" timestamp require a formal amendment to the prior Entry-Order Sort Mode decision (§5), and does that amendment need its own Product Architect sign-off separate from Decision 60?
9. What timestamp exactly represents "latest valid edit" for sorting — `lastWriteAt` is a candidate; confirm it is set correctly (and only) on genuine valid edits, including interaction with the same-writer fix (§2) and the bulk cleanup action (§7).
10. What happens if editing authorization changes while the operator is away — confirm the exact UX at the moment of return, not only that the underlying `isActiveContagemEditor` value is already live (§6).
11. What happens if the operator is offline at the moment they leave, or offline at the moment they attempt to return?
12. What happens if a retry from Decision 58's bounded-retry mechanism is still in flight at the exact moment of interruption or re-entry — confirm interaction with Decision 58's existing retry/classification behavior rather than assuming it needs to change.
13. Whether Decision 58's existing interruption-flush persistence/retry mechanism already provides part of the leave-and-return continuity requirement (§3), and exactly which part it does not.
14. Whether any newly-invented persistence mechanism is actually necessary, or whether the existing live Firestore listeners (already attached at the `AppContext` level, independent of which view is mounted) already provide most of what §0 requires once the remaining gaps (working-position durability, sort-mode durability) are separately addressed.
15. Cross-device behavior — confirm whether "leave and return" behaves identically for the same operator on the same device vs. a different device, given the existing per-row live-adoption mechanism is device-agnostic by construction.
16. Interaction with finalization — confirm a returning operator cannot be shown a state that contradicts an already-finalized Contagem, consistent with Decision 58's own `metaSnap`-existence guard.
17. Confirm no part of this proposal weakens Decision 55's conflict preservation for genuine two-writer disagreements, at every one of the above points, not only in §2/§7.
18. Confirm no part of this proposal touches Finding K / tenant and shared-device/cache isolation — preliminary grep shows no overlapping file; Rule 8 should re-confirm once an implementation shape exists.
19. Whether the existing draft-resume decision banner (`draftDecisionPending`) already satisfies part of the leave-and-return requirement for the whole-draft case, separate from the per-row case §1.3 already covers.

---

# 9. Confirmations Required by This Repository's Own Discipline

- **Decision 55's no-automatic-winner principle, for genuine two-person conflicts, is not reopened or weakened anywhere in this proposal** — every section above (§2 same-writer, §3 authoritative-state sync, §7 cleanup) is framed around recognizing when something was never a genuine two-person conflict, never around picking a winner between two legitimate, differing, two-person observations.
- **Decisions 44, 45, 46, 47, 48, 54 are unaffected** — the shared-live-data model and the editing-authority model are restated, not altered; §6 explicitly confirms no automatic takeover is introduced.
- **Decision 57 / Finding K (tenant/authorization, shared-device/cache isolation) are unaffected** — no overlapping file identified.
- **Decision 58 is not reopened** — its own scope (the interruption-flush path) is distinct from every function/state this proposal names; §8 item 13 asks Rule 8 to confirm the boundary precisely rather than this proposal assuming it.
- **The prior sort-mode decision (Entry-Order Sort Mode) is not silently reversed** — §5 explicitly flags that adopting a timestamp-based mode requires its own signed amendment, not an incidental side effect of this proposal.

---

# 10. What This Proposal Does and Does Not Authorize

**If signed, this proposal authorizes:** progression to a single Rule 8 Assessment covering §2 through §7 together, addressing every question in §8 with repository evidence, followed by one Implementation Plan and one Implementation Authorization, per this repository's standard gate sequence.

**If signed, this proposal does NOT:**
- Modify any code, test, `firestore.rules`, or `firestore.indexes.json` file.
- Modify Decisions 38–58 or the prior Entry-Order Sort Mode decision — each stands unamended; if Rule 8 confirms the sort-mode timestamp change is needed, that amendment is drafted and signed separately.
- Select any technical mechanism (persistence layer, listener design, storage technology) — that determination belongs to Rule 8.
- Authorize any change to `resolvePeriodicConflict`'s own transaction logic, the same-value branch, or the already-`CONFLICT` refusal-to-overwrite branch.
- Authorize building any permanent/scheduled/background version of the §7 cleanup action — it remains a one-time, operator-triggered tool.

**Open items flagged, not silently resolved:** whether sort-mode choice itself must persist across a leave/return (§5); the exact confirmation-dialog copy for the §7 bulk action; the exact UX at the moment authority is lost mid-session (§8 item 10). All three are correctly Rule 8 / Implementation-Plan-stage questions.

---

## Signature

> I have reviewed this revised Decision Proposal for Periodic Contagem Interruption/Re-Entry Recovery, Authoritative-State Synchronization, and False-Conflict Prevention, including the expanded scope in §0 (leave-and-return continuity, latest authoritative shared state, complete product list, working-position recovery without a second source of truth, user-controlled sorting, shared-authority interaction, and stale-local-state protection) alongside the carried-forward same-writer fix (§2) and existing-backlog cleanup (§7). I understand this signature authorizes progression to a Rule 8 Assessment only, and does not itself modify any code or governance document named above, and does not select any technical implementation mechanism.
>
> **Product Architect:** _______________________________
> **Date:** _______________________________
> **Decision:** ☐ ACCEPTED AS PROPOSED &nbsp;&nbsp; ☐ ACCEPTED WITH MODIFICATIONS (specify) &nbsp;&nbsp; ☐ NOT ACCEPTED

---

## 12. Signature — Recorded

**Status: ✅ ACCEPTED AS PROPOSED — SIGNED (5 September 2026).** Recorded additively below, per this repository's established signature-recording convention — the pending signature block immediately above is preserved unedited as the historical record of what was circulated for review; this section is the actual, dated act of acceptance.

> I ACCEPT Decision 60 as proposed.
>
> **Product Architect:** SABUSHIMIKE MASCENI
> **Date:** 2026-09-05
> **Decision:** ✅ ACCEPTED AS PROPOSED

**What this signature authorizes:** progression to a single, dedicated Rule 8 Assessment covering §2 through §7 together, addressing every question in §8 with repository evidence — nothing broader.

**What this signature does NOT authorize:** any code, `firestore.rules`, or test change; any Implementation Plan; any Implementation Authorization; any implementation of any kind; any silent technical redesign; any reopening of Decisions 38–58, including Decision 55's genuine-concurrent-observation conflict semantics or Decision 58's own already-closed scope. The prior Entry-Order Sort Mode decision likewise stands unamended by this signature — §5's own requirement, that Rule 8 determine whether a formal amendment to it is needed, is preserved exactly as written, not decided here.

**Distinct from Decision 59:** this acceptance is a separate governance act from Decision 59's retroactive ratification (`stock-count-data-loss-resilience-decision-59-amendment.md` §7a) — the two decisions are not merged, and accepting this proposal does not itself ratify, ratify further, or otherwise touch Decision 59's already-closed record.

---

## 13. Product Architect Decisions Following Rule 8 Assessment

**Status: ✅ RECORDED (5 September 2026).** These are Product Architect decisions resolving specific open items the Rule 8 Assessment (`../engineering/periodic-contagem-reentry-recovery-decision-60-rule8-assessment.md`, ✅ FINAL — READY AFTER PRODUCT ARCHITECT DECISIONS) identified as blocking Implementation Planning. They clarify and narrow how §0/§3 ("Leave-and-Return Continuity...") and §5 ("Sorting Requirements") of this same accepted decision are to be read — they do not reopen, narrow, or expand any other part of Decision 60, and they do not themselves authorize an Implementation Plan, Implementation Authorization, or any code/`firestore.rules`/test change. A separate, formal amendment to the prior Entry-Order Sort Mode decision, required by the third item below, is recorded independently (see `../engineering/periodic-contagem-entry-sequence-implementation-authorization.md`, its own §6, added by this same governance action) — that amendment is not performed here, only cross-referenced.

### 13.A — Decision A: Resume/Re-Entry Behavior

The Rule 8 Assessment (§1, §2.A) found that `PeriodicStockCountView`'s existing `draftDecisionPending` resume/discard gate re-appears on **every** leave-and-return cycle, not once per Contagem lifetime, because the state governing it (`draftBannerDismissed`) is ephemeral, per-mount local state. No data is ever lost by this gate; the finding was one of interaction friction, not data integrity.

**Product Architect decision:** "No forced restart" (§0 item 1 of this decision) means precisely that returning to an interrupted, still-active Periodic Contagem must **not** require the operator to make an explicit resume/discard decision merely because the component remounted. Specifically:

1. If the operator leaves Periodic Contagem and returns while the same active Contagem still exists, the system must reopen that active Contagem directly.
2. The operator must see the latest authoritative shared state on return (restating §0 item 2 — unchanged).
3. The operator must not be routed through a "Retomar/Descartar" decision merely because the component remounted.
4. The system must never silently discard the active Contagem.
5. The system must never overwrite authoritative shared quantities with stale local state.
6. If another authorized editor changed data while the operator was away, the returning operator must see that latest authoritative state (restating §0 item 2/§6 — unchanged).
7. Existing editing authority rules (Decisions 45/46/48/54) remain exactly as they are — unchanged by this decision.
8. This decision does **not** authorize automatic editor takeover or any authority change of any kind.
9. Decision 55's genuine two-person conflict semantics remain governed exactly as before — unchanged by this decision.
10. The working-position requirement (§4 of this decision) remains navigation-only and must never become a second source of truth — unchanged by this decision.

**What HOW remains open:** the exact mechanism by which the system "reopens the active Contagem directly" — whether that means removing the gate entirely, replacing it with a non-blocking/automatic reconciliation, or some other design — is explicitly left to the Implementation Plan, per Decision 60's own governing instruction not to prescribe mechanism at the decision stage. This decision fixes *what* must be true of the result, not *how* it is achieved.

### 13.B — Decision B: Sort-Mode Persistence

The Rule 8 Assessment (§2.F, §10 item 1) found that the repository does not currently establish whether the operator's selected sort mode itself must survive a leave-and-return cycle, and that Decision 60's own text did not resolve this either way.

**Product Architect decision:** the selected sort mode **should** persist across leave-and-return, for the same active Periodic Contagem/workspace, so that returning does not unexpectedly revert the operator's own display ordering. This is subject to the following, all of which restate and narrow constraints Decision 60 already establishes elsewhere:

1. Sort mode is display state only.
2. It must never mutate quantities, observations, conflicts, validation state, authority, or any other underlying Contagem data.
3. A persisted sort preference must never become a source of truth for stock data.
4. It must be safely scoped to the appropriate business/user/workspace context.
5. It must not create cross-business or cross-user leakage — this is the same boundary the Rule 8 Assessment already flagged as a Finding K review item for the working-position mechanism (§2.E), and applies identically here.
6. It must remain compatible with all six sort modes required by §5 of this decision, as amended by the Entry-Order Sort Mode amendment (§13.C, below).
7. The exact storage mechanism is left to the Implementation Plan / Rule 8-approved implementation design — not decided here.

### 13.C — Decision C: Cross-Reference to the Entry-Order Sort Mode Amendment

The Rule 8 Assessment (§7) confirmed that adopting a genuine timestamp-based "entry/edit time" sort mode requires a formal amendment to the already-signed prior decision governing `entrySequence` (`../engineering/periodic-contagem-entry-sequence-implementation-authorization.md`, ✅ Accepted and Authorized, 2 September 2026), which explicitly and deliberately chose an in-session counter "never a wall-clock timestamp" for that purpose.

**Product Architect decision:** that prior decision is formally amended, by a new §6 added to its own document (not here — see that document directly), to preserve `entrySequence` exactly as originally authorized while additionally authorizing two new, separate, timestamp-based sort modes. This decision's own six required sort modes (§5) are, following that amendment:

1. Newest entry/edit time → oldest (new — timestamp-based, per the amendment)
2. Oldest entry/edit time → newest (new — timestamp-based, per the amendment)
3. Name A → Z (already authorized, unchanged)
4. Name Z → A (already authorized, unchanged)
5. Value high → low (already authorized, unchanged)
6. Value low → high (already authorized, unchanged)

The existing ordinal `entrySequence` mode is **not** removed, replaced, or redefined as a timestamp by this decision or by the amendment it requires — it remains exactly as the prior decision authorized it, available as its own internal concept per that decision's own governance, distinct from the two new timestamp-based modes above.

### Signature

> I record Decision A (resume/re-entry behavior), Decision B (sort-mode persistence), and Decision C (cross-reference to the Entry-Order Sort Mode amendment) as specified above, resolving the two Product-Architect-level items the Rule 8 Assessment identified as blocking Implementation Planning. This does not itself authorize an Implementation Plan, Implementation Authorization, or any code/`firestore.rules`/test change, and does not reopen Decisions 44–59, Decision 55's conflict semantics, or Decision 58's own scope.
>
> **Product Architect:** SABUSHIMIKE MASCENI
> **Date:** 2026-09-05
> **Decision:** ✅ ACCEPTED / AMENDED AS SPECIFIED ABOVE
