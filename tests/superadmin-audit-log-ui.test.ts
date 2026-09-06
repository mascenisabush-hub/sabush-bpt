// SuperAdmin Audit Center Action-Type Allowlist Correction —
// Implementation Authorization, 2026-09-06.
// Governing chain: SUPERADMIN_AUDIT_CENTER_ACTION_TYPE_INVESTIGATION.md
// (CONFIRMED IMPLEMENTATION DEFECT) ->
// SUPERADMIN_AUDIT_CENTER_ACTION_TYPE_IMPLEMENTATION_PLAN.md (ACCEPTED) ->
// SUPERADMIN_AUDIT_CENTER_ACTION_TYPE_IMPLEMENTATION_PLAN_GOVERNANCE_REVIEW.md
// (READY FOR PRODUCT ARCHITECT ACCEPTANCE) ->
// SUPERADMIN_AUDIT_CENTER_ACTION_TYPE_IMPLEMENTATION_AUTHORIZATION.md
// (AUTHORIZED).
//
// Scope: apps/superadmin/src/pages/AuditTrail.tsx and
// apps/superadmin/src/lib/superadminApi.ts. WHY STATIC/STRUCTURAL:
// this repository has no UI test framework (confirmed, standing
// limitation across every prior SuperAdmin phase's own verification —
// Phase A through D, and the Business Directory checkpoint, each
// recorded this identically; see
// tests/superadmin-business-directory-ui.test.ts's own header, whose
// exact convention this file mirrors) — this suite reads the actual
// committed source and asserts the properties that matter most for
// this correction's own guardrails: the four newly-allowlisted action
// types are genuinely selectable/labeled in the UI, the two
// independently-maintained KNOWN_ACTION_TYPES copies (server and UI)
// were kept in sync by this correction (the exact failure mode the
// governing investigation found — three prior features each missed
// this step), and the UI still reproduces no server-side logic.
//
// IMPORTANT BOUNDARY: this suite does not and cannot substitute for
// the real authorization proof. The actual security boundary is
// server-enforced and already verified in
// tests/superadmin-operational-control-plane.test.ts and this
// project's broader Rules test suite. This file confirms the CLIENT
// does not add a second, weaker path around that boundary, and that
// this correction did not touch it — it does not re-verify the
// boundary itself.
//
// HOW TO RUN:
//   npx tsx --test tests/superadmin-audit-log-ui.test.ts

import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { KNOWN_ACTION_TYPES as SERVER_KNOWN_ACTION_TYPES } from '../server/auditLogQuery';

const UI_SOURCE = readFileSync(new URL('../apps/superadmin/src/pages/AuditTrail.tsx', import.meta.url), 'utf8');
const CLIENT_API_SOURCE = readFileSync(new URL('../apps/superadmin/src/lib/superadminApi.ts', import.meta.url), 'utf8');
const SERVER_SOURCE = readFileSync(new URL('../server/index.ts', import.meta.url), 'utf8');

const NEW_ACTION_TYPES = [
  'initial_stock_recovery.authorized',
  'initial_stock_recovery.consumed',
  'business_worth_recovery.authorized',
  'business_worth_recovery.expired',
] as const;

describe('AuditTrail.tsx — consumes the API only, no reproduced business logic', () => {
  it('imports fetchAuditLog and KNOWN_ACTION_TYPES from the client API wrapper, and nothing from the Firestore SDK', () => {
    assert.match(UI_SOURCE, /import \{[\s\S]*?fetchAuditLog[\s\S]*?KNOWN_ACTION_TYPES[\s\S]*?\} from '\.\.\/lib\/superadminApi';/);
    assert.ok(!UI_SOURCE.includes('firebase/firestore'), 'The Audit Trail UI must never import the Firestore client SDK directly.');
  });

  it('the action-type dropdown options are generated exclusively from the imported KNOWN_ACTION_TYPES — no second, independent option list', () => {
    assert.match(UI_SOURCE, /\{KNOWN_ACTION_TYPES\.map\(/);
    // Defensive: confirms there is exactly one array literal assigned
    // to a same-named identifier anywhere in this component (there
    // should be none — the only KNOWN_ACTION_TYPES in scope is the
    // imported one).
    assert.ok(!/const KNOWN_ACTION_TYPES\s*=/.test(UI_SOURCE), 'AuditTrail.tsx must not declare its own KNOWN_ACTION_TYPES — it must use only the imported one from superadminApi.ts.');
  });
});

describe('AuditTrail.tsx — the four newly-authorized action types are present and labeled', () => {
  it('the four action types are present in ACTION_LABELS with a real, non-fallback Portuguese label (not the raw machine string)', () => {
    for (const actionType of NEW_ACTION_TYPES) {
      const re = new RegExp(`'${actionType.replace('.', '\\.')}':\\s*'([^']+)'`);
      const match = UI_SOURCE.match(re);
      assert.ok(match, `Expected ACTION_LABELS to contain an entry for "${actionType}"`);
      assert.notEqual(match![1], actionType, `The label for "${actionType}" must not simply be the raw machine string — actionLabel()'s fallback is for genuinely UNLABELED values, not an excuse to skip labeling a known one.`);
    }
  });

  it('the four labels reuse this app\'s own existing recovery terminology (BusinessDetail.tsx), not invented wording', () => {
    assert.match(UI_SOURCE, /'initial_stock_recovery\.authorized':\s*'Recuperação de Capital Inicial autorizada'/);
    assert.match(UI_SOURCE, /'initial_stock_recovery\.consumed':\s*'Recuperação de Capital Inicial executada'/);
    assert.match(UI_SOURCE, /'business_worth_recovery\.authorized':\s*'Recuperação de Valor do Negócio autorizada'/);
    assert.match(UI_SOURCE, /'business_worth_recovery\.expired':\s*'Recuperação de Valor do Negócio expirada'/);
  });

  it('none of the existing seven labels were edited, removed, or reworded', () => {
    const existingLabels: Record<string, string> = {
      'payment.confirmed': 'Pagamento confirmado',
      'payment.rejected': 'Pagamento rejeitado',
      'operator.provisioned': 'Operador provisionado',
      'operator.revoked': 'Operador revogado',
      'business.viewed': 'Negócio consultado',
      'business.suspended': 'Negócio suspenso',
      'business.reactivated': 'Negócio reativado',
    };
    for (const [actionType, label] of Object.entries(existingLabels)) {
      assert.match(UI_SOURCE, new RegExp(`'${actionType.replace('.', '\\.')}':\\s*'${label}'`));
    }
  });
});

describe('The two independently-maintained KNOWN_ACTION_TYPES copies were kept in sync (the exact failure mode the governing investigation found)', () => {
  it('apps/superadmin/src/lib/superadminApi.ts\'s own KNOWN_ACTION_TYPES contains exactly the same 11 values as server/auditLogQuery.ts\'s', () => {
    const match = CLIENT_API_SOURCE.match(/export const KNOWN_ACTION_TYPES = \[([\s\S]*?)\] as const;/);
    assert.ok(match, 'Expected to find KNOWN_ACTION_TYPES in superadminApi.ts');
    // Line-anchored: only a line that IS an array element (optionally
    // indented, quoted, trailing comma) counts — deliberately does NOT
    // use a naive global quote-to-quote match, since this array's own
    // explanatory comment legitimately contains an apostrophe
    // ("auditLogQuery.ts's own KNOWN_ACTION_TYPES") that would
    // otherwise be misread as a string delimiter.
    const clientValues = Array.from(match![1].matchAll(/^\s*'([a-z_.]+)',\s*$/gm)).map((m) => m[1]);
    assert.deepEqual(clientValues.sort(), [...SERVER_KNOWN_ACTION_TYPES].sort());
  });

  it('both copies include all four newly-authorized action types', () => {
    for (const actionType of NEW_ACTION_TYPES) {
      assert.ok((SERVER_KNOWN_ACTION_TYPES as readonly string[]).includes(actionType), `server/auditLogQuery.ts is missing "${actionType}"`);
      assert.ok(CLIENT_API_SOURCE.includes(`'${actionType}'`), `apps/superadmin/src/lib/superadminApi.ts is missing "${actionType}"`);
    }
  });

  it('this correction did NOT consolidate the two lists into a shared import — each file still declares its own literal array', () => {
    assert.match(CLIENT_API_SOURCE, /export const KNOWN_ACTION_TYPES = \[/);
    assert.ok(!CLIENT_API_SOURCE.includes("from '../../../server/auditLogQuery'"), 'superadminApi.ts must not import KNOWN_ACTION_TYPES from server/auditLogQuery.ts — the accepted plan deliberately keeps these two lists independently maintained.');
    // Specifically: KNOWN_ACTION_TYPES itself must not be imported from
    // shared-types. This file already legitimately imports
    // @sabush/shared-types for PaymentMethod/PaymentStatus (unrelated
    // to this correction) — a blanket "file never mentions
    // @sabush/shared-types" check would be a false positive.
    assert.ok(!/import[\s\S]*?KNOWN_ACTION_TYPES[\s\S]*?from '@sabush\/shared-types'/.test(CLIENT_API_SOURCE), 'This correction must not import KNOWN_ACTION_TYPES from shared-types — consolidation was explicitly out of scope for this authorization.');
  });
});

describe('Response-shape boundary — unchanged by this correction (re-confirmed, not assumed)', () => {
  it('the UI never references targetStockCountId or authorizationId — the response-shape expansion remains out of scope', () => {
    assert.ok(!UI_SOURCE.includes('targetStockCountId'), 'AuditTrail.tsx must not reference targetStockCountId — response-shape expansion is explicitly out of scope for this correction.');
    assert.ok(!UI_SOURCE.includes('authorizationId'), 'AuditTrail.tsx must not reference authorizationId — response-shape expansion is explicitly out of scope for this correction.');
  });

  it('the client AuditLogEntryRow shape is unchanged — still exactly the existing 8 fields', () => {
    const match = CLIENT_API_SOURCE.match(/export interface AuditLogEntryRow \{([\s\S]*?)\}/);
    assert.ok(match, 'Expected to find AuditLogEntryRow in superadminApi.ts');
    const fields = Array.from(match![1].matchAll(/^\s*(\w+)[?:]/gm)).map((m) => m[1]);
    assert.deepEqual(
      fields.sort(),
      ['id', 'actorUid', 'actorRole', 'actionType', 'targetBusinessId', 'targetUid', 'justification', 'timestamp'].sort()
    );
  });
});

describe('Server authorization boundary — unchanged by this correction (re-confirmed, not assumed)', () => {
  it('the audit-log route still requires the exact same auth chain — this correction did not weaken it', () => {
    const routeMatch = SERVER_SOURCE.match(/expressApp\.get\(\s*\n?\s*'\/api\/superadmin\/audit-log'[\s\S]*?\n\);/);
    assert.ok(routeMatch, 'Expected the audit-log route to still exist in server/index.ts');
    assert.match(routeMatch![0], /requireAuth,/);
    assert.match(routeMatch![0], /requirePlatformOperator,/);
    assert.match(routeMatch![0], /requireSuperAdmin,/);
  });

  it('no new client-side-privileged route accompanies this correction', () => {
    const occurrences = SERVER_SOURCE.match(/'\/api\/superadmin\/audit-log'/g) || [];
    assert.equal(occurrences.length, 1);
  });
});
