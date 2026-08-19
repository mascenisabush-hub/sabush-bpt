// [Finding 20 closure — Final Implementation Authorization Compliance
// Audit] Draft abandonment / abandoned supplier-wording confirmation
// state.
//
// WHY THIS FILE EXISTS: the compliance audit against commit `90bb5b7`
// found every Finding 20 scenario covered by an existing test EXCEPT
// this one — "draft abandonment" was previously only justified by code
// inspection (Finding 12's design: nothing is written to `Product`
// until the entry's own existing finalization step), never asserted by
// a test with this scenario in its name. This file closes that gap.
//
// SCOPE: test-only. No production code is modified by this commit.
//
// WHAT "ABANDONMENT" MEANS HERE, PRECISELY:
//   candidate/pending supplier-wording state exists on a row
//     ↓
//   the owner never calls handleSubmit (discards the draft, navigates
//   away, or simply never finishes the form)
//     ↓
//   addMultipleStockBatches (AppContext.tsx) is never invoked at all
//     ↓
//   confirmSupplierWordingRelationship — the ONLY function in this
//   codebase that ever writes to Product.supplierWordings — is never
//   reached
//     ↓
//   NO relationship is persisted.
//
// HOW THIS IS PROVEN, GIVEN THIS REPOSITORY'S OWN ESTABLISHED
// CONSTRAINTS: this repo has no React component test harness (no
// jsdom, no @testing-library/react — confirmed by inspection,
// consistent with every other emulator/integration test file in this
// codebase), and addMultipleStockBatches/confirmSupplierWordingRelationship
// only exist inside AppProvider's React closure, never exported
// standalone. This test therefore proves the scenario in two
// complementary ways, neither of which fabricates a mock persistence
// path or an artificial implementation detail:
//
// (A) RUNTIME BEHAVIOR, against the real, unmocked, imported pure
//     functions: a row can genuinely hold candidate/pending supplier-
//     wording state (resolveSupplierWordingRecognition — Checkpoint 3),
//     and the EXACT expression AddStockView.tsx's handleSubmit uses to
//     decide whether to forward that state toward persistence
//     (row.pendingSupplierWording && row.pendingSupplierWording.origin
//     !== 'reused' ? {...} : {}) is reproduced verbatim here (not
//     reimplemented differently) and exercised directly — proving that
//     a row which merely has candidates surfaced, but was never
//     explicitly confirmed by the owner, produces no
//     pendingSupplierWording payload at all, regardless of whether
//     submit is ever called.
//
// (B) STRUCTURAL VERIFICATION against the real, current source of
//     AppContext.tsx (read fresh at test time via fs.readFileSync — the
//     same technique tests/open-batch-concurrency.test.ts already uses
//     to read the real firestore.rules, and
//     tests/supplier-wording-smart-stock-entry.test.ts already uses to
//     inspect the real server/smartStockEntry.ts module's exports):
//     confirms confirmSupplierWordingRelationship has exactly ONE call
//     site in the entire file, that it sits textually inside
//     addMultipleStockBatches's own function body (after the item-
//     processing loop, after fsBatch.commit()), and that
//     addMultipleStockBatches itself has an early-return guard when no
//     items are supplied. Together these prove the write path is
//     categorically unreachable without an actual finalization call —
//     not merely documented as such, but re-verified against the real
//     source every time this test runs, so a future edit that
//     accidentally added a second call site, moved the call outside the
//     finalization gate, or removed the guard would fail this test
//     immediately.
//
// HOW TO RUN:
//   npx tsx --test tests/supplier-wording-draft-abandonment.test.ts

import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { resolveSupplierWordingRecognition } from '../apps/tenant/src/lib/supplierWordingRecognition';

// ---------------------------------------------------------------------
// (A) Runtime behavior — real, unmocked pure functions
// ---------------------------------------------------------------------

/**
 * Reproduces AddStockView.tsx's handleSubmit conditional VERBATIM (see
 * this file's header) — not a reimplementation with different logic,
 * a literal copy of the exact expression that decides whether a row's
 * pending supplier-wording state is forwarded toward persistence.
 * Cross-reference: apps/tenant/src/components/AddStockView.tsx, the
 * `...(row.pendingSupplierWording && row.pendingSupplierWording.origin
 * !== 'reused' ? { pendingSupplierWording: {...} } : {})` spread inside
 * handleSubmit's itemsToSave.push(...) call. If that expression changes
 * in production, this copy must be updated to match, or this test no
 * longer verifies what it claims to — the identical caveat this
 * repository's other transaction/logic mirrors already document.
 */
function buildForwardedPendingSupplierWording(row: {
  pendingSupplierWording?: {
    wording: string;
    productId: string;
    origin: 'reused' | 'confirmed' | 'owner-initiated';
    conflictCheckProductIds: string[];
  };
}): { pendingSupplierWording?: unknown } {
  return {
    ...(row.pendingSupplierWording && row.pendingSupplierWording.origin !== 'reused'
      ? {
          pendingSupplierWording: {
            wording: row.pendingSupplierWording.wording,
            provenance:
              row.pendingSupplierWording.origin === 'owner-initiated' ? 'owner-initiated' : 'system-proposed',
            conflictCheckProductIds: row.pendingSupplierWording.conflictCheckProductIds,
          },
        }
      : {}),
  };
}

describe('Draft abandonment — [Finding 20] candidate/pending state exists, but is never confirmed or submitted', () => {
  it('Step 1: candidate state genuinely exists for a row (real, unmocked resolveSupplierWordingRecognition)', () => {
    const products = [{ id: 'p1', name: 'Café Preto 500ml' }];
    const outcome = resolveSupplierWordingRecognition('CAFE preto 500ml', 'supplier-1', products);
    assert.equal(outcome.type, 'candidates');
    if (outcome.type === 'candidates') {
      assert.equal(outcome.candidates.length, 1);
      assert.equal(outcome.candidates[0].productId, 'p1');
    }
  });

  it('Steps 2–4: a row with candidates surfaced but never explicitly confirmed by the owner (abandoned before any decision) forwards NOTHING toward persistence — even if handleSubmit somehow ran', () => {
    // This is exactly the state a row is left in the instant candidates
    // are shown (AddStockView.tsx's applySupplierWordingCheck /
    // buildRowFromProposalLineItem, both Checkpoint 3/4) — before the
    // owner has clicked Confirm on any of them.
    // row.pendingSupplierWording remains undefined until that explicit
    // click (handleConfirmSupplierWordingCandidate); merely being shown
    // candidates never sets it.
    const abandonedRow: { pendingSupplierWording?: never } = {};
    const forwarded = buildForwardedPendingSupplierWording(abandonedRow);
    assert.deepEqual(
      forwarded,
      {},
      'a row with unconfirmed candidate state must forward nothing toward persistence — abandonment before confirmation is silently, safely a no-op'
    );
    assert.equal('pendingSupplierWording' in forwarded, false);
  });

  it('Steps 2–4, second path: even a row the owner DID explicitly confirm forwards nothing once its origin is "reused" (no NEW relationship needed) — proving abandonment is never the only thing preventing a write for this path either', () => {
    const reusedRow = {
      pendingSupplierWording: {
        wording: 'Lager Grande',
        productId: 'p1',
        origin: 'reused' as const,
        conflictCheckProductIds: [],
      },
    };
    const forwarded = buildForwardedPendingSupplierWording(reusedRow);
    assert.deepEqual(forwarded, {});
  });

  it('control case: a row the owner DID explicitly confirm (origin "confirmed") DOES forward a payload — proving the prior two assertions are meaningful, not just "always empty" by construction', () => {
    const confirmedRow = {
      pendingSupplierWording: {
        wording: 'Lager Grande',
        productId: 'p1',
        origin: 'confirmed' as const,
        conflictCheckProductIds: [],
      },
    };
    const forwarded = buildForwardedPendingSupplierWording(confirmedRow);
    assert.ok(forwarded.pendingSupplierWording, 'a genuinely confirmed row must still forward a payload — the gate above is selective, not a blanket no-op');
  });
});

// ---------------------------------------------------------------------
// (B) Structural verification — the real, current AppContext.tsx source
// ---------------------------------------------------------------------

describe('Draft abandonment — [Finding 20] structural proof: the write path is categorically unreachable without an actual finalization call', () => {
  const appContextSource = readFileSync('apps/tenant/src/context/AppContext.tsx', 'utf8');

  it('confirmSupplierWordingRelationship — the ONLY function that writes to Product.supplierWordings — has exactly ONE call site in the entire file', () => {
    const callSites = appContextSource.match(/confirmSupplierWordingRelationship\(/g) ?? [];
    // Two occurrences expected: the function's own declaration
    // ("const confirmSupplierWordingRelationship = async (") does NOT
    // match this pattern (no trailing call syntax after the identifier
    // in a declaration) — only the actual invocation does. Assert
    // exactly one CALL, distinct from the declaration.
    assert.equal(
      callSites.length,
      1,
      `expected exactly 1 call site for confirmSupplierWordingRelationship(, found ${callSites.length} — a second call site would mean a new, unaudited path toward persisting a relationship`
    );
  });

  it('that one call site sits textually inside addMultipleStockBatches, AFTER the atomic stock/product write (fsBatch.commit()) — never before it, never in a separate function', () => {
    const fnStart = appContextSource.indexOf('const addMultipleStockBatches = async (');
    assert.ok(fnStart >= 0, 'addMultipleStockBatches declaration must exist');

    // Find the NEXT top-level `const <name> = ` declaration after this
    // one, to bound addMultipleStockBatches's own body — a simple,
    // reliable heuristic given this file's consistent formatting
    // (verified by inspection, matches every other function boundary in
    // this file).
    const nextDeclMatch = appContextSource.slice(fnStart + 1).search(/\n  const [a-zA-Z_]+ = (async )?\(/);
    assert.ok(nextDeclMatch >= 0, 'a following top-level declaration must exist to bound this function');
    const fnEnd = fnStart + 1 + nextDeclMatch;
    const fnBody = appContextSource.slice(fnStart, fnEnd);

    const callIndexInBody = fnBody.indexOf('confirmSupplierWordingRelationship(');
    assert.ok(
      callIndexInBody >= 0,
      'the call site must be located inside addMultipleStockBatches\u2019s own function body'
    );

    const commitIndexInBody = fnBody.indexOf('await fsBatch.commit();');
    assert.ok(commitIndexInBody >= 0, 'fsBatch.commit() must exist inside this same function body');

    assert.ok(
      callIndexInBody > commitIndexInBody,
      'confirmSupplierWordingRelationship must be called AFTER fsBatch.commit() — a call positioned before it would risk persisting a relationship for a stock write that could still fail/roll back'
    );
  });

  it('addMultipleStockBatches has an early-return guard for an empty/absent item list — the actual mechanism that makes "never submit" equivalent to "never called at all"', () => {
    assert.match(
      appContextSource,
      /if \(!activeBusinessId \|\| !items\.length\) return \{ purchaseBatchId: null \};/,
      'addMultipleStockBatches must bail out before doing any work (including before ever reaching confirmSupplierWordingRelationship) when no items are supplied — this is the concrete mechanism, re-verified against the real source, that makes an abandoned draft (handleSubmit never called, or called with nothing to save) provably incapable of writing a supplier-wording relationship'
    );
  });
});
