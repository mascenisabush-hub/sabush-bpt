// Decision 58 — Periodic Contagem Interruption Persistence and
// Recovery Parity — Test Group F (cross-device finalization edge
// case), Firestore Security Rules emulator suite.
//
// [Implementation Authorization §3 item 2, §4 Test Group F; Rule 8
// Assessment §H] This is the one mandatory, gating verification the
// Implementation Authorization requires before the conditional §22
// meta-existence guard's necessity can be determined. It was not
// written as part of the Decision 58 code change itself (commit
// 2897673) because it requires the Firestore emulator, which this
// authoring session's own sandboxed environment cannot reach (see
// tests/periodic-contagem-shared-live-data-decisions-44-56-emulator.test.ts's
// own header comment for the identical, already-documented network
// constraint). Written once the Product Architect confirmed emulator
// access is available on a separate machine.
//
// SCENARIO (mirrors the Implementation Authorization §4 Test Group F
// text exactly): Device A holds a dirty row and, per Decision 58,
// would retry persisting it through the exact write shape
// savePeriodicStockDraftItem's transaction produces for a row whose
// document no longer exists ("first write" branch,
// AppContext.tsx:6630-6640) — exercised here directly against
// firestore.rules, not through application code, consistent with this
// suite's sibling emulator files' own stated methodology. Device B
// finalizes the same Contagem in between (simulated here via
// withSecurityRulesDisabled, mirroring recordStockCount's own atomic
// delete of the periodic draft's meta document and every item
// document — AppContext.tsx:5991-5997 — without needing to invoke the
// application code that performs it). Device A's stale write then
// executes.
//
// HOW TO RUN:
//   npm run test:decision-58-cross-device-finalization:emulator

import { readFileSync } from 'node:fs';
import { before, after, beforeEach, describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  initializeTestEnvironment,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, deleteDoc, getDoc, getDocs, collection } from 'firebase/firestore';

const PROJECT_ID = 'sabush-bpt-decision-58-cross-device-finalization-test';
const BIZ = 'biz1';
const OWNER_UID = 'owner1';

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
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', OWNER_UID), { role: 'owner', businessId: BIZ });
  });
});

function ownerDbFor() {
  return testEnv.authenticatedContext(OWNER_UID).firestore();
}

const ITEM_PATH = ['businesses', BIZ, 'stockCountDrafts', 'periodic', 'items', 'catalog:p1'] as const;
const META_PATH = ['businesses', BIZ, 'stockCountDrafts', 'periodic'] as const;
const STOCK_COUNTS_COLLECTION = ['businesses', BIZ, 'stockCounts'] as const;

describe('Decision 58 — Test Group F: stale interruption retry executing after a different device finalized the same Contagem', () => {
  it('setup: seed Device A\'s last-synced row and the draft meta document, as a real prior Contagem in progress', async () => {
    const db = ownerDbFor();
    await assertSucceeds(
      setDoc(doc(db, ...ITEM_PATH), {
        productName: 'Produto X', quantity: '12', unit: 'un', costPrice: '5', sellingPrice: '8',
        rev: 1, state: 'ACCEPTED', lastWriterUid: OWNER_UID, lastWriterRole: 'owner', lastWriteAt: new Date().toISOString(),
      })
    );
    await assertSucceeds(
      setDoc(doc(db, ...META_PATH), { type: 'monthly', date: '2026-09-01', updatedAt: new Date().toISOString() })
    );
  });

  it('Device B finalizes: the draft meta document and every item document are deleted atomically (simulating recordStockCount\'s own cleanup)', async () => {
    const db = ownerDbFor();
    await setDoc(doc(db, ...ITEM_PATH), {
      productName: 'Produto X', quantity: '12', unit: 'un', costPrice: '5', sellingPrice: '8',
      rev: 1, state: 'ACCEPTED', lastWriterUid: OWNER_UID, lastWriterRole: 'owner', lastWriteAt: new Date().toISOString(),
    });
    await setDoc(doc(db, ...META_PATH), { type: 'monthly', date: '2026-09-01', updatedAt: new Date().toISOString() });

    // recordStockCount's own atomic batch (AppContext.tsx:5991-5997) —
    // simulated directly, not through application code, exactly like
    // this suite's own seedRow-style helpers do for setup elsewhere.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const bypassDb = ctx.firestore();
      await deleteDoc(doc(bypassDb, ...ITEM_PATH));
      await deleteDoc(doc(bypassDb, ...META_PATH));
    });

    const metaSnap = await getDoc(doc(db, ...META_PATH));
    assert.equal(metaSnap.exists(), false, 'Precondition: finalization must have genuinely deleted the meta document before Device A\'s stale retry below.');
  });

  it('Device A\'s stale retry (the exact "first write" transaction shape) is accepted by firestore.rules against the now-deleted item path', async () => {
    const db = ownerDbFor();
    await setDoc(doc(db, ...ITEM_PATH), {
      productName: 'Produto X', quantity: '12', unit: 'un', costPrice: '5', sellingPrice: '8',
      rev: 1, state: 'ACCEPTED', lastWriterUid: OWNER_UID, lastWriterRole: 'owner', lastWriteAt: new Date().toISOString(),
    });
    await setDoc(doc(db, ...META_PATH), { type: 'monthly', date: '2026-09-01', updatedAt: new Date().toISOString() });
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const bypassDb = ctx.firestore();
      await deleteDoc(doc(bypassDb, ...ITEM_PATH));
      await deleteDoc(doc(bypassDb, ...META_PATH));
    });

    // [Implementation Authorization §4 Test Group F] The stale retry
    // itself — savePeriodicStockDraftItem's transaction, against an
    // item document that no longer exists, takes the "first write"
    // branch (AppContext.tsx:6630-6640) and writes rev:1/ACCEPTED
    // unconditionally. No check anywhere in that branch, or in
    // firestore.rules' own `create` grant (firestore.rules:1453-1457),
    // consults whether the parent meta document currently exists.
    await assertSucceeds(
      setDoc(doc(db, ...ITEM_PATH), {
        productName: 'Produto X', quantity: '12', unit: 'un', costPrice: '5', sellingPrice: '8',
        rev: 1, state: 'ACCEPTED', lastWriterUid: OWNER_UID, lastWriterRole: 'owner', lastWriteAt: new Date().toISOString(),
      })
    );
  });

  it('the stale retry does not mutate finalized stockCounts, does not touch openConflictCount, and does not recreate the meta document', async () => {
    const db = ownerDbFor();
    await setDoc(doc(db, ...ITEM_PATH), {
      productName: 'Produto X', quantity: '12', unit: 'un', costPrice: '5', sellingPrice: '8',
      rev: 1, state: 'ACCEPTED', lastWriterUid: OWNER_UID, lastWriterRole: 'owner', lastWriteAt: new Date().toISOString(),
    });
    await setDoc(doc(db, ...META_PATH), { type: 'monthly', date: '2026-09-01', updatedAt: new Date().toISOString() });
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const bypassDb = ctx.firestore();
      // Finalization's own write, for realism — a genuine stockCounts
      // document now exists, exactly as it would after a real
      // recordStockCount call.
      await setDoc(doc(bypassDb, ...STOCK_COUNTS_COLLECTION, 'stockcount-periodic-sub-001'), {
        type: 'monthly', date: '2026-09-01', items: [{ productId: 'p1', quantity: '12' }], confirmedAt: new Date().toISOString(),
      });
      await deleteDoc(doc(bypassDb, ...ITEM_PATH));
      await deleteDoc(doc(bypassDb, ...META_PATH));
    });

    await setDoc(doc(db, ...ITEM_PATH), {
      productName: 'Produto X', quantity: '12', unit: 'un', costPrice: '5', sellingPrice: '8',
      rev: 1, state: 'ACCEPTED', lastWriterUid: OWNER_UID, lastWriterRole: 'owner', lastWriteAt: new Date().toISOString(),
    });

    const stockCountSnap = await testEnv.withSecurityRulesDisabled((ctx) =>
      getDoc(doc(ctx.firestore(), ...STOCK_COUNTS_COLLECTION, 'stockcount-periodic-sub-001'))
    );
    assert.deepEqual(
      (stockCountSnap.data() as any).items,
      [{ productId: 'p1', quantity: '12' }],
      'Finalized stockCounts must be byte-for-byte unchanged by Device A\'s stale retry — that retry never targets stockCounts under any code path.'
    );

    const metaSnapAfter = await testEnv.withSecurityRulesDisabled((ctx) => getDoc(doc(ctx.firestore(), ...META_PATH)));
    assert.equal(
      metaSnapAfter.exists(),
      false,
      'The stale retry\'s "first write" branch never touches the meta document (only the CONFLICT-creation/resolution branches read+write openConflictCount on it) — it must remain absent, not resurrected as a side effect.'
    );
  });

  it('DETERMINING RESULT: a subsequently created active Contagem DOES inherit the orphaned item — its own items subcollection query is unfiltered by any per-Contagem generation field', async () => {
    const db = ownerDbFor();
    // Same stale-retry setup as the tests above, ending with the
    // orphaned item present and the meta document absent.
    await setDoc(doc(db, ...ITEM_PATH), {
      productName: 'Produto X', quantity: '12', unit: 'un', costPrice: '5', sellingPrice: '8',
      rev: 1, state: 'ACCEPTED', lastWriterUid: OWNER_UID, lastWriterRole: 'owner', lastWriteAt: new Date().toISOString(),
    });
    await setDoc(doc(db, ...META_PATH), { type: 'monthly', date: '2026-09-01', updatedAt: new Date().toISOString() });
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const bypassDb = ctx.firestore();
      await deleteDoc(doc(bypassDb, ...ITEM_PATH));
      await deleteDoc(doc(bypassDb, ...META_PATH));
    });
    await setDoc(doc(db, ...ITEM_PATH), {
      productName: 'Produto X', quantity: '12', unit: 'un', costPrice: '5', sellingPrice: '8',
      rev: 1, state: 'ACCEPTED', lastWriterUid: OWNER_UID, lastWriterRole: 'owner', lastWriteAt: new Date().toISOString(),
    });

    // A brand-new Periodic Contagem begins — savePeriodicStockDraftMeta's
    // own write shape (AppContext.tsx:6803-6844): a fresh, non-merge
    // setDoc of ONLY the meta document. It never reads, enumerates, or
    // clears the items subcollection — that subcollection's own
    // documents are addressed purely by the fixed path
    // stockCountDrafts/periodic/items/{rowKey}, which every Periodic
    // Contagem for this business reuses identically; there is no
    // per-Contagem-instance path segment or generation field anywhere
    // in this schema.
    await setDoc(doc(db, ...META_PATH), { type: 'monthly', date: '2026-09-15', updatedAt: new Date().toISOString() });

    // This is the exact query PeriodicStockCountView.tsx's own
    // periodicStockDraftItemsByKey listener issues — unfiltered by
    // submissionId, date, or any other generation marker.
    const itemsSnap = await getDocs(collection(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic', 'items'));
    const keys = itemsSnap.docs.map((d) => d.id);
    assert.ok(
      keys.includes('catalog:p1'),
      'DETERMINING RESULT for Implementation Authorization §3 item 2: the orphaned item from the FINALIZED, prior Contagem is present in the NEW Contagem\'s own items subcollection query — a live listener attached during the new Contagem would render it as an already-counted row the operator never entered this session. This confirms the orphan-visibility concern Test Group F exists to check is REAL, not merely theoretical — the §22 meta-existence guard is necessary.'
    );
  });
});
