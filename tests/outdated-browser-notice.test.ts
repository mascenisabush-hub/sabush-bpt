// SABUSH BPT — outdated-browser notice (apps/tenant/index.html).
// The check must run on browsers too old for the app itself, so it is an
// ES5-only classic inline script. Here it is executed against simulated
// browsers to prove it accepts current ones and flags too-old ones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../apps/tenant/index.html', import.meta.url), 'utf-8');
const match = /<script>\s*([\s\S]*?)<\/script>/.exec(html);
const script = match ? match[1] : '';

// A minimal fake browser; `features` switches individual capabilities off.
const makeWindow = (features: { colorMix?: boolean; propertyRule?: boolean; randomUUID?: boolean; indexedDB?: boolean } = {}) => {
  const f = { colorMix: true, propertyRule: true, randomUUID: true, indexedDB: true, ...features };
  const appended: unknown[] = [];
  const body = { appendChild: (n: unknown) => appended.push(n) };
  const w: Record<string, unknown> = {
    CSS: { supports: (_p: string, v: string) => (v.includes('color-mix') ? f.colorMix : true) },
    crypto: f.randomUUID ? { randomUUID: () => 'x' } : {},
    sessionStorage: { getItem: () => null, setItem: () => {} },
  };
  if (f.propertyRule) w.CSSPropertyRule = function () {};
  if (f.indexedDB) w.indexedDB = {};
  const document = {
    body,
    getElementById: () => null,
    createElement: () => ({ style: {}, setAttribute: () => {} }),
    addEventListener: () => {},
  };
  w.window = w;
  w.document = document;
  return { w, appended };
};

const run = (features?: Parameters<typeof makeWindow>[0]) => {
  const { w, appended } = makeWindow(features);
  vm.runInNewContext(script, w);
  return appended.length; // 1 = notice shown, 0 = not shown
};

test('the notice script exists before the app bundle', () => {
  assert.ok(script.length > 0);
  assert.ok(html.indexOf('sabushBrowserSupported') < html.indexOf('<script type="module" src="/src/main.tsx">'));
});

test('ES5-only: no arrow functions, let/const, template literals or classes', () => {
  const code = script.replace(/'(?:[^'\\]|\\.)*'/g, "''");
  assert.doesNotMatch(code, /=>|\blet\b|\bconst\b|`|\bclass\b/);
});

test('a current browser sees no notice', () => {
  assert.equal(run(), 0);
});

test('too-old browsers see the notice', () => {
  assert.equal(run({ colorMix: false }), 1, 'no color-mix: Chrome <111, Safari <16.2, Firefox <113');
  assert.equal(run({ propertyRule: false }), 1, 'no @property: Safari <16.4, Firefox <128');
  assert.equal(run({ randomUUID: false }), 1, 'no crypto.randomUUID');
  assert.equal(run({ indexedDB: false }), 1, 'no IndexedDB');
});

test('the notice can be dismissed for the session (never locks anyone out)', () => {
  assert.match(script, /Continuar mesmo assim/);
  assert.match(script, /sessionStorage\.setItem\('sabush-old-browser-dismissed', '1'\)/);
  assert.match(script, /sessionStorage\.getItem\('sabush-old-browser-dismissed'\) === '1'\) return;/);
});
