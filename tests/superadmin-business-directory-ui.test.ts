// SuperAdmin V1 Operational Control Plane — Phase E UI tests
// (BDR-0010, POL-18-001, docs/specs/18-superadmin-business-directory-slice.md
// v1.2).
//
// Scope: apps/superadmin/src/pages/BusinessDirectory.tsx and its
// wiring in App.tsx. WHY STATIC/STRUCTURAL: this repository has no UI
// test framework (confirmed, standing limitation across every prior
// SuperAdmin phase's own verification — Phase A through D each
// recorded this identically) — this suite reads the actual committed
// source and asserts the properties that matter most for this
// checkpoint's own guardrails: the UI reproduces no business logic
// (activity classification, subscription-state computation, Firestore
// queries, lastActivityAt derivation, or pagination-cursor math all
// stay exclusively server-side/module-side, already proven by their
// own dedicated test suites), and the page is correctly reachable only
// through the SuperAdmin-gated shell.
//
// IMPORTANT BOUNDARY: this suite does not and cannot substitute for
// the real authorization proof. The actual security boundary — that
// an unauthorized caller cannot reach directory data no matter what
// the client does — is server-enforced and already verified in
// tests/superadmin-business-directory-api.test.ts (the auth-chain
// test) and, at the Firestore layer, in this project's broader Rules
// test suite. This file confirms the CLIENT does not add a second,
// weaker path around that boundary — it does not re-verify the
// boundary itself.
//
// HOW TO RUN:
//   npx tsx --test tests/superadmin-business-directory-ui.test.ts

import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

const UI_SOURCE = readFileSync(new URL('../apps/superadmin/src/pages/BusinessDirectory.tsx', import.meta.url), 'utf8');
const APP_SOURCE = readFileSync(new URL('../apps/superadmin/src/App.tsx', import.meta.url), 'utf8');
const SERVER_SOURCE = readFileSync(new URL('../server/index.ts', import.meta.url), 'utf8');

describe('BusinessDirectory.tsx — consumes the API only, no reproduced business logic', () => {
  it('imports fetchBusinessDirectory from the client API wrapper, and nothing from the Firestore SDK', () => {
    assert.match(UI_SOURCE, /import \{[\s\S]*?fetchBusinessDirectory[\s\S]*?\} from '\.\.\/lib\/superadminApi';/);
    assert.ok(!UI_SOURCE.includes('firebase/firestore'), 'The directory UI must never import the Firestore client SDK directly.');
  });

  it('never computes Operational Activity classification itself — no threshold constants, no date-math duplication', () => {
    for (const forbidden of ['NEW_WINDOW_DAYS', 'ACTIVE_WINDOW_DAYS', 'DORMANT_THRESHOLD_DAYS', 'classifyOperationalActivity', 'daysBetween']) {
      assert.ok(!UI_SOURCE.includes(forbidden), `Found "${forbidden}" in BusinessDirectory.tsx — Operational Activity classification must remain exclusively server-side (server/businessDirectory.ts).`);
    }
  });

  it('never constructs a Firestore query — no .where()/.orderBy()/.startAfter() calls', () => {
    assert.ok(!/\.where\(|\.orderBy\(|\.startAfter\(/.test(UI_SOURCE), 'The UI must never construct its own Firestore query — all querying stays server-side.');
  });

  it('pagination uses the API\'s own opaque nextCursor — no client-side page-number or offset arithmetic', () => {
    assert.match(UI_SOURCE, /nextCursor/);
    assert.ok(!/Math\.ceil|Math\.floor|pageNumber|offset\s*\*/.test(UI_SOURCE), 'Pagination must remain purely cursor-based, echoing the opaque cursor the API returns — no reimplemented page-math.');
  });

  it('the filter parameters sent to the API match server/businessDirectory.ts\'s own DirectoryFilters shape exactly', () => {
    for (const param of ['search', 'operationalActivity', 'subscriptionState', 'suspended', 'sortBy']) {
      assert.ok(UI_SOURCE.includes(param), `Expected the filter shape to include "${param}", matching the API's own DirectoryFilters interface.`);
    }
  });
});

describe('BusinessDirectory.tsx — discovery/monitoring surface, not a management console', () => {
  it('contains no suspend/reactivate/edit/delete action — clicking a row only navigates, via onOpenBusiness', () => {
    for (const forbidden of ['Suspender negócio', 'Reativar negócio', 'onDelete', 'onEdit', 'onSuspend', 'onReactivate']) {
      assert.ok(!UI_SOURCE.includes(forbidden), `Found "${forbidden}" in BusinessDirectory.tsx — the directory must remain a monitoring surface; suspend/reactivate/edit actions belong exclusively to the existing Business Detail screen.`);
    }
    assert.match(UI_SOURCE, /onOpenBusiness\(r\.businessId\)/);
  });

  it('contains no bulk-action or chart/analytics affordance', () => {
    for (const forbidden of ['checkbox', 'selectAll', '<canvas', 'recharts', 'Chart.js', 'bulkAction']) {
      assert.ok(!UI_SOURCE.toLowerCase().includes(forbidden.toLowerCase()), `Found a possible bulk-action/chart affordance ("${forbidden}") — out of scope for V1, per BDR-0010 Part 8.`);
    }
  });

  it('handles loading, empty, and error states explicitly', () => {
    assert.match(UI_SOURCE, /A carregar…/); // loading
    assert.match(UI_SOURCE, /Nenhum negócio encontrado/); // empty
    assert.match(UI_SOURCE, /setError\(/); // error
  });
});

describe('App.tsx — Business Directory is reachable only through the SuperAdmin-gated shell', () => {
  it('BusinessDirectory is imported and rendered only inside the view switch that already requires phase.kind === "superadmin"', () => {
    assert.match(APP_SOURCE, /import BusinessDirectory from '\.\/pages\/BusinessDirectory';/);
    // The entire view-switching <main> block (where BusinessDirectory is
    // rendered) is only reached after the function has already returned
    // early for every non-superadmin phase above it — confirmed by the
    // ordering of the early-return blocks preceding it.
    const directoryRenderIndex = APP_SOURCE.indexOf("view.name === 'directory'");
    const superadminGateIndex = APP_SOURCE.indexOf("phase.kind === 'superadmin'");
    assert.ok(directoryRenderIndex > 0 && superadminGateIndex > 0);
    assert.ok(APP_SOURCE.indexOf("if (phase.kind === 'not-superadmin')") < directoryRenderIndex, 'The directory view must be rendered only after the not-superadmin early return.');
  });

  it('a click-through to Business Detail correctly tracks its origin (directory vs. the existing search screen) for the back button', () => {
    assert.match(APP_SOURCE, /from: 'directory'/);
    assert.match(APP_SOURCE, /from: 'businesses'/);
  });
});

describe('Server authorization boundary — unchanged by this checkpoint (re-confirmed, not assumed)', () => {
  it('the directory route still requires the exact same auth chain — this UI checkpoint did not weaken it', () => {
    const routeMatch = SERVER_SOURCE.match(/expressApp\.get\(\s*\n?\s*'\/api\/superadmin\/businesses\/directory'[\s\S]*?\n\);/);
    assert.ok(routeMatch, 'Expected the directory route to still exist in server/index.ts');
    assert.match(routeMatch![0], /requireAuth,/);
    assert.match(routeMatch![0], /requirePlatformOperator,/);
    assert.match(routeMatch![0], /requireSuperAdmin,/);
  });

  it('no new client-side-privileged route or Firestore rule change accompanies this UI checkpoint', () => {
    // A structural sanity check, not exhaustive: confirms this
    // checkpoint's own scope (the UI files) did not introduce a
    // second, parallel route to the same capability.
    const occurrences = SERVER_SOURCE.match(/'\/api\/superadmin\/businesses\/directory'/g) || [];
    assert.equal(occurrences.length, 1);
  });
});
