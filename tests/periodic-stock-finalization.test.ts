// Periodic Stock Count finalization — idempotency and draft round-trip,
// against a REAL Firestore emulator, not application code.
//
// [Stock Count Data-Loss Resilience — Implementation Task, §14 items 2 & 3]
//
// WHY THIS FILE EXISTS AS A SEPARATE SUITE FROM tests/firestore-rules.test.ts:
// that file proves WHO can read/write WHAT (security rules). This file
// proves a different, genuinely Firestore-level property: that repeated
// execution of the SAME logical submission — an ambiguous commit
// followed by a client retry — converges to exactly one stockCounts
// document and exactly one timelineEvents document, and that a 300+-row
// draft survives a real write/read round-trip against the emulator's
// actual document-size and query behavior, not just this repo's own JS
// logic (which tests/stock-count-simplification.test.ts already proves
// separately, without needing a live Firestore dependency for that
// narrower concern).
//
// This suite intentionally does NOT invoke AppContext.tsx's
// recordStockCount()/savePeriodicStockDraft() directly — those are
// tightly coupled to the live Firebase client SDK's `db` singleton and
// React state, the same constraint documented throughout this repo's
// test suite (see tests/initial-stock-confirmation.test.ts's own header).
// Instead, this suite performs the exact same Firestore operations those
// functions perform (same deterministic id formulas, same batch shape),
// directly against the emulator, and asserts on the resulting documents —
// proving the DATA-LEVEL property the mechanism depends on, independent
// of whether the calling React code is wired correctly (that wiring is
// covered separately by tests/periodic-stock-draft-resurrection.test.ts's
// source-level guards).
//
// HOW TO RUN:
//   npm run test:periodic-stock-finalization
// Requires a Firestore emulator on localhost:8080, same as
// tests/firestore-rules.test.ts. One-shot with emulator lifecycle
// managed automatically:
//   npm run test:periodic-stock-finalization:emulator
//
// SANDBOX DISCLOSURE: this suite could not be executed in the
// environment that authored it — network egress there is allow-listed to
// a fixed set of domains (npm, github, pypi, crates.io, ubuntu archives)
// and does not include Google's emulator-binary infrastructure. It has
// been typechecked but NOT run end-to-end. Treat a clean run of
// `npm run test:periodic-stock-finalization:emulator` as the actual
// acceptance gate, not this file's existence or a typecheck pass.
//
// [Bug fix — per-product independent draft persistence] Updated for the
// new draft storage shape (a small META document plus an `items`
// subcollection — one document per row — replacing the old single
// document with one `items` array field; see AppContext.tsx's own
// periodicStockDraftMeta/periodicStockDraftItemsByKey comment for the
// full rationale). The writeDraft/readDraft helpers below mirror the
// app's own new write/read shape. Like every other change in this file,
// this update is typechecked but has NOT been run against a live
// emulator in this environment — the same SANDBOX DISCLOSURE above
// applies to it in full.
//
// [Decision 38 Amendment, 24 August 2026 — Implementation Task §7 items
// 11-12; Implementation Authorization §2 item 2, §8 items 5-6] Extended
// with a new describe block covering newProductInfo's own round-trip
// and backward-compatibility properties, same emulator harness, same
// SANDBOX DISCLOSURE above — these new tests are equally untested
// end-to-end in this environment for the identical reason.

import { strict as assert } from 'node:assert';
import { before, after, beforeEach, describe, it } from 'node:test';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, writeBatch } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const PROJECT_ID = 'sabush-bpt-periodic-finalization-test';
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
    await setDoc(doc(ctx.firestore(), 'users', OWNER_UID), { role: 'owner', businessId: BIZ });
    // No subscriptions/{BIZ} doc seeded — subscriptionAllowsNewRecords()
    // fails open (allows) when none exists, matching this repo's own
    // documented interim behavior (see firestore.rules' own comment on
    // hasSubscription()). Deliberate: this suite is about idempotency,
    // not subscription gating, which tests/firestore-rules.test.ts
    // already covers separately.
  });
});

function ownerDbFor() {
  return testEnv.authenticatedContext(OWNER_UID).firestore();
}

// Mirrors AppContext.tsx's recordStockCount() deterministic-id formulas
// exactly (Implementation Task §3) — kept as literal string templates
// here, not imported, since this suite deliberately exercises Firestore
// directly rather than through application code (see file header).
const stockCountId = (submissionId: string) => 'stockcount-periodic-' + submissionId;
const timelineEventId = (submissionId: string) => 'tl-periodic-' + submissionId;

// [Bug fix — per-product independent draft persistence] Mirrors
// AppContext.tsx's own new draft shape exactly (see that file's
// periodicStockDraftMeta/periodicStockDraftItemsByKey state comment,
// and savePeriodicStockDraftItem/savePeriodicStockDraftMeta/
// flushPeriodicStockDraftRows): the periodic draft is now a small META
// document (everything except `items`) plus an `items` SUBCOLLECTION,
// one document per row, keyed exactly like PeriodicStockCountView.tsx's
// own scheduleRowDraftSave rowKey convention (`catalog:{productId}` /
// `manual:{index}`). These two helpers replace every direct
// `setDoc(doc(..., 'periodic'), draft)` / `getDoc(doc(..., 'periodic'))`
// call this suite used to make against the OLD single-document shape —
// same Firestore operations the app itself now performs, still
// exercised directly rather than through application code (see file
// header), just against the current shape instead of the superseded
// one.
function draftItemRowKey(item: { productId?: string }, index: number): string {
  return item.productId ? `catalog:${item.productId}` : `manual:${index}`;
}

async function writeDraft(
  db: ReturnType<typeof ownerDbFor>,
  draft: { items: Array<Record<string, unknown>> } & Record<string, unknown>
) {
  const { items, ...meta } = draft;
  const fsBatch = writeBatch(db);
  fsBatch.set(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic'), meta);
  items.forEach((item, index) => {
    fsBatch.set(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic', 'items', draftItemRowKey(item, index)), item);
  });
  await fsBatch.commit();
}

async function readDraft(
  db: ReturnType<typeof ownerDbFor>
): Promise<({ items: Array<Record<string, unknown>> } & Record<string, unknown>) | null> {
  const metaSnap = await getDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic'));
  if (!metaSnap.exists()) return null;
  const itemsSnap = await getDocs(collection(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic', 'items'));
  const catalogItems: Array<Record<string, unknown>> = [];
  const manualEntries: { index: number; item: Record<string, unknown> }[] = [];
  itemsSnap.forEach((itemDoc) => {
    const key = itemDoc.id;
    if (key.startsWith('catalog:')) {
      catalogItems.push(itemDoc.data());
    } else if (key.startsWith('manual:')) {
      const index = parseInt(key.slice('manual:'.length), 10);
      if (Number.isFinite(index)) manualEntries.push({ index, item: itemDoc.data() });
    }
  });
  manualEntries.sort((a, b) => a.index - b.index);
  return { ...(metaSnap.data() as Record<string, unknown>), items: [...catalogItems, ...manualEntries.map((e) => e.item)] };
}

describe('§14 item 2 — ambiguous commit + retry converges to exactly one logical result', () => {
  it('a retried stockCounts write under the same submissionId produces exactly one document, not two', async () => {
    const db = ownerDbFor();
    const submissionId = 'sub-test-001';
    const countId = stockCountId(submissionId);

    const stockCountBody = {
      id: countId,
      type: 'monthly',
      date: '2026-08-10',
      items: [{ productId: 'p1', productName: 'Arroz', quantity: 10, unit: 'kg', costPrice: 50, sellingPrice: 65, totalValue: 500 }],
      totalValue: 500,
      createdAt: new Date().toISOString(),
    };

    // Attempt 1: server "commits" this — simulated directly as a
    // successful write (the ambiguity is about what the CLIENT observed,
    // not about whether the server-side write itself happened).
    const batch1 = writeBatch(db);
    batch1.set(doc(db, 'businesses', BIZ, 'stockCounts', countId), stockCountBody);
    batch1.delete(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic'));
    await assertSucceeds(batch1.commit());

    // Attempt 2: the retry — client never saw attempt 1's result
    // (connectivity dropped), so it resubmits the SAME logical
    // finalization under the SAME submissionId. This is exactly what
    // handleConfirmSave does: submissionIdRef.current is not cleared on
    // a failed/ambiguous attempt (see periodic-stock-draft-resurrection
    // .test.ts's own regression guard for that specific behavior).
    const batch2 = writeBatch(db);
    batch2.set(doc(db, 'businesses', BIZ, 'stockCounts', countId), stockCountBody);
    batch2.delete(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic'));
    await assertSucceeds(batch2.commit());

    // Exactly one document must exist at the deterministic id — this is
    // the core claim: a retry is a harmless overwrite, never a second
    // document, because both writes target the SAME id.
    const snap = await getDoc(doc(db, 'businesses', BIZ, 'stockCounts', countId));
    assert.equal(snap.exists(), true);
    assert.deepEqual(snap.data()?.items, stockCountBody.items);

    // Belt-and-suspenders: query the whole stockCounts collection and
    // confirm there is exactly one document total for this business —
    // rules out a scenario where the retry somehow landed on a
    // DIFFERENT id (e.g. a bug reintroducing Date.now()-based ids) that
    // this narrower doc-level check wouldn't catch.
    const allCounts = await getDocs(collection(db, 'businesses', BIZ, 'stockCounts'));
    assert.equal(allCounts.size, 1, `Expected exactly 1 stockCounts document after a retry under the same submissionId, found ${allCounts.size}.`);
  });

  it('a retried timelineEvents write under the same submissionId-derived id converges to exactly one document — via rejection, not overwrite', async () => {
    // [Correction found by this very test, see Implementation Task §9]
    // timelineEvents' own rule (firestore.rules) is `allow update: if
    // false` — unconditionally append-only, pre-existing, untouched by
    // this task. A write to an id that already holds a document is
    // classified by Firestore as an UPDATE, so the retry below is
    // correctly expected to be REJECTED, not accepted as a no-op
    // overwrite. This still produces the required observable outcome —
    // exactly one document — because AppContext.tsx's logTimelineEvent
    // already swallows this exact rejection in its own pre-existing
    // try/catch, so recordStockCount never throws because of it.
    const db = ownerDbFor();
    const submissionId = 'sub-test-002';
    const eventId = timelineEventId(submissionId);

    const eventBody = {
      id: eventId,
      type: 'stock-verification',
      date: '2026-08-10',
      createdAt: new Date().toISOString(),
      userName: 'Owner',
      title: 'Verificação de Stock Concluída',
      description: 'Contagem física de stock (monthly) com 1 produto(s).',
    };

    await assertSucceeds(setDoc(doc(db, 'businesses', BIZ, 'timelineEvents', eventId), eventBody));
    // Retry — same deterministic id, same content. This MUST fail
    // (rejected by the append-only rule) — a passing assertSucceeds
    // here would mean the rule had silently changed to allow edits,
    // which would be a far more serious, unrelated regression.
    await assertFails(setDoc(doc(db, 'businesses', BIZ, 'timelineEvents', eventId), eventBody));

    const allEvents = await getDocs(collection(db, 'businesses', BIZ, 'timelineEvents'));
    assert.equal(allEvents.size, 1, `Expected exactly 1 timelineEvents document after a retry under the same submissionId, found ${allEvents.size}.`);
    // The one surviving document is attempt 1's — rejection of the
    // retry never touched or corrupted it.
    const snap = await getDoc(doc(db, 'businesses', BIZ, 'timelineEvents', eventId));
    assert.equal(snap.exists(), true);
    assert.equal(snap.data()?.title, eventBody.title);
  });

  it('two DIFFERENT submissionIds (two genuinely separate periodic counts) produce two separate stockCounts documents — the mechanism does not over-collapse unrelated counts', async () => {
    const db = ownerDbFor();
    const bodyFor = (submissionId: string) => ({
      id: stockCountId(submissionId),
      type: 'monthly',
      date: '2026-08-10',
      items: [{ productId: 'p1', productName: 'Arroz', quantity: 10, unit: 'kg', costPrice: 50, sellingPrice: 65, totalValue: 500 }],
      totalValue: 500,
      createdAt: new Date().toISOString(),
    });
    await assertSucceeds(setDoc(doc(db, 'businesses', BIZ, 'stockCounts', stockCountId('sub-A')), bodyFor('sub-A')));
    await assertSucceeds(setDoc(doc(db, 'businesses', BIZ, 'stockCounts', stockCountId('sub-B')), bodyFor('sub-B')));

    const allCounts = await getDocs(collection(db, 'businesses', BIZ, 'stockCounts'));
    assert.equal(allCounts.size, 2, 'Two distinct submission identities must produce two distinct stockCounts documents, not be collapsed into one.');
  });
});

describe('§14 item 3 — periodic draft persists and is recoverable at 300+ rows', () => {
  it('a 300-row periodic draft (catalog rows, removed rows, and manual rows mixed) round-trips through the emulator unchanged', async () => {
    const db = ownerDbFor();

    const items: Array<{
      productId?: string;
      productName: string;
      quantity: string;
      unit: string;
      costPrice: string;
      sellingPrice: string;
      removed?: boolean;
      // [Decision 40 — Validar Workflow, FR-N6/FR-N7] Additive
      // optional field, exercised here the exact same way `removed`
      // already is, immediately above — same SANDBOX DISCLOSURE
      // (header of this file) applies: typechecked, not run
      // end-to-end in the authoring environment.
      validated?: boolean;
    }> = [];
    for (let i = 0; i < 280; i++) {
      // Mix of blank, zero, and positive quantities, and a scattering of
      // removed catalog rows — matching the real working list's shape.
      const quantity = i % 5 === 0 ? '' : i % 5 === 1 ? '0' : String(i);
      items.push({
        productId: 'p' + i,
        productName: 'Produto ' + i,
        quantity,
        unit: 'un',
        costPrice: '10.5',
        sellingPrice: '15.75',
        ...(i % 11 === 0 ? { removed: true } : {}),
        // [Decision 40 — Validar Workflow] A scattering of validated
        // rows, independent of the `removed` scattering above (i % 7
        // vs. i % 11 — deliberately different moduli so the two flags
        // overlap on some rows and not others, exactly like the real
        // orthogonal relationship between them in the component).
        ...(i % 7 === 0 ? { validated: true } : {}),
      });
    }
    // 20 manually-added (non-catalog) rows, no productId — matching
    // §14 item 3's explicit "manual rows" requirement.
    for (let i = 0; i < 20; i++) {
      items.push({
        productName: 'Manual ' + i,
        quantity: String(i + 1),
        unit: 'un',
        costPrice: '5',
        sellingPrice: '8',
        // [Decision 40 — Validar Workflow] Every third manual row
        // validated, same orthogonal-scattering approach as above.
        ...(i % 3 === 0 ? { validated: true } : {}),
      });
    }
    assert.equal(items.length, 300);

    const draft = {
      items,
      type: 'monthly',
      date: '2026-08-10',
      submissionId: 'sub-recovery-test',
      updatedAt: new Date().toISOString(),
    };

    await writeDraft(db, draft);

    // Simulate a reload/remount: read the draft back exactly as
    // AppContext.tsx's own periodicStockDraftMeta/
    // periodicStockDraftItemsByKey listeners would reassemble it.
    const restored = await readDraft(db);
    assert.notEqual(restored, null);
    assert.equal(restored!.items.length, 300, 'All 300 rows must survive the round-trip.');
    // Every blank stays blank, every zero stays zero — the same property
    // tests/stock-count-simplification.test.ts already proves at the
    // pure-function level, checked again here at the actual Firestore
    // storage layer. Catalog rows are matched by productId (order is
    // not guaranteed to be preserved across the subcollection
    // reassembly for catalog rows — same as AppContext.tsx's own
    // reassembly, which never relied on catalog order either, only
    // manual rows' relative order, reconstructed via their own
    // `manual:{index}` key).
    const restoredByProductId = new Map(restored!.items.filter((it) => it.productId).map((it) => [it.productId, it]));
    for (const original of items) {
      if (!original.productId) continue;
      const found = restoredByProductId.get(original.productId);
      assert.ok(found, `catalog row ${original.productId} missing after round-trip`);
      assert.equal(found!.quantity, original.quantity, `row ${original.productId}: quantity mismatch after round-trip`);
      assert.equal(found!.removed, original.removed, `row ${original.productId}: removed flag mismatch after round-trip`);
      // [Decision 40 — Validar Workflow] validated survives the same
      // real Firestore write/read round-trip, at scale, alongside
      // every other field — not merely at the pure-JS level (that
      // narrower property is proven separately, without an emulator
      // dependency, in tests/periodic-contagem-validar-decision-40.test.ts).
      assert.equal(found!.validated, original.validated, `row ${original.productId}: validated flag mismatch after round-trip`);
    }
    // Manual rows (no productId) specifically preserved, in their
    // original relative order (reconstructed via their own
    // `manual:{index}` key, exactly like AppContext.tsx's own
    // reassembly).
    const restoredManualItems = restored!.items.filter((it) => !it.productId);
    assert.equal(restoredManualItems.length, 20);
    const originalManualItems = items.filter((it) => !it.productId);
    for (let i = 0; i < originalManualItems.length; i++) {
      assert.equal(restoredManualItems[i].productName, originalManualItems[i].productName, `manual row ${i}: order/identity mismatch after round-trip`);
      assert.equal(restoredManualItems[i].validated, originalManualItems[i].validated, `manual row ${i}: validated flag mismatch after round-trip`);
    }
    // [Decision 40 — Validar Workflow] At least one validated row of
    // each kind (catalog and manual) actually survived the round-trip
    // as `true` — guards against a vacuously-passing loop above if
    // every scattered `true` happened to collapse to `undefined`.
    const restoredValidatedCatalogCount = restored!.items.filter((it) => it.productId && it.validated === true).length;
    const restoredValidatedManualCount = restored!.items.filter((it) => !it.productId && it.validated === true).length;
    assert.ok(restoredValidatedCatalogCount > 0, 'Expected at least one validated catalog row to survive the round-trip.');
    assert.ok(restoredValidatedManualCount > 0, 'Expected at least one validated manual row to survive the round-trip.');

    // The submission identity itself is durable and reads back exactly
    // — this is the specific property Implementation Task §4b depends
    // on: a client that reloads after establishSubmissionIdentity's
    // write has landed must see the SAME identity a retry would need
    // to reuse. Lives on the META document specifically.
    assert.equal(restored!.submissionId, 'sub-recovery-test');
  });

  it('a draft written without a validated field anywhere (a legacy, pre-Decision-40 draft) round-trips with the field entirely absent on every item, never as a fabricated false', async () => {
    const db = ownerDbFor();
    const draft = {
      items: [
        { productId: 'p1', productName: 'Arroz', quantity: '10', unit: 'kg', costPrice: '50', sellingPrice: '65' },
        { productName: 'Manual', quantity: '3', unit: 'un', costPrice: '5', sellingPrice: '8' },
      ],
      type: 'monthly',
      date: '2026-08-10',
      updatedAt: new Date().toISOString(),
    };
    await writeDraft(db, draft);
    const restored = await readDraft(db);
    assert.notEqual(restored, null);
    for (const item of restored!.items) {
      assert.equal('validated' in item, false, 'A legacy item must resume with validated entirely absent, never as a fabricated false.');
    }
  });

  it('a draft written without a submissionId yet (still editing, before first confirmation) round-trips with the field entirely absent, never as an empty string', async () => {
    const db = ownerDbFor();
    const draft = {
      items: [{ productId: 'p1', productName: 'Arroz', quantity: '10', unit: 'kg', costPrice: '50', sellingPrice: '65' }],
      type: 'monthly',
      date: '2026-08-10',
      updatedAt: new Date().toISOString(),
    };
    await writeDraft(db, draft);
    const restored = await readDraft(db);
    assert.notEqual(restored, null);
    assert.equal('submissionId' in restored!, false, 'submissionId must be entirely absent before the first confirmation attempt, not present as an empty/placeholder value.');
  });
});

// [Stock Count Data-Loss Resilience — Decision 38 Amendment,
// Implementation Task §7 items 11-12; Implementation Authorization §2
// item 2, §8 items 5-6]
describe('§7 items 11-12 (Decision 38 Amendment) — newProductInfo durable draft content', () => {
  it('item 11: a draft including newProductInfo round-trips unchanged through write/read', async () => {
    const db = ownerDbFor();
    const newProductInfo = {
      'produto novo': {
        purchaseUnit: 'caixa',
        purchaseCost: '120.5',
        relationshipSteps: [
          { unit: 'unidade', factor: '24' },
          { unit: 'pacote', factor: '6' },
        ],
      },
      'outro produto': {
        purchaseUnit: 'saco',
        purchaseCost: '45',
        relationshipSteps: [{ unit: 'kg', factor: '25' }],
      },
    };
    const draft = {
      items: [{ productName: 'Produto Novo', quantity: '3', unit: 'caixa', costPrice: '120.5', sellingPrice: '150' }],
      type: 'monthly',
      date: '2026-08-10',
      newProductInfo,
      updatedAt: new Date().toISOString(),
    };
    await writeDraft(db, draft);
    const restored = await readDraft(db);
    assert.notEqual(restored, null);
    assert.deepEqual(
      restored!.newProductInfo,
      newProductInfo,
      'newProductInfo must round-trip byte-for-byte through the emulator, on the META document — including its nested relationshipSteps array and multiple product keys.'
    );
  });

  it('item 12: a pre-existing draft written WITHOUT newProductInfo reads back with the field correctly absent/empty, not erroring', async () => {
    const db = ownerDbFor();
    // Simulates a draft written before this amendment existed — no
    // newProductInfo key at all, exactly like the pre-amendment
    // §14 item 3 draft shape above.
    const draft = {
      items: [{ productId: 'p1', productName: 'Arroz', quantity: '10', unit: 'kg', costPrice: '50', sellingPrice: '65' }],
      type: 'monthly',
      date: '2026-08-10',
      submissionId: 'sub-legacy-001',
      updatedAt: new Date().toISOString(),
    };
    await writeDraft(db, draft);
    const restored = await readDraft(db);
    assert.notEqual(restored, null);
    assert.equal(
      'newProductInfo' in restored!,
      false,
      'newProductInfo must be entirely absent on a pre-existing draft — never present as an empty object or null placeholder, and reading it back must not throw.'
    );
    // The resume path's own `?? {}` fallback (PeriodicStockCountView.tsx
    // handleResumeDraft) is what turns this absence into an empty
    // object at the application layer — this test proves the
    // Firestore-level precondition that fallback depends on: the field
    // is genuinely undefined/absent here, not some other falsy value
    // that `?? {}` would not correctly handle the same way.
    assert.equal((restored as any).newProductInfo, undefined);
  });

  it('a draft can be resumed, edited to ADD newProductInfo, and re-saved — the field transitions from absent to present across two writes to the same meta document', async () => {
    const db = ownerDbFor();

    // Write 1: no newProductInfo yet (operator hasn't reached a new
    // product's info panel).
    await writeDraft(db, {
      items: [{ productName: 'Produto Novo', quantity: '1', unit: 'un', costPrice: '', sellingPrice: '' }],
      type: 'monthly',
      date: '2026-08-10',
      updatedAt: new Date().toISOString(),
    });
    let restored = await readDraft(db);
    assert.notEqual(restored, null);
    assert.equal('newProductInfo' in restored!, false);

    // Write 2 (same META document, now including newProductInfo — the
    // items subcollection's own already-written document for this
    // manual row is independently overwritten too, exactly like
    // savePeriodicStockDraftItem's own per-row write would do).
    const newProductInfo = { 'produto novo': { purchaseUnit: 'un', purchaseCost: '10', relationshipSteps: [] } };
    await writeDraft(db, {
      items: [{ productName: 'Produto Novo', quantity: '1', unit: 'un', costPrice: '10', sellingPrice: '15' }],
      type: 'monthly',
      date: '2026-08-10',
      newProductInfo,
      updatedAt: new Date().toISOString(),
    });
    restored = await readDraft(db);
    assert.notEqual(restored, null);
    assert.deepEqual(restored!.newProductInfo, newProductInfo);
  });
});
