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
  collectionGroup,
  query,
  getDocs,
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
});

// ---------------------------------------------------------------------
// Batches — any team member reads/creates/updates; only Owner deletes.
// ---------------------------------------------------------------------
describe('batches', () => {
  it('Any team member can read, create, and update; only Owner can delete', async () => {
    const staffDb = ctxFor(STAFF_UID).firestore();
    await assertSucceeds(setDoc(doc(staffDb, 'businesses', BIZ, 'batches', 'b1'), { id: 'b1', quantity: 10 }));
    await assertSucceeds(updateDoc(doc(staffDb, 'businesses', BIZ, 'batches', 'b1'), { quantity: 5 }));
    await assertFails(deleteDoc(doc(staffDb, 'businesses', BIZ, 'batches', 'b1')));
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(deleteDoc(doc(ownerDb, 'businesses', BIZ, 'batches', 'b1')));
  });

  it('A user from another business cannot read, create, update, or delete this business\'s batches', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'batches', 'b2'), { id: 'b2', quantity: 20 });
    });
    const otherDb = ctxFor(OTHER_OWNER_UID).firestore();
    await assertFails(getDoc(doc(otherDb, 'businesses', BIZ, 'batches', 'b2')));
    await assertFails(setDoc(doc(otherDb, 'businesses', BIZ, 'batches', 'b3'), { id: 'b3', quantity: 1 }));
    await assertFails(updateDoc(doc(otherDb, 'businesses', BIZ, 'batches', 'b2'), { quantity: 999 }));
    await assertFails(deleteDoc(doc(otherDb, 'businesses', BIZ, 'batches', 'b2')));
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
    await assertSucceeds(setDoc(doc(staffDb, 'businesses', BIZ, 'quebras', 'q1'), { id: 'q1', quantity: 2 }));
    await assertSucceeds(updateDoc(doc(staffDb, 'businesses', BIZ, 'quebras', 'q1'), { quantity: 3 }));
    await assertFails(deleteDoc(doc(staffDb, 'businesses', BIZ, 'quebras', 'q1')));
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(deleteDoc(doc(ownerDb, 'businesses', BIZ, 'quebras', 'q1')));
  });

  it('A user from another business cannot read, create, update, or delete this business\'s quebras', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'businesses', BIZ, 'quebras', 'q2'), { id: 'q2', quantity: 5 });
    });
    const otherDb = ctxFor(OTHER_OWNER_UID).firestore();
    await assertFails(getDoc(doc(otherDb, 'businesses', BIZ, 'quebras', 'q2')));
    await assertFails(setDoc(doc(otherDb, 'businesses', BIZ, 'quebras', 'q3'), { id: 'q3', quantity: 1 }));
    await assertFails(updateDoc(doc(otherDb, 'businesses', BIZ, 'quebras', 'q2'), { quantity: 99 }));
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

  it('While trial_active, every restricted collection still accepts new records', async () => {
    await seedSubscriptionStatus('trial_active');
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertSucceeds(setDoc(doc(ownerDb, 'businesses', BIZ, 'batches', 'ta-b1'), { id: 'ta-b1', quantity: 1 }));
    await assertSucceeds(setDoc(doc(ownerDb, 'businesses', BIZ, 'purchaseBatches', 'ta-pb1'), { id: 'ta-pb1', archived: false }));
    await assertSucceeds(setDoc(doc(ownerDb, 'businesses', BIZ, 'quebras', 'ta-q1'), { id: 'ta-q1', quantity: 1 }));
    await assertSucceeds(setDoc(doc(ownerDb, 'businesses', BIZ, 'expenses', 'ta-e1'), { id: 'ta-e1', date: '2026-06-01', amount: 10 }));
    await assertSucceeds(setDoc(doc(ownerDb, 'businesses', BIZ, 'withdrawals', 'ta-w1'), { id: 'ta-w1', date: '2026-06-01', amount: 10 }));
    await assertSucceeds(setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'ta-sc1'), { id: 'ta-sc1', countedAt: '2026-06-01' }));
  });

  it('Once trial_completed, every restricted collection rejects new records', async () => {
    await seedSubscriptionStatus('trial_completed');
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(setDoc(doc(ownerDb, 'businesses', BIZ, 'batches', 'tc-b1'), { id: 'tc-b1', quantity: 1 }));
    await assertFails(setDoc(doc(ownerDb, 'businesses', BIZ, 'purchaseBatches', 'tc-pb1'), { id: 'tc-pb1', archived: false }));
    await assertFails(setDoc(doc(ownerDb, 'businesses', BIZ, 'quebras', 'tc-q1'), { id: 'tc-q1', quantity: 1 }));
    await assertFails(setDoc(doc(ownerDb, 'businesses', BIZ, 'expenses', 'tc-e1'), { id: 'tc-e1', date: '2026-06-01', amount: 10 }));
    await assertFails(setDoc(doc(ownerDb, 'businesses', BIZ, 'withdrawals', 'tc-w1'), { id: 'tc-w1', date: '2026-06-01', amount: 10 }));
    await assertFails(setDoc(doc(ownerDb, 'businesses', BIZ, 'stockCounts', 'tc-sc1'), { id: 'tc-sc1', countedAt: '2026-06-01' }));
  });

  it('Once expired, every restricted collection rejects new records (same as trial_completed)', async () => {
    await seedSubscriptionStatus('expired');
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(setDoc(doc(ownerDb, 'businesses', BIZ, 'batches', 'ex-b1'), { id: 'ex-b1', quantity: 1 }));
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
describe('platform_audit_log', () => {
  it('No role can read, create, update, or delete an audit event from the client', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'platform_audit_log', 'evt1'), {
        eventType: 'trial_activated',
        businessId: BIZ,
        subscriptionId: BIZ,
        occurredAt: '2026-01-01T00:00:00.000Z',
      });
    });
    const ownerDb = ctxFor(OWNER_UID).firestore();
    await assertFails(getDoc(doc(ownerDb, 'platform_audit_log', 'evt1')));
    await assertFails(setDoc(doc(ownerDb, 'platform_audit_log', 'evt2'), { eventType: 'trial_activated' }));
    await assertFails(updateDoc(doc(ownerDb, 'platform_audit_log', 'evt1'), { eventType: 'trial_completed' }));
    await assertFails(deleteDoc(doc(ownerDb, 'platform_audit_log', 'evt1')));
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
