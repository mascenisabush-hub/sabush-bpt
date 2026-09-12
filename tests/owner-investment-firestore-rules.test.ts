// Owner Investment / Capital Added — Implementation Authorization §23,
// Increment 10, Item 3 — CHECKPOINT 1 (Data Model + Persistence
// Boundary + Security), extended by Product Architect Decision OI-PA-1
// (closed-period enforcement, business-worth-evolution-implementation-
// plan.md) — against a REAL Firestore emulator, not application code.
//
// Specification §43, FR-63, FR-66; Rule 8 Findings OI-1 (security/
// tenant isolation), OI-2 (atomicity — asserted at the data-shape
// level here; the actual atomic batch write is exercised directly
// against Firestore, mirroring tests/business-worth-snapshot-
// foundation.test.ts's own technique of performing the same operations
// the application code performs, rather than invoking AppContext.tsx's
// tightly-coupled addOwnerInvestment() directly).
//
// SCOPE: Checkpoint 1 (data model/persistence/security), plus OI-PA-1's
// closed-period enforcement. This suite does NOT test any Business
// Worth formula/snapshot effect — those are covered separately in
// tests/owner-investment-checkpoint-2-fr64.test.ts,
// tests/owner-investment-checkpoint-3-fr65.test.ts, and
// tests/owner-investment-checkpoint-4-owner-declared-fr65.test.ts.
//
// HOW TO RUN:
//   npx tsx --test tests/owner-investment-firestore-rules.test.ts
// Requires a Firestore emulator on localhost:8080, same as
// tests/firestore-rules.test.ts.
//
// SANDBOX DISCLOSURE: this suite could not be executed in the
// environment that authored it — network egress there is allow-listed
// to a fixed set of domains and does not include Google's emulator-
// binary infrastructure. It has been typechecked but NOT run
// end-to-end. Treat a clean run of an emulator-backed script as the
// actual acceptance gate, not this file's existence or a typecheck
// pass — same disclosure this repository's other emulator-dependent
// suites already carry.

import { strict as assert } from 'node:assert';
import { before, after, beforeEach, describe, it } from 'node:test';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const PROJECT_ID = 'sabush-bpt-owner-investment-test';
const BIZ = 'biz1';
const OTHER_BIZ = 'biz2';
const OWNER_UID = 'owner1';
const OTHER_OWNER_UID = 'owner2';
const STAFF_UID = 'staff1';

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
    await setDoc(doc(ctx.firestore(), 'users', STAFF_UID), { role: 'staff', businessId: BIZ });
  });
});

function ownerDbFor() {
  return testEnv.authenticatedContext(OWNER_UID).firestore();
}
function otherOwnerDbFor() {
  return testEnv.authenticatedContext(OTHER_OWNER_UID).firestore();
}
function staffDbFor() {
  return testEnv.authenticatedContext(STAFF_UID).firestore();
}

function ownerInvestmentBody(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    businessId: BIZ,
    amount: 100000,
    date: '2026-09-12',
    description: 'Capital adicional para reposição de stock',
    createdAt: new Date().toISOString(),
    createdBy: OWNER_UID,
    ...overrides,
  };
}

function cashLedgerEntryBody(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    businessId: BIZ,
    direction: 'inflow',
    amount: 100000,
    category: 'other-governed-movement',
    sourceReference: { type: 'owner-investment', id: 'oi-001' },
    occurredAt: '2026-09-12',
    createdAt: new Date().toISOString(),
    createdBy: OWNER_UID,
    ...overrides,
  };
}

describe('ownerInvestments — FR-63/FR-66, Rule 8 Finding OI-1: mandatory-field validation, zero/negative rejected', () => {
  it('accepts a valid Owner Investment create (baseline)', async () => {
    const db = ownerDbFor();
    await assertSucceeds(setDoc(doc(db, 'businesses', BIZ, 'ownerInvestments', 'oi-001'), ownerInvestmentBody('oi-001')));
  });

  it('accepts an Owner Investment with no description (optional field genuinely absent, never fabricated)', async () => {
    const db = ownerDbFor();
    const body = ownerInvestmentBody('oi-002');
    delete (body as Record<string, unknown>).description;
    await assertSucceeds(setDoc(doc(db, 'businesses', BIZ, 'ownerInvestments', 'oi-002'), body));
  });

  it('rejects amount == 0 — unlike CAIXER, zero is never valid for Owner Investment', async () => {
    const db = ownerDbFor();
    await assertFails(setDoc(doc(db, 'businesses', BIZ, 'ownerInvestments', 'oi-003'), ownerInvestmentBody('oi-003', { amount: 0 })));
  });

  it('rejects a negative amount', async () => {
    const db = ownerDbFor();
    await assertFails(setDoc(doc(db, 'businesses', BIZ, 'ownerInvestments', 'oi-004'), ownerInvestmentBody('oi-004', { amount: -500 })));
  });

  it('rejects a non-numeric amount', async () => {
    const db = ownerDbFor();
    await assertFails(setDoc(doc(db, 'businesses', BIZ, 'ownerInvestments', 'oi-005'), ownerInvestmentBody('oi-005', { amount: '100000' })));
  });

  it('rejects a missing amount', async () => {
    const db = ownerDbFor();
    const body = ownerInvestmentBody('oi-006');
    delete (body as Record<string, unknown>).amount;
    await assertFails(setDoc(doc(db, 'businesses', BIZ, 'ownerInvestments', 'oi-006'), body));
  });

  it('rejects a businessId that does not match the URL path business (tenant isolation is structural, not merely checked)', async () => {
    const db = ownerDbFor();
    await assertFails(setDoc(doc(db, 'businesses', BIZ, 'ownerInvestments', 'oi-007'), ownerInvestmentBody('oi-007', { businessId: OTHER_BIZ })));
  });

  it('rejects a document id that does not match the resource.data.id field', async () => {
    const db = ownerDbFor();
    await assertFails(setDoc(doc(db, 'businesses', BIZ, 'ownerInvestments', 'oi-008'), ownerInvestmentBody('mismatched-id')));
  });

  it('rejects createdBy spoofing — a caller cannot attribute the investment to a different uid', async () => {
    const db = ownerDbFor();
    await assertFails(setDoc(doc(db, 'businesses', BIZ, 'ownerInvestments', 'oi-009'), ownerInvestmentBody('oi-009', { createdBy: OTHER_OWNER_UID })));
  });
});

describe('ownerInvestments — Rule 8 Finding OI-1: Owner-only authorization', () => {
  it('Staff cannot create an Owner Investment', async () => {
    const db = staffDbFor();
    await assertFails(setDoc(doc(db, 'businesses', BIZ, 'ownerInvestments', 'oi-010'), ownerInvestmentBody('oi-010')));
  });

  it('Staff cannot read an Owner Investment (Owner-only read, narrower than businessWorthSnapshots\' own isMemberOf read grant)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'ownerInvestments', 'oi-011'), ownerInvestmentBody('oi-011'));
    });
    await assertFails(getDoc(doc(staffDbFor(), 'businesses', BIZ, 'ownerInvestments', 'oi-011')));
  });

  it('the Owner can read their own business\'s Owner Investments', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'ownerInvestments', 'oi-012'), ownerInvestmentBody('oi-012'));
    });
    await assertSucceeds(getDoc(doc(ownerDbFor(), 'businesses', BIZ, 'ownerInvestments', 'oi-012')));
  });
});

describe('ownerInvestments — tenant isolation (cross-business read/write)', () => {
  it('the Owner of a different business cannot create an Owner Investment under this business\'s path', async () => {
    const otherDb = otherOwnerDbFor();
    await assertFails(setDoc(doc(otherDb, 'businesses', BIZ, 'ownerInvestments', 'oi-013'), ownerInvestmentBody('oi-013')));
  });

  it('a member of a different business cannot read this business\'s Owner Investments', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'ownerInvestments', 'oi-014'), ownerInvestmentBody('oi-014'));
    });
    await assertFails(getDoc(doc(otherOwnerDbFor(), 'businesses', BIZ, 'ownerInvestments', 'oi-014')));
  });
});

describe('ownerInvestments — append-only immutability (mirrors startupInvestmentEntries exactly)', () => {
  it('no role can update an existing Owner Investment', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'ownerInvestments', 'oi-015'), ownerInvestmentBody('oi-015'));
    });
    await assertFails(setDoc(doc(ownerDbFor(), 'businesses', BIZ, 'ownerInvestments', 'oi-015'), { amount: 999999 }, { merge: true }));
  });

  it('no role can delete an existing Owner Investment', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'ownerInvestments', 'oi-016'), ownerInvestmentBody('oi-016'));
    });
    await assertFails(deleteDoc(doc(ownerDbFor(), 'businesses', BIZ, 'ownerInvestments', 'oi-016')));
  });

  it('a retried submission (same deterministic id) is rejected as an update, not silently duplicated — the idempotency backstop', async () => {
    const db = ownerDbFor();
    await assertSucceeds(setDoc(doc(db, 'businesses', BIZ, 'ownerInvestments', 'oi-017'), ownerInvestmentBody('oi-017')));
    // Retry: same id, identical body — Firestore classifies this as an
    // UPDATE (the document already exists), rejected by this
    // collection's own `allow update: if false`, exactly mirroring
    // businessWorthSnapshots' own identical retry-rejection precedent.
    await assertFails(setDoc(doc(db, 'businesses', BIZ, 'ownerInvestments', 'oi-017'), ownerInvestmentBody('oi-017')));
  });
});

describe('ownerInvestments — Product Architect Decision OI-PA-1: closed-period enforcement, server-side (mirrors expenses/withdrawals exactly)', () => {
  it('Owner cannot create an Owner Investment dated inside a closed monthly period', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'closedPeriods', 'monthly:2026-07'), {
        id: 'monthly:2026-07', periodType: 'monthly', startDate: '2026-07-01', endDate: '2026-07-31',
        closingId: 'closing-A', closedAt: new Date().toISOString(),
      });
    });
    const db = ownerDbFor();
    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'ownerInvestments', 'oi-021'), ownerInvestmentBody('oi-021', { date: '2026-07-20' }))
    );
  });

  it('Owner cannot create an Owner Investment dated inside a closed yearly period (no matching monthly doc)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'closedPeriods', 'yearly:2025'), {
        id: 'yearly:2025', periodType: 'yearly', startDate: '2025-01-01', endDate: '2025-12-31',
        closingId: 'closing-Y', closedAt: new Date().toISOString(),
      });
    });
    const db = ownerDbFor();
    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'ownerInvestments', 'oi-022'), ownerInvestmentBody('oi-022', { date: '2025-03-01' }))
    );
  });

  it('a date OUTSIDE the closed period is unaffected', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'closedPeriods', 'monthly:2026-07'), {
        id: 'monthly:2026-07', periodType: 'monthly', startDate: '2026-07-01', endDate: '2026-07-31',
        closingId: 'closing-A', closedAt: new Date().toISOString(),
      });
    });
    const db = ownerDbFor();
    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'ownerInvestments', 'oi-023'), ownerInvestmentBody('oi-023', { date: '2026-08-01' }))
    );
  });
});

describe('Atomic pairing — OwnerInvestment + CashLedgerEntry (Rule 8 Finding OI-2, FR-63)', () => {
  it('a batch write creating both an OwnerInvestment and its linked CashLedgerEntry succeeds together', async () => {
    const db = ownerDbFor();
    const batch = writeBatch(db);
    batch.set(doc(db, 'businesses', BIZ, 'ownerInvestments', 'oi-018'), ownerInvestmentBody('oi-018'));
    batch.set(doc(db, 'businesses', BIZ, 'cashLedgerEntries', 'cle-owner-investment-oi-018'), cashLedgerEntryBody('cle-owner-investment-oi-018', { sourceReference: { type: 'owner-investment', id: 'oi-018' } }));
    await assertSucceeds(batch.commit());
  });

  it('the linked CashLedgerEntry uses direction=inflow and category=other-governed-movement (FR-63)', async () => {
    const db = ownerDbFor();
    const entry = cashLedgerEntryBody('cle-owner-investment-oi-019', { sourceReference: { type: 'owner-investment', id: 'oi-019' } });
    assert.equal(entry.direction, 'inflow');
    assert.equal(entry.category, 'other-governed-movement');
    await assertSucceeds(setDoc(doc(db, 'businesses', BIZ, 'cashLedgerEntries', 'cle-owner-investment-oi-019'), entry));
  });

  it('a batch where the CashLedgerEntry half is invalid fails atomically — no partial OwnerInvestment/CashLedgerEntry pair is left behind', async () => {
    const db = ownerDbFor();
    const batch = writeBatch(db);
    batch.set(doc(db, 'businesses', BIZ, 'ownerInvestments', 'oi-020'), ownerInvestmentBody('oi-020'));
    // Invalid: negative amount on the ledger entry half.
    batch.set(doc(db, 'businesses', BIZ, 'cashLedgerEntries', 'cle-owner-investment-oi-020'), cashLedgerEntryBody('cle-owner-investment-oi-020', { amount: -100000 }));
    await assertFails(batch.commit());

    // Neither half exists — the batch is genuinely atomic.
    let oiExists = true;
    let cleExists = true;
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      oiExists = (await getDoc(doc(ctx.firestore(), 'businesses', BIZ, 'ownerInvestments', 'oi-020'))).exists();
      cleExists = (await getDoc(doc(ctx.firestore(), 'businesses', BIZ, 'cashLedgerEntries', 'cle-owner-investment-oi-020'))).exists();
    });
    assert.equal(oiExists, false, 'OwnerInvestment must not exist after an atomically-failed batch.');
    assert.equal(cleExists, false, 'CashLedgerEntry must not exist after an atomically-failed batch.');
  });
});
