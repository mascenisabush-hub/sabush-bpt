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
// SCOPE: covers the Closing Integrity Amendment's new/changed rules
// (expenses, withdrawals, closings, closedPeriods) plus enough tenant-
// isolation coverage on those same collections to catch an obvious
// regression. It is deliberately not a full security audit of every
// collection in firestore.rules — that is a separate, larger piece of
// work (see HANDOFF.md's flagged priorities).

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
} from 'firebase/firestore';

const PROJECT_ID = 'sabush-bpt-rules-test';
const BIZ = 'biz1';
const OTHER_BIZ = 'biz2';

const OWNER_UID = 'owner1';
const OTHER_OWNER_UID = 'owner2'; // owns OTHER_BIZ, not BIZ — tenant isolation checks
const MANAGER_WITH_CLOSINGS_UID = 'manager1';
const MANAGER_NO_PERMISSION_UID = 'manager2';
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
