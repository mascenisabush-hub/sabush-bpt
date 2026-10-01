// SABUSH BPT — "Missing or insufficient permissions" saving a purchase
// (Owner-reported, 2026-09-30). A restock of an EXISTING product at a new
// cost price also updated the product's catalog cost inside the same
// all-or-nothing batch; firestore.rules allow that product update only to
// the owner or staff with the catalog permission, so the whole purchase
// was refused for other staff.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ctx = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf-8');
const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf-8');
const start = ctx.indexOf('const addMultipleStockBatches = async');
const body = ctx.slice(start, ctx.indexOf('\n  };\n', start));

test('the rule: updating a product is owner-or-catalog-permission only', () => {
  const block = rules.slice(rules.indexOf('match /products/{productId}'));
  assert.match(block.slice(0, block.indexOf('match /', 10)), /allow update, delete: if ownerOrPerm\(businessId, 'catalog_act'\);/);
});

test('the purchase only updates the catalog cost when the user holds that same permission', () => {
  const update = body.indexOf("fsBatch.update(doc(db, 'businesses', businessId, 'products', product.id), {");
  assert.ok(update > 0);
  const guard = body.slice(update - 300, update);
  assert.match(guard, /product &&\s*can\('catalog', 'act'\) &&/);
  // can(area, level) = owner OR permissions[`${area}_${level}`] — the same key the rule checks
  assert.match(ctx, /const can = \(area: PermissionArea, level: PermissionLevel = 'view'\): boolean =>\s*isOwner \|\| permissions\[permissionKey\(area, level\)\] === true;/);
});

test('no other product write in the purchase batch can be refused for staff', () => {
  const productWrites = body.match(/fsBatch\.(set|update)\(doc\(db, 'businesses', businessId, 'products'/g) ?? [];
  assert.equal(productWrites.length, 1, 'only the guarded update — new products go through prodRef (create, allowed by canAddStock)');
  assert.match(body, /const prodRef = doc\(db, 'businesses', businessId, 'products', productId\);\s*fsBatch\.set\(prodRef, newProd\);/);
});

test('a refused save explains itself in Portuguese (nothing was saved)', () => {
  assert.match(body, /try \{\s*await fsBatch\.commit\(\);\s*\} catch \(err\) \{[\s\S]*?code === 'permission-denied'/);
  assert.match(body, /Não tem permissão para guardar esta compra\. Nada foi guardado\./);
});
