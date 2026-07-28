# Section 1 — Product Vision

**Status:** Drafted, awaiting approval
**Depends on:** Nothing (foundational section)
**Everything downstream depends on this section.** Sections 2–15 will treat the position taken here — Business Worth Platform, not ERP/POS/accounting — as a fixed constraint, not a revisited question.

---

## 1.1 Mission

**Sabush BPT exists to give every business owner — starting with the smallest, least formally-served ones — an honest, always-current answer to the single question that matters most and is hardest to get right without an accountant: "What is my business actually worth right now, and is that worth growing or shrinking?"**

Not revenue. Not sales volume. Not "how busy was I today." **Worth** — capital invested, stock value, embedded profit, losses, and the trend across all of it over time.

## 1.2 Vision

**To become the world's default Business Worth Platform: the system every small and mid-sized business owner opens first, before anything else, to understand the financial reality of what they own and what it's becoming.**

Where a POS answers "what did I sell today," and an accounting system answers "am I compliant and what do I owe in tax," Sabush BPT answers a question neither of those systems is built to answer well for an inventory-heavy small business: **is the capital I've put into this business growing, and where is it leaking.**

The long-term vision is not "Sabush BPT plus more modules." It is **Sabush BPT as the category-defining answer to Business Worth**, with every future capability (multi-shop, AI, SuperAdmin, subscriptions) built to make that one answer better, faster, and available to more businesses — never to make it a different product.

## 1.3 Core Philosophy

Four commitments, in priority order when they conflict:

1. **Worth over activity.** Every screen should move the owner closer to understanding worth (what they own, what it's costing them, what it's becoming) — not just log activity for its own sake. Logging is a means, not the product.
2. **Truth over convenience.** The audit confirmed the product already makes disciplined accounting choices most tools skip for convenience — Embedded Profit is never called revenue, Withdrawals are never merged with Expenses, an Initial Stock Count is immutable once set. This philosophy is a product asset, not a technical detail, and it must be preserved as the platform scales. A future feature that would blur one of these distinctions for the sake of a simpler UI is the wrong trade.
3. **Simplicity over completeness.** Sabush BPT will always be able to do less than a full ERP. That is by design (Section 1.8). The response to "we're missing feature X that ERPs have" is never an automatic "add it" — it's "does X measurably improve the owner's understanding of business worth." If not, it doesn't belong here, regardless of how standard it is elsewhere.
4. **Scale without redesign.** Every architectural decision from Section 2 onward is evaluated not just against today's needs but against the 100,000-business, millions-of-products future stated in the mission for this document series. A decision that works at 100 businesses but requires a rewrite at 10,000 is treated as a defect today, not deferred.

## 1.4 Target Market

**Primary:** Small and micro-business owners running inventory-based retail or trade businesses — shops, stalls, small wholesalers, informal traders — who currently track their business's worth (if at all) in a notebook, a WhatsApp message to themselves, or nothing. This is confirmed by the product's existing design choices: the deliberate simplicity of Stock Counts and Purchase Batches, the PT/FR/EN localization (consistent with African and Francophone/Lusophone small-retail markets), and the complete absence of any assumption that the owner has bookkeeping training.

**Secondary (growth path):** Owners of multiple shops under one identity (multi-shop support already exists, capped at 10) — the natural next tier as a single owner's business worth spans several locations.

**Not the target market, and not a pivot to chase:** Businesses whose core need is transaction processing (retailers needing checkout/POS), tax/compliance-driven accounting (businesses needing a full ledger and tax filing), or enterprises whose primary need is ERP-style operations management (payroll, HR, procurement workflows). These businesses are well served by dedicated POS, accounting, and ERP products. Sabush BPT should be the tool they *also* use to understand worth, not the tool they abandon those systems for.

## 1.5 Problems Solved

| Problem (as it exists today for the target owner) | How Sabush BPT solves it |
|---|---|
| "I don't actually know what my business is worth, only roughly how much stock I have" | Business Worth is a first-class, always-current number, not a derived report only an accountant produces once a year |
| "I can't tell if money I took out personally is eating into my business" | Withdrawals are tracked as a distinct concept from Expenses, so personal draw is never silently hidden inside business cost |
| "I don't know how much stock I've lost to breakage/spoilage/theft over time" | Quebras (losses) are tracked per batch and roll up into loss reporting, tied to the exact stock they came from |
| "My 'profit' number is really just unsold inventory marked up — I don't want to confuse that with money I've actually made" | Embedded Profit is explicitly, permanently distinguished from realized income everywhere in the product |
| "I have no record of what actually happened in my business over time" | The Business Timeline gives an append-only, chronological narrative of every material event |
| "I run more than one shop and can't see them as one business" | Multi-shop support under a single owner identity (currently up to 10 shops) |

## 1.6 Competitive Position

Sabush BPT is not competing with Square, Toast, Lightspeed, or other POS platforms (transaction-first), nor with QuickBooks, Xero, or Wave (compliance/ledger-first), nor with SAP/Odoo-class ERPs (operations-first). It occupies a category those products treat as an afterthought or don't address at all: **a real-time, always-on answer to "what is this business worth," built for owners who have never had — and may never want — a formal accounting system.**

Where competitors would require an owner to first learn double-entry bookkeeping or first digitize their sales process, Sabush BPT requires only that they record what they bought, what they lost, and what they took out. That lower floor is the competitive moat, and it should not be raised by feature creep toward ERP-style complexity.

## 1.7 Unique Value Proposition

**"Know what your business is worth, in the time it takes to check WhatsApp — without an accountant, a POS, or a spreadsheet."**

The three pillars that make this true and defensible, all confirmed by the current build:
- **Immediate, honest numbers** — Business Worth, Embedded Profit, and Capital are always current, computed from real stock batches, not estimated or manually reconciled.
- **Accounting-grade discipline, consumer-grade simplicity** — the underlying model respects real financial distinctions (worth vs. revenue, expense vs. withdrawal, estimate vs. finalized) while asking the owner for almost nothing they wouldn't already know.
- **Built for the multi-shop, low-formality reality of the target market**, not adapted from an enterprise product — the PIN-based shared-device quick login, the shop-scoped staff model, and the localization choices are all evidence this was designed for how these businesses actually operate, not retrofitted onto them.

## 1.8 Why Business Worth, Not Another ERP

This is the most consequential decision in the entire architecture series, and it is made explicitly here so it never has to be re-litigated feature-by-feature in Sections 2–15.

**The case for staying focused:**

1. **Depth beats breadth in this category.** An owner choosing between "a tool that tells me my business's worth better than anything else" and "a tool that does worth, plus sales, plus payroll, plus CRM, adequately" reliably picks the first, because the first solves a problem nothing else solves well, while the second competes directly with mature, well-funded incumbents at everything else it does.
2. **Every ERP feature added is a promise to maintain it forever, for every one of 100,000+ future tenants.** The audit already identified that the codebase's biggest technical risks (an oversized central state file, unbounded data listeners) come from scope, not malice. Adding sales/invoicing/payroll/CRM multiplies that surface area precisely as the platform is trying to harden it for scale — the two goals are in direct tension.
3. **The target owner's real alternative to Sabush BPT is not another software product — it's nothing.** A notebook, or nothing at all. The competitive urgency is to be the best possible answer to worth for someone with no system today, not to out-feature an incumbent ERP for someone who already has one.
4. **A Business Worth Platform can sit alongside any POS or accounting system the owner already uses or adopts later**, as a complementary source of truth for capital and worth — but only if it stays a specialist. The moment it becomes a partial ERP, it becomes a worse ERP than the alternatives *and* a diluted Business Worth tool, satisfying neither need well.
5. **Every future capability in this document series — multi-shop, AI, SuperAdmin, subscriptions, enterprise features — has a clear worth-related justification already visible in the mission** (capital forecasting, dead-stock detection, business worth prediction). None of them require a sales ledger to exist. The 100,000-business, millions-of-products scale target is a scale-of-worth-tracking target, not a scale-of-transaction-processing target, and the architecture from Section 3 onward will be designed accordingly.

**The discipline this requires going forward:** every section from here on will be evaluated against one test — *does this increase the owner's understanding of business worth, capital, and financial health* — and any proposal that fails that test (a sales/checkout flow, a payroll module, a full customer CRM) is out of scope for this architecture regardless of how standard it is in adjacent categories, unless explicitly requested outside this document series.

---

## What Sections 2–15 Will Build On This

- **Section 2 (Core Product Principles)** will translate this vision into concrete, checkable engineering/design rules.
- **Section 3 (Domain Architecture)** will enumerate the actual domains (Business, Inventory, Stock, Purchase Batches, Expenses, Withdrawals, Breakages, Reports, Timeline, Staff, Notifications, Subscriptions, SuperAdmin, AI, Analytics) — every one of them will be scoped against the worth-first test above.
- Every later section (System Architecture, SuperAdmin, AI, Scalability, Security, Roadmap) will explicitly avoid introducing sales/POS/accounting-ledger capability, per 1.8, unless a future explicit instruction overrides this document.

**This section requires your explicit approval before Section 2 begins**, since Section 2's principles are derived directly from the philosophy above.
