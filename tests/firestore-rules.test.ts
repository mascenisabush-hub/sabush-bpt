// Firestore Security Rules test suite — Closing Integrity Amendment v1.0.
//
// WHY THIS FILE EXISTS: rule behavior (who can create/edit/delete what,
// and under what conditions) cannot be reliably inferred from application
// code alone — the app is only one caller among many. This suite asserts
// directly against firestore.rules, running against the Firestore
// emulator, not against application code.
//
// HOW TO RUN:
//   npm run test:rules
// This requires a Firestore emulator already running on localhost:8080
// (see firebase.json's `emulators.firestore.port`). The easiest way to
// get both in one command:
//   npm run test:rules:emulator
// which uses `firebase-tools emulators:exec` to start the emulator, run
// this suite against it, then tear the emulator down automatically.
//
// This suite could not be executed in the sandbox that authored it — the
// environment's network egress is allow-listed to a fixed set of domains
// (npm, github, pypi, crates.io, ubuntu archives) and does not include
// Google's emulator-binary infrastructure. It has been typechecked
// (`tsc --noEmit`) but NOT run end-to-end. Treat a clean run of
// `npm run test:rules:emulator` as the actual acceptance gate before
// deploying these rules to production — do not treat this file's
// existence, or its passing a typecheck, as equivalent to that.
//
// SCOPE: originally covered only the Closing Integrity Amendment's
// new/changed rules (expenses, withdrawals, closings, closedPeriods).
// Extended per docs/security/firestore-tenant-isolation-audit-plan.md
// to cover every business-scoped collection in firestore.rules (users,
// businesses, products, batches, purchaseBatches, quebras, stockCounts,
// staff, timelineEvents), a suspended-member access-cutoff check, and a
// collection-group query-leakage check. This is now the audit itself —
// see the plan doc for the acceptance criteria this suite is measured
// against, and for which findings (if any) still need write-up once it
// actually runs.

import { readFileSync } from 'node:fs';
import { before, after, beforeEach, describe, it } from 'node:test';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  deleteField,
  collection,
  collectionGroup,
  query,
  getDocs,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';

const PROJECT_ID = 'sabush-bpt-rules-test';
const BIZ = 'biz1';
const OTHER_BIZ = 'biz2';

const OWNER_UID = 'owner1';
const OTHER_OWNER_UID = 'owner2'; // owns OTHER_BIZ, not BIZ — tenant isolation checks
const MANAGER_WITH_CLOSINGS_UID = 'manager1';
const MANAGER_NO_PERMISSION_UID = 'manager2';
const STAFF_UID = 'staff1';

// [Phase 0 Stage 1 — owner->admin migration] A profile already holding the
// *target* role value, to prove the dual-read tolerance added to
// firestore.rules treats 'admin' as fully equivalent to 'owner' everywhere
// isOwnerOf-style checks exist — see the "admin role dual-read tolerance"
// describe block at the end of this file. Scoped to its own business
// (ADMIN_BIZ) so it can't interact with any existing OWNER_UID/BIZ fixture
// data above.
const ADMIN_ROLE_UID = 'admin1';
const ADMIN_BIZ = 'biz3';

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
  // Defensive: if before() failed to reach the emulator (e.g. "fetch
  // failed" — no emulator running), testEnv was never assigned. Without
  // this guard, that produces a second, more confusing failure here on
  // top of the real one, obscuring the actual problem.
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  // Seed every fixture user's own profile doc — myProfile() in the rules
  // reads users/{uid} directly, not auth custom claims, so every context
  // needs a matching seeded doc to be evaluated correctly.
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', OWNER_UID), { role: 'owner', businessId: BIZ });
    await setDoc(doc(db, 'users', OTHER_OWNER_UID), { role: 'owner', businessId: OTHER_BIZ });
    await setDoc(doc(db, 'users', MANAGER_WITH_CLOSINGS_UID), {
      role: 'staff',
      businessId: BIZ,
      staffTier: 'manager',
      managerPermissions: { closings: true, staffManagement: false },
    });
    await setDoc(doc(db, 'users', MANAGER_NO_PERMISSION_UID), {
      role: 'staff',
      businessId: BIZ,
      staffTier: 'manager',
      managerPermissions: { closings: false, staffManagement: false },
    });
    await setDoc(doc(db, 'users', STAFF_UID), { role: 'staff', businessId: BIZ });
    // [Phase 0 Stage 1] Already-'admin'-valued profile, own business —
    // simulates a backfilled/new-vocabulary account under dual-read rules.
    await setDoc(doc(db, 'users', ADMIN_ROLE_UID), { role: 'admin', businessId: ADMIN_BIZ });
  });
});

function ctxFor(uid: string) {
  return testEnv.authenticatedContext(uid);
}

// ---------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------
describe('expenses', () => {
  it('Owner can create an expense with a date in an open period', async () => {
    const db = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'expenses', 'e1'), {
        id: 'e1', date: '2026-07-15', description: 'Rent', amount: 100, createdAt: new Date().toISOString(),
      })
    );
  });

  it('Staff can create an expense with a date in an open period', async () => {
    const db = ctxFor(STAFF_UID).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'expenses', 'e2'), {
        id: 'e2', date: '2026-07-15', description: 'Utilities', amount: 50, createdAt: new Date().toISOString(),
      })
    );
  });

  it('Owner CANNOT create an expense dated inside a closed monthly period', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'businesses', BIZ, 'closedPeriods', 'monthly:2026-07'), {
        id: 'monthly:2026-07', periodType: 'monthly', startDate: '2026-07-01', endDate: '2026-07-31',
        closingId: 'closing-A', closedAt: new Date().toISOString(),
      });
    });
    const db = ctxFor(OWNER_UID).firestore();
    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'expenses', 'e3'), {
        id: 'e3', date: '2026-07-20', description: 'Late entry', amount: 30, createdAt: new Date().toISOString(),
      })
    );
  });

  it('Owner CANNOT create an expense dated inside a closed yearly period (no matching monthly doc)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'businesses', BIZ, 'closedPeriods', 'yearly:2025'), {
        id: 'yearly:2025', periodType: 'yearly', startDate: '2025-01-01', endDate: '2025-12-31',
        closingId: 'closing-Y', closedAt: new Date().toISOString(),
      });
    });
    const db = ctxFor(OWNER_UID).firestore();
    await assertFails(
      setDoc(doc(db, 'businesses', BIZ, 'expenses', 'e4'), {
        id: 'e4', date: '2025-03-01', description: 'Backdated into closed year', amount: 30, createdAt: new Date().toISOString(),
      })
    );
  });

  it('A date OUTSIDE the closed period is unaffected', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'businesses', BIZ, 'closedPeriods', 'monthly:2026-07'), {
        id: 'monthly:2026-07', periodType: 'monthly', startDate: '2026-07-01', endDate: '2026-07-31',
        closingId: 'closing-A', closedAt: new Date().toISOString(),
      });
    });
    const db = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'businesses', BIZ, 'expenses', 'e5'), {
        id: 'e5', date: '2026-08-01', description: 'Next month, fine', amount: 30, createdAt: new Date().toISOString(),
      })
    );
  });

  it('Cannot edit a locked expense while keeping it locked (Owner or Staff)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'businesses', BIZ, 'expenses', 'e6'), {
        id: 'e6', date: '2026-07-10', description: 'Rent', amount: 100, createdAt: new Date().toISOString(),
        closingId: 'closing-A', lockedAt: new Date().toISOString(),
      });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(updateDoc(doc(ownerDb, 'businesses', BIZ, 'expenses', 'e6'), { amount: 999 }));
    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertFails(updateDoc(doc(staffDb, 'businesses', BIZ, 'expenses', 'e6'), { amount: 999 }));
  });

  it('Owner CAN clear the lock (the reopen unlock transition); Staff cannot', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'businesses', BIZ, 'expenses', 'e7'), {
        id: 'e7', date: '2026-07-10', description: 'Rent', amount: 100, createdAt: new Date().toISOString(),
        closingId: 'closing-A', lockedAt: new Date().toISOString(),
      });
    });
    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertFails(
      updateDoc(doc(staffDb, 'businesses', BIZ, 'expenses', 'e7'), { closingId: deleteField(), lockedAt: deleteField() })
    );
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(
      updateDoc(doc(ownerDb, 'businesses', BIZ, 'expenses', 'e7'), { closingId: deleteField(), lockedAt: deleteField() })
    );
  });

  it('Cannot delete a locked expense (Owner included); CAN delete an unlocked one', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'businesses', BIZ, 'expenses', 'locked1'), {
        id: 'locked1', date: '2026-07-10', description: 'Locked', amount: 10, createdAt: new Date().toISOString(),
        closingId: 'closing-A', lockedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'businesses', BIZ, 'expenses', 'unlocked1'), {
        id: 'unlocked1', date: '2026-07-11', description: 'Unlocked', amount: 10, createdAt: new Date().toISOString(),
      });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(deleteDoc(doc(ownerDb, 'businesses', BIZ, 'expenses', 'locked1')));
    await assertSucceeds(deleteDoc(doc(ownerDb, 'businesses', BIZ, 'expenses', 'unlocked1')));
  });

  it('Staff can never delete an expense, locked or not', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'businesses', BIZ, 'expenses', 'unlocked2'), {
        id: 'unlocked2', date: '2026-07-11', description: 'Unlocked', amount: 10, createdAt: new Date().toISOString(),
      });
    });
    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertFails(deleteDoc(doc(staffDb, 'businesses', BIZ, 'expenses', 'unlocked2')));
  });

  it('A user from another business cannot read or write this business\'s expenses', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'businesses', BIZ, 'expenses', 'e8'), {
        id: 'e8', date: '2026-07-11', description: 'Private', amount: 10, createdAt: new Date().toISOString(),
      });
    });
    const otherDb = ctxFor(OTHER_OWNER_UID).firestore();
    await assertFails(getDoc(doc(otherDb, 'businesses', BIZ, 'expenses', 'e8')));
    await assertFails(
      setDoc(doc(otherDb, 'businesses', BIZ, 'expenses', 'e9'), {
        id: 'e9', date: '2026-07-11', description: 'Intrusion attempt', amount: 10, createdAt: new Date().toISOString(),
      })
    );
  });
});

// ---------------------------------------------------------------------
// Withdrawals — same shape as Expenses, but Owner-only across the board
// ---------------------------------------------------------------------
describe('withdrawals', () => {
  it('Owner can create in an open period; Staff cannot read or create at all', async () => {
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'withdrawals', 'w1'), {
        id: 'w1', date: '2026-07-15', amount: 100, createdAt: new Date().toISOString(),
      })
    );
    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertFails(
      setDoc(doc(staffDb, 'businesses', BIZ, 'withdrawals', 'w2'), {
        id: 'w2', date: '2026-07-15', amount: 100, createdAt: new Date().toISOString(),
      })
    );
    await assertFails(getDoc(doc(staffDb, 'businesses', BIZ, 'withdrawals', 'w1')));
  });

  it('Owner cannot create a withdrawal dated inside a closed period', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'businesses', BIZ, 'closedPeriods', 'monthly:2026-07'), {
        id: 'monthly:2026-07', periodType: 'monthly', startDate: '2026-07-01', endDate: '2026-07-31',
        closingId: 'closing-A', closedAt: new Date().toISOString(),
      });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'withdrawals', 'w3'), {
        id: 'w3', date: '2026-07-20', amount: 100, createdAt: new Date().toISOString(),
      })
    );
  });

  it('Cannot delete a locked withdrawal; can delete an unlocked one; only Owner ever', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'businesses', BIZ, 'withdrawals', 'wlocked'), {
        id: 'wlocked', date: '2026-07-10', amount: 10, createdAt: new Date().toISOString(),
        closingId: 'closing-A', lockedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'businesses', BIZ, 'withdrawals', 'wunlocked'), {
        id: 'wunlocked', date: '2026-07-11', amount: 10, createdAt: new Date().toISOString(),
      });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(deleteDoc(doc(ownerDb, 'businesses', BIZ, 'withdrawals', 'wlocked')));
    await assertSucceeds(deleteDoc(doc(ownerDb, 'businesses', BIZ, 'withdrawals', 'wunlocked')));
  });
});

// ---------------------------------------------------------------------
// Closings — create honors a Manager's 'closings' grant; reopening
// (update) and delete do not, per the amendment's Decisions Record.
// ---------------------------------------------------------------------
describe('closings', () => {
  const closingDoc = {
    id: 'closing-A', periodType: 'monthly', periodLabel: 'Julho 2026',
    startDate: '2026-07-01', endDate: '2026-07-31',
    totalEmbeddedProfit: 0, totalExpenses: 0, totalWithdrawals: 0,
    inventoryCostAtClose: 0, inventoryMarketValueAtClose: 0, businessWorthAtClose: 0,
    closedAt: new Date().toISOString(), status: 'active',
  };

  it('Owner can create a Closing', async () => {
    const db = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(setDoc(doc(db, 'businesses', BIZ, 'closings', 'closing-A'), closingDoc));
  });

  it('Manager WITH the closings permission can create a Closing', async () => {
    const db = ctxFor(MANAGER_WITH_CLOSINGS_UID).firestore();
    await assertSucceeds(setDoc(doc(db, 'businesses', BIZ, 'closings', 'closing-A'), closingDoc));
  });

  it('Manager WITHOUT the closings permission cannot create a Closing', async () => {
    const db = ctxFor(MANAGER_NO_PERMISSION_UID).firestore();
    await assertFails(setDoc(doc(db, 'businesses', BIZ, 'closings', 'closing-A'), closingDoc));
  });

  it('Plain Staff cannot create a Closing', async () => {
    const db = ctxFor(STAFF_UID).firestore();
    await assertFails(setDoc(doc(db, 'businesses', BIZ, 'closings', 'closing-A'), closingDoc));
  });

  it('Manager with the closings permission CANNOT reopen (update) a Closing — Owner-only', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'closings', 'closing-A'), closingDoc);
    });
    const managerDb = ctxFor(MANAGER_WITH_CLOSINGS_UID).firestore();
    await assertFails(
      updateDoc(doc(managerDb, 'businesses', BIZ, 'closings', 'closing-A'), {
        status: 'reopened', reopenedAt: new Date().toISOString(), reopenedByUid: MANAGER_WITH_CLOSINGS_UID,
      })
    );
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(
      updateDoc(doc(ownerDb, 'businesses', BIZ, 'closings', 'closing-A'), {
        status: 'reopened', reopenedAt: new Date().toISOString(), reopenedByUid: OWNER_UID,
      })
    );
  });

  it('Nobody can delete a Closing — not even the Owner', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'closings', 'closing-A'), closingDoc);
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(deleteDoc(doc(ownerDb, 'businesses', BIZ, 'closings', 'closing-A')));
  });
});

// ---------------------------------------------------------------------
// ClosedPeriods — the lock-index collection. Critically: writing to an
// id that already has a document is an update, not a create, in rules
// terms — so this collection's `allow update: if false` is what actually
// prevents re-locking (or double-locking) an already-closed period, even
// if application code were bypassed.
// ---------------------------------------------------------------------
describe('closedPeriods', () => {
  const periodDoc = {
    id: 'monthly:2026-07', periodType: 'monthly', startDate: '2026-07-01', endDate: '2026-07-31',
    closingId: 'closing-A', closedAt: new Date().toISOString(),
  };

  it('Owner can create a new ClosedPeriod lock doc', async () => {
    const db = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(setDoc(doc(db, 'businesses', BIZ, 'closedPeriods', 'monthly:2026-07'), periodDoc));
  });

  it('Cannot overwrite (re-lock) an EXISTING ClosedPeriod doc — this is the double-close guard', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'closedPeriods', 'monthly:2026-07'), periodDoc);
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'closedPeriods', 'monthly:2026-07'), {
        ...periodDoc, closingId: 'closing-B-attempting-to-overwrite',
      })
    );
  });

  it('Only Owner can delete a ClosedPeriod (the reopen action) — Manager with closings permission cannot', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'closedPeriods', 'monthly:2026-07'), periodDoc);
    });
    const managerDb = ctxFor(MANAGER_WITH_CLOSINGS_UID).firestore();
    await assertFails(deleteDoc(doc(managerDb, 'businesses', BIZ, 'closedPeriods', 'monthly:2026-07')));
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(deleteDoc(doc(ownerDb, 'businesses', BIZ, 'closedPeriods', 'monthly:2026-07')));
  });
});

// ---------------------------------------------------------------------
// Users — profile documents; these gate membership for everything else,
// so a leak here undermines every isMemberOf()/isOwnerOf() check.
// ---------------------------------------------------------------------
describe('users', () => {
  it('A user can always read their own profile', async () => {
    const db = ctxFor(STAFF_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'users', STAFF_UID)));
  });

  it('An Owner can read a staff profile belonging to their own business', async () => {
    const db = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'users', STAFF_UID)));
  });

  it('An Owner from another business cannot read a staff profile belonging to a different business', async () => {
    const db = ctxFor(OTHER_OWNER_UID).firestore();
    await assertFails(getDoc(doc(db, 'users', STAFF_UID)));
  });

  it('A plain Staff member cannot read another user\'s profile, even within the same business', async () => {
    const db = ctxFor(STAFF_UID).firestore();
    await assertFails(getDoc(doc(db, 'users', MANAGER_WITH_CLOSINGS_UID)));
  });
});

// ---------------------------------------------------------------------
// Businesses — the tenant root document.
// ---------------------------------------------------------------------
describe('businesses', () => {
  it('A member can read their own business document; a non-member cannot', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ), { id: BIZ, ownerUid: OWNER_UID, name: 'Biz One' });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(getDoc(doc(ownerDb, 'businesses', BIZ)));
    const otherDb = ctxFor(OTHER_OWNER_UID).firestore();
    await assertFails(getDoc(doc(otherDb, 'businesses', BIZ)));
  });

  it('A business can only be created by a user whose uid matches its own ownerUid', async () => {
    const db = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(setDoc(doc(db, 'businesses', 'biz-new'), { id: 'biz-new', ownerUid: OWNER_UID, name: 'New Biz' }));
    await assertFails(setDoc(doc(db, 'businesses', 'biz-forged'), { id: 'biz-forged', ownerUid: OTHER_OWNER_UID, name: 'Forged' }));
  });

  it('Only the Owner can update business settings; nobody can ever delete a business', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ), { id: BIZ, ownerUid: OWNER_UID, name: 'Biz One', currency: 'BRL' });
    });
    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertFails(updateDoc(doc(staffDb, 'businesses', BIZ), { currency: 'USD' }));
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(updateDoc(doc(ownerDb, 'businesses', BIZ), { currency: 'USD' }));
    await assertFails(deleteDoc(doc(ownerDb, 'businesses', BIZ)));
  });
});

// ---------------------------------------------------------------------
// Products — any team member reads/creates; only Owner updates/deletes.
// ---------------------------------------------------------------------
describe('products', () => {
  it('Any team member can read and create; only Owner can update or delete', async () => {
    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertSucceeds(setDoc(doc(staffDb, 'businesses', BIZ, 'products', 'p1'), { id: 'p1', name: 'Widget' }));
    await assertSucceeds(getDoc(doc(staffDb, 'businesses', BIZ, 'products', 'p1')));
    await assertFails(updateDoc(doc(staffDb, 'businesses', BIZ, 'products', 'p1'), { name: 'Renamed' }));
    await assertFails(deleteDoc(doc(staffDb, 'businesses', BIZ, 'products', 'p1')));
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(updateDoc(doc(ownerDb, 'businesses', BIZ, 'products', 'p1'), { name: 'Renamed' }));
  });

  it('A user from another business cannot read, create, update, or delete this business\'s products', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'products', 'p2'), { id: 'p2', name: 'Private Widget' });
    });
    const otherDb = ctxFor(OTHER_OWNER_UID).firestore();
    await assertFails(getDoc(doc(otherDb, 'businesses', BIZ, 'products', 'p2')));
    await assertFails(setDoc(doc(otherDb, 'businesses', BIZ, 'products', 'p3'), { id: 'p3', name: 'Intrusion' }));
    await assertFails(updateDoc(doc(otherDb, 'businesses', BIZ, 'products', 'p2'), { name: 'Hijacked' }));
    await assertFails(deleteDoc(doc(otherDb, 'businesses', BIZ, 'products', 'p2')));
  });

  // [Data integrity audit — Owner-requested] New field validation on
  // create — only ever `name`, matching exactly what every product-
  // creation call site (addStockBatch, addMultipleStockBatches,
  // recordStockCount, all in AppContext.tsx) sends. Deliberately does
  // NOT test update — the rule change is create-only by design.
  describe('field validation on create (Data integrity audit)', () => {
    const staffDbFor = () => ctxFor(STAFF_UID).firestore();

    it('rejects a missing name', async () => {
      await assertFails(setDoc(doc(staffDbFor(), 'businesses', BIZ, 'products', 'no-name'), { id: 'no-name' }));
    });

    it('rejects an empty-string name', async () => {
      await assertFails(setDoc(doc(staffDbFor(), 'businesses', BIZ, 'products', 'empty-name'), { id: 'empty-name', name: '' }));
    });

    it('rejects a non-string name', async () => {
      await assertFails(setDoc(doc(staffDbFor(), 'businesses', BIZ, 'products', 'num-name'), { id: 'num-name', name: 123 }));
    });

    it('accepts a real product with just name — the actual shape every real create call site sends (never costPrice/sellingPrice/active at creation)', async () => {
      await assertSucceeds(setDoc(doc(staffDbFor(), 'businesses', BIZ, 'products', 'real1'), { id: 'real1', name: 'Widget', createdAt: '2026-06-01T00:00:00.000Z' }));
    });

    it('an update is completely unaffected by the new create-only validation — Owner can still clear name-adjacent fields or set active/costPrice freely', async () => {
      await assertSucceeds(setDoc(doc(staffDbFor(), 'businesses', BIZ, 'products', 'upd1'), { id: 'upd1', name: 'Widget' }));
      const ownerDb = ctxFor(OWNER_UID).firestore();
      await assertSucceeds(updateDoc(doc(ownerDb, 'businesses', BIZ, 'products', 'upd1'), { active: false, costPrice: 5 }));
    });
  });
});

// ---------------------------------------------------------------------
// Batches — any team member reads/creates/updates; only Owner deletes.
// ---------------------------------------------------------------------
describe('batches', () => {
  // A complete, realistic batch document — exactly the shape
  // addStockBatch/addMultipleStockBatches (AppContext.tsx) actually
  // send. Used as the baseline for every test below; each invalid-data
  // test starts from a shallow copy of this with exactly one field
  // broken, so a failure can only be attributed to that one field.
  const validBatch = {
    id: 'b1',
    productId: 'prod1',
    dateEntered: '2026-01-01',
    unit: 'un',
    quantity: 10,
    costPrice: 5,
    sellingPrice: 8,
    status: 'open',
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('Any team member can read, create, and update; only Owner can delete', async () => {
    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertSucceeds(setDoc(doc(staffDb, 'businesses', BIZ, 'batches', 'b1'), validBatch));
    await assertSucceeds(updateDoc(doc(staffDb, 'businesses', BIZ, 'batches', 'b1'), { quantity: 5 }));
    await assertFails(deleteDoc(doc(staffDb, 'businesses', BIZ, 'batches', 'b1')));
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(deleteDoc(doc(ownerDb, 'businesses', BIZ, 'batches', 'b1')));
  });

  it('A user from another business cannot read, create, update, or delete this business\'s batches', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'batches', 'b2'), { ...validBatch, id: 'b2' });
    });
    const otherDb = ctxFor(OTHER_OWNER_UID).firestore();
    await assertFails(getDoc(doc(otherDb, 'businesses', BIZ, 'batches', 'b2')));
    await assertFails(setDoc(doc(otherDb, 'businesses', BIZ, 'batches', 'b3'), { ...validBatch, id: 'b3' }));
    await assertFails(updateDoc(doc(otherDb, 'businesses', BIZ, 'batches', 'b2'), { quantity: 999 }));
    await assertFails(deleteDoc(doc(otherDb, 'businesses', BIZ, 'batches', 'b2')));
  });

  // [Data integrity audit — Owner-requested] New field validation on
  // create, matching exactly what addStockBatch/addMultipleStockBatches
  // always send. Each case below changes exactly one field away from
  // validBatch so a failure is unambiguous. Deliberately does NOT test
  // update — the rule change is create-only by design, and the
  // existing 'Any team member can... update' test above already
  // proves a plain quantity-only update (the real close-out/edit
  // shape) still succeeds unchanged.
  describe('field validation on create (Data integrity audit)', () => {
    const staffDbFor = () => ctxFor(STAFF_UID).firestore();

    it('accepts a complete, valid batch (baseline — proves the checks below fail for the RIGHT reason, not by accident)', async () => {
      await assertSucceeds(setDoc(doc(staffDbFor(), 'businesses', BIZ, 'batches', 'valid1'), { ...validBatch, id: 'valid1' }));
    });

    it('rejects a negative quantity', async () => {
      await assertFails(setDoc(doc(staffDbFor(), 'businesses', BIZ, 'batches', 'neg-qty'), { ...validBatch, id: 'neg-qty', quantity: -5 }));
    });

    it('rejects a zero quantity (a batch represents stock actually received — zero is meaningless, not a valid "no stock" state the way it is for a Contagem count)', async () => {
      await assertFails(setDoc(doc(staffDbFor(), 'businesses', BIZ, 'batches', 'zero-qty'), { ...validBatch, id: 'zero-qty', quantity: 0 }));
    });

    it('rejects a non-numeric quantity', async () => {
      await assertFails(setDoc(doc(staffDbFor(), 'businesses', BIZ, 'batches', 'str-qty'), { ...validBatch, id: 'str-qty', quantity: '10' }));
    });

    it('rejects a negative costPrice', async () => {
      await assertFails(setDoc(doc(staffDbFor(), 'businesses', BIZ, 'batches', 'neg-cost'), { ...validBatch, id: 'neg-cost', costPrice: -1 }));
    });

    it('accepts a zero costPrice (a genuinely free/promotional item is a real, valid case — see AddStockView\'s own "ou 0, se for mesmo gratuito" messaging)', async () => {
      await assertSucceeds(setDoc(doc(staffDbFor(), 'businesses', BIZ, 'batches', 'zero-cost'), { ...validBatch, id: 'zero-cost', costPrice: 0 }));
    });

    it('rejects a negative sellingPrice', async () => {
      await assertFails(setDoc(doc(staffDbFor(), 'businesses', BIZ, 'batches', 'neg-sell'), { ...validBatch, id: 'neg-sell', sellingPrice: -1 }));
    });

    it('rejects a missing productId', async () => {
      const { productId, ...rest } = validBatch;
      await assertFails(setDoc(doc(staffDbFor(), 'businesses', BIZ, 'batches', 'no-product'), { ...rest, id: 'no-product' }));
    });

    it('rejects an empty-string productId', async () => {
      await assertFails(setDoc(doc(staffDbFor(), 'businesses', BIZ, 'batches', 'empty-product'), { ...validBatch, id: 'empty-product', productId: '' }));
    });

    it('rejects a status other than "open" at create (a batch is always created open — it only ever becomes closed via a later update, never at creation)', async () => {
      await assertFails(setDoc(doc(staffDbFor(), 'businesses', BIZ, 'batches', 'bad-status'), { ...validBatch, id: 'bad-status', status: 'closed' }));
    });

    it('rejects a missing dateEntered', async () => {
      const { dateEntered, ...rest } = validBatch;
      await assertFails(setDoc(doc(staffDbFor(), 'businesses', BIZ, 'batches', 'no-date'), { ...rest, id: 'no-date' }));
    });

    it('an update that changes only quantity (the real close-out/edit shape — see the existing "Any team member can... update" test above) is completely unaffected by the new create-only validation, even to a value that would fail as a fresh create', async () => {
      await assertSucceeds(setDoc(doc(staffDbFor(), 'businesses', BIZ, 'batches', 'update-ok'), { ...validBatch, id: 'update-ok' }));
      // Deliberately mirrors real usage: addStockBatch/
      // addMultipleStockBatches only ever update `status` when closing
      // out a batch — never quantity — but this proves the update path
      // genuinely enforces nothing new, not merely that it happens to
      // still pass for the one field the app actually touches.
      await assertSucceeds(updateDoc(doc(staffDbFor(), 'businesses', BIZ, 'batches', 'update-ok'), { quantity: -999 }));
    });
  });
});

// ---------------------------------------------------------------------
// Purchase Batches — same access pattern as Batches.
// ---------------------------------------------------------------------
describe('purchaseBatches', () => {
  it('Any team member can read, create, and update (archive/unarchive); only Owner can delete', async () => {
    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertSucceeds(setDoc(doc(staffDb, 'businesses', BIZ, 'purchaseBatches', 'pb1'), { id: 'pb1', archived: false }));
    await assertSucceeds(updateDoc(doc(staffDb, 'businesses', BIZ, 'purchaseBatches', 'pb1'), { archived: true }));
    await assertFails(deleteDoc(doc(staffDb, 'businesses', BIZ, 'purchaseBatches', 'pb1')));
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(deleteDoc(doc(ownerDb, 'businesses', BIZ, 'purchaseBatches', 'pb1')));
  });

  it('A user from another business cannot read, create, update, or delete this business\'s purchase batches', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'purchaseBatches', 'pb2'), { id: 'pb2', archived: false });
    });
    const otherDb = ctxFor(OTHER_OWNER_UID).firestore();
    await assertFails(getDoc(doc(otherDb, 'businesses', BIZ, 'purchaseBatches', 'pb2')));
    await assertFails(setDoc(doc(otherDb, 'businesses', BIZ, 'purchaseBatches', 'pb3'), { id: 'pb3', archived: false }));
    await assertFails(updateDoc(doc(otherDb, 'businesses', BIZ, 'purchaseBatches', 'pb2'), { archived: true }));
    await assertFails(deleteDoc(doc(otherDb, 'businesses', BIZ, 'purchaseBatches', 'pb2')));
  });
});

// ---------------------------------------------------------------------
// Quebras (Breakages) — same access pattern as Batches/Products.
// ---------------------------------------------------------------------
describe('quebras', () => {
  it('Any team member can read, create, and update; only Owner can delete', async () => {
    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertSucceeds(setDoc(doc(staffDb, 'businesses', BIZ, 'quebras', 'q1'), { id: 'q1', quantityLost: 2 }));
    await assertSucceeds(updateDoc(doc(staffDb, 'businesses', BIZ, 'quebras', 'q1'), { quantityLost: 3 }));
    await assertFails(deleteDoc(doc(staffDb, 'businesses', BIZ, 'quebras', 'q1')));
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(deleteDoc(doc(ownerDb, 'businesses', BIZ, 'quebras', 'q1')));
  });

  it('A user from another business cannot read, create, update, or delete this business\'s quebras', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'quebras', 'q2'), { id: 'q2', quantityLost: 5 });
    });
    const otherDb = ctxFor(OTHER_OWNER_UID).firestore();
    await assertFails(getDoc(doc(otherDb, 'businesses', BIZ, 'quebras', 'q2')));
    await assertFails(setDoc(doc(otherDb, 'businesses', BIZ, 'quebras', 'q3'), { id: 'q3', quantityLost: 1 }));
    await assertFails(updateDoc(doc(otherDb, 'businesses', BIZ, 'quebras', 'q2'), { quantityLost: 99 }));
    await assertFails(deleteDoc(doc(otherDb, 'businesses', BIZ, 'quebras', 'q2')));
  });
});

// ---------------------------------------------------------------------
// Stock Counts — establish/verify capital, so only the Owner may
// record/edit/remove; any team member may read.
// ---------------------------------------------------------------------
describe('stockCounts', () => {
  it('Any team member can read; only Owner can create, update, or delete', async () => {
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'sc1'), { id: 'sc1', countedAt: new Date().toISOString() }));
    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertSucceeds(getDoc(doc(staffDb, 'businesses', BIZ, 'stockCounts', 'sc1')));
    await assertFails(setDoc(doc(staffDb, 'businesses', BIZ, 'stockCounts', 'sc2'), { id: 'sc2', countedAt: new Date().toISOString() }));
    await assertFails(updateDoc(doc(staffDb, 'businesses', BIZ, 'stockCounts', 'sc1'), { countedAt: new Date().toISOString() }));
    await assertFails(deleteDoc(doc(staffDb, 'businesses', BIZ, 'stockCounts', 'sc1')));
  });

  it('A user from another business cannot read, create, update, or delete this business\'s stock counts', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'stockCounts', 'sc3'), { id: 'sc3', countedAt: new Date().toISOString() });
    });
    const otherDb = ctxFor(OTHER_OWNER_UID).firestore();
    await assertFails(getDoc(doc(otherDb, 'businesses', BIZ, 'stockCounts', 'sc3')));
    await assertFails(setDoc(doc(otherDb, 'businesses', BIZ, 'stockCounts', 'sc4'), { id: 'sc4', countedAt: new Date().toISOString() }));
    await assertFails(updateDoc(doc(otherDb, 'businesses', BIZ, 'stockCounts', 'sc3'), { countedAt: new Date().toISOString() }));
    await assertFails(deleteDoc(doc(otherDb, 'businesses', BIZ, 'stockCounts', 'sc3')));
  });

  // [Amendment v1.0 — 10-expected-stock-value-amendment.md, Part 3]
  it('Owner can update/delete a non-initial count, but never an initial count — no exceptions', async () => {
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'sc-periodic'), { id: 'sc-periodic', type: 'monthly', countedAt: new Date().toISOString() }));
    await assertSucceeds(updateDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'sc-periodic'), { countedAt: new Date().toISOString() }));
    // [Decision 57 — Intentional Removal of Finalized Periodic Contagem
    // History, Option B; Implementation Authorization (decision-57-
    // clear-all-data-finalized-history-implementation-authorization.md)
    // §3 item 1] `delete` is now unconditionally `false` for every
    // stockCounts type — this assertion previously read
    // assertSucceeds, matching this test's own pre-Decision-57 title
    // ("Owner can update/delete a non-initial count"); the `delete`
    // half of that title is now factually wrong, updated below to the
    // now-correct assertFails. NOTE, left deliberately unfixed here:
    // the `updateDoc` assertSucceeds two lines above already
    // contradicts `allow update: if false;` (unconditional since
    // Decision 56, commit d3b8d9b) and was already stale before this
    // change — that is a separate, pre-existing test-maintenance gap
    // unrelated to Decision 57, not fixed by this edit; see Rule 8
    // §IV.O-n §H and the Decision 57 Implementation Authorization §4.
    // This whole file requires a real Firestore emulator to execute at
    // all and could not be run in this environment to confirm the
    // edit below passes.
    await assertFails(deleteDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'sc-periodic')));

    // [Capital Inicial Retirement — Implementation Authorization
    // Increment 2 — RECLASSIFIED: UPDATE. This test's own subject is
    // update/delete immutability of an 'initial' document, not
    // create-path availability. Its setup used to reach that state via
    // a real (legacy-shape) create, which Increment 2 now denies at
    // the rules layer by design — that denial is covered directly by
    // the dedicated Increment 2 tests below. Reseeded here via
    // withSecurityRulesDisabled, the same bypass the Void & Redo suite
    // already uses, so the update/delete assertions this test actually
    // exists to make remain exercised unchanged.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'stockCounts', 'initial'), { id: 'initial', type: 'initial', countedAt: new Date().toISOString() });
    });
    await assertFails(updateDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'initial'), { countedAt: new Date().toISOString() }));
    await assertFails(deleteDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'initial')));
  });

  // [Capital Inicial Retirement — Implementation Authorization
  // Increment 2 — RECLASSIFIED: RETIRE. This test's entire premise was
  // a successful first create at the legacy-shape 'initial' path,
  // followed by a denied same-path retry, proving the singleton
  // invariant held even under a race. Increment 2 retires that create
  // path outright — the first write now fails identically to the
  // second, so there is no longer a create-then-retry race for this
  // shape to exercise; the scenario this test names no longer exists.
  // The underlying concern (no client can ever create two 'initial'
  // documents at the same slot id) remains covered independently by
  // Firestore's own create-if-absent semantics on every surviving
  // creation path (legacy: removed by design; redo: exercised by the
  // Void & Redo suite below) and is not weakened by this retirement.

  // [Capital Inicial Retirement — Implementation Authorization
  // Increment 2, AC-1/AC-2] The two new required denial tests. Both
  // exercise the real rules-engine `allow create` evaluation for
  // 'stockCounts' (no withSecurityRulesDisabled bypass) — proving the
  // retirement at the layer the Authorization requires, not by source
  // inspection alone.
  it('AC-1: a NEW original Capital Inicial confirmation, legacy shape (no chainPosition field), is DENIED', async () => {
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'initial'), {
        id: 'initial', type: 'initial', items: [], totalValue: 0, countedAt: new Date().toISOString(),
      })
    );
  });

  it('AC-2: a NEW original Capital Inicial confirmation, full shape (chainPosition 1, server confirmedAt), is DENIED', async () => {
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'initial'), {
        id: 'initial', type: 'initial', chainPosition: 1, confirmedAt: serverTimestamp(),
        items: [], totalValue: 0, createdAt: new Date().toISOString(),
      })
    );
  });
});

// [Void & Redo — Initial Stock Accidental Confirmation Recovery.
// Governed by BDR-0015 (Approved), POL-0008 (Approved), the accepted
// Specification, and the Rule 8 Assessment (READY). This suite is the
// dedicated rules-emulator coverage required by the signed
// Implementation Authorization §6/§8 and requested explicitly in the
// security-first review for this implementation step — it asserts
// directly against firestore.rules' new /voidRecords rule and the
// tightened /stockCounts create rule, not against application code.
describe('Void & Redo — voidRecords create + chain-slot stockCounts create', () => {
  // A confirmedAt 10 minutes old is safely inside the 12-hour window
  // [Recovery Window Amendment, amending the original 30-minute value]
  // for every "should succeed" fixture below.
  function freshConfirmedAt() {
    return Timestamp.fromMillis(Date.now() - 10 * 60 * 1000);
  }
  // 12 hours + 1 minute old — just past the 12-hour boundary.
  function expiredConfirmedAt() {
    return Timestamp.fromMillis(Date.now() - (12 * 60 * 60 * 1000 + 60 * 1000));
  }

  async function seedConfirmation(
    businessId: string,
    stockCountId: string,
    fields: Record<string, unknown>
  ) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', businessId, 'stockCounts', stockCountId), {
        id: stockCountId,
        type: 'initial',
        items: [],
        totalValue: 0,
        createdAt: new Date().toISOString(),
        ...fields,
      });
    });
  }

  async function seedVoidRecord(businessId: string, stockCountId: string) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', businessId, 'voidRecords', stockCountId), {
        id: stockCountId,
        voidedConfirmationId: stockCountId,
        voidedAt: Timestamp.now(),
      });
    });
  }

  it('Owner + valid window + eligible confirmation → void succeeds, then a matching redo succeeds', async () => {
    await seedConfirmation(BIZ, 'initial', { chainPosition: 1, confirmedAt: freshConfirmedAt() });
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertSucceeds(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'voidRecords', 'initial'), {
        id: 'initial',
        voidedConfirmationId: 'initial',
        voidedAt: serverTimestamp(),
      })
    );

    await assertSucceeds(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'initial-2'), {
        id: 'initial-2',
        type: 'initial',
        chainPosition: 2,
        redoesConfirmationId: 'initial',
        confirmedAt: serverTimestamp(),
        items: [],
        totalValue: 0,
        createdAt: new Date().toISOString(),
      })
    );
  });

  // [Recovery Window Amendment] The real operational path this
  // amendment exists to fix: an Owner who accidentally confirms
  // Initial Stock, then discovers the mistake several hours later —
  // not within the original 30-minute window, but still well inside
  // the new 12-hour one.
  it('Owner discovering the mistake 8 hours after confirming (well within the 12-hour window, well past the old 30-minute one) can still void and redo', async () => {
    const eightHoursAgo = Timestamp.fromMillis(Date.now() - 8 * 60 * 60 * 1000);
    await seedConfirmation(BIZ, 'initial', { chainPosition: 1, confirmedAt: eightHoursAgo });
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertSucceeds(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'voidRecords', 'initial'), {
        id: 'initial',
        voidedConfirmationId: 'initial',
        voidedAt: serverTimestamp(),
      })
    );

    await assertSucceeds(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'initial-2'), {
        id: 'initial-2',
        type: 'initial',
        chainPosition: 2,
        redoesConfirmationId: 'initial',
        confirmedAt: serverTimestamp(),
        items: [],
        totalValue: 0,
        createdAt: new Date().toISOString(),
      })
    );
  });

  it('Manager and Staff cannot create a VoidRecord, even with a valid window', async () => {
    await seedConfirmation(BIZ, 'initial', { chainPosition: 1, confirmedAt: freshConfirmedAt() });
    const managerDb = ctxFor(MANAGER_WITH_CLOSINGS_UID).firestore();
    const staffDb = ctxFor(STAFF_UID).firestore();

    await assertFails(
      setDoc(doc(managerDb, 'businesses', BIZ, 'voidRecords', 'initial'), {
        id: 'initial', voidedConfirmationId: 'initial', voidedAt: serverTimestamp(),
      })
    );
    await assertFails(
      setDoc(doc(staffDb, 'businesses', BIZ, 'voidRecords', 'initial'), {
        id: 'initial', voidedConfirmationId: 'initial', voidedAt: serverTimestamp(),
      })
    );
  });

  it('An expired window (> 12 hours) denies the void', async () => {
    await seedConfirmation(BIZ, 'initial', { chainPosition: 1, confirmedAt: expiredConfirmedAt() });
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'voidRecords', 'initial'), {
        id: 'initial', voidedConfirmationId: 'initial', voidedAt: serverTimestamp(),
      })
    );
  });

  it('A confirmation with no confirmedAt (legacy, pre-feature) is never eligible — no timestamp is inferred', async () => {
    // Deliberately no confirmedAt/chainPosition field at all — exactly
    // the shape of every Initial Stock confirmation written before
    // this feature existed.
    await seedConfirmation(BIZ, 'initial', {});
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'voidRecords', 'initial'), {
        id: 'initial', voidedConfirmationId: 'initial', voidedAt: serverTimestamp(),
      })
    );
  });

  it('Confirmation #4 (chainPosition 4) can never be voided, even with a fully fresh window', async () => {
    await seedConfirmation(BIZ, 'initial-4', {
      chainPosition: 4,
      redoesConfirmationId: 'initial-3',
      confirmedAt: freshConfirmedAt(),
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'voidRecords', 'initial-4'), {
        id: 'initial-4', voidedConfirmationId: 'initial-4', voidedAt: serverTimestamp(),
      })
    );
  });

  it('A user from another business cannot void this business\'s confirmation', async () => {
    await seedConfirmation(BIZ, 'initial', { chainPosition: 1, confirmedAt: freshConfirmedAt() });
    const otherDb = ctxFor(OTHER_OWNER_UID).firestore();

    await assertFails(
      setDoc(doc(otherDb, 'businesses', BIZ, 'voidRecords', 'initial'), {
        id: 'initial', voidedConfirmationId: 'initial', voidedAt: serverTimestamp(),
      })
    );
    // Also cannot even void their OWN business's confirmation by
    // attempting to write it under the wrong business path with a
    // mismatched target — structurally unreachable (no such doc there).
    await assertFails(
      setDoc(doc(otherDb, 'businesses', OTHER_BIZ, 'voidRecords', 'initial'), {
        id: 'initial', voidedConfirmationId: 'initial', voidedAt: serverTimestamp(),
      })
    );
  });

  it('A VoidRecord whose voidedConfirmationId does not match its own document id is denied (lineage/id mismatch)', async () => {
    await seedConfirmation(BIZ, 'initial', { chainPosition: 1, confirmedAt: freshConfirmedAt() });
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'voidRecords', 'initial'), {
        id: 'initial',
        voidedConfirmationId: 'some-other-id', // mismatched — must equal the doc id itself
        voidedAt: serverTimestamp(),
      })
    );
  });

  it('A redo confirmation with a fabricated redoesConfirmationId (no matching VoidRecord) is denied', async () => {
    // No VoidRecord seeded at all for 'initial' — a client attempting
    // to skip the void step and jump straight to a "redo" must fail.
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'initial-2'), {
        id: 'initial-2',
        type: 'initial',
        chainPosition: 2,
        redoesConfirmationId: 'initial',
        confirmedAt: serverTimestamp(),
        items: [],
        totalValue: 0,
        createdAt: new Date().toISOString(),
      })
    );
  });

  it('A redo confirmation whose redoesConfirmationId points to the WRONG predecessor slot is denied, even with a real VoidRecord elsewhere', async () => {
    // A VoidRecord genuinely exists for 'initial-2', but this attempt
    // claims chainPosition 3 while pointing redoesConfirmationId at
    // 'initial' (skipping 'initial-2' entirely) — a fabricated/
    // skipped-link lineage.
    await seedVoidRecord(BIZ, 'initial-2');
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'initial-3'), {
        id: 'initial-3',
        type: 'initial',
        chainPosition: 3,
        redoesConfirmationId: 'initial', // should be 'initial-2'
        confirmedAt: serverTimestamp(),
        items: [], totalValue: 0, createdAt: new Date().toISOString(),
      })
    );
  });

  it('subscription-blocked business: a valid Void & Redo (void + redo) still succeeds', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'subscriptions', BIZ), { status: 'expired' });
    });
    await seedConfirmation(BIZ, 'initial', { chainPosition: 1, confirmedAt: freshConfirmedAt() });
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertSucceeds(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'voidRecords', 'initial'), {
        id: 'initial', voidedConfirmationId: 'initial', voidedAt: serverTimestamp(),
      })
    );
    await assertSucceeds(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'initial-2'), {
        id: 'initial-2',
        type: 'initial',
        chainPosition: 2,
        redoesConfirmationId: 'initial',
        confirmedAt: serverTimestamp(),
        items: [], totalValue: 0, createdAt: new Date().toISOString(),
      })
    );
  });

  it('subscription-blocked business: an ORDINARY new record (periodic count) is still denied — the exemption does not generalize', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'subscriptions', BIZ), { status: 'expired' });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'sc-periodic-blocked'), {
        id: 'sc-periodic-blocked', type: 'monthly', countedAt: new Date().toISOString(),
      })
    );
  });

  it('subscription-blocked business: a fresh ORIGINAL confirmation is still denied (the exemption never applies to Confirmation #1)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'subscriptions', BIZ), { status: 'expired' });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'initial'), {
        id: 'initial', type: 'initial', items: [], totalValue: 0, createdAt: new Date().toISOString(),
      })
    );
  });

  it('A redo confirmation (initial-2) is just as immutable as the original — update/delete denied unconditionally', async () => {
    await seedConfirmation(BIZ, 'initial-2', { chainPosition: 2, redoesConfirmationId: 'initial', confirmedAt: freshConfirmedAt() });
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertFails(updateDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'initial-2'), { countedAt: new Date().toISOString() }));
    await assertFails(deleteDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'initial-2')));
  });

  it('A VoidRecord, once created, can never be updated or deleted', async () => {
    await seedConfirmation(BIZ, 'initial', { chainPosition: 1, confirmedAt: freshConfirmedAt() });
    await seedVoidRecord(BIZ, 'initial');
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertFails(updateDoc(doc(ownerDb, 'businesses', BIZ, 'voidRecords', 'initial'), { voidedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(ownerDb, 'businesses', BIZ, 'voidRecords', 'initial')));
  });

  it('Two simultaneous void attempts against the same confirmation: only the first succeeds', async () => {
    await seedConfirmation(BIZ, 'initial', { chainPosition: 1, confirmedAt: freshConfirmedAt() });
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertSucceeds(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'voidRecords', 'initial'), {
        id: 'initial', voidedConfirmationId: 'initial', voidedAt: serverTimestamp(),
      })
    );
    // A second attempt against the same target is now a create against
    // an already-existing document — Firestore's own create-if-absent
    // semantics deny it outright, independent of any application-layer
    // check ever running (Rule 8 Finding D1/FR-27).
    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'voidRecords', 'initial'), {
        id: 'initial', voidedConfirmationId: 'initial', voidedAt: serverTimestamp(),
      })
    );
  });

  it('No path to a 5th confirmation: even with a VoidRecord for initial-3 seeded, chainPosition 5 / doc id initial-5 is never a valid create', async () => {
    await seedVoidRecord(BIZ, 'initial-3');
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'initial-5'), {
        id: 'initial-5',
        type: 'initial',
        chainPosition: 5,
        redoesConfirmationId: 'initial-4',
        confirmedAt: serverTimestamp(),
        items: [], totalValue: 0, createdAt: new Date().toISOString(),
      })
    );
  });

  it('No path to a 5th confirmation via Confirmation #4: a VoidRecord can never even be created for it, so no redo can ever cite it', async () => {
    await seedConfirmation(BIZ, 'initial-4', {
      chainPosition: 4, redoesConfirmationId: 'initial-3', confirmedAt: freshConfirmedAt(),
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();

    // The void step itself (the only way a VoidRecord for 'initial-4'
    // could ever come to exist) is denied — already covered above, but
    // asserted again here directly adjacent to the "5th confirmation"
    // claim it exists specifically to prevent.
    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'voidRecords', 'initial-4'), {
        id: 'initial-4', voidedConfirmationId: 'initial-4', voidedAt: serverTimestamp(),
      })
    );
    // And even if a client fabricated a VoidRecord write attempt AND
    // simultaneously tried the corresponding redo in the same test run
    // (no such VoidRecord exists, since the line above failed), the
    // redo create rule's own precondition (an existing VoidRecord at
    // voidRecords/initial-4) still independently denies it.
    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'initial-5'), {
        id: 'initial-5',
        type: 'initial',
        chainPosition: 5,
        redoesConfirmationId: 'initial-4',
        confirmedAt: serverTimestamp(),
        items: [], totalValue: 0, createdAt: new Date().toISOString(),
      })
    );
  });

  // [Step 5/5 — additional coverage beyond Step 2's own block] Step 2's
  // suite above proves the FIRST cycle (initial -> initial-2) end to
  // end. These prove each LATER chain slot is independently voidable
  // within its own window — not merely reachable as a byproduct of a
  // prior cycle succeeding — matching the Implementation Plan §6 item
  // 3's "both sides of the boundary... for the void step" requirement
  // applied to every slot, not just the first.
  it('Confirmation #2 (chainPosition 2, itself a redo) can be voided within its own fresh window, then Confirmation #3 created', async () => {
    await seedVoidRecord(BIZ, 'initial'); // proves initial-2 legitimately exists as a redo
    await seedConfirmation(BIZ, 'initial-2', {
      chainPosition: 2, redoesConfirmationId: 'initial', confirmedAt: freshConfirmedAt(),
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertSucceeds(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'voidRecords', 'initial-2'), {
        id: 'initial-2', voidedConfirmationId: 'initial-2', voidedAt: serverTimestamp(),
      })
    );
    await assertSucceeds(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'initial-3'), {
        id: 'initial-3',
        type: 'initial',
        chainPosition: 3,
        redoesConfirmationId: 'initial-2',
        confirmedAt: serverTimestamp(),
        items: [], totalValue: 0, createdAt: new Date().toISOString(),
      })
    );
  });

  it('Confirmation #3 (chainPosition 3, the last voidable slot before the #4 ceiling) can be voided within its own fresh window, then Confirmation #4 created', async () => {
    await seedVoidRecord(BIZ, 'initial');
    await seedVoidRecord(BIZ, 'initial-2');
    await seedConfirmation(BIZ, 'initial-3', {
      chainPosition: 3, redoesConfirmationId: 'initial-2', confirmedAt: freshConfirmedAt(),
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertSucceeds(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'voidRecords', 'initial-3'), {
        id: 'initial-3', voidedConfirmationId: 'initial-3', voidedAt: serverTimestamp(),
      })
    );
    await assertSucceeds(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'initial-4'), {
        id: 'initial-4',
        type: 'initial',
        chainPosition: 4,
        redoesConfirmationId: 'initial-3',
        confirmedAt: serverTimestamp(),
        items: [], totalValue: 0, createdAt: new Date().toISOString(),
      })
    );
  });

  it('Confirmation #2 with an EXPIRED window (> 12 hours since its own confirmedAt) is denied — the window is per-confirmation, never restarted or inherited from a prior cycle', async () => {
    await seedVoidRecord(BIZ, 'initial');
    await seedConfirmation(BIZ, 'initial-2', {
      chainPosition: 2, redoesConfirmationId: 'initial', confirmedAt: expiredConfirmedAt(),
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'voidRecords', 'initial-2'), {
        id: 'initial-2', voidedConfirmationId: 'initial-2', voidedAt: serverTimestamp(),
      })
    );
  });

  // [Implementation Plan §6 item 6 — "a void attempt racing against the
  // ceiling being reached by another completed cycle"] Once a full
  // redo cycle has already produced Confirmation #4, an attempt to void
  // an EARLIER slot in that same chain (#3) must still be denied if its
  // own window has separately elapsed by the time the race is attempted
  // — proving the ceiling and the window are both independently
  // re-checked per attempt, not cached from an earlier point in the
  // chain's history.
  it('once Confirmation #4 already exists, a void attempt against Confirmation #3 (already voided to produce #4) is denied — not by the ceiling, but because it was already voided (duplicate-void, still correctly refused)', async () => {
    await seedVoidRecord(BIZ, 'initial');
    await seedVoidRecord(BIZ, 'initial-2');
    await seedVoidRecord(BIZ, 'initial-3'); // #3 was already voided to produce #4
    await seedConfirmation(BIZ, 'initial-4', {
      chainPosition: 4, redoesConfirmationId: 'initial-3', confirmedAt: freshConfirmedAt(),
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();

    // A second "void" of initial-3 is a create against an
    // already-existing voidRecords/initial-3 document — denied by
    // Firestore's own create-if-absent semantics, exactly like the
    // single-cycle duplicate-void case above, now proven at the far end
    // of a full 4-confirmation chain.
    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'voidRecords', 'initial-3'), {
        id: 'initial-3', voidedConfirmationId: 'initial-3', voidedAt: serverTimestamp(),
      })
    );
  });

  it('concurrent attempts cannot exceed the 4-confirmation ceiling even when raced against a fresh, valid VoidRecord for Confirmation #3: initial-5 is refused regardless of chainPosition claimed', async () => {
    await seedVoidRecord(BIZ, 'initial');
    await seedVoidRecord(BIZ, 'initial-2');
    await seedVoidRecord(BIZ, 'initial-3');
    const ownerDb = ctxFor(OWNER_UID).firestore();

    // Two racing "redo" attempts both citing the same real predecessor
    // VoidRecord (initial-3) — one honestly claiming chainPosition 4
    // (the legitimate next slot, covered by the "Confirmation #3...then
    // Confirmation #4 created" test above), the other dishonestly
    // claiming chainPosition 5 at a fabricated doc id. Firestore rules
    // evaluate each write independently against its own claimed id/
    // chainPosition — the fixed-slot-id constraint (Step 2) refuses the
    // second regardless of ordering or timing.
    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'initial-5'), {
        id: 'initial-5',
        type: 'initial',
        chainPosition: 5,
        redoesConfirmationId: 'initial-3',
        confirmedAt: serverTimestamp(),
        items: [], totalValue: 0, createdAt: new Date().toISOString(),
      })
    );
  });

  it('a redo confirmation cannot fabricate a lineage relationship by claiming a chainPosition that does not match its own doc id\'s fixed slot (e.g. initial-2 doc id with chainPosition 3)', async () => {
    await seedVoidRecord(BIZ, 'initial');
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'initial-2'), {
        id: 'initial-2',
        type: 'initial',
        chainPosition: 3, // mismatched — initial-2's fixed slot is chainPosition 2
        redoesConfirmationId: 'initial',
        confirmedAt: serverTimestamp(),
        items: [], totalValue: 0, createdAt: new Date().toISOString(),
      })
    );
  });
});

// [SuperAdmin-Assisted Initial Stock Recovery — BDR-0016/POL-0009/
// Specification/Rule 8 (READY)/Implementation Authorization, signed
// 2026-08-21; Consumption & Audit Amendment/Rule 8 Re-Assessment
// (READY)/Supplementary Implementation Authorization, signed
// 2026-08-21] The rules-layer coverage the original submission of
// this suite did not yet include — added per this session's own
// verification report identifying the gap. Every scenario here is
// checked directly against firestore.rules via the real emulator, not
// inferred from server/*.ts (which bypasses these rules entirely via
// the Admin SDK) or from source-regression tests alone.
describe('SuperAdmin-Assisted Initial Stock Recovery — initialStockRecoveryAuthorization collection + voidRecords authorized branch', () => {
  const AUTH_DURATION_MS = 48 * 60 * 60 * 1000;

  function freshAuthorizedAt() {
    return Timestamp.fromMillis(Date.now() - 60 * 60 * 1000); // 1 hour ago — well within 48h
  }
  function expiredAuthorizedAt() {
    return Timestamp.fromMillis(Date.now() - (AUTH_DURATION_MS + 60 * 1000)); // 48h + 1min ago
  }

  async function seedConfirmation(businessId: string, stockCountId: string, fields: Record<string, unknown> = {}) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', businessId, 'stockCounts', stockCountId), {
        id: stockCountId,
        type: 'initial',
        items: [],
        totalValue: 0,
        createdAt: new Date().toISOString(),
        ...fields,
      });
    });
  }

  async function seedAuthorization(
    businessId: string,
    fields: { targetStockCountId: string; authorizedAt: Timestamp; status?: 'unconsumed' | 'consumed' }
  ) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', businessId, 'initialStockRecoveryAuthorization', 'current'), {
        targetStockCountId: fields.targetStockCountId,
        authorizedAt: fields.authorizedAt,
        expiresAt: Timestamp.fromMillis(fields.authorizedAt.toMillis() + AUTH_DURATION_MS),
        status: fields.status ?? 'unconsumed',
        grantedByUid: 'superadmin-op-1',
        justification: 'Cliente contactou o suporte — confirmação acidental.',
      });
    });
  }

  it('Owner CAN void a LEGACY confirmation (no confirmedAt at all) when a valid, matching Authorization exists', async () => {
    await seedConfirmation(BIZ, 'initial'); // no confirmedAt, no chainPosition — legacy shape
    await seedAuthorization(BIZ, { targetStockCountId: 'initial', authorizedAt: freshAuthorizedAt() });
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertSucceeds(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'voidRecords', 'initial'), {
        id: 'initial', voidedConfirmationId: 'initial', voidedAt: serverTimestamp(),
      })
    );
  });

  it('Owner CAN void an EXPIRED-WINDOW, non-legacy confirmation (chainPosition 2, confirmedAt long past 12h) when authorized', async () => {
    const wellPast12h = Timestamp.fromMillis(Date.now() - 20 * 60 * 60 * 1000);
    await seedConfirmation(BIZ, 'initial-2', { chainPosition: 2, confirmedAt: wellPast12h });
    await seedAuthorization(BIZ, { targetStockCountId: 'initial-2', authorizedAt: freshAuthorizedAt() });
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertSucceeds(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'voidRecords', 'initial-2'), {
        id: 'initial-2', voidedConfirmationId: 'initial-2', voidedAt: serverTimestamp(),
      })
    );
  });

  it('Owner CANNOT void with an EXPIRED (>48h) Authorization', async () => {
    await seedConfirmation(BIZ, 'initial');
    await seedAuthorization(BIZ, { targetStockCountId: 'initial', authorizedAt: expiredAuthorizedAt() });
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'voidRecords', 'initial'), {
        id: 'initial', voidedConfirmationId: 'initial', voidedAt: serverTimestamp(),
      })
    );
  });

  it('Owner CANNOT void with an already-CONSUMED Authorization', async () => {
    await seedConfirmation(BIZ, 'initial');
    await seedAuthorization(BIZ, { targetStockCountId: 'initial', authorizedAt: freshAuthorizedAt(), status: 'consumed' });
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'voidRecords', 'initial'), {
        id: 'initial', voidedConfirmationId: 'initial', voidedAt: serverTimestamp(),
      })
    );
  });

  it('Owner CANNOT void a confirmation the Authorization does NOT name (mismatch)', async () => {
    await seedConfirmation(BIZ, 'initial-2', { chainPosition: 2 });
    await seedAuthorization(BIZ, { targetStockCountId: 'initial', authorizedAt: freshAuthorizedAt() }); // names a different slot
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'voidRecords', 'initial-2'), {
        id: 'initial-2', voidedConfirmationId: 'initial-2', voidedAt: serverTimestamp(),
      })
    );
  });

  it('Confirmation #4 CANNOT be voided even with a valid, matching Authorization — the ceiling is absolute', async () => {
    await seedConfirmation(BIZ, 'initial-4', { chainPosition: 4 });
    await seedAuthorization(BIZ, { targetStockCountId: 'initial-4', authorizedAt: freshAuthorizedAt() });
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'voidRecords', 'initial-4'), {
        id: 'initial-4', voidedConfirmationId: 'initial-4', voidedAt: serverTimestamp(),
      })
    );
  });

  it('Manager and Staff cannot void via the authorized path either — Owner-only, exactly as the ordinary path', async () => {
    await seedConfirmation(BIZ, 'initial');
    await seedAuthorization(BIZ, { targetStockCountId: 'initial', authorizedAt: freshAuthorizedAt() });
    const managerDb = ctxFor(MANAGER_WITH_CLOSINGS_UID).firestore();
    const staffDb = ctxFor(STAFF_UID).firestore();

    await assertFails(
      setDoc(doc(managerDb, 'businesses', BIZ, 'voidRecords', 'initial'), {
        id: 'initial', voidedConfirmationId: 'initial', voidedAt: serverTimestamp(),
      })
    );
    await assertFails(
      setDoc(doc(staffDb, 'businesses', BIZ, 'voidRecords', 'initial'), {
        id: 'initial', voidedConfirmationId: 'initial', voidedAt: serverTimestamp(),
      })
    );
  });

  it('Tenant isolation: an Authorization on OTHER_BIZ grants nothing on BIZ, even for the same slot id', async () => {
    await seedConfirmation(BIZ, 'initial'); // legacy, BIZ — would otherwise be voidable if authorization leaked across tenants
    await seedAuthorization(OTHER_BIZ, { targetStockCountId: 'initial', authorizedAt: freshAuthorizedAt() });
    const ownerDb = ctxFor(OWNER_UID).firestore(); // owns BIZ, not OTHER_BIZ

    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'voidRecords', 'initial'), {
        id: 'initial', voidedConfirmationId: 'initial', voidedAt: serverTimestamp(),
      })
    );
  });

  it('Owner of a DIFFERENT business cannot consume BIZ\'s Authorization', async () => {
    await seedConfirmation(BIZ, 'initial');
    await seedAuthorization(BIZ, { targetStockCountId: 'initial', authorizedAt: freshAuthorizedAt() });
    const otherOwnerDb = ctxFor(OTHER_OWNER_UID).firestore(); // owns OTHER_BIZ

    await assertFails(
      setDoc(doc(otherOwnerDb, 'businesses', BIZ, 'voidRecords', 'initial'), {
        id: 'initial', voidedConfirmationId: 'initial', voidedAt: serverTimestamp(),
      })
    );
  });

  // [Consumption & Audit Amendment §8] Consumption is now fully
  // server-mediated (Admin SDK, bypasses these rules entirely) — no
  // client, Owner included, may write this collection at all anymore.
  it('No client — not even the Owner — can CREATE an Authorization document (grant is Admin-SDK/server-only)', async () => {
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'initialStockRecoveryAuthorization', 'current'), {
        targetStockCountId: 'initial',
        authorizedAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + AUTH_DURATION_MS),
        status: 'unconsumed',
        grantedByUid: 'someone',
        justification: 'attempted client-side grant',
      })
    );
  });

  it('No client — not even a seeded platform_operators uid — can CREATE an Authorization document from the client SDK', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'platform_operators', 'operator1'), { platformRole: 'superadmin' });
    });
    const operatorDb = ctxFor('operator1').firestore();

    await assertFails(
      setDoc(doc(operatorDb, 'businesses', BIZ, 'initialStockRecoveryAuthorization', 'current'), {
        targetStockCountId: 'initial',
        authorizedAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + AUTH_DURATION_MS),
        status: 'unconsumed',
        grantedByUid: 'operator1',
        justification: 'attempted client-side grant by a real platform operator uid',
      })
    );
  });

  it('No client — Owner included — can UPDATE an existing Authorization document (consumption is server-mediated only)', async () => {
    await seedAuthorization(BIZ, { targetStockCountId: 'initial', authorizedAt: freshAuthorizedAt() });
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertFails(
      updateDoc(doc(ownerDb, 'businesses', BIZ, 'initialStockRecoveryAuthorization', 'current'), {
        status: 'consumed',
        consumedAt: serverTimestamp(),
      })
    );
  });

  it('No client can DELETE an Authorization document, ever', async () => {
    await seedAuthorization(BIZ, { targetStockCountId: 'initial', authorizedAt: freshAuthorizedAt() });
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertFails(deleteDoc(doc(ownerDb, 'businesses', BIZ, 'initialStockRecoveryAuthorization', 'current')));
  });

  it('Any business member (Owner, Manager, or Staff) can READ the Authorization document — visibility is not Owner-restricted', async () => {
    await seedAuthorization(BIZ, { targetStockCountId: 'initial', authorizedAt: freshAuthorizedAt() });

    await assertSucceeds(getDoc(doc(ctxFor(OWNER_UID).firestore(), 'businesses', BIZ, 'initialStockRecoveryAuthorization', 'current')));
    await assertSucceeds(getDoc(doc(ctxFor(MANAGER_WITH_CLOSINGS_UID).firestore(), 'businesses', BIZ, 'initialStockRecoveryAuthorization', 'current')));
    await assertSucceeds(getDoc(doc(ctxFor(STAFF_UID).firestore(), 'businesses', BIZ, 'initialStockRecoveryAuthorization', 'current')));
  });

  it('A member of a DIFFERENT business cannot read this business\'s Authorization document', async () => {
    await seedAuthorization(BIZ, { targetStockCountId: 'initial', authorizedAt: freshAuthorizedAt() });
    await assertFails(getDoc(doc(ctxFor(OTHER_OWNER_UID).firestore(), 'businesses', BIZ, 'initialStockRecoveryAuthorization', 'current')));
  });

  it('The original stockCounts immutability rule is unaffected by any of the above — still refused unconditionally for type "initial"', async () => {
    await seedConfirmation(BIZ, 'initial');
    await seedAuthorization(BIZ, { targetStockCountId: 'initial', authorizedAt: freshAuthorizedAt() });
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertFails(updateDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'initial'), { totalValue: 99999 }));
    await assertFails(deleteDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'initial')));
  });

  it('The subscription exemption is preserved: the authorized voidRecords create succeeds even while the business subscription is expired', async () => {
    await seedConfirmation(BIZ, 'initial');
    await seedAuthorization(BIZ, { targetStockCountId: 'initial', authorizedAt: freshAuthorizedAt() });
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'subscriptions', BIZ), { status: 'expired' });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();

    await assertSucceeds(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'voidRecords', 'initial'), {
        id: 'initial', voidedConfirmationId: 'initial', voidedAt: serverTimestamp(),
      })
    );
  });
});

// [Amendment v1.0 — 10-expected-stock-value-amendment.md, Part 1]
describe('stockCountDrafts', () => {
  it('Owner can read/create/update/delete their own draft; Staff and other businesses cannot', async () => {
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCountDrafts', 'initial'), { items: [], date: '2026-08-01', updatedAt: new Date().toISOString() }));
    await assertSucceeds(getDoc(doc(ownerDb, 'businesses', BIZ, 'stockCountDrafts', 'initial')));
    await assertSucceeds(updateDoc(doc(ownerDb, 'businesses', BIZ, 'stockCountDrafts', 'initial'), { updatedAt: new Date().toISOString() }));
    await assertSucceeds(deleteDoc(doc(ownerDb, 'businesses', BIZ, 'stockCountDrafts', 'initial')));

    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertFails(getDoc(doc(staffDb, 'businesses', BIZ, 'stockCountDrafts', 'initial')));
    await assertFails(setDoc(doc(staffDb, 'businesses', BIZ, 'stockCountDrafts', 'initial'), { items: [], date: '2026-08-01', updatedAt: new Date().toISOString() }));

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'stockCountDrafts', 'initial'), { items: [], date: '2026-08-01', updatedAt: new Date().toISOString() });
    });
    const otherDb = ctxFor(OTHER_OWNER_UID).firestore();
    await assertFails(getDoc(doc(otherDb, 'businesses', BIZ, 'stockCountDrafts', 'initial')));
    await assertFails(deleteDoc(doc(otherDb, 'businesses', BIZ, 'stockCountDrafts', 'initial')));
  });

  // [Stock Count Data-Loss Resilience — Implementation Task, Section 1/§14
  // item 5] Same coverage as the 'initial' doc id above, run against the
  // NEW 'periodic' doc id — proving the Implementation Task's own claim
  // that the existing generic `stockCountDrafts/{draftId}` rule block
  // already covers `periodic` with zero rule-text changes, rather than
  // just asserting that in prose.
  it('Owner can read/create/update/delete their own PERIODIC draft; Staff and other businesses cannot', async () => {
    const ownerDb = ctxFor(OWNER_UID).firestore();
    const periodicDraftBody = { items: [], type: 'monthly', date: '2026-08-01', updatedAt: new Date().toISOString() };
    await assertSucceeds(setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCountDrafts', 'periodic'), periodicDraftBody));
    await assertSucceeds(getDoc(doc(ownerDb, 'businesses', BIZ, 'stockCountDrafts', 'periodic')));
    await assertSucceeds(updateDoc(doc(ownerDb, 'businesses', BIZ, 'stockCountDrafts', 'periodic'), { updatedAt: new Date().toISOString() }));
    await assertSucceeds(deleteDoc(doc(ownerDb, 'businesses', BIZ, 'stockCountDrafts', 'periodic')));

    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertFails(getDoc(doc(staffDb, 'businesses', BIZ, 'stockCountDrafts', 'periodic')));
    await assertFails(setDoc(doc(staffDb, 'businesses', BIZ, 'stockCountDrafts', 'periodic'), periodicDraftBody));

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'stockCountDrafts', 'periodic'), periodicDraftBody);
    });
    const otherDb = ctxFor(OTHER_OWNER_UID).firestore();
    await assertFails(getDoc(doc(otherDb, 'businesses', BIZ, 'stockCountDrafts', 'periodic')));
    await assertFails(deleteDoc(doc(otherDb, 'businesses', BIZ, 'stockCountDrafts', 'periodic')));
  });

  // [Implementation Task §11] Delete is never subscription-gated — same
  // invariant the 'initial' draft already holds (tested elsewhere in this
  // file for 'initial'), proven here for 'periodic' too: even with a
  // blocked subscription, deleting/clearing (e.g. the "Começar de novo"
  // path) must still succeed for the Owner.
  it('Owner can delete their own periodic draft even when the business subscription blocks new records', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic'), {
        items: [], type: 'monthly', date: '2026-08-01', updatedAt: new Date().toISOString(),
      });
      // subscriptionAllowsNewRecords(businessId) reads the TOP-LEVEL
      // subscriptions/{businessId} document (not a business subcollection)
      // — matches every other subscription-blocked test in this file.
      await setDoc(doc(db, 'subscriptions', BIZ), { status: 'expired' });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    // create/update are blocked while subscription-blocked (matching the
    // 'initial' draft's own already-tested restriction)...
    await assertFails(setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCountDrafts', 'periodic'), {
      items: [], type: 'monthly', date: '2026-08-02', updatedAt: new Date().toISOString(),
    }));
    // ...but delete is never subscription-gated.
    await assertSucceeds(deleteDoc(doc(ownerDb, 'businesses', BIZ, 'stockCountDrafts', 'periodic')));
  });
});

// [Initial Stock Valuation History] Immutable, append-only price-change
// audit trail for units remaining from the 'initial' StockCount. See
// firestore.rules' own comment on this match block for the full rule.
describe('initialStockPriceChangeEvents', () => {
  const validEvent = (overrides: Record<string, unknown> = {}) => ({
    id: 'evt1',
    businessId: BIZ,
    productId: 'prod1',
    productName: 'Coca-Cola',
    effectiveDate: '2026-08-01',
    quantityRemaining: 35,
    previousCostPrice: 550,
    previousSellingPrice: 560,
    newCostPrice: 580,
    newSellingPrice: 600,
    createdAt: new Date().toISOString(),
    createdBy: OWNER_UID,
    ...overrides,
  });

  it('Any team member can read; only Owner can create a well-formed event', async () => {
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(setDoc(doc(ownerDb, 'businesses', BIZ, 'initialStockPriceChangeEvents', 'evt1'), validEvent()));

    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertSucceeds(getDoc(doc(staffDb, 'businesses', BIZ, 'initialStockPriceChangeEvents', 'evt1')));
    await assertFails(
      setDoc(doc(staffDb, 'businesses', BIZ, 'initialStockPriceChangeEvents', 'evt2'), validEvent({ id: 'evt2', createdBy: STAFF_UID }))
    );
  });

  it('Rejects a create with a negative price or non-positive quantity', async () => {
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'initialStockPriceChangeEvents', 'evt-bad-price'), validEvent({ id: 'evt-bad-price', newCostPrice: -1 }))
    );
    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'initialStockPriceChangeEvents', 'evt-bad-qty'), validEvent({ id: 'evt-bad-qty', quantityRemaining: 0 }))
    );
  });

  it('Rejects a create whose businessId or createdBy does not match the caller/path', async () => {
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'initialStockPriceChangeEvents', 'evt-wrong-biz'), validEvent({ id: 'evt-wrong-biz', businessId: OTHER_BIZ }))
    );
    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'initialStockPriceChangeEvents', 'evt-wrong-author'), validEvent({ id: 'evt-wrong-author', createdBy: OTHER_OWNER_UID }))
    );
  });

  it('Is immutable once created — Owner included, no exceptions', async () => {
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(setDoc(doc(ownerDb, 'businesses', BIZ, 'initialStockPriceChangeEvents', 'evt-immutable'), validEvent({ id: 'evt-immutable' })));
    await assertFails(updateDoc(doc(ownerDb, 'businesses', BIZ, 'initialStockPriceChangeEvents', 'evt-immutable'), { newCostPrice: 999 }));
    await assertFails(deleteDoc(doc(ownerDb, 'businesses', BIZ, 'initialStockPriceChangeEvents', 'evt-immutable')));
  });

  it('A user from another business cannot read or create this business\'s events', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'initialStockPriceChangeEvents', 'evt-tenant'), validEvent({ id: 'evt-tenant' }));
    });
    const otherDb = ctxFor(OTHER_OWNER_UID).firestore();
    await assertFails(getDoc(doc(otherDb, 'businesses', BIZ, 'initialStockPriceChangeEvents', 'evt-tenant')));
    await assertFails(
      setDoc(doc(otherDb, 'businesses', BIZ, 'initialStockPriceChangeEvents', 'evt-tenant2'), validEvent({ id: 'evt-tenant2', createdBy: OTHER_OWNER_UID }))
    );
  });
});

// ---------------------------------------------------------------------
// Staff roster — Owner-or-granted-Manager manage it; delete is always
// false client-side (must go through the server's deleteStaffMember).
// ---------------------------------------------------------------------
describe('staff', () => {
  it('Owner can read/create/update staff records; a Manager without the staffManagement grant cannot', async () => {
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(setDoc(doc(ownerDb, 'businesses', BIZ, 'staff', STAFF_UID), { id: STAFF_UID, role: 'staff' }));

    // MANAGER_WITH_CLOSINGS_UID has managerPermissions.staffManagement === false
    // in the shared fixture — reused here to prove staffManagement is a grant
    // separate from closings, not implied by staffTier: 'manager' alone.
    const managerDb = ctxFor(MANAGER_WITH_CLOSINGS_UID).firestore();
    await assertFails(updateDoc(doc(managerDb, 'businesses', BIZ, 'staff', STAFF_UID), { staffTier: 'manager' }));
  });

  it('Nobody — not even the Owner — can delete a staff record from the client', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'staff', STAFF_UID), { id: STAFF_UID, role: 'staff' });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(deleteDoc(doc(ownerDb, 'businesses', BIZ, 'staff', STAFF_UID)));
  });

  it('A user from another business cannot read, create, or update this business\'s staff records', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'staff', STAFF_UID), { id: STAFF_UID, role: 'staff' });
    });
    const otherDb = ctxFor(OTHER_OWNER_UID).firestore();
    await assertFails(getDoc(doc(otherDb, 'businesses', BIZ, 'staff', STAFF_UID)));
    await assertFails(setDoc(doc(otherDb, 'businesses', BIZ, 'staff', 'intruder'), { id: 'intruder', role: 'staff' }));
    await assertFails(updateDoc(doc(otherDb, 'businesses', BIZ, 'staff', STAFF_UID), { staffTier: 'manager' }));
  });
});

// ---------------------------------------------------------------------
// Timeline Events — append-only; never updatable; only Owner deletes
// (used solely by clearAllData / data reset).
// ---------------------------------------------------------------------
describe('timelineEvents', () => {
  it('Any team member can read and create; entries are never updatable; only Owner can delete', async () => {
    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertSucceeds(setDoc(doc(staffDb, 'businesses', BIZ, 'timelineEvents', 't1'), { id: 't1', type: 'stock_added', createdAt: new Date().toISOString() }));
    await assertFails(updateDoc(doc(staffDb, 'businesses', BIZ, 'timelineEvents', 't1'), { type: 'edited' }));
    await assertFails(deleteDoc(doc(staffDb, 'businesses', BIZ, 'timelineEvents', 't1')));
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(deleteDoc(doc(ownerDb, 'businesses', BIZ, 'timelineEvents', 't1')));
  });

  it('A user from another business cannot read, create, or delete this business\'s timeline events', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'timelineEvents', 't2'), { id: 't2', type: 'sale', createdAt: new Date().toISOString() });
    });
    const otherDb = ctxFor(OTHER_OWNER_UID).firestore();
    await assertFails(getDoc(doc(otherDb, 'businesses', BIZ, 'timelineEvents', 't2')));
    await assertFails(setDoc(doc(otherDb, 'businesses', BIZ, 'timelineEvents', 't3'), { id: 't3', type: 'intrusion', createdAt: new Date().toISOString() }));
    await assertFails(deleteDoc(doc(otherDb, 'businesses', BIZ, 'timelineEvents', 't2')));
  });
});

// ---------------------------------------------------------------------
// Suspended member — isSuspended() must cut off access immediately, not
// merely once the member's ID token naturally expires.
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// Subscriptions (Module #19, Phase 1) — one doc per business, id ===
// businessId. Read narrower than plain isMemberOf: Owner/Admin +
// Manager-tier staff only, per docs/specs/19-subscriptions.md's
// Security Considerations ("Admin/Manager (view)"). All writes are
// server-only (Admin SDK, via server/index.ts's Business Provisioning
// Orchestrator) — allow write is unconditionally false for every role.
// ---------------------------------------------------------------------
describe('subscriptions', () => {
  const seedSubscription = async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'subscriptions', BIZ), {
        businessId: BIZ,
        planId: 'v1-default',
        status: 'trial_pending',
        trialActivatedAt: null,
        trialEndsAt: null,
        gracePeriodEndsAt: null,
        renewalDate: null,
        entitlements: { business_limit: 10, feature_flags: {} },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
    });
  };

  it('The Owner/Admin of the business can read its subscription', async () => {
    await seedSubscription();
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(getDoc(doc(ownerDb, 'subscriptions', BIZ)));
  });

  it('Manager-tier staff can read the subscription; a Manager permission (e.g. closings) is not required', async () => {
    await seedSubscription();
    const managerDb = ctxFor(MANAGER_NO_PERMISSION_UID).firestore();
    await assertSucceeds(getDoc(doc(managerDb, 'subscriptions', BIZ)));
  });

  it('A plain (non-Manager) Staff member cannot read the subscription', async () => {
    await seedSubscription();
    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertFails(getDoc(doc(staffDb, 'subscriptions', BIZ)));
  });

  it('An Owner from a different business cannot read this business\'s subscription', async () => {
    await seedSubscription();
    const otherDb = ctxFor(OTHER_OWNER_UID).firestore();
    await assertFails(getDoc(doc(otherDb, 'subscriptions', BIZ)));
  });

  it('No role — not even the Owner — can create, update, or delete a subscription from the client', async () => {
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(setDoc(doc(ownerDb, 'subscriptions', BIZ), {
      businessId: BIZ,
      planId: 'v1-default',
      status: 'trial_pending',
      trialActivatedAt: null,
      trialEndsAt: null,
      gracePeriodEndsAt: null,
      renewalDate: null,
      entitlements: { business_limit: 10, feature_flags: {} },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }));

    await seedSubscription();
    await assertFails(updateDoc(doc(ownerDb, 'subscriptions', BIZ), { status: 'active' }));
    await assertFails(deleteDoc(doc(ownerDb, 'subscriptions', BIZ)));
  });
});

// ---------------------------------------------------------------------
// notifications — Module #20 Phase 1 (Foundations), Checkpoint 2.
// This repository's first top-level (not business-nested) collection —
// recipient scoping is field-based (scope/businessId/userId), not a
// path segment, unlike every other describe block in this file. See
// isNotificationRecipient() in firestore.rules.
//
// "Dismissal" is deliberately not tested as a separate field: the
// approved data model (20.1) has exactly one mutable field, `status`,
// and POL-20-001 Decision 1 explicitly couples dismiss-and-mark-read
// onto that one field ("dismissing a notification automatically marks
// it read"). The "permitted dismissal update" case below is the same
// unread->read transition as the "permitted read-status update" case —
// two UI actions, one rule.
// ---------------------------------------------------------------------
describe('notifications', () => {
  const businessNotifId = 'n-biz-1';
  const userNotifId = 'n-user-1';

  const baseFields = {
    category: 'closing' as const,
    type: 'closing_overdue',
    payloadRef: { collection: 'businesses', documentId: BIZ },
    channel: 'in_app' as const,
    status: 'unread' as const,
    dedupeKey: 'dedupe-1',
    createdAt: '2026-08-01T00:00:00.000Z',
    context: {
      whatHappened: 'The June closing is overdue.',
      whyItMatters: 'Business Worth cannot be trusted until it is closed.',
      recommendedAction: 'Close the period from the Closing tab.',
    },
    priority: 'immediate' as const,
  };

  const seedBusinessScoped = async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'notifications', businessNotifId), {
        ...baseFields,
        scope: 'business',
        businessId: BIZ,
        userId: null,
      });
    });
  };

  const seedUserScoped = async (uid: string) => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'notifications', userNotifId), {
        ...baseFields,
        category: 'subscription',
        type: 'staff_role_changed',
        scope: 'user',
        businessId: null,
        userId: uid,
      });
    });
  };

  // -- Tenant isolation / recipient access --------------------------

  it('The Owner/Admin of the business can read its business-scoped notification', async () => {
    await seedBusinessScoped();
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(getDoc(doc(ownerDb, 'notifications', businessNotifId)));
  });

  it('An admin-role account can read its own business\'s notification (Phase 0 dual-read tolerance)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'notifications', 'n-admin-biz'), {
        ...baseFields,
        scope: 'business',
        businessId: ADMIN_BIZ,
        userId: null,
      });
    });
    const adminDb = ctxFor(ADMIN_ROLE_UID).firestore();
    await assertSucceeds(getDoc(doc(adminDb, 'notifications', 'n-admin-biz')));
  });

  it('Manager-tier staff can read a business-scoped notification; no specific Manager permission is required (view-only, per 20.2)', async () => {
    await seedBusinessScoped();
    const managerDb = ctxFor(MANAGER_NO_PERMISSION_UID).firestore();
    await assertSucceeds(getDoc(doc(managerDb, 'notifications', businessNotifId)));
  });

  it('A plain (non-Manager) Staff member cannot read a business-scoped notification', async () => {
    await seedBusinessScoped();
    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertFails(getDoc(doc(staffDb, 'notifications', businessNotifId)));
  });

  it('An Owner/Admin from a different business cannot read this business\'s notification (tenant isolation)', async () => {
    await seedBusinessScoped();
    const otherDb = ctxFor(OTHER_OWNER_UID).firestore();
    await assertFails(getDoc(doc(otherDb, 'notifications', businessNotifId)));
  });

  it('The matching user can read their own user-scoped notification', async () => {
    await seedUserScoped(STAFF_UID);
    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertSucceeds(getDoc(doc(staffDb, 'notifications', userNotifId)));
  });

  it('A different authenticated user — including that user\'s own Business Admin — cannot read a user-scoped notification that isn\'t theirs', async () => {
    await seedUserScoped(STAFF_UID);
    const ownerDb = ctxFor(OWNER_UID).firestore();
    const otherStaffDb = ctxFor(MANAGER_NO_PERMISSION_UID).firestore();
    await assertFails(getDoc(doc(ownerDb, 'notifications', userNotifId)));
    await assertFails(getDoc(doc(otherStaffDb, 'notifications', userNotifId)));
  });

  it('A suspended staff member loses access to their own user-scoped notification', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', STAFF_UID), { role: 'staff', businessId: BIZ, suspended: true });
    });
    await seedUserScoped(STAFF_UID);
    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertFails(getDoc(doc(staffDb, 'notifications', userNotifId)));
  });

  // -- Server-only creation / prohibited deletion --------------------

  it('No role — not even the Owner — can create a notification from the client', async () => {
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(setDoc(doc(ownerDb, 'notifications', 'n-client-create'), {
      ...baseFields,
      scope: 'business',
      businessId: BIZ,
      userId: null,
    }));
  });

  it('No role can delete a notification from the client', async () => {
    await seedBusinessScoped();
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(deleteDoc(doc(ownerDb, 'notifications', businessNotifId)));

    await seedUserScoped(STAFF_UID);
    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertFails(deleteDoc(doc(staffDb, 'notifications', userNotifId)));
  });

  // -- Restricted client update: status only (read + dismiss) --------

  it('permitted read-status update: the recipient can flip status unread -> read, changing no other field', async () => {
    await seedBusinessScoped();
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(updateDoc(doc(ownerDb, 'notifications', businessNotifId), { status: 'read' }));
  });

  it('permitted dismissal update: same unread -> read transition (POL-20-001 dismiss/read coupling — no separate dismissed field exists)', async () => {
    await seedUserScoped(STAFF_UID);
    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertSucceeds(updateDoc(doc(staffDb, 'notifications', userNotifId), { status: 'read' }));
  });

  it('A Manager (view-only) can also flip status, same as Owner/Admin — read access implies the same restricted update right', async () => {
    await seedBusinessScoped();
    const managerDb = ctxFor(MANAGER_NO_PERMISSION_UID).firestore();
    await assertSucceeds(updateDoc(doc(managerDb, 'notifications', businessNotifId), { status: 'read' }));
  });

  it('prohibited update of any other field: changing category/priority/context alongside or instead of status is denied', async () => {
    await seedBusinessScoped();
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(updateDoc(doc(ownerDb, 'notifications', businessNotifId), { category: 'inventory_risk' }));
    await assertFails(updateDoc(doc(ownerDb, 'notifications', businessNotifId), { priority: 'daily_summary' }));
    await assertFails(updateDoc(doc(ownerDb, 'notifications', businessNotifId), {
      status: 'read',
      priority: 'daily_summary',
    }));
  });

  // [Fix #5] Regression coverage for the null-safe .get() form of the
  // `importance` immutability check (firestore.rules, /notifications/
  // {id} update rule). The three tests above already cover a document
  // with no `importance` field at all (baseFields has none) — that's
  // the pre-existing Phase 1/2 shape the Amendment's Migration
  // Statement (§4) guarantees keeps working unchanged. These two cover
  // the other side: a document that DOES have `importance` (the Phase
  // 3+ shape) — proving the actual immutability guarantee this rule
  // line exists for is real, not merely assumed, since no test
  // previously exercised the field's presence in either direction.
  it('permitted read-status update: a notification WITH importance set can still flip status unread -> read, importance unchanged', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'notifications', 'n-biz-importance'), {
        ...baseFields,
        scope: 'business',
        businessId: BIZ,
        userId: null,
        importance: 'high',
      });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(updateDoc(doc(ownerDb, 'notifications', 'n-biz-importance'), { status: 'read' }));
  });

  it('prohibited update: importance itself cannot be changed, alone or alongside a status update', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'notifications', 'n-biz-importance-2'), {
        ...baseFields,
        scope: 'business',
        businessId: BIZ,
        userId: null,
        importance: 'high',
      });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(updateDoc(doc(ownerDb, 'notifications', 'n-biz-importance-2'), { importance: 'low' }));
    await assertFails(updateDoc(doc(ownerDb, 'notifications', 'n-biz-importance-2'), {
      status: 'read',
      importance: 'low',
    }));
  });

  it('prohibited update: a non-recipient cannot update status even if they somehow guess the document id', async () => {
    await seedBusinessScoped();
    const otherDb = ctxFor(OTHER_OWNER_UID).firestore();
    await assertFails(updateDoc(doc(otherDb, 'notifications', businessNotifId), { status: 'read' }));
  });

  it('prohibited update: an invalid status value is rejected', async () => {
    await seedBusinessScoped();
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(updateDoc(doc(ownerDb, 'notifications', businessNotifId), { status: 'archived' }));
  });
});

// ---------------------------------------------------------------------
// Module #19 Phase 2 (Trial Engine) — Restricted-Operations Enforcement
// (Business Rule 6 / Decision 2). Applies to `create` on the six
// operational collections identified as "affecting Business Worth or
// financial position": batches, purchaseBatches, quebras, expenses,
// withdrawals, stockCounts. Reads are never restricted (Read-Only
// Preservation, Business Rule 5) — checked explicitly below, not just
// assumed. The fail-open-if-no-subscription-doc interim behavior is
// exercised implicitly by every pre-existing describe block above (none
// of them seed a subscriptions/{BIZ} doc) and once more explicitly here.
// ---------------------------------------------------------------------
describe('Module #19 Phase 2 — restricted operations enforcement', () => {
  const seedSubscriptionStatus = async (status: string) => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'subscriptions', BIZ), {
        businessId: BIZ,
        planId: 'v1-default',
        status,
        trialActivatedAt: status === 'trial_pending' ? null : '2026-01-01T00:00:00.000Z',
        trialEndsAt: status === 'trial_pending' ? null : '2026-01-31T00:00:00.000Z',
        gracePeriodEndsAt: null,
        renewalDate: null,
        entitlements: { business_limit: 10, feature_flags: {} },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
    });
  };

  // [Data integrity audit — Owner-requested] A complete, valid batch
  // shape — same reasoning as the dedicated 'batches' describe block's
  // own identical helper, above: batches now has real field validation
  // on create, so every batches create exercised below (whether
  // expected to succeed or fail) must use a shape that would pass that
  // validation on its own, or a subscription-gating assertFails could
  // no longer be trusted to mean what it claims — it could just as
  // easily be failing on a missing field instead, silently no longer
  // proving the actual thing this describe block exists to test.
  const validBatchFor = (id: string) => ({
    id,
    productId: 'prod1',
    dateEntered: '2026-06-01',
    unit: 'un',
    quantity: 1,
    costPrice: 5,
    sellingPrice: 8,
    status: 'open',
    createdAt: '2026-06-01T00:00:00.000Z',
  });

  it('While trial_active, every restricted collection still accepts new records', async () => {
    await seedSubscriptionStatus('trial_active');
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(setDoc(doc(ownerDb, 'businesses', BIZ, 'batches', 'ta-b1'), validBatchFor('ta-b1')));
    await assertSucceeds(setDoc(doc(ownerDb, 'businesses', BIZ, 'purchaseBatches', 'ta-pb1'), { id: 'ta-pb1', archived: false }));
    await assertSucceeds(setDoc(doc(ownerDb, 'businesses', BIZ, 'quebras', 'ta-q1'), { id: 'ta-q1', quantityLost: 1 }));
    await assertSucceeds(setDoc(doc(ownerDb, 'businesses', BIZ, 'expenses', 'ta-e1'), { id: 'ta-e1', date: '2026-06-01', amount: 10 }));
    await assertSucceeds(setDoc(doc(ownerDb, 'businesses', BIZ, 'withdrawals', 'ta-w1'), { id: 'ta-w1', date: '2026-06-01', amount: 10 }));
    await assertSucceeds(setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'ta-sc1'), { id: 'ta-sc1', countedAt: '2026-06-01' }));
    // [Amendment v1.0] stockCountDrafts create/update follow the same
    // restriction as stockCounts create; delete never restricted.
    await assertSucceeds(setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCountDrafts', 'initial'), { items: [], date: '2026-06-01', updatedAt: new Date().toISOString() }));
  });

  it('Once trial_completed, every restricted collection rejects new records', async () => {
    await seedSubscriptionStatus('trial_completed');
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(setDoc(doc(ownerDb, 'businesses', BIZ, 'batches', 'tc-b1'), validBatchFor('tc-b1')));
    await assertFails(setDoc(doc(ownerDb, 'businesses', BIZ, 'purchaseBatches', 'tc-pb1'), { id: 'tc-pb1', archived: false }));
    await assertFails(setDoc(doc(ownerDb, 'businesses', BIZ, 'quebras', 'tc-q1'), { id: 'tc-q1', quantityLost: 1 }));
    await assertFails(setDoc(doc(ownerDb, 'businesses', BIZ, 'expenses', 'tc-e1'), { id: 'tc-e1', date: '2026-06-01', amount: 10 }));
    await assertFails(setDoc(doc(ownerDb, 'businesses', BIZ, 'withdrawals', 'tc-w1'), { id: 'tc-w1', date: '2026-06-01', amount: 10 }));
    await assertFails(setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'tc-sc1'), { id: 'tc-sc1', countedAt: '2026-06-01' }));
    await assertFails(setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCountDrafts', 'initial'), { items: [], date: '2026-06-01', updatedAt: new Date().toISOString() }));
  });

  it('Once expired, every restricted collection rejects new records (same as trial_completed)', async () => {
    await seedSubscriptionStatus('expired');
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(setDoc(doc(ownerDb, 'businesses', BIZ, 'batches', 'ex-b1'), validBatchFor('ex-b1')));
    await assertFails(setDoc(doc(ownerDb, 'businesses', BIZ, 'expenses', 'ex-e1'), { id: 'ex-e1', date: '2026-06-01', amount: 10 }));
  });

  it('Read-Only Preservation: existing records remain fully readable once trial_completed', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'expenses', 'ro-e1'), { id: 'ro-e1', date: '2026-01-01', amount: 5 });
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'batches', 'ro-b1'), { id: 'ro-b1', quantity: 1 });
    });
    await seedSubscriptionStatus('trial_completed');
    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertSucceeds(getDoc(doc(staffDb, 'businesses', BIZ, 'expenses', 'ro-e1')));
    await assertSucceeds(getDoc(doc(staffDb, 'businesses', BIZ, 'batches', 'ro-b1')));
  });

  it('No subscription document at all (pre-Phase-1 legacy Business): new records still accepted (accepted interim risk, not permanent)', async () => {
    // Deliberately does not seed subscriptions/{BIZ} at all.
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(setDoc(doc(ownerDb, 'businesses', BIZ, 'expenses', 'legacy-e1'), { id: 'legacy-e1', date: '2026-06-01', amount: 10 }));
  });
});

// ---------------------------------------------------------------------
// platform_audit_log — Module #19 Phase 2, Decision 4. Entirely
// client-inaccessible for now (Architecture §9.6's platform-operator
// read scope depends on Module #18's role model, not yet built) — every
// write goes through server/index.ts via the Admin SDK.
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// platform_operators — Architecture §7.4/§9.1, first real population by
// the SuperAdmin Payment Operations V1 Launch Slice (ADR-0005). See
// isPlatformOperator() in firestore.rules.
// ---------------------------------------------------------------------
describe('platform_operators', () => {
  const OPERATOR_UID = 'operator1';
  const OTHER_OPERATOR_UID = 'operator2';

  const seedOperator = async (uid: string, platformRole: string) => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'platform_operators', uid), { platformRole });
    });
  };

  it('A platform operator can read their own platform_operators document', async () => {
    await seedOperator(OPERATOR_UID, 'superadmin');
    const operatorDb = ctxFor(OPERATOR_UID).firestore();
    await assertSucceeds(getDoc(doc(operatorDb, 'platform_operators', OPERATOR_UID)));
  });

  it('A platform operator cannot read another platform_operators document', async () => {
    await seedOperator(OPERATOR_UID, 'superadmin');
    await seedOperator(OTHER_OPERATOR_UID, 'superadmin');
    const operatorDb = ctxFor(OPERATOR_UID).firestore();
    await assertFails(getDoc(doc(operatorDb, 'platform_operators', OTHER_OPERATOR_UID)));
  });

  it('The read rule is purely uid-based — a tenant Owner uid provisioned into platform_operators (never done by this app in practice; provisioning is Admin-SDK-only) would read like any other operator, which is exactly why correct provisioning discipline (never a tenant uid) matters, not the rule shape itself', async () => {
    await seedOperator(OWNER_UID, 'superadmin');
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(getDoc(doc(ownerDb, 'platform_operators', OWNER_UID)));
  });

  it('No client, including an existing platform operator, can write platform_operators (provisioning is Admin-SDK-only)', async () => {
    const operatorDb = ctxFor(OPERATOR_UID).firestore();
    await assertFails(setDoc(doc(operatorDb, 'platform_operators', OPERATOR_UID), { platformRole: 'superadmin' }));
    await seedOperator(OPERATOR_UID, 'superadmin');
    await assertFails(updateDoc(doc(operatorDb, 'platform_operators', OPERATOR_UID), { platformRole: 'developer' }));
    await assertFails(deleteDoc(doc(operatorDb, 'platform_operators', OPERATOR_UID)));
  });

  it('A tenant account cannot promote itself to platform operator by writing its own uid into platform_operators', async () => {
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(setDoc(doc(ownerDb, 'platform_operators', OWNER_UID), { platformRole: 'superadmin' }));
  });
});

describe('platform_audit_log', () => {
  const OPERATOR_UID = 'operator1';

  const seedAuditEvent = async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'platform_audit_log', 'evt1'), {
        actorUid: OPERATOR_UID,
        actorRole: 'superadmin',
        actionType: 'payment.confirmed',
        targetBusinessId: BIZ,
        timestamp: '2026-01-01T00:00:00.000Z',
      });
    });
  };

  it('A verified platform operator can read platform_audit_log', async () => {
    await seedAuditEvent();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'platform_operators', OPERATOR_UID), { platformRole: 'superadmin' });
    });
    const operatorDb = ctxFor(OPERATOR_UID).firestore();
    await assertSucceeds(getDoc(doc(operatorDb, 'platform_audit_log', 'evt1')));
  });

  it('A tenant Owner (no platform_operators document) cannot read platform_audit_log', async () => {
    await seedAuditEvent();
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(getDoc(doc(ownerDb, 'platform_audit_log', 'evt1')));
  });

  it('An authenticated user with no platform_operators document at all cannot read platform_audit_log', async () => {
    await seedAuditEvent();
    const randomDb = ctxFor('some-random-authenticated-uid').firestore();
    await assertFails(getDoc(doc(randomDb, 'platform_audit_log', 'evt1')));
  });

  it('No role, including a verified platform operator, can create, update, or delete an audit event from the client', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'platform_operators', OPERATOR_UID), { platformRole: 'superadmin' });
    });
    const operatorDb = ctxFor(OPERATOR_UID).firestore();
    await assertFails(setDoc(doc(operatorDb, 'platform_audit_log', 'evt2'), { actionType: 'payment.confirmed' }));
    await seedAuditEvent();
    await assertFails(updateDoc(doc(operatorDb, 'platform_audit_log', 'evt1'), { actionType: 'payment.rejected' }));
    await assertFails(deleteDoc(doc(operatorDb, 'platform_audit_log', 'evt1')));
  });
});

describe('platform_event_dedupe', () => {
  it('No role can read, create, update, or delete a dedupe record from the client', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'platform_event_dedupe', 'dk1'), {
        dedupeKey: 'dk1',
        producer: 'trial-engine',
        eventType: 'trial.ending_soon',
        outcome: 'notify',
      });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(getDoc(doc(ownerDb, 'platform_event_dedupe', 'dk1')));
    await assertFails(setDoc(doc(ownerDb, 'platform_event_dedupe', 'dk2'), { dedupeKey: 'dk2' }));
    await assertFails(updateDoc(doc(ownerDb, 'platform_event_dedupe', 'dk1'), { outcome: 'suppress' }));
    await assertFails(deleteDoc(doc(ownerDb, 'platform_event_dedupe', 'dk1')));
  });
});

describe('platform_worker_state', () => {
  it('No role can read, create, update, or delete worker-state from the client', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'platform_worker_state', 'trial-lifecycle-sweep'), {
        jobType: 'trial-lifecycle-sweep',
        lastRunCompletedAt: '2026-08-05T00:00:00.000Z',
      });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(getDoc(doc(ownerDb, 'platform_worker_state', 'trial-lifecycle-sweep')));
    await assertFails(setDoc(doc(ownerDb, 'platform_worker_state', 'other-job'), { jobType: 'other-job' }));
    await assertFails(updateDoc(doc(ownerDb, 'platform_worker_state', 'trial-lifecycle-sweep'), { lastRunCompletedAt: '2026-08-06T00:00:00.000Z' }));
    await assertFails(deleteDoc(doc(ownerDb, 'platform_worker_state', 'trial-lifecycle-sweep')));
  });
});

describe('suspended member', () => {
  it('A suspended staff member loses read/write access even though their business membership is otherwise unchanged', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'users', STAFF_UID), { role: 'staff', businessId: BIZ, suspended: true });
      await setDoc(doc(db, 'businesses', BIZ, 'products', 'p-susp'), { id: 'p-susp', name: 'Widget' });
    });
    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertFails(getDoc(doc(staffDb, 'businesses', BIZ, 'products', 'p-susp')));
    await assertFails(setDoc(doc(staffDb, 'businesses', BIZ, 'products', 'p-susp-2'), { id: 'p-susp-2', name: 'Another' }));
  });
});

// ---------------------------------------------------------------------
// SuperAdmin V1 Operational Control Plane — Phase C (ADR-0006, Gap 1,
// Product-Architect-confirmed). isBusinessSuspended() folded into
// isMemberOf() — the widest-reaching rules change in this file's
// history (Rule 8 Assessment §6/§13, Pre-Implementation Verification
// §2). Representative collections chosen per that verification's own
// §3/§13 analysis: `products` (any-member-create tier), `expenses`
// (subscription-gated create tier), `stockCounts` (owner-only-write
// tier) — together spanning every distinct isMemberOf/isOwnerOf
// consumer shape already proven elsewhere in this file, not an
// exhaustive per-collection sweep (deliberately, per that
// verification's own instruction not to duplicate tests for every
// collection sharing one helper).
// ---------------------------------------------------------------------
describe('business suspension — Phase C', () => {
  it('Active Owner performs a normal write (regression baseline)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ), { id: BIZ, ownerUid: OWNER_UID, name: 'Biz One' });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(setDoc(doc(ownerDb, 'businesses', BIZ, 'products', 'p-active'), { id: 'p-active', name: 'Widget' }));
  });

  it('Active Staff performs a normal write (regression baseline)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ), { id: BIZ, ownerUid: OWNER_UID, name: 'Biz One' });
    });
    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertSucceeds(setDoc(doc(staffDb, 'businesses', BIZ, 'products', 'p-active-2'), { id: 'p-active-2', name: 'Widget 2' }));
  });

  it('Suspended Owner cannot write to products', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ), { id: BIZ, ownerUid: OWNER_UID, name: 'Biz One', suspended: true });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(setDoc(doc(ownerDb, 'businesses', BIZ, 'products', 'p-susp'), { id: 'p-susp', name: 'Widget' }));
  });

  it('Suspended Owner cannot write to expenses', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ), { id: BIZ, ownerUid: OWNER_UID, name: 'Biz One', suspended: true });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'expenses', 'e-susp'), {
        id: 'e-susp', date: '2026-07-15', description: 'Rent', amount: 100, createdAt: new Date().toISOString(),
      })
    );
  });

  it('Suspended Owner cannot write to stockCounts', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ), { id: BIZ, ownerUid: OWNER_UID, name: 'Biz One', suspended: true });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'sc-susp'), { id: 'sc-susp', countedAt: new Date().toISOString() }));
  });

  it('Suspended Staff cannot write to a representative business-scoped collection', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ), { id: BIZ, ownerUid: OWNER_UID, name: 'Biz One', suspended: true });
    });
    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertFails(setDoc(doc(staffDb, 'businesses', BIZ, 'products', 'p-susp-staff'), { id: 'p-susp-staff', name: 'Widget' }));
  });

  it('Suspended Manager does not retain business-scoped access through manager privileges', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ), { id: BIZ, ownerUid: OWNER_UID, name: 'Biz One', suspended: true });
    });
    const managerDb = ctxFor(MANAGER_WITH_CLOSINGS_UID).firestore();
    await assertFails(
      setDoc(doc(managerDb, 'businesses', BIZ, 'closings', 'c-susp'), {
        id: 'c-susp', period: '2026-07', status: 'closed', endDate: '2026-07-31',
      })
    );
  });

  it('Owner cannot set suspended=true on the business document directly', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ), { id: BIZ, ownerUid: OWNER_UID, name: 'Biz One' });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(updateDoc(doc(ownerDb, 'businesses', BIZ), { suspended: true }));
  });

  it('Owner cannot set suspended=false on an already-suspended business document directly', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ), { id: BIZ, ownerUid: OWNER_UID, name: 'Biz One', suspended: true });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    // Suspended, so isOwnerOf(businessId) itself is already false here —
    // this proves the field is unreachable for a second, independent
    // reason (both the suspension gate AND the field-guard), not just
    // one. A more targeted proof that the FIELD GUARD ITSELF (not just
    // suspension) blocks this exists in the next test, on an ACTIVE
    // business, where isOwnerOf(businessId) is otherwise true.
    await assertFails(updateDoc(doc(ownerDb, 'businesses', BIZ), { suspended: false }));
  });

  it('Owner cannot flip suspended on an ACTIVE business either — proves the field-guard invariant itself, independent of suspension state', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ), { id: BIZ, ownerUid: OWNER_UID, name: 'Biz One' });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    // isOwnerOf(businessId) is true here (active business) — so a
    // failure below is attributable ONLY to the field-guard clause,
    // not to isBusinessSuspended() also being in play.
    await assertFails(updateDoc(doc(ownerDb, 'businesses', BIZ), { suspended: true }));
    // A normal, permitted field update (never touching suspended)
    // still succeeds on the same active, non-suspended document —
    // confirms the guard doesn't collaterally block ordinary writes.
    await assertSucceeds(updateDoc(doc(ownerDb, 'businesses', BIZ), { currencySymbol: 'USD' }));
  });

  it('Staff has no write path to the business document at all, suspended or not (regression, unrelated to Phase C)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ), { id: BIZ, ownerUid: OWNER_UID, name: 'Biz One' });
    });
    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertFails(updateDoc(doc(staffDb, 'businesses', BIZ), { suspended: true }));
    await assertFails(updateDoc(doc(staffDb, 'businesses', BIZ), { currencySymbol: 'EUR' }));
  });

  it('A non-suspended (unrelated) business remains completely unaffected by another business being suspended', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'businesses', BIZ), { id: BIZ, ownerUid: OWNER_UID, name: 'Biz One', suspended: true });
      await setDoc(doc(db, 'businesses', OTHER_BIZ), { id: OTHER_BIZ, ownerUid: OTHER_OWNER_UID, name: 'Biz Two' });
    });
    const otherOwnerDb = ctxFor(OTHER_OWNER_UID).firestore();
    await assertSucceeds(
      setDoc(doc(otherOwnerDb, 'businesses', OTHER_BIZ, 'products', 'p-other'), { id: 'p-other', name: 'Unaffected Widget' })
    );
  });

  it('A missing suspended field behaves identically to suspended=false (default-value proof)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      // Deliberately no `suspended` key at all — not even `suspended: false`.
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ), { id: BIZ, ownerUid: OWNER_UID, name: 'Biz One' });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(setDoc(doc(ownerDb, 'businesses', BIZ, 'products', 'p-default'), { id: 'p-default', name: 'Widget' }));
  });

  it('users/{uid} self-read/self-update remains available for a suspended business\'s Owner — an existing rule boundary, not part of Phase C\'s business-scoped lockout', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ), { id: BIZ, ownerUid: OWNER_UID, name: 'Biz One', suspended: true });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(getDoc(doc(ownerDb, 'users', OWNER_UID)));
    await assertSucceeds(updateDoc(doc(ownerDb, 'users', OWNER_UID), { name: 'Updated Name' }));
  });

  it('subscriptions/{businessId} read is denied for a suspended business — a separate, top-level collection gated the same way (also folded through isMemberOf/isOwnerOf), explicitly verified since it is not business-nested', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'businesses', BIZ), { id: BIZ, ownerUid: OWNER_UID, name: 'Biz One', suspended: true });
      await setDoc(doc(db, 'subscriptions', BIZ), { businessId: BIZ, status: 'active' });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(getDoc(doc(ownerDb, 'subscriptions', BIZ)));
  });
});

// ---------------------------------------------------------------------
// Query-based leakage — a collection-group query spans every business's
// subcollection of the same name; confirm the rules engine refuses an
// out-of-tenant caller's broad query rather than silently filtering it.
// ---------------------------------------------------------------------
describe('query-based leakage', () => {
  it('A collection-group query across all businesses\' expenses is denied to a caller who is not a member of every business it would span', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'businesses', BIZ, 'expenses', 'e-cg1'), {
        id: 'e-cg1', date: '2026-07-01', description: 'Biz1', amount: 1, createdAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'businesses', OTHER_BIZ, 'expenses', 'e-cg2'), {
        id: 'e-cg2', date: '2026-07-01', description: 'Biz2', amount: 1, createdAt: new Date().toISOString(),
      });
    });
    const otherDb = ctxFor(OTHER_OWNER_UID).firestore();
    await assertFails(getDocs(query(collectionGroup(otherDb, 'expenses'))));
  });

  it('An unscoped query against the top-level notifications collection is rejected outright, not merely filtered to an empty result', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'notifications', 'n-leak-1'), {
        scope: 'business',
        businessId: BIZ,
        userId: null,
        category: 'closing',
        type: 'closing_overdue',
        payloadRef: { collection: 'businesses', documentId: BIZ },
        channel: 'in_app',
        status: 'unread',
        dedupeKey: 'dedupe-leak-1',
        createdAt: new Date().toISOString(),
        context: { whatHappened: 'x', whyItMatters: 'y', recommendedAction: null },
        priority: 'timeline',
      });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    // No where('businessId', ...) / where('userId', ...) clause at all —
    // exactly the shape Rule 8 Assessment Risk 2 says must structurally
    // fail, not silently return nothing.
    await assertFails(getDocs(query(collection(ownerDb, 'notifications'))));
  });
});

// ---------------------------------------------------------------------
// Full historical workflow — the exact scenario the Product Architect
// review asked to be verified: Closing A → reopen → new Expense added →
// Closing B. Confirms Closing A survives untouched, a second lock for
// the same still-open period is blocked, and the period can be re-locked
// once corrections are made.
// ---------------------------------------------------------------------
describe('historical reopen → correct → re-close workflow', () => {
  it('Closing A remains intact; re-locking is blocked while open; Closing B locks cleanly once corrected', async () => {
    const ownerDb = ctxFor(OWNER_UID).firestore();

    // Step 1 — Owner closes July 2026 as "Closing A", locking one existing expense.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'businesses', BIZ, 'expenses', 'original-expense'), {
        id: 'original-expense', date: '2026-07-05', description: 'Rent', amount: 500, createdAt: new Date().toISOString(),
      });
    });
    await assertSucceeds(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'closings', 'closing-A'), {
        id: 'closing-A', periodType: 'monthly', periodLabel: 'Julho 2026',
        startDate: '2026-07-01', endDate: '2026-07-31',
        totalEmbeddedProfit: 1000, totalExpenses: 500, totalWithdrawals: 0,
        inventoryCostAtClose: 2000, inventoryMarketValueAtClose: 3000, businessWorthAtClose: 2500,
        closedAt: new Date().toISOString(), status: 'active',
      })
    );
    await assertSucceeds(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'closedPeriods', 'monthly:2026-07'), {
        id: 'monthly:2026-07', periodType: 'monthly', startDate: '2026-07-01', endDate: '2026-07-31',
        closingId: 'closing-A', closedAt: new Date().toISOString(),
      })
    );
    await assertSucceeds(
      updateDoc(doc(ownerDb, 'businesses', BIZ, 'expenses', 'original-expense'), {
        closingId: 'closing-A', lockedAt: new Date().toISOString(),
      })
    );

    // Guard: while Closing A is still active, nobody can sneak in a second
    // lock for the same period (simulating a double-close attempt).
    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'closedPeriods', 'monthly:2026-07'), {
        id: 'monthly:2026-07', periodType: 'monthly', startDate: '2026-07-01', endDate: '2026-07-31',
        closingId: 'closing-B-premature', closedAt: new Date().toISOString(),
      })
    );

    // Step 2 — Owner reopens: supersede Closing A in place, delete the
    // lock-index doc, unlock the expense it had counted.
    await assertSucceeds(
      updateDoc(doc(ownerDb, 'businesses', BIZ, 'closings', 'closing-A'), {
        status: 'reopened', reopenedAt: new Date().toISOString(), reopenedByUid: OWNER_UID,
      })
    );
    await assertSucceeds(deleteDoc(doc(ownerDb, 'businesses', BIZ, 'closedPeriods', 'monthly:2026-07')));
    await assertSucceeds(
      updateDoc(doc(ownerDb, 'businesses', BIZ, 'expenses', 'original-expense'), {
        closingId: deleteField(), lockedAt: deleteField(),
      })
    );

    // Step 3 — a correction: a new Expense, backdated into the now-reopened period, succeeds.
    await assertSucceeds(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'expenses', 'correction-expense'), {
        id: 'correction-expense', date: '2026-07-12', description: 'Missed expense, added on reopen', amount: 75, createdAt: new Date().toISOString(),
      })
    );

    // Step 4 — Owner re-closes the period as "Closing B", locking BOTH
    // expenses (the original, unlocked one and the new correction).
    await assertSucceeds(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'closings', 'closing-B'), {
        id: 'closing-B', periodType: 'monthly', periodLabel: 'Julho 2026 (corrigido)',
        startDate: '2026-07-01', endDate: '2026-07-31',
        totalEmbeddedProfit: 1000, totalExpenses: 575, totalWithdrawals: 0,
        inventoryCostAtClose: 2000, inventoryMarketValueAtClose: 3000, businessWorthAtClose: 2425,
        closedAt: new Date().toISOString(), status: 'active',
      })
    );
    await assertSucceeds(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'closedPeriods', 'monthly:2026-07'), {
        id: 'monthly:2026-07', periodType: 'monthly', startDate: '2026-07-01', endDate: '2026-07-31',
        closingId: 'closing-B', closedAt: new Date().toISOString(),
      })
    );
    await assertSucceeds(
      updateDoc(doc(ownerDb, 'businesses', BIZ, 'expenses', 'original-expense'), {
        closingId: 'closing-B', lockedAt: new Date().toISOString(),
      })
    );
    await assertSucceeds(
      updateDoc(doc(ownerDb, 'businesses', BIZ, 'expenses', 'correction-expense'), {
        closingId: 'closing-B', lockedAt: new Date().toISOString(),
      })
    );

    // Verify — Closing A still exists, reopened, with its ORIGINAL frozen
    // totals untouched (500, not 575) — it was superseded, never rewritten.
    let closingAData: Record<string, unknown> | undefined;
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const snap = await getDoc(doc(ctx.firestore(), 'businesses', BIZ, 'closings', 'closing-A'));
      closingAData = snap.data();
    });
    if (closingAData?.status !== 'reopened') throw new Error('Closing A should be marked reopened, not deleted or reactivated');
    if (closingAData?.totalExpenses !== 500) throw new Error('Closing A totalExpenses must remain its original frozen value (500), not be rewritten to match Closing B');

    // Verify — both expenses are now locked under Closing B, not Closing A.
    let origData: Record<string, unknown> | undefined;
    let corrData: Record<string, unknown> | undefined;
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const [origSnap, corrSnap] = await Promise.all([
        getDoc(doc(ctx.firestore(), 'businesses', BIZ, 'expenses', 'original-expense')),
        getDoc(doc(ctx.firestore(), 'businesses', BIZ, 'expenses', 'correction-expense')),
      ]);
      origData = origSnap.data();
      corrData = corrSnap.data();
    });
    if (origData?.closingId !== 'closing-B') throw new Error('original-expense should now be locked under Closing B');
    if (corrData?.closingId !== 'closing-B') throw new Error('correction-expense should be locked under Closing B');

    // Guard again: with Closing B now active, a third lock attempt for the
    // same period is blocked exactly as it was for Closing A.
    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'closedPeriods', 'monthly:2026-07'), {
        id: 'monthly:2026-07', periodType: 'monthly', startDate: '2026-07-01', endDate: '2026-07-31',
        closingId: 'closing-C-premature', closedAt: new Date().toISOString(),
      })
    );
  });
});

// ---------------------------------------------------------------------
// [Phase 0 Stage 1 — owner->admin migration] Dual-read tolerance.
// Purely additive: does not modify any fixture or assertion above. Proves
// a profile already holding role: 'admin' is treated identically to
// role: 'owner' by every check widened in this stage (isOwnerOf, the
// users/{userId} read/create rules, and the businessIds-growth check),
// and that a plain Staff account is still denied exactly as before —
// i.e. the tolerance only widens what 'owner' already allowed, it does
// not loosen anything else. See
// docs/engineering/phase0-owner-admin-migration-implementation-plan.md,
// Stage 1 acceptance criteria.
// ---------------------------------------------------------------------
describe('Phase 0 Stage 1 — admin role dual-read tolerance', () => {
  it('An "admin"-valued profile passes isOwnerOf-gated operations the same as an "owner"-valued one', async () => {
    const adminDb = ctxFor(ADMIN_ROLE_UID).firestore();
    // Owner-only create (stockCounts) — mirrors the existing 'stockCounts' describe block above.
    await assertSucceeds(
      setDoc(doc(adminDb, 'businesses', ADMIN_BIZ, 'stockCounts', 'sc-admin'), {
        id: 'sc-admin', countedAt: new Date().toISOString(),
      })
    );
    // Owner-only update/delete (products) — mirrors the existing 'products' describe block above.
    await assertSucceeds(setDoc(doc(adminDb, 'businesses', ADMIN_BIZ, 'products', 'p-admin'), { id: 'p-admin', name: 'Widget' }));
    await assertSucceeds(updateDoc(doc(adminDb, 'businesses', ADMIN_BIZ, 'products', 'p-admin'), { name: 'Renamed' }));
    await assertSucceeds(deleteDoc(doc(adminDb, 'businesses', ADMIN_BIZ, 'products', 'p-admin')));
  });

  it('A Staff account is still denied the same owner-only operations regardless of the "admin" tolerance', async () => {
    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertFails(
      setDoc(doc(staffDb, 'businesses', BIZ, 'stockCounts', 'sc-should-fail'), {
        id: 'sc-should-fail', countedAt: new Date().toISOString(),
      })
    );
  });

  it('The users/{userId} read rule lets an "admin"-valued profile read its own team\'s staff, same as "owner"', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', 'admin-staff-1'), { role: 'staff', businessId: ADMIN_BIZ });
    });
    const adminDb = ctxFor(ADMIN_ROLE_UID).firestore();
    await assertSucceeds(getDoc(doc(adminDb, 'users', 'admin-staff-1')));
  });

  it('Self-registration accepts role: "admin" at profile creation, same as role: "owner"', async () => {
    const newAdminDb = ctxFor('brand-new-admin').firestore();
    await assertSucceeds(
      setDoc(doc(newAdminDb, 'users', 'brand-new-admin'), { role: 'admin', businessId: 'biz-brand-new' })
    );
  });

  it('An "admin"-valued profile can grow its businessIds (multi-shop) the same as an "owner"-valued one', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ADMIN_ROLE_UID), {
        role: 'admin', businessId: ADMIN_BIZ, businessIds: [ADMIN_BIZ],
      });
      await setDoc(doc(ctx.firestore(), 'businesses', 'biz3-second-shop'), {
        id: 'biz3-second-shop', ownerUid: ADMIN_ROLE_UID, name: 'Second Shop',
      });
    });
    const adminDb = ctxFor(ADMIN_ROLE_UID).firestore();
    await assertSucceeds(
      updateDoc(doc(adminDb, 'users', ADMIN_ROLE_UID), {
        businessIds: [ADMIN_BIZ, 'biz3-second-shop'],
      })
    );
  });
});

// ---------------------------------------------------------------------
// Payments (Module #19 V1 Manual Payment Bridge) — Owner-only, and
// deliberately NOT gated by subscriptionAllowsNewRecords(), unlike
// every other create rule in this file. This is the one collection
// that must remain creatable specifically WHILE a subscription is
// trial_completed/expired — it's the way out of that state.
// ---------------------------------------------------------------------
describe('payments', () => {
  it('Owner can submit a pending payment; Staff cannot read or create at all', async () => {
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'payments', 'p1'), {
        id: 'p1', businessId: BIZ, submittedBy: OWNER_UID, amount: 750, currency: 'MZN',
        method: 'mpesa', reference: 'TXN123', submittedAt: new Date().toISOString(), status: 'pending',
      })
    );
    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertFails(
      setDoc(doc(staffDb, 'businesses', BIZ, 'payments', 'p2'), {
        id: 'p2', businessId: BIZ, submittedBy: STAFF_UID, amount: 750, currency: 'MZN',
        method: 'mpesa', reference: 'TXN456', submittedAt: new Date().toISOString(), status: 'pending',
      })
    );
    await assertFails(getDoc(doc(staffDb, 'businesses', BIZ, 'payments', 'p1')));
  });

  it('A submission must start pending, with businessId/submittedBy matching the caller — cannot create an already-confirmed record or submit on another business\'s behalf', async () => {
    const ownerDb = ctxFor(OWNER_UID).firestore();
    // Wrong status at creation.
    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'payments', 'p3'), {
        id: 'p3', businessId: BIZ, submittedBy: OWNER_UID, amount: 750, currency: 'MZN',
        method: 'mpesa', reference: 'TXN789', submittedAt: new Date().toISOString(), status: 'confirmed',
      })
    );
    // Confirmation fields present at creation — must be rejected even with status: pending.
    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'payments', 'p4'), {
        id: 'p4', businessId: BIZ, submittedBy: OWNER_UID, amount: 750, currency: 'MZN',
        method: 'mpesa', reference: 'TXN000', submittedAt: new Date().toISOString(), status: 'pending',
        confirmedAt: new Date().toISOString(), confirmedBy: 'someone',
      })
    );
    // businessId mismatch.
    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'payments', 'p5'), {
        id: 'p5', businessId: 'some-other-biz', submittedBy: OWNER_UID, amount: 750, currency: 'MZN',
        method: 'mpesa', reference: 'TXN111', submittedAt: new Date().toISOString(), status: 'pending',
      })
    );
  });

  it('Client can never update or delete a payment — only the server-side confirmation script may', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'payments', 'p6'), {
        id: 'p6', businessId: BIZ, submittedBy: OWNER_UID, amount: 750, currency: 'MZN',
        method: 'mpesa', reference: 'TXN222', submittedAt: new Date().toISOString(), status: 'pending',
      });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(updateDoc(doc(ownerDb, 'businesses', BIZ, 'payments', 'p6'), { status: 'confirmed' }));
    await assertFails(deleteDoc(doc(ownerDb, 'businesses', BIZ, 'payments', 'p6')));
  });

  it('Payment submission succeeds even when the subscription is expired — this is the one collection NOT gated by subscriptionAllowsNewRecords()', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'subscriptions', BIZ), {
        businessId: BIZ, status: 'expired', planId: 'v1-monthly',
      });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();

    // Control: a normal operational record (expenses) IS correctly blocked.
    await assertFails(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'expenses', 'e-blocked'), {
        id: 'e-blocked', date: '2026-07-15', amount: 50, category: 'Outro', createdAt: new Date().toISOString(),
      })
    );

    // The actual assertion: payment submission is NOT blocked.
    await assertSucceeds(
      setDoc(doc(ownerDb, 'businesses', BIZ, 'payments', 'p7'), {
        id: 'p7', businessId: BIZ, submittedBy: OWNER_UID, amount: 750, currency: 'MZN',
        method: 'emola', reference: 'TXN333', submittedAt: new Date().toISOString(), status: 'pending',
      })
    );
  });
});

