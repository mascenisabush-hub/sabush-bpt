# SABUSH BPT — Module #19 V1 Customer & Commercial Validation Plan

**Type:** Project record — a validation design and evidence-capture
framework, not a governance document. Does not authorize any product,
pricing, or engineering decision by itself. Records the read-only
Customer Journey Audit performed this session and the real-customer
test design agreed with the Product Architect, so neither exists only
in conversation history.
**Status:** Test not yet run. No customer evidence exists yet as of
this document's creation. This document must not be read, later, as
if it contains results — check its own "Results" section (§5, added
after the test) before assuming anything below is more than a plan.
**Origin:** Read-only Customer Journey Audit conducted this session,
per the Product Architect's explicit "Post-Implementation Customer &
Commercial Validation Phase" instruction — no code was changed to
produce it. Repository state at the time of the audit: `main` ==
`origin/main` at `c7782af`.

---

## 1. Strategic Framing

The V1 Manual Payment Bridge (`c7782af`) closed the "can we build it"
question. The remaining, more important risk is:

> **Will an SME owner understand SABUSH BPT's Business Worth value
> enough to pay 750 MZN/month and keep using it?**

This document exists to answer that with real customer behavior, not
hypothetical answers or further engineering. Per explicit instruction:
**do not change pricing, do not make Initial Stock Count mandatory, do
not add subscription/notification features — until this test produces
evidence that justifies it.**

## 2. What the Prior Audit Found (context for the test design, not itself evidence)

Grounded in direct code inspection this session, not customer
behavior — the test below exists specifically to check whether these
code-level observations actually matter to real people:

1. **Signup's own subtitle is inventory-framed** ("Gestão inteligente
   e controlo de lucro por lote"), not Business Worth-framed.
2. **Initial Stock Count (the Business Worth baseline) is explicitly
   skippable** (`onSkip` in `App.tsx`).
3. **The Business Worth explanation itself (Dashboard's "Valor do
   Negócio" modal) is strong and honest once found** — the problem
   found was discovery, not content.
4. **No explicit "you're now active" confirmation moment exists**
   anywhere in the product — the only signal is the status banner's
   absence once `active`.

## 3. Test Design

**Size:** 3–10 real SME owners. Preferred over building more
infrastructure, per explicit instruction.

**Two conditions, split across the sample:**

- **Test A — Explain nothing.** Hand over the app with only: *"Este
  sistema ajuda-o a perceber quanto vale o seu negócio."* Observe
  without further explanation.
- **Test B — One human nudge.** Additionally say: *"No Dashboard,
  toque no valor dourado para ver o Valor do seu Negócio."* Compare
  comprehension against Test A.

**Interpretation rule, fixed before running the test (not decided
after seeing results):** with an arm size as small as 1–5 people, only
a dramatic difference between A and B (e.g., most of one arm correctly
explains Business Worth and most of the other doesn't) should be read
as real signal. A subtle difference is not distinguishable from noise
at this sample size and should be recorded as inconclusive, not
interpreted either way.

**The 750 MZN question is behavioral, never hypothetical.** Never ask
*"would you pay 750 MZN?"* — let them reach the payment point
naturally and observe whether they actually pay.

**The pre-payment sentence must be captured unprompted, never
elicited.** Do not ask *"why are you paying?"* immediately before the
transaction — the diagnostic value of that sentence depends entirely
on it being spontaneous, not a reflection of language just used in the
pitch (a specific risk in Test B, where "Valor do Negócio" was said
aloud moments earlier). If nothing is said spontaneously, record that
as data too — do not prompt to fill the silence.

**Known limitation, accepted rather than solved:** if the same person
runs both Test A and Test B, tone/enthusiasm may differ unconsciously
between the two conditions. Not fixable at this sample size — note it
as a limitation when writing up observations, not as something to
correct mid-test.

**The distinction to watch for most closely**, in the customer's own
words, spontaneous or otherwise, anywhere in the journey:

> *"Estou a pagar para controlar o meu stock."*
> vs.
> *"Estou a pagar para saber quanto vale o meu negócio e acompanhar
> esse valor."*

Consistent answers of the first kind would indicate a
**product-positioning problem** (the differentiator isn't reaching the
customer's mental model), not a technical one — a materially different
kind of finding than anything in §2.

## 4. Evidence Capture Template

One copy per customer. Fill in during/immediately after each session —
do not reconstruct from memory later.

```
Customer:
Date:
Condition: A / B

VALUE
- First impression:
- What they think Sabush BPT does:
- Exact spontaneous description:

UNDERSTANDING
- Did they discover Business Worth?
- Did they open the Worth Modal?
- Could they explain it in their own words?
- Exact words:

PAYMENT
- Did they reach payment without prompting?
- Reaction to 750 MZN:
- Payment method:
- Time from decision → payment reference:
- Confusion/questions:

ACTIVATION
- Time from confirmation → next app visit:
- Did they notice activation?
- First reaction:
- Did they ask whether payment succeeded?

RETENTION
- One-week return: Yes / No
- First thing they checked:
- Business Worth interaction:
- Other observations:

RAW NOTES
- Do not interpret while observing.
- Record notable statements/actions as close to verbatim as possible.

FOLLOW-UP
- What changed after one week?
- What would make them continue using Sabush BPT?
```

## 5. Results

*(Not yet populated — no test has been run as of this document's
creation. Fill in per-customer using §4's template above, then
classify into the framework below once at least 3 records exist. Do
not summarize with fewer than 3.)*

### 5a. Raw records

*(Paste each completed §4 template here, one per customer, unedited.)*

### 5b. Classification

Once raw records exist, classify into:

**VALUE → UNDERSTANDING → PAYMENT → ACTIVATION → RETENTION**

State, for each stage, what the evidence actually showed — not what
was expected or hoped for.

### 5c. A/B comparison

State plainly whether the A/B difference was dramatic, subtle, or
absent, per §3's own pre-fixed interpretation rule. Do not retroactively
loosen that rule to make an ambiguous result look decisive.

### 5d. The positioning question

State plainly which framing customers converged on (§3's "controlar o
meu stock" vs. "saber quanto vale o meu negócio" distinction), across
all customers, both conditions.

## 6. What Happens After Results Exist

Per the Product Architect's own instruction: bring raw observations
back, even messy, for classification and decision — this document's
§5 is where that classification should be recorded once it happens,
so the reasoning trail survives past any one conversation. Only after
that classification should any of the following be decided, and only
as warranted by what the evidence actually shows:

- UX/onboarding refinement (§2 items 1–3)
- A "subscription activated" confirmation moment (§2 item 4)
- Pricing validation
- Notification improvements
- Simply continuing customer acquisition unchanged

**This document does not itself authorize any of the above.** Each
remains a separate, explicit Product Architect decision, made from
real evidence recorded in §5 — not from the plan in §§1–4.

---

## Governance Notes

This record does not modify any BDS, ADR, POL, or BDR. It does not
change pricing (POL-19-011, unaffected), does not change Initial Stock
Count's optional status, and does not authorize any notification or
subscription-engine work. No code, `firestore.rules`, or
`firestore.indexes.json` file was touched to produce it.
