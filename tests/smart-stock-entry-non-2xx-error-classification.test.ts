// Bug fix — Owner-reported, urgent, live with a client: a genuine
// server-side rejection from /api/smart-stock-entry/extract (a 403
// permission-denied, or a 500 internal failure — the ONLY non-2xx
// outcomes this route can return; every expected/graceful failure mode
// — too_large/unsupported_type/invalid_upload/provider_unavailable/
// unreadable — is sent as res.json(...), i.e. HTTP 200) was shown to
// the Owner as "Sem ligação ao servidor. Verifique a sua internet..."
// — misleading, since nothing about the network connection itself was
// the problem. The client's `if (!response.ok)` branch discarded the
// response body entirely and returned a hardcoded 'network_error'.
//
// FIX: scanPurchaseDocument (AppContext.tsx) now attempts to read the
// response body even on a non-2xx response, honoring a `reason` field
// if the server ever sends one there, and falling back to
// 'provider_unavailable' (never 'network_error') when it doesn't — an
// honest "the scan service rejected this request," not a false claim
// about connectivity. True 'network_error' remains reserved
// exclusively for the fetch() call itself failing (no response
// received at all) or a token-acquisition failure — both unchanged.
//
// SCOPE: this repository has no DOM/React render harness, and
// scanPurchaseDocument is tightly coupled to the live fetch/Firebase
// Auth client SDK (see this file's own established precedent — e.g.
// tests/business-worth-correction-recovery-ui.test.ts's header — for
// why that class of function is covered by structural source-text
// inspection here, mirroring tests/smart-stock-entry-image-
// preprocessing.test.ts's own identical technique for this exact
// function).
//
// HOW TO RUN:
//   npx tsx --test tests/smart-stock-entry-non-2xx-error-classification.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const appContextSrc = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf-8');

function scanPurchaseDocumentBody(): string {
  const start = appContextSrc.indexOf('const scanPurchaseDocument = async (');
  const end = appContextSrc.indexOf('\n  };', start);
  return appContextSrc.slice(start, end);
}

describe('scanPurchaseDocument — non-2xx responses no longer mislabeled as network_error', () => {
  const body = scanPurchaseDocumentBody();

  it('the function is found in the source, well-formed', () => {
    assert.notEqual(body.indexOf('const scanPurchaseDocument'), -1);
    assert.match(body, /if \(!response\.ok\) \{/);
  });

  it('a non-2xx response is no longer unconditionally classified as network_error', () => {
    const okBranchStart = body.indexOf('if (!response.ok) {');
    const okBranchEnd = body.indexOf('const reason: SmartStockEntryFailureReason =\n        body?.reason === \'too_large\' ||\n        body?.reason === \'unsupported_type\' ||\n        body?.reason === \'provider_unavailable\' ||\n        body?.reason === \'unreadable\' ||\n        body?.reason === \'invalid_upload\'\n          ? body.reason\n          : \'unreadable\';', okBranchStart);
    assert.notEqual(okBranchEnd, -1, 'expected to find the start of the response-parsing block that follows the !response.ok branch');
    const okBranch = body.slice(okBranchStart, okBranchEnd);
    assert.doesNotMatch(okBranch, /return \{ success: false, reason: 'network_error' \};/);
  });

  it('the !response.ok branch attempts to read the response body and honors a valid reason field if present', () => {
    const okBranchStart = body.indexOf('if (!response.ok) {');
    const okBranchEnd = body.indexOf('const reason: SmartStockEntryFailureReason =\n        body?.reason === \'too_large\' ||\n        body?.reason === \'unsupported_type\' ||\n        body?.reason === \'provider_unavailable\' ||\n        body?.reason === \'unreadable\' ||\n        body?.reason === \'invalid_upload\'\n          ? body.reason\n          : \'unreadable\';', okBranchStart);
    const okBranch = body.slice(okBranchStart, okBranchEnd);
    assert.match(okBranch, /const body = await response\.json\(\);/);
    assert.match(okBranch, /body\?\.reason === 'too_large' \|\|/);
    assert.match(okBranch, /body\?\.reason === 'provider_unavailable' \|\|/);
  });

  it('falls back to provider_unavailable (never network_error) when the non-2xx response has no usable reason, or cannot be parsed at all', () => {
    const okBranchStart = body.indexOf('if (!response.ok) {');
    const okBranchEnd = body.indexOf('const reason: SmartStockEntryFailureReason =\n        body?.reason === \'too_large\' ||\n        body?.reason === \'unsupported_type\' ||\n        body?.reason === \'provider_unavailable\' ||\n        body?.reason === \'unreadable\' ||\n        body?.reason === \'invalid_upload\'\n          ? body.reason\n          : \'unreadable\';', okBranchStart);
    const okBranch = body.slice(okBranchStart, okBranchEnd);
    // Two fallback sites: the ternary's own else-branch, and the outer catch.
    const fallbackCount = (okBranch.match(/'provider_unavailable'/g) || []).length;
    assert.ok(fallbackCount >= 3, `expected at least three provider_unavailable mentions (two fallback sites + the allowed-values check) in the !response.ok branch, found ${fallbackCount}`);
    // Comments in this branch legitimately mention 'network_error' by
    // name while explaining why it's NOT used here — so this checks for
    // the actual return-value pattern, not the bare string.
    assert.doesNotMatch(okBranch, /reason: 'network_error'/);
  });

  it('true network_error remains reserved for the fetch() call itself failing — unchanged, still present exactly once for that case', () => {
    const fetchTryStart = body.indexOf("response = await fetch('/api/smart-stock-entry/extract'");
    const fetchCatchEnd = body.indexOf('\n    }\n\n    if (!response.ok)', fetchTryStart);
    assert.notEqual(fetchTryStart, -1);
    assert.notEqual(fetchCatchEnd, -1);
    const fetchBlock = body.slice(fetchTryStart, fetchCatchEnd);
    assert.match(fetchBlock, /catch \{\s*return \{ success: false, reason: 'network_error' \}/);
  });

  it('a token-acquisition failure also still correctly returns network_error, unaffected by this fix', () => {
    const tokenStart = body.indexOf('idToken = await currentUser.getIdToken();');
    const tokenEnd = body.indexOf('\n\n    let response: Response;', tokenStart);
    assert.notEqual(tokenStart, -1);
    const tokenBlock = body.slice(tokenStart, tokenEnd);
    assert.match(tokenBlock, /catch \{\s*return \{ success: false, reason: 'network_error' \};\s*\}/);
  });
});
