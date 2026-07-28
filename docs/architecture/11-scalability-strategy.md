# Section 11 — Scalability Strategy

**Status:** Drafted, awaiting approval
**Depends on:** Sections 1–10 — all approved
**Purpose:** Give the concrete thresholds every prior section deferred here — Section 4.8 named an "explicit ceiling" for the Background Worker without stating it, Section 7.8 fixed the *shape* that makes pagination/indexing achievable without specifying the numbers, Section 8.3 flagged Purchase Batch numbering as fine "at this business's current scale" without saying when that stops being true. Section 11 is where every one of those becomes a measurable number, at each of the Mission's four named scale tiers: 100, 1,000, 10,000, 100,000 businesses.

---

## 11.1 How to Read This Section

Each tier below states what breaks (or would break) if nothing changed from the tier before it, and the specific, minimal change that prevents it — never a wholesale redesign, per Principle 2.12 (Build for the Next Order of Magnitude, Not the Next Feature). A tier with "no change required" is not an oversight — it means the architecture already fixed in Sections 4–9 was already built to survive it, and this section is where that claim gets checked rather than assumed.

---

## 11.2 Tier: 100 Businesses

**Database growth:** Trivial. Total document count across every business-scoped collection (7.2) is in the low tens of thousands at most, even with rich per-business history.

**Performance:** Every existing query pattern (audit-confirmed, unbounded listeners included) performs acceptably at this volume — this is precisely why the audit's unbounded-listener finding wasn't caught by manual testing; it doesn't manifest yet.

**Caching, indexes, Cloud Functions, Storage, monitoring:** No change required at this tier. Firestore's automatic single-field indexes cover every query pattern in use today.

**What this tier is actually for, architecturally:** it's the validation tier — confirming the tenant-isolation-by-nesting model (7.1) and the privileged-server pattern (4.4) work correctly under real, if light, multi-tenant load before any scale-specific work is justified.

---

## 11.3 Tier: 1,000 Businesses

**Database growth:** Still modest in aggregate, but the audit's unbounded-listener finding starts to matter for any *individual* long-lived business — a business active for a year with daily Stock Batch entries can accumulate thousands of documents in `batches`/`timelineEvents` on its own, independent of platform-wide tenant count.

**The fix, scoped precisely:** Reports (8.9) and Timeline (8.10) — the two modules Section 8 already identified as reading unbounded lists — must move to **paginated, indexed queries** at this tier: a composite index on `(businessId, dateEntered)` for batch-scoped queries, cursor-based pagination (Firestore's native `startAfter`) rather than a single unbounded `get()`. This is a query-pattern change within the existing modules, not a schema change — 7.2's entity shapes don't move.

**Caching:** Still not required — a paginated query against an indexed collection is fast enough at this volume without an additional cache layer. Introducing caching before it's needed would itself violate Principle 2.6 (Simplicity Over Completeness).

**Cloud Functions:** No change — the Background Worker (4.8) on Railway continues to handle scheduled work; nothing here yet requires the Blaze-plan trigger model 4.8 deliberately avoided.

**Monitoring:** This is the tier where System Health (9.11) actually starts earning its keep — `platform_worker_state` (4.8.1) becomes worth checking regularly rather than a theoretical safeguard, since a missed Background Worker run at this volume has real user-facing consequences (a Notification that doesn't fire).

---

## 11.4 Tier: 10,000 Businesses

**Database growth:** Aggregate document count crosses into the millions. The platform-level collections (7.4) — `platform_aggregates`, `platform_audit_log` — now hold enough history that they themselves need the same pagination discipline 11.3 gave Reports/Timeline; this is the tier where 9.6's Audit Log filter UI needs its own composite indexes (`actorUid + timestamp`, `targetBusinessId + timestamp`) to stay fast, not just the tenant-scoped collections.

**Purchase Batch numbering (8.3) — the threshold named there, now stated:** `getNextBatchSeq`'s client-derived "highest seq + 1" pattern is business-scoped, so it doesn't degrade with platform-wide tenant count directly — but a single very active business's own sequence generation, read-then-write from the client, starts to carry a real (if still small) race risk once that specific business has multiple staff simultaneously entering stock. The fix: move `batchSeq` generation server-side, via a Firestore transaction (still no Cloud Function required — this is a client-SDK transaction, or, if already going through the privileged server for another reason, generated there) — an additive change to 8.3's existing function signature, not a redesign of the numbering scheme itself.

**`businessCode` (7.2's amendment) global sequencing:** already specified as living on a single counter document rather than client-derived, precisely because it needed to be race-safe from day one (a platform-wide identifier can't tolerate collision at any tier) — no change required here, this tier is where that earlier design choice starts to matter and is confirmed correct rather than newly needed.

**The Background Worker (4.8) — the ceiling 4.8 named without a number:** an hourly scan across 10,000 businesses' worth of notification-trigger/subscription-check/aggregation-rollup logic is the point where a single worker process's runtime, while still likely under an hour, has little headroom left before it would start overlapping its own next scheduled run. **Concrete threshold:** if a worker run's measured duration exceeds 50% of the interval between runs (i.e., over 30 minutes for an hourly cadence), split job types across separate worker processes (4.8's own stated escalation path) — notification triggers, subscription checks, and aggregation rollups become three independent scheduled processes rather than one, still on the same Railway project, still no Blaze plan required.

**Caching:** `platform_aggregates` reads (Dashboard 9.2, Platform Analytics 9.8) benefit from a short-lived in-memory cache on the privileged server (seconds-to-minutes TTL, not a new infrastructure component) — since these are read by every platform-operator page load but only change on the Background Worker's own schedule, re-reading Firestore on every request is unnecessary cost at this volume.

**Storage (4.7's deferred flow, now live):** if product-photo uploads (8.4) have shipped by this tier, per-business Storage usage needs the same tenant-scoped path discipline 4.7 already fixed — no new decision here, just confirming the existing design holds.

**Monitoring:** System Health (9.11) needs alerting, not just a dashboard a Developer checks manually — a worker run that misses its expected window (11.3's monitoring hook) should page, via the platform-side Notification mechanism (9.9) already designed for exactly this.

---

## 11.5 Tier: 100,000+ Businesses

**Database growth:** Tens of millions of documents platform-wide. This is the Mission's stated target ceiling — every design decision in Sections 4–10 was checked against this number already (Principle 2.12's "next order of magnitude" framing), so this tier is where those decisions get confirmed under load, not where new ones get invented.

**The core claim being tested:** that Firestore, correctly indexed and rule-scoped (4.5), serves 100,000+ tenants directly from the client SDK without a conventional multi-service backend. At this tier, the specific thing that would falsify that claim is any query pattern that scans across businesses rather than within one — and Sections 4.10/7.1 already structurally prevented that (nesting + the aggregation-layer boundary), so the claim holds by construction, not by hoping tenant isolation was respected everywhere.

**The Background Worker, second escalation:** if 11.4's process-split isn't sufficient at this tier (a concrete, measured signal: any one of the three split job types itself exceeding 50% of its interval), the documented next step (4.8's original escalation path) is Cloud Functions' scheduled-trigger model — this is the point where revisiting the Blaze-plan constraint (4.1) is actually justified by real operational need, not before. Whether that trade-off is worth it depends on whether the target market's payment/regional constraints (Section 1.4) have themselves changed by the time this tier is reached — a business decision this section flags, not one it makes.

**Indexes:** every composite index introduced at 11.3/11.4 remains sufficient in *shape* — what changes is Firestore's own automatic scaling of index maintenance cost, which is a platform-managed concern, not an architecture decision this document needs to make.

**Caching:** the privileged-server in-memory cache (11.4) is no longer sufficient alone once multiple server instances are running behind Railway's own scaling — a shared cache (e.g., Redis) for `platform_aggregates` reads becomes justified at this tier specifically because multiple server instances would otherwise each maintain their own inconsistent in-memory copy. This is the one genuinely new infrastructure component this entire Scalability Strategy introduces, and it is introduced only here, at the tier that actually requires it.

**Storage and Cloud Functions:** no change beyond what 11.4 already specified — the tenant-scoped path discipline and the (possible) Cloud Functions migration are the two open items, both already named.

**Monitoring:** full observability (structured logging, error tracking, latency percentiles on privileged-server endpoints) — the informal "check the System Health screen" approach that sufficed through 11.4 needs to become instrumented and alerting-driven by default at this tier, since manual checking doesn't scale to catching a regression before it affects thousands of businesses.

---

## 11.6 Summary Table

| Concern | 100 | 1,000 | 10,000 | 100,000+ |
|---|---|---|---|---|
| Reports/Timeline queries | Unbounded, fine | **Paginated + indexed** | Same, confirmed at scale | Same |
| Purchase Batch numbering | Client-derived, fine | Same | **Server-side transaction** | Same |
| `businessCode` sequencing | Single counter doc | Same | Same, confirmed | Same |
| Background Worker | Single process | Same | **Split by job type (if >50% interval)** | **Cloud Functions migration (if split still >50%)** |
| Aggregate reads (Dashboard, Analytics) | Direct Firestore read | Same | **Short in-memory cache** | **Shared cache (Redis)** |
| Audit Log / platform collections | No index needed | Same | **Composite indexes added** | Same, confirmed |
| Monitoring | None needed | System Health checked ad hoc | **Alerting via Notifications** | **Full observability stack** |

---

## 11.7 What This Section Deliberately Does Not Do

It does not pre-build the 10,000-tier pagination or the 100,000-tier shared cache today, at the 100-business tier — doing so would violate Principle 2.6 exactly as much as under-building would violate 2.12. Every threshold above is stated as a **trigger condition** (a measured number: query latency, worker-run duration, tenant count), not a calendar date — Section 13 (Development Strategy) decides when to actually build ahead of a threshold versus reactively, but Section 11's job was to make sure that decision is never a guess.

---

## What Sections 12–15 Will Build On This

- **Section 12 (Security Architecture)** will confirm none of the caching layers introduced here (11.4, 11.5) become a tenant-isolation gap — a shared cache keyed incorrectly could leak one business's aggregate figures into another's read path if not scoped carefully, which this section flags as Section 12's job to formalize as an explicit control.
- **Section 13 (Development Strategy)** sequences exactly when each threshold's fix gets built, relative to feature work, using the trigger conditions in 11.6 rather than a fixed calendar.
- **Section 14 (Future Roadmap)** can reference these tiers directly when describing how Sabush grows without losing focus.

**This section requires your explicit approval before Section 12 (Security Architecture) begins.**
