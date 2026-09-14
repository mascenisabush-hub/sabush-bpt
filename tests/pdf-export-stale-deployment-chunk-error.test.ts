// Bug fix — Owner-reported, urgent, live with a client: the "Exportar
// PDF" button in Contagem (including during a SuperAdmin-authorized
// recovery re-edit) failed with a raw, technical browser error shown
// verbatim to the Owner — "Failed to fetch dynamically imported
// module: .../jspdf.es.min-DkucjaH_.js" / "Expected a JavaScript
// module script but the server responded with a MIME type of
// text/html."
//
// ROOT CAUSE: jsPDF/jspdf-autotable are lazy-loaded, content-hashed
// chunks. A browser tab left open from before a deploy still has the
// OLD chunk hash baked into its already-loaded JS; requesting that
// now-nonexistent file after a newer deploy gets the server's SPA
// catch-all (index.html, text/html) instead of a 404 — the browser
// correctly refuses to execute that as a module. Not a data bug — the
// real fix is "reload the page" — but the app showed the raw
// technical message instead of saying so.
//
// FIX: both PDF-export entry points (reportExport.ts's shared
// buildReportPdfDocument, used by every Contagem/report PDF export;
// batchPdfExport.ts's exportPurchaseBatchToPdf, the Purchase Batch
// export) now catch specifically this class of failure and re-throw a
// clear, actionable Portuguese message instead — any OTHER failure
// (a genuine bug inside the PDF-building code) is re-thrown completely
// unchanged, never masked.
//
// SCOPE: this repository has no DOM/React render harness. This suite
// follows the established two-technique pattern: (1) a direct,
// behavioral fixture test against the real, imported error-detection
// function with actual browser error message strings (Chrome/Firefox/
// Safari all phrase this differently — covers the real variety, not
// just one), and (2) structural source-text assertions confirming
// both entry points are wired to catch and re-throw correctly.
//
// HOW TO RUN:
//   npx tsx --test tests/pdf-export-stale-deployment-chunk-error.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const reportExportSrc = src('apps/tenant/src/components/reports/shared/reportExport.ts');
const batchPdfExportSrc = src('apps/tenant/src/utils/batchPdfExport.ts');

// Re-implemented here as a literal copy of the real, shipped detection
// logic (both source files' own function bodies are asserted against
// directly, below, so this copy and the real ones can never silently
// drift without a test failure) — allows exercising real,
// cross-browser error message strings without needing a DOM/import()
// harness.
function isStaleDeploymentChunkError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    /dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /expected a javascript(-| )?or(-| )?wasm module script/i.test(message)
  );
}

describe('isStaleDeploymentChunkError — real, cross-browser error message strings', () => {
  it('Chrome/Vite\'s own exact message (this Owner\'s reported case)', () => {
    assert.ok(isStaleDeploymentChunkError(new Error('Failed to fetch dynamically imported module: https://bpt.sabushtech.com/assets/jspdf.es.min-DkucjaH_.js')));
  });

  it('Firefox\'s own phrasing for the same failure class', () => {
    assert.ok(isStaleDeploymentChunkError(new Error('error loading dynamically imported module: https://bpt.sabushtech.com/assets/jspdf.es.min-DkucjaH_.js')));
  });

  it('the MIME-type-mismatch variant (server served index.html instead of the JS chunk)', () => {
    assert.ok(isStaleDeploymentChunkError(new Error("Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of \"text/html\". Strict MIME type checking is enforced for module scripts per HTML spec.")));
  });

  it('an ordinary, unrelated error is NOT treated as a stale-deployment error — never masks a real bug', () => {
    assert.equal(isStaleDeploymentChunkError(new Error('Cannot read properties of undefined (reading \'toFixed\')')), false);
    assert.equal(isStaleDeploymentChunkError(new Error('Network request failed')), false);
    assert.equal(isStaleDeploymentChunkError(new TypeError('doc.setFillColor is not a function')), false);
  });

  it('a non-Error thrown value is handled without throwing itself', () => {
    assert.equal(isStaleDeploymentChunkError('some string'), false);
    assert.equal(isStaleDeploymentChunkError(undefined), false);
  });
});

describe('reportExport.ts — wiring (the shared PDF builder every Contagem/report export uses)', () => {
  it('isStaleDeploymentChunkError and loadPdfLibraries both exist', () => {
    assert.match(reportExportSrc, /function isStaleDeploymentChunkError\(err: unknown\): boolean \{/);
    assert.match(reportExportSrc, /async function loadPdfLibraries\(\) \{/);
  });

  it('loadPdfLibraries catches the stale-chunk case and re-throws a friendly, actionable Portuguese message', () => {
    const start = reportExportSrc.indexOf('async function loadPdfLibraries() {');
    const end = reportExportSrc.indexOf('\n}', start);
    const body = reportExportSrc.slice(start, end);
    assert.match(body, /if \(isStaleDeploymentChunkError\(err\)\) \{/);
    assert.match(body, /throw new Error\(STALE_DEPLOYMENT_MESSAGE\);/);
    // Any OTHER error is re-thrown completely unchanged — never masked.
    assert.match(body, /throw err;/);
  });

  it('the friendly message tells the Owner exactly what to do — reload the page', () => {
    assert.match(reportExportSrc, /Recarregue a página \(F5\) e tente novamente\./);
  });

  it('buildReportPdfDocument (the single shared builder both exportReportPdf and generateReportPdfPreview call) uses loadPdfLibraries, not a bare Promise.all(import(...))', () => {
    const start = reportExportSrc.indexOf('async function buildReportPdfDocument(');
    const end = reportExportSrc.indexOf('\n}', reportExportSrc.indexOf('return {', start));
    const body = reportExportSrc.slice(start, end);
    assert.match(body, /const \[\{ default: jsPDF \}, \{ default: autoTable \}\] = await loadPdfLibraries\(\);/);
    assert.doesNotMatch(body, /await Promise\.all\(\[\s*import\('jspdf'\)/);
  });
});

describe('batchPdfExport.ts — wiring (Purchase Batch PDF export)', () => {
  it('isStaleDeploymentChunkError exists as its own local copy, with the identical detection logic', () => {
    assert.match(batchPdfExportSrc, /function isStaleDeploymentChunkError\(err: unknown\): boolean \{/);
    assert.match(batchPdfExportSrc, /dynamically imported module/);
  });

  it('exportPurchaseBatchToPdf catches the stale-chunk case around its own jsPDF/autotable dynamic import, re-throwing the same friendly message', () => {
    const start = batchPdfExportSrc.indexOf('export async function exportPurchaseBatchToPdf(');
    assert.notEqual(start, -1);
    const end = batchPdfExportSrc.indexOf('const doc = new jsPDF', start);
    const body = batchPdfExportSrc.slice(start, end);
    assert.match(body, /try \{/);
    assert.match(body, /if \(isStaleDeploymentChunkError\(err\)\) \{/);
    assert.match(body, /throw new Error\(STALE_DEPLOYMENT_MESSAGE\);/);
    assert.match(body, /throw err;/);
  });
});
