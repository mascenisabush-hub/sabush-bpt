# Sabush BPT — Business Domain Specifications (BDS)

**Status:** Living document series, built and approved one module at a time.
**Depends on:** [Product Architecture Document](../architecture/README.md)
(Sections 1–15, all approved), [Design System v2.0](../../DESIGN_SYSTEM.md),
[Component Library](../../COMPONENT_LIBRARY.md).

**Purpose:** This is the bridge between Product Architecture and
Engineering. Architecture answered *why the system is shaped this way*.
Standards (Design System, Component Library) answered *what it looks
like*. This series answers, module by module, *exactly what each module
must do* — precisely enough that six months from now, "improve Dashboard"
resolves against `01-dashboard.md` instead of a fresh, undocumented
conversation about what Dashboard even is.

**Method:** Every module gets Purpose → Business Problem → Users → User
Stories → Business Rules → Functional Requirements → Non-functional
Requirements → KPIs → Future Enhancements → Acceptance Criteria, per the
brief's own template. Every claim in every section is grounded in the
real, already-approved Architecture document (cited by section number)
and, where the module already exists in code, the real implementation —
never invented fresh for the spec.

**Order:** Product value, not code dependency — per the stated reasoning:
first define what makes Sabush unique (Business Worth, capital
intelligence), then build the platform capabilities around that.

---

## Phase 1 — Core Business Intelligence

| # | Module | Status |
|---|---|---|
| 1 | [Dashboard](./01-dashboard.md) | ✅ Approved |
| 2 | [Business Worth Engine](./02-business-worth-engine.md) | ✅ Approved |
| 3 | [Products](./03-products.md) | ✅ Approved |
| 4 | [Purchase Batches](./04-purchase-batches.md) | ✅ Approved |
| 5 | [Stock Batches](./05-stock-batches.md) | ✅ Approved |
| 6 | [Embedded Profit Engine](./06-embedded-profit-engine.md) | Drafted — awaiting approval |

## Phase 2 — Capital Protection

| # | Module | Status |
|---|---|---|
| 7 | Breakages (Quebras) | Not started |
| 8 | Expenses | Not started |
| 9 | Withdrawals | Not started |
| 10 | Stock Counts | Not started |
| 11 | Monthly Closings | Not started |

## Phase 3 — Insight & Decision Support

| # | Module | Status |
|---|---|---|
| 12 | Reports | Not started |
| 13 | Business Timeline | Not started |
| 14 | Analytics | Not started |
| 15 | AI Intelligence | Not started |

## Phase 4 — Platform

| # | Module | Status |
|---|---|---|
| 16 | Staff & Roles | Not started |
| 17 | Multi-Shop | Not started |
| 18 | SuperAdmin | Not started |
| 19 | Subscriptions | Not started |
| 20 | Notifications | Not started |

---

## The Discipline This Series Protects

**Architecture → Standards → Specifications → Implementation.** Each spec
in this series is written *after* the module's place in Architecture is
already settled and *before* any implementation work is proposed for it —
never the reverse. A module reaching Phase 0 implementation work
(Development Strategy, Section 13) without an approved spec here is a
process gap worth flagging when it's noticed, not a shortcut to take
quietly.
