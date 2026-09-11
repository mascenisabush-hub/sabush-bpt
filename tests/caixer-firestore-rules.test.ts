// CAIXER — Implementation Authorization §44, Checkpoint 3 (Plan §D/C.8:
// Non-Destructive Validation and Write-Boundary Enforcement) — against a
// REAL Firestore emulator, not application code.
//
// Specification §45, FR-73, FR-74, FR-79; Rule 8 Findings CX-1
// (aggregate consistency), CX-2 (mandatory-field presence/type,
// non-destructive validation).
//
// WHY THIS FILE EXISTS AS A SEPARATE SUITE FROM
// tests/business-worth-snapshot-foundation.test.ts: that file proves
// Increment 1's own foundation rules (atomicity, idempotency, tenant
// isolation, immutability). This file proves the two NEW conditions
// this checkpoint adds to the same `businessWorthSnapshots` `allow
// create` Contagem branch — CX-1 and CX-2 — without re-asserting
// anything that suite already covers. Mirrors that file's own technique
// exactly: it does not invoke AppContext.tsx's recordStockCount()
// directly (tightly coupled to the live Firebase client SDK — see that
// file's own header for why); it performs the exact same Firestore
// write recordStockCount() performs and asserts on the rule outcome.
//
// HOW TO RUN:
//   npm run test:rules:emulator -- --test-name-pattern=CAIXER
// or directly:
//   npx tsx --test tests/caixer-firestore-rules.test.ts
// Requires a Firestore emulator on localhost:8080, same as
// tests/firestore-rules.test.ts.
//
// SANDBOX DISCLOSURE: this suite could not be executed in the
// environment that authored it — network egress there is allow-listed
// to a fixed set of domains and does not include Google's
// emulator-binary infrastructure. It has been typechecked but NOT run
// end-to-end. Treat a clean run of the :emulator script as the actual
// acceptance gate, not this file's existence or a typecheck pass — same
// disclosure this repository's other emulator-dependent suites already
// carry (tests/business-worth-snapshot-foundation.test.ts, tests/
// firestore-rules.test.ts).

import { strict as assert } from 'node:assert';
import { before, after, beforeEach, describe, it } from 'node:test';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const PROJECT_ID = 'sabush-bpt-caixer-rules-test';
const BIZ = 'biz1';
const OTHER_BIZ = 'biz2';
const OWNER_UID = 'owner1';
const OTHER_OWNER_UID = 'owner2';

let testEnv: RulesTestEnvironment;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
});

after(async () => {
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', OWNER_UID), { role: 'owner', businessId: BIZ });
    await setDoc(doc(ctx.firestore(), 'users', OTHER_OWNER_UID), { role: 'owner', businessId: OTHER_BIZ });
  });
});

function ownerDbFor() {
  return testEnv.authenticatedContext(OWNER_UID).firestore();
}
function otherOwnerDbFor() {
  return testEnv.authenticatedContext(OTHER_OWNER_UID).firestore();
}

// Mirrors AppContext.tsx's recordStockCount() deterministic-id formula
// exactly — kept as a literal string template, not imported, matching
// tests/business-worth-snapshot-foundation.test.ts's own convention.
const snapshotId = (sourceStockCountId: string) => 'bws-' + sourceStockCountId;

function stockCountBody(id: string) {
  return {
    id,
    type: 'monthly',
    date: '2026-09-10',
    items: [{ productId: 'p1', productName: 'Arroz', quantity: 10, unit: 'kg', costPrice: 50, sellingPrice: 65, totalValue: 500 }],
    totalValue: 500,
    totalSellingValue: 650,
    createdAt: new Date().toISOString(),
    producesBusinessWorthSnapshot: true,
  };
}

// A fully CAIXER-complete, internally-consistent snapshot body — the
// baseline every test below mutates from. cashPosition is the exact
// four-component sum, matching what computeCaixerTotalLiquidity
// (calculations.ts) would itself produce for these inputs (an honest
// client can never construct anything else).
function caixerSnapshotBody(id: string, sourceStockCountId: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    businessId: BIZ,
    establishmentMethod: 'contagem',
    sourceStockCountId,
    confirmedAt: serverTimestamp(),
    measuredBusinessWorth: 650,
    productValuationTotal: 650,
    productValuationDetail: [],
    embeddedProfitTotal: 0,
    embeddedProfitDetail: [],
    expensesSinceLastSnapshot: 0,
    breakagesSinceLastSnapshot: 0,
    levantamentosSinceLastSnapshot: 0,
    previousCurrentBusinessWorth: null,
    correctionWindowExpiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    cashPositionCash: 1000,
    cashPositionEmola: 250,
    cashPositionMpesa: 500,
    cashPositionBanco: 4200,
    cashPosition: 5950,
    ...overrides,
  };
}

describe('CAIXER — CX-2: mandatory four-field presence/type, zero valid, missing/null/undefined invalid', () => {
  it('accepts a complete, consistent CAIXER write (baseline — proves the happy path this whole suite mutates from)', async () => {
    const db = ownerDbFor();
    const sId = 'stockcount-caixer-001';
    const bwsId = snapshotId(sId);
    const batch = writeBatch(db);
    batch.set(doc(db, 'businesses', BIZ, 'stockCounts', sId), stockCountBody(sId));
    batch.set(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), caixerSnapshotBody(bwsId, sId));
    await assertSucceeds(batch.commit());
  });

  it('an explicit 0 in every CAIXER field is valid — zero must never be confused with missing data', async () => {
    const db = ownerDbFor();
    const sId = 'stockcount-caixer-002';
    const bwsId = snapshotId(sId);
    const batch = writeBatch(db);
    batch.set(doc(db, 'businesses', BIZ, 'stockCounts', sId), stockCountBody(sId));
    batch.set(
      doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId),
      caixerSnapshotBody(bwsId, sId, {
        cashPositionCash: 0,
        cashPositionEmola: 0,
        cashPositionMpesa: 0,
        cashPositionBanco: 0,
        cashPosition: 0,
      })
    );
    await assertSucceeds(batch.commit());
  });

  for (const missingField of ['cashPositionCash', 'cashPositionEmola', 'cashPositionMpesa', 'cashPositionBanco'] as const) {
    it(`rejects a Contagem-establishment write with ${missingField} genuinely absent`, async () => {
      const db = ownerDbFor();
      const sId = `stockcount-caixer-missing-${missingField}`;
      const bwsId = snapshotId(sId);
      const body = caixerSnapshotBody(bwsId, sId);
      delete (body as Record<string, unknown>)[missingField];
      const batch = writeBatch(db);
      batch.set(doc(db, 'businesses', BIZ, 'stockCounts', sId), stockCountBody(sId));
      batch.set(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), body);
      await assertFails(batch.commit());
    });

    it(`rejects a Contagem-establishment write with ${missingField} explicitly null`, async () => {
      const db = ownerDbFor();
      const sId = `stockcount-caixer-null-${missingField}`;
      const bwsId = snapshotId(sId);
      const body = caixerSnapshotBody(bwsId, sId, { [missingField]: null });
      const batch = writeBatch(db);
      batch.set(doc(db, 'businesses', BIZ, 'stockCounts', sId), stockCountBody(sId));
      batch.set(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), body);
      await assertFails(batch.commit());
    });

    it(`rejects a Contagem-establishment write with ${missingField} as a non-numeric (string) value`, async () => {
      const db = ownerDbFor();
      const sId = `stockcount-caixer-nonnumeric-${missingField}`;
      const bwsId = snapshotId(sId);
      const body = caixerSnapshotBody(bwsId, sId, { [missingField]: '0' });
      const batch = writeBatch(db);
      batch.set(doc(db, 'businesses', BIZ, 'stockCounts', sId), stockCountBody(sId));
      batch.set(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), body);
      await assertFails(batch.commit());
    });
  }

  it('rejects a Contagem-establishment write with cashPosition itself absent, even when all four components are present', async () => {
    const db = ownerDbFor();
    const sId = 'stockcount-caixer-no-aggregate';
    const bwsId = snapshotId(sId);
    const body = caixerSnapshotBody(bwsId, sId);
    delete (body as Record<string, unknown>).cashPosition;
    const batch = writeBatch(db);
    batch.set(doc(db, 'businesses', BIZ, 'stockCounts', sId), stockCountBody(sId));
    batch.set(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), body);
    await assertFails(batch.commit());
  });
});

describe('CAIXER — CX-1: aggregate consistency (cashPosition must equal the four-component sum, ±0.01 tolerance)', () => {
  it('rejects a tampered/inconsistent aggregate — a client cannot fabricate cashPosition independently of its own four components', async () => {
    const db = ownerDbFor();
    const sId = 'stockcount-caixer-tampered-aggregate';
    const bwsId = snapshotId(sId);
    const body = caixerSnapshotBody(bwsId, sId, { cashPosition: 999999 });
    const batch = writeBatch(db);
    batch.set(doc(db, 'businesses', BIZ, 'stockCounts', sId), stockCountBody(sId));
    batch.set(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), body);
    await assertFails(batch.commit());
  });

  it('rejects an aggregate that is short of the true sum by more than the tolerance', async () => {
    const db = ownerDbFor();
    const sId = 'stockcount-caixer-aggregate-too-low';
    const bwsId = snapshotId(sId);
    const body = caixerSnapshotBody(bwsId, sId, { cashPosition: 5950 - 1 });
    const batch = writeBatch(db);
    batch.set(doc(db, 'businesses', BIZ, 'stockCounts', sId), stockCountBody(sId));
    batch.set(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), body);
    await assertFails(batch.commit());
  });

  it('accepts an aggregate within the ±0.01 floating-point tolerance of the true sum', async () => {
    const db = ownerDbFor();
    const sId = 'stockcount-caixer-aggregate-tolerance';
    const bwsId = snapshotId(sId);
    const body = caixerSnapshotBody(bwsId, sId, { cashPosition: 5950 + 0.009 });
    const batch = writeBatch(db);
    batch.set(doc(db, 'businesses', BIZ, 'stockCounts', sId), stockCountBody(sId));
    batch.set(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), body);
    await assertSucceeds(batch.commit());
  });

  it('rejects an aggregate outside the tolerance in the positive direction', async () => {
    const db = ownerDbFor();
    const sId = 'stockcount-caixer-aggregate-too-high';
    const bwsId = snapshotId(sId);
    const body = caixerSnapshotBody(bwsId, sId, { cashPosition: 5950 + 1 });
    const batch = writeBatch(db);
    batch.set(doc(db, 'businesses', BIZ, 'stockCounts', sId), stockCountBody(sId));
    batch.set(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), body);
    await assertFails(batch.commit());
  });
});

describe('CAIXER — backward compatibility (CX-14): the write boundary applies only to establishmentMethod == \'contagem\'', () => {
  it('a pre-CAIXER-shaped write (establishmentMethod absent, no CAIXER fields, only the legacy single cashPosition) is unaffected — this checkpoint adds no retroactive requirement', async () => {
    const db = ownerDbFor();
    const sId = 'stockcount-legacy-no-caixer';
    const bwsId = snapshotId(sId);
    const body: Record<string, unknown> = caixerSnapshotBody(bwsId, sId, { cashPosition: 12000 });
    delete body.establishmentMethod;
    delete body.cashPositionCash;
    delete body.cashPositionEmola;
    delete body.cashPositionMpesa;
    delete body.cashPositionBanco;
    const batch = writeBatch(db);
    batch.set(doc(db, 'businesses', BIZ, 'stockCounts', sId), stockCountBody(sId));
    batch.set(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), body);
    await assertSucceeds(batch.commit());
  });

  it('a Contagem write with no cash position at all (Owner never completed CAIXER, and the caller supplied nothing) still succeeds — CAIXER fields are only required together, never fabricated when genuinely absent', async () => {
    const db = ownerDbFor();
    const sId = 'stockcount-no-cash-position-at-all';
    const bwsId = snapshotId(sId);
    const body: Record<string, unknown> = caixerSnapshotBody(bwsId, sId);
    delete body.cashPositionCash;
    delete body.cashPositionEmola;
    delete body.cashPositionMpesa;
    delete body.cashPositionBanco;
    delete body.cashPosition;
    const batch = writeBatch(db);
    batch.set(doc(db, 'businesses', BIZ, 'stockCounts', sId), stockCountBody(sId));
    batch.set(doc(db, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), body);
    await assertSucceeds(batch.commit());
  });
});

describe('CAIXER — tenant isolation (§I): the new fields introduce no new cross-business surface', () => {
  it('the Owner of a different business cannot create a CAIXER-bearing snapshot under this business\'s path', async () => {
    const sId = 'stockcount-caixer-cross-tenant';
    const bwsId = snapshotId(sId);
    const otherDb = otherOwnerDbFor();
    await assertFails(
      setDoc(doc(otherDb, 'businesses', BIZ, 'businessWorthSnapshots', bwsId), caixerSnapshotBody(bwsId, sId))
    );
  });
});
