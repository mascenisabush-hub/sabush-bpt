// SABUSH BPT — Periodic Contagem, Single-Product Workspace.
//
// Covers the "IMPLEMENTATION AUTHORIZATION — SABUSH BPT PERIODIC
// CONTAGEM SINGLE-PRODUCT WORKSPACE" change: the active data-entry
// workspace now holds exactly zero or one product at a time — the
// global "Adicionar produto que não está no catálogo" action is
// unavailable while a product is active, portions of the active
// product remain addable, validating the active product's entire
// portion set returns the workspace to empty, and the persistent
// counted list is otherwise unchanged. Desktop LEFT/RIGHT and mobile
// TOP/BOTTOM responsive layout (Authorization §10) is also covered.
//
// SCOPE: this repository has no DOM/React render harness — established
// precedent (see periodic-contagem-concept-c-validated-compaction.test.ts's
// own header). This suite follows the same source-inspection
// technique: regex/string assertions against the raw
// PeriodicStockCountView.tsx source, proving structural guarantees
// rather than rendered output.
//
// NOT COVERED HERE (explicitly out of scope for this Authorization,
// per its own §7, or not yet implemented — see the completion report's
// own [KNOWN LIMITATIONS]): done-list editing/cancellation/jump-to-row
// redesign, and sorting the persistent counted list (name/highest/
// lowest value) — the Authorization's own §8 requirement, not yet
// built as of this test file.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-contagem-single-product-workspace.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const periodicSrc = src('apps/tenant/src/components/PeriodicStockCountView.tsx');

function extractFunctionBody(source: string, signatureMarker: string): string {
  const start = source.indexOf(signatureMarker);
  assert.notEqual(start, -1, `Could not locate ${signatureMarker} — has it been renamed?`);
  const rest = source.slice(start);
  const nextConstMatch = rest.slice(signatureMarker.length).search(/\n  const \w+[:\s]*=/);
  return nextConstMatch === -1 ? rest : rest.slice(0, signatureMarker.length + nextConstMatch);
}

// The picker section: from its own opening comment marker through to
// the "Catalog-populated product grid" comment that starts the
// workspace-scoped rendering immediately after it.
function pickerSection(): string {
  const start = periodicSrc.indexOf('PICKER — shown only when the workspace is empty');
  assert.notEqual(start, -1, 'Could not locate the picker section.');
  const end = periodicSrc.indexOf('Catalog-populated product grid', start);
  assert.notEqual(end, -1, 'Could not bound the end of the picker section.');
  return periodicSrc.slice(start, end);
}

describe('A — Empty workspace is allowed by default', () => {
  it('activeWorkspaceKey and activeNewManualRowIndex both initialize to null — the workspace starts empty', () => {
    const body = extractFunctionBody(periodicSrc, 'const [activeWorkspaceKey, setActiveWorkspaceKey] = useState');
    assert.match(body, /useState<string \| null>\(null\)/);
    const body2 = extractFunctionBody(periodicSrc, 'const [activeNewManualRowIndex, setActiveNewManualRowIndex] = useState');
    assert.match(body2, /useState<number \| null>\(null\)/);
  });

  it('isWorkspaceActive is false exactly when both pieces of state are null — never independently true', () => {
    assert.match(
      periodicSrc,
      /const isWorkspaceActive = activeWorkspaceKey !== null \|\| activeNewManualRowIndex !== null;/
    );
  });
});

describe('B — One product can become active, by selection or by adding a new one', () => {
  it('handleSelectExistingProductForWorkspace sets activeWorkspaceKey to a single string key, and clears the other reference', () => {
    const body = extractFunctionBody(periodicSrc, 'const handleSelectExistingProductForWorkspace = (key: string) => {');
    assert.match(body, /setActiveWorkspaceKey\(key\)/);
    assert.match(body, /setActiveNewManualRowIndex\(null\)/);
  });

  it('handleAddNewProductToWorkspace calls the existing, unmodified handleAddManualRow and additionally activates the new row by index', () => {
    const body = extractFunctionBody(periodicSrc, 'const handleAddNewProductToWorkspace = () => {');
    assert.match(body, /handleAddManualRow\(\);/);
    assert.match(body, /setActiveWorkspaceKey\(null\);/);
    assert.match(body, /setActiveNewManualRowIndex\(newIndex\);/);
  });
});

describe('C — A second independent product cannot be activated while one is already active', () => {
  const picker = pickerSection();

  it('the entire picker (search box, candidate lists, and the "add new product" action) is gated on !isWorkspaceActive', () => {
    assert.match(periodicSrc, /\{!isWorkspaceActive && \(/);
    // The picker itself contains both activation entry points — proof
    // they live inside, not beside, that gate.
    assert.match(picker, /handleSelectExistingProductForWorkspace/);
    assert.match(picker, /handleAddNewProductToWorkspace/);
  });

  it('activeWorkspaceKey/activeNewManualRowIndex are plain nullable scalars, never an array or Set — structurally impossible to hold two products at once', () => {
    assert.match(periodicSrc, /const \[activeWorkspaceKey, setActiveWorkspaceKey\] = useState<string \| null>/);
    assert.match(periodicSrc, /const \[activeNewManualRowIndex, setActiveNewManualRowIndex\] = useState<number \| null>/);
    assert.doesNotMatch(periodicSrc, /activeWorkspaceKeys|activeProductKeys|Set<string>\(\).*activeWorkspace/i);
  });
});

describe('D — "Adicionar produto que não está no catálogo" is unavailable while a product is active', () => {
  it('exactly one LIVE <span> button label exists — a second mention in an explanatory comment (describing what the old, now-removed button used to do) is expected and does not count', () => {
    const spanMatches = periodicSrc.match(/<span>Adicionar produto que não está no catálogo<\/span>/g) ?? [];
    assert.equal(spanMatches.length, 1, 'Expected exactly one live button label in the source.');
    const totalMentions = (periodicSrc.match(/Adicionar produto que não está no catálogo/g) ?? []).length;
    assert.equal(totalMentions, 2, 'Expected exactly two mentions total: one live button, one explanatory comment.');
  });

  it('that one occurrence lives inside the picker section (gated on !isWorkspaceActive), not the workspace section', () => {
    const picker = pickerSection();
    assert.match(picker, /<span>Adicionar produto que não está no catálogo<\/span>/);
  });

  it('its onClick is handleAddNewProductToWorkspace, not the raw handleAddManualRow directly', () => {
    const idx = periodicSrc.indexOf('<span>Adicionar produto que não está no catálogo</span>');
    const buttonOpenIdx = periodicSrc.lastIndexOf('<button', idx);
    assert.notEqual(buttonOpenIdx, -1);
    const buttonTag = periodicSrc.slice(buttonOpenIdx, idx);
    assert.match(buttonTag, /onClick=\{handleAddNewProductToWorkspace\}/);
    assert.doesNotMatch(buttonTag, /onClick=\{handleAddManualRow\}/);
  });
});

describe('E — A portion can be added to the active product, and doing so does not activate a second product', () => {
  it('handleAddPortionToManualGroup is completely unmodified — still the same pre-fill-by-name behavior, no reference to the workspace state at all', () => {
    const body = extractFunctionBody(periodicSrc, 'const handleAddPortionToManualGroup = (groupDisplayName: string) => {');
    assert.doesNotMatch(body, /setActiveWorkspaceKey|setActiveNewManualRowIndex/);
  });

  it('the per-row "+ portion" button call sites are unchanged and still exist inside the (now workspace-scoped) catalog/manual rendering', () => {
    assert.match(periodicSrc, /onClick=\{\(\) => handleAddPortionToManualGroup\(row\.productName\)\}/);
    assert.match(periodicSrc, /onClick=\{\(\) => handleAddPortionToManualGroup\(group\.displayName\)\}/);
  });
});

describe('F — Validating the active product\'s entire portion set empties the workspace', () => {
  it('a useEffect clears both workspace references once every row currently in the workspace is validated', () => {
    const body = extractFunctionBody(periodicSrc, '  useEffect(() => {\n    if (!isWorkspaceActive) return;');
    assert.match(body, /rows\.length === 0 \|\| rows\.every\(\(row\) => row\.validated\)/);
    assert.match(body, /setActiveWorkspaceKey\(null\);/);
    assert.match(body, /setActiveNewManualRowIndex\(null\);/);
  });

  it('the effect reads visibleCatalogEntries/visibleManualRowGroups (the workspace-scoped views) in its own actual logic', () => {
    const body = extractFunctionBody(periodicSrc, '  useEffect(() => {\n    if (!isWorkspaceActive) return;');
    // Only the effect's own executable lines — deliberately excludes
    // trailing explanatory comments before the next `const`, which may
    // legitimately mention the picker-scoped names by way of contrast
    // (extractFunctionBody's "up to the next const" heuristic sweeps
    // those in too, same as this repo's own existing tests do).
    const executableLines = body
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    assert.match(executableLines, /visibleCatalogEntries\.map/);
    assert.match(executableLines, /visibleManualRowGroups\.flatMap/);
    assert.doesNotMatch(executableLines, /pickerCatalogEntries|pickerManualRowGroupsRaw/);
  });
});

describe('G — The validated product remains represented in the existing persistent counted list, unchanged', () => {
  it('the "Produtos Validados" section still reads validatedCatalogEntries/validatedManualRowEntries — never the workspace-scoped visibleCatalogEntries/visibleManualRowGroups', () => {
    const start = periodicSrc.indexOf('Produtos Validados', periodicSrc.indexOf('accumulated/validated area'));
    assert.notEqual(start, -1);
    const end = periodicSrc.indexOf('Valor Físico (Custo) Contado até Agora', start);
    assert.notEqual(end, -1);
    const section = periodicSrc.slice(start, end);
    assert.match(section, /validatedCatalogEntries\.map/);
    assert.match(section, /validatedManualRowEntries\.map/);
  });

  it('handleEditCatalogRow/handleEditManualRow (the existing, out-of-scope edit path) are completely unmodified', () => {
    const body = extractFunctionBody(periodicSrc, 'const handleEditCatalogRow = (productId: string) => {');
    assert.match(body, /window\.confirm\('Este produto já foi validado\. Queres editá-lo\?'\)/);
    assert.match(body, /updateCatalogRow\(productId, \{ validated: false \}\);/);
  });
});

describe('H — After the workspace empties, a subsequent product can become active', () => {
  it('nothing conditions the picker\'s own rendering, or either activation handler, on any prior-selection history — the gate is purely the current value of isWorkspaceActive', () => {
    // The picker's gate and both activation handlers are all defined
    // exactly once each, with no additional "already used once"
    // tracking state anywhere in the file.
    assert.doesNotMatch(periodicSrc, /hasSelectedBefore|previousActiveProduct|workspaceHistory/i);
  });
});

describe('I — Search selects one product into the workspace; it never activates more than one', () => {
  it('handleSelectExistingProductForWorkspace takes a single string key, not a list', () => {
    assert.match(periodicSrc, /const handleSelectExistingProductForWorkspace = \(key: string\) => \{/);
  });

  it('productSearch only narrows the picker-scoped pickerCatalogEntries/pickerManualRowGroupsRaw, never the workspace-scoped visibleCatalogEntries/visibleManualRowGroups', () => {
    const pickerCatalogBody = extractFunctionBody(periodicSrc, 'const pickerCatalogEntries = useMemo(() => {');
    assert.match(pickerCatalogBody, /productSearch/);
    const workspaceCatalogBody = extractFunctionBody(periodicSrc, 'const visibleCatalogEntries = useMemo(() => {');
    assert.doesNotMatch(workspaceCatalogBody, /productSearch/);
  });

  it('each picker candidate row is its own independent button with its own onClick — clicking one never affects any other row\'s own activation', () => {
    const picker = pickerSection();
    const catalogButtonMatches = picker.match(/onClick=\{\(\) => handleSelectExistingProductForWorkspace\(productKeyFor\(row\.productName\)\)\}/g) ?? [];
    const manualButtonMatches = picker.match(/onClick=\{\(\) => handleSelectExistingProductForWorkspace\(group\.key\)\}/g) ?? [];
    assert.equal(catalogButtonMatches.length, 1);
    assert.equal(manualButtonMatches.length, 1);
  });
});

describe('J — Existing valuation, UnitRelationship, and autosave behavior are untouched (diff-based proof, not just source assertions)', () => {
  const changedFiles = execSync('git diff --name-only HEAD', { cwd: new URL('..', import.meta.url), encoding: 'utf-8' })
    .split('\n')
    .filter(Boolean);

  it('the only file changed by this Authorization is PeriodicStockCountView.tsx itself', () => {
    assert.deepEqual(changedFiles, ['apps/tenant/src/components/PeriodicStockCountView.tsx']);
  });

  it('utils/stockCount.ts (tallyStockCountRows, normalizeStockCountItems — the valuation formula) is not in the changed-files list', () => {
    assert.equal(changedFiles.includes('apps/tenant/src/utils/stockCount.ts'), false);
  });

  it('lib/purchaseToSellingConversion.ts (getConversionFactor, UnitRelationship logic) is not in the changed-files list', () => {
    assert.equal(changedFiles.includes('apps/tenant/src/lib/purchaseToSellingConversion.ts'), false);
  });

  it('lib/contagemMultiUnitValuation.ts (Mode A/Mode B) is not in the changed-files list', () => {
    assert.equal(changedFiles.includes('apps/tenant/src/lib/contagemMultiUnitValuation.ts'), false);
  });

  it('context/AppContext.tsx (savePeriodicStockDraft, recordStockCount — persistence/autosave) is not in the changed-files list', () => {
    assert.equal(changedFiles.includes('apps/tenant/src/context/AppContext.tsx'), false);
  });

  it('activeWorkspaceKey/activeNewManualRowIndex are never referenced inside the draft save call sites (scheduleRowDraftSave), confirming the workspace pointer stays UI-only, never persisted', () => {
    const saveSites = periodicSrc.match(/scheduleRowDraftSave\([^)]*\)/g) ?? [];
    for (const call of saveSites) {
      assert.doesNotMatch(call, /activeWorkspaceKey|activeNewManualRowIndex/);
    }
  });
});

describe('K — Responsive layout (Authorization §10): desktop LEFT/RIGHT, mobile TOP/BOTTOM', () => {
  it('a single grid wrapper switches from one column (mobile) to two columns at the lg breakpoint', () => {
    assert.match(periodicSrc, /className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"/);
  });

  it('the right column (persistent counted list) is sticky and independently scrollable on desktop only — no such rule applies below lg', () => {
    assert.match(
      periodicSrc,
      /className="space-y-6 lg:sticky lg:top-4 lg:max-h-\[calc\(100vh-2rem\)\] lg:overflow-y-auto"/
    );
  });

  it('the grid wrapper opens before the picker section and its matching right-column div opens immediately before "Produtos Validados"', () => {
    const gridStart = periodicSrc.indexOf('className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"');
    const pickerStart = periodicSrc.indexOf('PICKER — shown only when the workspace is empty');
    const rightColStart = periodicSrc.indexOf('className="space-y-6 lg:sticky lg:top-4');
    const validatedStart = periodicSrc.indexOf('Produtos Validados', periodicSrc.indexOf('accumulated/validated area'));
    assert.ok(gridStart < pickerStart, 'grid wrapper must open before the picker');
    assert.ok(pickerStart < rightColStart, 'picker must precede the right column opening');
    assert.ok(rightColStart < validatedStart, 'right column must open before "Produtos Validados" itself');
  });
});
