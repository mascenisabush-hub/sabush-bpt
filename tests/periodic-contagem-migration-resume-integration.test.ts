// [Periodic Contagem Expanded Phase 2 — live-UI integration] Regression
// coverage for wiring migration into the actual draft-resume flow.
// Source-text based, following this repository's own established
// convention.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const componentSource = readFileSync(
  new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
  'utf8'
);
const appContextSource = readFileSync(
  new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url),
  'utf8'
);

describe('migrateAllLegacyPeriodicRows — batch discovery and migration', () => {
  const fnMatch = appContextSource.match(
    /const migrateAllLegacyPeriodicRows = async \(\): Promise<\{ ambiguousKeys: string\[\] \}> => \{[\s\S]*?\n  \};/
  );

  it('exists with the documented signature', () => {
    assert.ok(fnMatch, 'expected migrateAllLegacyPeriodicRows to exist');
  });

  it('discovers legacy keys via a fresh read, not the reactive listener\'s current state', () => {
    assert.match(fnMatch![0], /const itemsSnap = await getDocs\(/);
  });

  it('filters strictly to the legacy manual:{digits} format, excluding already-migrated or genuinely new UUID-keyed rows', () => {
    assert.match(fnMatch![0], /\.filter\(\(key\) => \/\^manual:\\d\+\$\/\.test\(key\)\);/);
  });

  it('processes each legacy key sequentially through migratePeriodicLegacyManualRow, collecting ambiguous outcomes', () => {
    assert.match(
      fnMatch![0],
      /for \(const legacyKey of legacyKeys\) \{\s*\n\s*const outcome = await migratePeriodicLegacyManualRow\(legacyKey\);\s*\n\s*if \(outcome === 'ambiguous'\) ambiguousKeys\.push\(legacyKey\);/
    );
  });

  it('is declared in the interface and exposed through the context value', () => {
    assert.match(
      appContextSource,
      /migrateAllLegacyPeriodicRows: \(\) => Promise<\{ ambiguousKeys: string\[\] \}>;/
    );
    assert.match(appContextSource, /migratePeriodicLegacyManualRow,\s*\n\s*migrateAllLegacyPeriodicRows,/);
  });
});

describe('handleResumeDraft — migration wired into the live resume flow', () => {
  const fnMatch = componentSource.match(/const handleResumeDraft = async \(\) => \{[\s\S]*?\n  \};/);

  it('handleResumeDraft is now async', () => {
    assert.match(componentSource, /const handleResumeDraft = async \(\) => \{/);
  });

  it('migration runs first, before any resumed-row state is built', () => {
    assert.ok(fnMatch);
    const migrateIndex = fnMatch![0].indexOf('await migrateAllLegacyPeriodicRows()');
    const buildIndex = fnMatch![0].indexOf('const nextCatalogRows: CatalogRowState = {};');
    assert.ok(migrateIndex > -1 && buildIndex > -1);
    assert.ok(migrateIndex < buildIndex, 'migration must run before the resumed rows are built');
  });

  it('sets migrationStatus to blocked when any row resolves ambiguous, complete otherwise', () => {
    assert.match(
      fnMatch![0],
      /setMigrationStatus\(ambiguousKeys\.length > 0 \? 'blocked' : 'complete'\);/
    );
  });

  it('a migration failure is treated as blocked, not silently as complete', () => {
    assert.match(
      fnMatch![0],
      /\} catch \{[\s\S]{0,400}?setMigrationStatus\('blocked'\);/
    );
  });

  it('the sole existing call site remains a compatible fire-and-forget call inside a useEffect', () => {
    const callSiteMatch = componentSource.match(/autoResumedRef\.current = true;\s*\n\s*lastAutoResumedItemCountRef\.current = currentItemCount;\s*\n\s*handleResumeDraft\(\);/);
    assert.ok(callSiteMatch, 'expected the existing auto-resume effect to still call handleResumeDraft compatibly');
  });
});

describe('Finalization blocked while migration is ambiguous', () => {
  it('handleRequestConfirmation returns early, with a clear error, when migrationStatus is blocked', () => {
    const fnMatch = componentSource.match(/const handleRequestConfirmation = async \(e: React\.FormEvent\) => \{[\s\S]*?\n  \};/);
    assert.ok(fnMatch);
    assert.match(
      fnMatch![0],
      /if \(migrationStatus === 'blocked'\) \{\s*\n\s*setError\(/
    );
  });

  it('handleConfirmSave — the finalization action itself — also returns early, as defense-in-depth', () => {
    const fnMatch = componentSource.match(/const handleConfirmSave = async \(\) => \{[\s\S]*?\n\s+if \(!isOwner/);
    assert.ok(fnMatch);
    assert.match(fnMatch![0], /if \(migrationStatus === 'blocked'\) return;/);
  });

  it('migrationStatus and ambiguousMigrationKeys are declared as reactive state, not refs — needed for this gate to actually re-render the confirmation UI', () => {
    assert.match(
      componentSource,
      /const \[migrationStatus, setMigrationStatus\] = useState<'idle' \| 'migrating' \| 'complete' \| 'blocked'>\('idle'\);/
    );
    assert.match(componentSource, /const \[ambiguousMigrationKeys, setAmbiguousMigrationKeys\] = useState<string\[\]>\(\[\]\);/);
  });
});
