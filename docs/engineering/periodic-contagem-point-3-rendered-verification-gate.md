Governance Record

# PERIODIC CONTAGEM — INTEGRATION POINT 3
## RENDERED VERIFICATION GATE

**Status:** 🟡 **Point 3 implementation complete — rendered verification pending.** Not itself deployment authorization. No files were modified in preparing this record.

**Governing commit:** `3053a60` on `main` — the actual one-product-one-row rendering implementation, source-level complete, 209/209 tests passing.

**Prepared by:** Claude (Lead Software Engineer role, this repository), recording a decision delivered directly in conversation, against repository state `main` @ `3053a60`.

---

## 1. What is established, and how

A rigorous, direct investigation — not assumed, not guessed — established that genuine rendered/DOM verification of Point 3 is not achievable in this sandbox, for three independent, confirmed reasons:

1. **Network:** Playwright installs via npm (an allowed domain), but its browser binary download fails — `Host not in allowlist: cdn.playwright.dev`. Confirmed by direct attempt.
2. **Architecture:** JSDOM installs successfully, but importing this app's real `AppContext.tsx` module fails immediately at load time (`Cannot read properties of undefined (reading 'VITE_FIREBASE_API_KEY')`) — the entire module graph depends on Vite's build-time `import.meta.env` injection, which doesn't exist under direct Node/`tsx` execution. Confirmed by direct attempt, with the exact error captured.
3. **Environment:** Vite's own dev server starts successfully and serves the correct application shell (confirmed via `curl`, 200 response, correct title and meta tags) — the build/serve pipeline genuinely works here. But `curl` cannot execute JavaScript, and this is a client-rendered SPA; the actual Contagem screen only exists after browser-side React execution. Additionally, background processes (including the dev server) do not persist across separate tool invocations in this sandbox, closing off any multi-step interaction even with the one component that does work.

A fourth, non-tooling barrier exists independently of all of the above: reaching the actual Contagem screen requires authenticated, seeded application state (a real business, a real draft) that this sandbox does not have.

## 2. The governing distinction

**Point 3 is source-level complete, but not operationally/UI-verified.** The 209 passing tests confirm that the correct functions are called, with the correct values, reusing the correct already-tested modules, in the correct order. **They do not, and were never claimed to, verify actual rendered pixels, real click events, or real keyboard focus movement.**

No further source-level tests will be manufactured as a substitute for this. The environmental boundary has been established rigorously enough that adding more pattern-matching tests would not close the actual gap — only genuine execution in a real or realistic browser environment can.

## 3. Required verification, before this gate is considered closed

A human, or a CI environment with unrestricted network access to Playwright's CDN, must exercise the following against the actual deployed or locally-run application:

1. One product with multiple portions → one displayed row.
2. Catalog + manual portion with the same `productId` → one row.
3. Same display name, different `productId` → two separate rows, never merged.
4. Product-less fallback behavior — grouping by name only, never silently claiming an explicit identity.
5. Clicking each product opens only its own workspace — verified specifically against the same-name/different-`productId` case (items 2/3 above), confirming no cross-product workspace merge.
6. Arrow-key navigation moves group-to-group, not portion-to-portion.
7. "Next unvalidated" (Ctrl/Cmd+Enter) operates at the group level, visiting each group at most once.
8. Editing one portion of a multi-portion product leaves every other portion's own data untouched.
9. Deleting one portion removes only that portion — the product's other portions, and the product itself, remain.
10. Persistence/conflict/error indicators remain truthful at the group level — a group must never show "saved" while any member is genuinely unresolved.
11. Search retains the complete matching group, including members whose own content didn't individually match the search term.
12. No financial value changes merely because of the visual grouping — a multi-portion product's displayed total, and the underlying stock-count tally, must match what summing the individual portions separately would produce.

## 4. Governance status, explicit

- **Deployment authorization: NOT GRANTED.** This gate existing, and Point 3's source-level completeness, do not constitute deployment authorization for any part of the Expanded Phase 2 work.
- **This gate blocks nothing else already committed** — Stages 1–10, Integration Points 1 and 2, and Point 3's own source-level implementation remain exactly as committed and pushed; nothing is being rolled back or reopened.
- **This gate blocks what comes next:** PA-08 persistence-state UI integration and durable recovery UI integration are not to proceed until this verification is complete, since both would build additional UI on top of a rendering change that has not itself been confirmed to work correctly for a real user.

## 5. Sequence, going forward

```
Point 3 (source-level complete, commit 3053a60)
        ↓
THIS GATE — rendered verification, human or CI, against the 12 items above
        ↓
[on pass] PA-08 persistence-state UI integration
        ↓
Durable recovery UI integration
        ↓
Final Expanded Phase 2 acceptance assessment
        ↓
[still separately required, unchanged] Emulator-dependent concurrency
verification (concurrent nextOrderIndex, migration/deletion race,
tombstone protection, conflicting-provenance behavior, firestore.rules
enforcement) — remains its own, independent, unmet gate throughout
this entire sequence, not superseded or satisfied by this one.
        ↓
Deployment authorization — a separate, explicit, future decision
```

---

**No repository code was modified in preparing this record. No deployment is authorized. No further source-level tests were manufactured as a substitute for the verification this gate requires.**
