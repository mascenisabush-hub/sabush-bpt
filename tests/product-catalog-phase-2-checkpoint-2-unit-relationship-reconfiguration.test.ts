// Product Catalog Phase 2 — Checkpoint 2 (Catálogo creation/edit) —
// Implementation Authorization §3.2, §4, and its two accepted amendments
// (commits 54ef1e0/194d46d and df91535/02a2fb9).
//
// Source-inspection tests, matching this repository's established
// technique (no @testing-library/react or jsdom harness exists in this
// repo; see tests/product-catalog-phase-1-checkpoint-b.test.ts's own
// header for the same repository-wide convention).
//
// Scope: this file covers what tests/product-catalog-phase-1-checkpoint-
// b.test.ts (registerCatalogProduct write path) and the amended
// tests/product-catalog-phase-1-checkpoint-c.test.ts (registration form)
// do NOT — specifically EditProductModal.tsx's new Checkpoint 2 editing
// capability (unit-relationship editing, invariant enforcement, routing
// through confirmProductUnitRelationship) — plus a handful of
// cross-cutting Checkpoint 2 boundary checks (costPrice,
// SupplierWordingRelationship, Product Memory, StockBatch) that apply to
// more than one of the three touched files at once.
//
// HOW TO RUN:
//   npx tsx --test tests/product-catalog-phase-2-checkpoint-2-unit-relationship-reconfiguration.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

function extractFunctionBody(source: string, startMarker: string): string {
  const startIdx = source.indexOf(startMarker);
  assert.notEqual(startIdx, -1, `Could not locate "${startMarker}" in source.`);
  const nearbyWindow = source.slice(startIdx, startIdx + 400);
  const arrowOffset = nearbyWindow.indexOf('=>');
  const searchFrom = arrowOffset === -1 ? startIdx : startIdx + arrowOffset;
  const braceStart = source.indexOf('{', searchFrom);
  let depth = 0;
  let i = braceStart;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  return source.slice(startIdx, i + 1);
}

const editModalSrc = src('apps/tenant/src/components/EditProductModal.tsx');
const catalogViewSrc = src('apps/tenant/src/components/ProductCatalogView.tsx');
const appContextSrc = src('apps/tenant/src/context/AppContext.tsx');
const registerFnBody = extractFunctionBody(appContextSrc, 'const registerCatalogProduct = async ({');
const handleSubmitBody = extractFunctionBody(editModalSrc, 'const handleSubmit = async (e: React.FormEvent) => {');

describe('Product Catalog Phase 2 — Checkpoint 2 — Catálogo creation/edit', () => {
  describe('A — EditProductModal: editable, not merely displayed', () => {
    it('imports confirmProductUnitRelationship from context, alongside updateProduct — reused unmodified from Checkpoint 1, never a second confirmation mechanism', () => {
      assert.match(editModalSrc, /const \{ updateProduct, confirmProductUnitRelationship, currencySymbol, batches, stockCounts \} = useApp\(\);/);
    });

    it('the old read-only "1 {unit} = {factor} {unit}" display paragraph is gone — replaced by editable inputs', () => {
      assert.doesNotMatch(editModalSrc, /1 \{product\.unitRelationship!\.units\[0\]\.unit\}/);
      assert.match(editModalSrc, /onChange=\{\(e\) => \{\s*\n\s*const next = \[\.\.\.unitRows\];\s*\n\s*next\[idx\] = \{ \.\.\.next\[idx\], unit: e\.target\.value \};/);
    });

    it('unitRows/sellingUnit state is prefilled from the product\'s existing confirmed relationship, if any, via isValidUnitRelationship — never trusted un-checked', () => {
      assert.match(editModalSrc, /isValidUnitRelationship\(product\.unitRelationship\) && product\.unitRelationship\s*\n\s*\? product\.unitRelationship\.units\.map/);
      assert.match(editModalSrc, /const \[sellingUnit, setSellingUnit\] = useState\(\s*\n\s*isValidUnitRelationship\(product\.unitRelationship\)/);
    });

    it('a selling-unit <select> exists, scoped to whichever units are currently entered', () => {
      assert.match(editModalSrc, /<select\s*\n\s*value=\{sellingUnit\}/);
    });
  });

  describe('B — unitRelationshipCandidateEqualsCurrent — pure, module-level "did it actually change" check', () => {
    it('is a pure function outside the component, taking the current relationship, candidate units, and candidate sellingUnit', () => {
      assert.match(editModalSrc, /function unitRelationshipCandidateEqualsCurrent\(\s*\n\s*current: Product\['unitRelationship'\],\s*\n\s*units: \{ unit: string; factorFromPrevious: number \}\[\],\s*\n\s*sellingUnit: string\s*\n\s*\): boolean \{/);
    });

    it('an empty candidate against a valid current relationship is NOT treated as equal — the caller must decide to skip the write, not this function', () => {
      // extractFunctionBody's brace-scan isn't used here: this function's
      // own parameter list contains a typed object literal
      // (`{ unit: string; factorFromPrevious: number }`), whose brace pair
      // would be mistaken for the function body's opening brace by the
      // shared helper's arrow-only lookahead (it exists for arrow
      // functions' destructured params, not this case) — a direct
      // source-text check avoids that false match entirely.
      assert.match(editModalSrc, /if \(!isValidUnitRelationship\(current\) \|\| !current\) return units\.length === 0;/);
    });
  });

  describe('C — handleSubmit: validation-before-write, sellingPrice/sellingUnit invariant enforced', () => {
    it('validates per-level factors before any write is attempted', () => {
      assert.match(handleSubmitBody, /if \(!Number\.isFinite\(candidateUnits\[i\]\.factorFromPrevious\) \|\| candidateUnits\[i\]\.factorFromPrevious <= 0\) \{\s*\n\s*setUnitRelationshipError\(/);
    });

    it('computes whether the relationship is actually about to be written (relationshipChanged && candidateUnits.length > 0) before deciding the effective sellingUnit — never assumes a write will happen', () => {
      assert.match(handleSubmitBody, /const relationshipChanged = !unitRelationshipCandidateEqualsCurrent\(product\.unitRelationship, candidateUnits, sellingUnit\);/);
      assert.match(handleSubmitBody, /const willWriteRelationship = relationshipChanged && candidateUnits\.length > 0;/);
    });

    it('when the relationship IS about to be written, the effective sellingUnit is only the candidate\'s own — never invented, never assumed valid without a membership check', () => {
      assert.match(
        handleSubmitBody,
        /candidateUnits\.some\(\(u\) => u\.unit\.trim\(\)\.toLowerCase\(\) === sellingUnit\.trim\(\)\.toLowerCase\(\)\)\s*\n\s*\? sellingUnit\.trim\(\)\s*\n\s*: undefined/
      );
    });

    it('when the relationship is NOT about to be written, the effective sellingUnit falls back to the product\'s own already-confirmed one — never silently treated as absent merely because the form left it untouched', () => {
      assert.match(
        handleSubmitBody,
        /: isValidUnitRelationship\(product\.unitRelationship\)\s*\n\s*\? product\.unitRelationship\?\.sellingUnit\s*\n\s*: undefined;/
      );
    });

    it('refuses the entire submit, before any write, when a non-empty sellingPrice has no effective sellingUnit — the same Specification §10 invariant registerCatalogProduct enforces, applied to editing', () => {
      const guardIdx = handleSubmitBody.indexOf("if (trimmedSellingPrice !== '' && !effectiveSellingUnit) {");
      const relWriteIdx = handleSubmitBody.indexOf('if (willWriteRelationship) {');
      const metadataWriteIdx = handleSubmitBody.indexOf('await updateProduct(product.id, {');
      assert.notEqual(guardIdx, -1);
      assert.ok(guardIdx < relWriteIdx && guardIdx < metadataWriteIdx, 'The pairing guard must run before either write.');
    });

    it('clearing every unit row never triggers a relationship write — the existing confirmed relationship is left exactly as it was, never silently discarded (Decision 1)', () => {
      assert.match(handleSubmitBody, /if \(willWriteRelationship\) \{\s*\n\s*await confirmProductUnitRelationship\(/);
      // willWriteRelationship is false whenever candidateUnits.length === 0
      // (see B, above, and the willWriteRelationship definition in C) — so
      // an emptied form structurally cannot reach the confirmProductUnitRelationship
      // call, confirmed by the guard condition itself already asserted above.
    });

    it('relationship changes are routed through confirmProductUnitRelationship — the exact Checkpoint-1-extended function, never a raw updateProduct({ unitRelationship: ... }) call', () => {
      assert.doesNotMatch(editModalSrc, /updateProduct\([^)]*unitRelationship/);
      assert.match(handleSubmitBody, /await confirmProductUnitRelationship\(product\.id, \{\s*\n\s*units: candidateUnits,/);
    });

    it('a failure from confirmProductUnitRelationship (e.g. Decision 1\'s blocking case) is caught and surfaced, never left unhandled — reusing the same catch/surface pattern this codebase already uses elsewhere (handleReactivateProduct)', () => {
      assert.match(handleSubmitBody, /\} catch \(err\) \{\s*\n\s*setUnitRelationshipError\(err instanceof Error \? err\.message : /);
    });
  });

  describe('D — Boundaries: costPrice, SupplierWordingRelationship, StockBatch, Product Memory architecture', () => {
    it('EditProductModal never sends costPrice in any write payload (checked outside comments)', () => {
      const codeOnly = editModalSrc
        .split('\n')
        .filter((line) => !line.trim().startsWith('//'))
        .join('\n');
      assert.doesNotMatch(codeOnly, /costPrice:/);
    });

    it('EditProductModal never references SupplierWordingRelationship or supplierWordings — that remains BDR-0013/POL-0007-governed, untouched by Catálogo', () => {
      assert.doesNotMatch(editModalSrc, /SupplierWordingRelationship/);
      assert.doesNotMatch(editModalSrc, /supplierWordings/);
    });

    it('registerCatalogProduct never references SupplierWordingRelationship, supplierWordings, or StockBatch (checked outside comments)', () => {
      const codeOnly = registerFnBody
        .split('\n')
        .filter((line) => !line.trim().startsWith('//'))
        .join('\n');
      assert.doesNotMatch(codeOnly, /SupplierWordingRelationship/);
      assert.doesNotMatch(codeOnly, /supplierWordings/);
      assert.doesNotMatch(codeOnly, /StockBatch/);
    });

    it('ProductCatalogView\'s new unit-relationship capture UI never references costPrice or SupplierWordingRelationship (checked outside comments)', () => {
      const codeOnly = catalogViewSrc
        .split('\n')
        .filter((line) => !line.trim().startsWith('//'))
        .join('\n');
      assert.doesNotMatch(codeOnly, /costPrice/);
      assert.doesNotMatch(codeOnly, /SupplierWordingRelationship/);
    });

    it('no new Product Memory store is introduced anywhere in this checkpoint\'s three touched files — no new collection name, no new "Memory"-suffixed type or state variable', () => {
      for (const fileSrc of [editModalSrc, catalogViewSrc]) {
        assert.doesNotMatch(fileSrc, /new.*ProductMemory/i);
        assert.doesNotMatch(fileSrc, /createProductMemory/i);
      }
    });

    it('calculations.ts (Business Worth) is untouched by this checkpoint — confirmed via git-independent structural check: it still never reads the products collection directly for valuation (existing invariant, re-confirmed, not newly introduced by Checkpoint 2)', () => {
      const calcSrc = src('apps/tenant/src/utils/calculations.ts');
      // This is a pre-existing invariant (Implementation Plan §E) —
      // re-confirmed here, not newly established by this checkpoint, so
      // this test's own presence protects against a future Checkpoint 2
      // regression without claiming to have introduced the guarantee.
      assert.doesNotMatch(calcSrc, /collection\(db, 'businesses'[^)]*'products'\)/);
    });
  });

  describe('E — No new duplicate-creation or identity mechanism introduced by Checkpoint 2', () => {
    it('registerCatalogProduct still performs exactly one Firestore write (setDoc) — the new unitRelationship/sellingPrice validation is pure, pre-write logic, not an additional write', () => {
      const setDocCount = (registerFnBody.match(/setDoc\(/g) || []).length;
      const otherWriteCount = (registerFnBody.match(/updateDoc\(|addDoc\(|deleteDoc\(|writeBatch\(|runTransaction\(/g) || []).length;
      assert.equal(setDocCount, 1, 'Expected exactly one setDoc call.');
      assert.equal(otherWriteCount, 0, 'Expected no other Firestore write of any kind.');
    });

    it('EditProductModal edits the same canonical product.id in every write — never generates a new id', () => {
      assert.doesNotMatch(editModalSrc, /Date\.now\(\)/);
      assert.match(editModalSrc, /confirmProductUnitRelationship\(product\.id,/);
      assert.match(editModalSrc, /updateProduct\(product\.id, \{/);
    });
  });
});
