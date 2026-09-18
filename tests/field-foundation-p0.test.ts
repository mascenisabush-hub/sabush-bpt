// Field Readability & Interaction — P0 (canonical field foundation) conformance.
//
// Governance: docs/engineering/field-readability-p0-implementation-authorization-request.md
// (Authorized, P0 only). This suite asserts the P0 INVARIANTS so they fail loudly if they
// regress; it is a static check over the two stylesheets and the .tsx sources (this repo has
// no DOM render harness). Rendered evidence (computed styles, pixels, screenshots) is a
// separate, manual validation step recorded in the P0 close-out — not asserted here.
//
// It changes no behaviour and touches no product code.

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TENANT_CSS = path.join(ROOT, 'apps/tenant/src/index.css');
const SUPER_CSS = path.join(ROOT, 'apps/superadmin/src/index.css');
const read = (p: string) => readFileSync(p, 'utf8');

// ---------- CSS helpers ----------
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Return the index just after the '}' matching the '{' at openIdx. */
function matchBrace(css: string, openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') { depth--; if (depth === 0) return i + 1; }
  }
  throw new Error('unbalanced braces');
}

/** Extract bodies of every top-level-or-nested `@layer <name> { ... }` block, and the CSS with them removed. */
function layers(css: string): { blocks: { name: string; body: string }[]; rest: string } {
  const blocks: { name: string; body: string }[] = [];
  let rest = '';
  let i = 0;
  const re = /@layer\s+([a-z-]+)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const open = css.indexOf('{', m.index);
    const end = matchBrace(css, open);
    rest += css.slice(i, m.index);
    blocks.push({ name: m[1], body: css.slice(open + 1, end - 1) });
    i = end;
    re.lastIndex = end;
  }
  rest += css.slice(i);
  return { blocks, rest };
}

const FOUNDATION_RE = /\/\* >>> FIELD FOUNDATION[\s\S]*?<<< FIELD FOUNDATION <<< \*\//;
const foundationOf = (p: string) => {
  const m = read(p).match(FOUNDATION_RE);
  assert.ok(m, `${path.relative(ROOT, p)} must contain the FIELD FOUNDATION block`);
  return m![0];
};

/** Parse "prop: value;" declarations from a rule body. */
function decls(body: string): Record<string, string> {
  const o: Record<string, string> = {};
  for (const d of body.split(';')) {
    const i = d.indexOf(':');
    if (i > 0) o[d.slice(0, i).trim()] = d.slice(i + 1).trim();
  }
  return o;
}

/** Find the declaration body of the first rule whose selector list equals `selector`. */
function ruleBody(css: string, selector: string): string | null {
  const c = stripComments(css);
  let from = 0;
  for (;;) {
    const i = c.indexOf(selector, from);
    if (i < 0) return null;
    const rest = c.slice(i + selector.length).trimStart();
    const before = c.slice(0, i).trimEnd();
    if (rest.startsWith('{') && (before === '' || /[{};]$/.test(before))) {
      const open = c.indexOf('{', i);
      return c.slice(open + 1, matchBrace(c, open) - 1);
    }
    from = i + selector.length;
  }
}

// ---------- WCAG helpers ----------
const lin = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = (hex: string) => { const h = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// ---------- token helpers ----------
const rootTokens = (block: string): Record<string, string> => {
  const body = ruleBody(block, ':root') ?? '';
  return decls(body);
};

const RATIFIED = {
  '--surface-page': '#FBF9F4',
  '--border-strong': '#7C8695',
  '--field-bg': '#FFFFFF',
  '--field-text': '#000000',
  '--field-placeholder': '#5F6B7A',
  '--field-focus-border': '#8A6D1F',
  '--field-error': '#B91C1C',
  '--field-disabled-bg': '#F5F7FA',
  '--field-disabled-text': '#4B5563',
  '--field-disabled-border': '#7C8695',
} as const;

const PAGE = '#FBF9F4';
const WHITE = '#FFFFFF';

describe('P0 field foundation — convergence (S-1 fallback: byte-identical blocks)', () => {
  it('the canonical foundation block is byte-identical in apps/tenant and apps/superadmin', () => {
    assert.equal(foundationOf(TENANT_CSS), foundationOf(SUPER_CSS));
  });
  it('each foundation block appears exactly once per stylesheet', () => {
    for (const p of [TENANT_CSS, SUPER_CSS]) {
      assert.equal((read(p).match(/>>> FIELD FOUNDATION/g) ?? []).length, 1, p);
      assert.equal((read(p).match(/<<< FIELD FOUNDATION <<</g) ?? []).length, 1, p);
    }
  });
});

describe('P0 field foundation — CSS layering (Tailwind v4: theme < base < components < utilities)', () => {
  for (const [name, p] of [['tenant', TENANT_CSS], ['superadmin', SUPER_CSS]] as const) {
    it(`${name}: every .input-base rule lives inside @layer components`, () => {
      const css = stripComments(read(p));
      const { blocks, rest } = layers(css);
      assert.ok(blocks.some(b => b.name === 'components' && b.body.includes('.input-base')), 'components layer must define .input-base');
      assert.ok(!/(^|[\s,{};])\.input-base/.test(rest), 'no rule whose selector starts with .input-base may exist outside a layer (unlayered rules beat utilities); the `:not(:where(.input-base))` exclusion on the global focus rule is the only permitted mention');
      for (const b of blocks.filter(x => x.name !== 'components')) {
        assert.ok(!/\.input-base/.test(b.body), `.input-base must not be in @layer ${b.name}`);
      }
    });
    it(`${name}: no !important anywhere except the prefers-reduced-motion block`, () => {
      const css = stripComments(read(p));
      const i = css.indexOf('@media (prefers-reduced-motion: reduce)');
      assert.ok(i >= 0);
      const end = matchBrace(css, css.indexOf('{', i));
      const outside = css.slice(0, i) + css.slice(end);
      assert.ok(!/!important/.test(outside), '!important is prohibited in field CSS (and elsewhere outside the reduced-motion block)');
    });
    it(`${name}: no unlayered rule targets input/select/textarea/.input-base apart from the allow-listed tap-highlight rule`, () => {
      const { rest } = layers(stripComments(read(p)));
      // walk top-level rules of the unlayered remainder
      const offenders: string[] = [];
      let i = 0;
      while (i < rest.length) {
        const open = rest.indexOf('{', i);
        if (open < 0) break;
        const selector = rest.slice(i, open).trim().split(';').pop()!.trim();
        const end = matchBrace(rest, open);
        const body = rest.slice(open + 1, end - 1);
        const sel = selector.replace(/:not\(:where\(\.input-base\)\)/g, '');
        if (!selector.startsWith('@') && /(^|[\s,>+~])(input|select|textarea)\b|\.input-base/.test(sel)) {
          const props = Object.keys(decls(body));
          const allowed = props.length === 1 && props[0] === '-webkit-tap-highlight-color';
          if (!allowed) offenders.push(selector);
        }
        i = end;
      }
      assert.deepEqual(offenders, []);
    });
  }
});

describe('P0 field foundation — global focus rule (S-2: phased, still unlayered)', () => {
  for (const [name, p] of [['tenant', TENANT_CSS], ['superadmin', SUPER_CSS]] as const) {
    it(`${name}: global :focus-visible stays UNLAYERED, has no border-radius, and excludes .input-base`, () => {
      const { blocks, rest } = layers(stripComments(read(p)));
      const sel = ':focus-visible:not(:where(.input-base))';
      const body = ruleBody(rest, sel);
      assert.ok(body, 'global focus rule must exist unlayered with the .input-base exclusion');
      assert.ok(!/border-radius/.test(body!), 'forced border-radius must be removed');
      assert.match(body!, /outline:\s*2px solid var\(--gold/);
      for (const b of blocks) assert.ok(!b.body.includes(':focus-visible'), `global focus rule must not be in @layer ${b.name} during P0`);
      assert.ok(!/(^|[^-\w]):focus-visible\s*\{/.test(rest), 'no plain :focus-visible rule may remain');
    });
  }
});

describe('P0 field foundation — ratified token values', () => {
  const block = foundationOf(TENANT_CSS);
  const t = rootTokens(block);
  for (const [k, v] of Object.entries(RATIFIED)) {
    it(`${k} = ${v}`, () => assert.equal(t[k]?.toUpperCase(), v));
  }
  it('--field-border resolves to --border-strong', () => assert.equal(t['--field-border'], 'var(--border-strong)'));
  it('--border-strong is defined exactly once per stylesheet (inside the foundation block)', () => {
    for (const p of [TENANT_CSS, SUPER_CSS]) assert.equal((stripComments(read(p)).match(/--border-strong\s*:/g) ?? []).length, 1, p);
  });
  it('unchanged tokens stay unchanged in both apps (R-1: global --error is NOT changed)', () => {
    for (const p of [TENANT_CSS, SUPER_CSS]) {
      const css = stripComments(read(p));
      assert.match(css, /--border:\s*#E5E7EB;/i);
      assert.match(css, /--error:\s*#DC2626;/i);
      assert.match(css, /--gold:\s*#D4AF37;/i);
      assert.match(css, /--foreground:\s*#111827;/i);
    }
  });
  it('S-4: --field-focus-amber and --gold-text are NOT created in P0', () => {
    for (const p of [TENANT_CSS, SUPER_CSS]) assert.ok(!/--field-focus-amber|--gold-text/.test(read(p)));
  });
});

describe('P0 field foundation — contrast (computed from the tokens)', () => {
  const t = rootTokens(foundationOf(TENANT_CSS));
  const c = (k: string) => t[k].toUpperCase();
  it('entered value >= 4.5:1 on the field surface', () => assert.ok(contrast(c('--field-text'), c('--field-bg')) >= 4.5));
  it('placeholder >= 4.5:1 on the field surface', () => assert.ok(contrast(c('--field-placeholder'), c('--field-bg')) >= 4.5));
  it('boundary >= 3:1 against white AND the page surface', () => {
    assert.ok(contrast(c('--border-strong'), WHITE) >= 3);
    assert.ok(contrast(c('--border-strong'), PAGE) >= 3);
  });
  it('focus border >= 3:1 against white AND the page surface', () => {
    assert.ok(contrast(c('--field-focus-border'), WHITE) >= 3);
    assert.ok(contrast(c('--field-focus-border'), PAGE) >= 3);
  });
  it('field error: text >= 4.5:1 and border >= 3:1 on white and page', () => {
    for (const s of [WHITE, PAGE]) assert.ok(contrast(c('--field-error'), s) >= 4.5);
  });
  it('disabled text >= 4.5:1 on the disabled surface (product floor)', () => assert.ok(contrast(c('--field-disabled-text'), c('--field-disabled-bg')) >= 4.5));
  it('disabled boundary >= 3:1 against the page and against the disabled surface', () => {
    assert.ok(contrast(c('--field-disabled-border'), PAGE) >= 3);
    assert.ok(contrast(c('--field-disabled-border'), c('--field-disabled-bg')) >= 3);
  });
  it('brand gold #D4AF37 is NOT relied on for focus: it fails 3:1 on white (documented reason for #8A6D1F)', () => {
    assert.ok(contrast('#D4AF37', WHITE) < 3);
  });
});

describe('P0 field foundation — behaviour of the foundation rules', () => {
  const layerBody = () => layers(stripComments(foundationOf(TENANT_CSS))).blocks.find(b => b.name === 'components')!.body;
  const rule = (sel: string) => { const b = ruleBody(layerBody(), sel); assert.ok(b, `rule ${sel} must exist`); return decls(b!); };

  it('owns appearance/state only: declares no layout properties', () => {
    const forbidden = /^(width|min-width|max-width|height|min-height|max-height|padding(-.*)?|margin(-.*)?|display|position|grid.*|flex.*|inset.*|top|left|right|bottom|gap|overflow.*|box-sizing)$/;
    const body = layerBody();
    let i = 0; const found: string[] = [];
    while (i < body.length) {
      const open = body.indexOf('{', i); if (open < 0) break;
      const end = matchBrace(body, open);
      for (const prop of Object.keys(decls(body.slice(open + 1, end - 1)))) if (forbidden.test(prop)) found.push(prop);
      i = end;
    }
    assert.deepEqual(found, []);
  });
  it('default radius is 10px (a low-priority default, overridable by utilities)', () => assert.equal(rule('.input-base')['border-radius'], '10px'));
  it('Standard tier is Inter 14px / 500 / 1.5; Compact tier is 13px and never below', () => {
    const b = rule('.input-base');
    assert.equal(b['font-family'], 'var(--font-sans)');
    assert.equal(b['--field-font-size'], '0.875rem');
    assert.equal(b['font-size'], 'var(--field-font-size)');
    assert.equal(b['font-weight'], '500');
    assert.equal(b['line-height'], '1.5');
    assert.equal(rule('.input-base--compact')['--field-font-size'], '0.8125rem');
    assert.ok(0.8125 * 16 >= 13);
  });
  it('placeholder uses the placeholder token at full opacity', () => {
    const b = rule('.input-base::placeholder');
    assert.equal(b['color'], 'var(--field-placeholder)');
    assert.equal(b['opacity'], '1');
  });
  it('focus: border-color + same-colour 1px stroke + gold glow; no width change; no fill change; forced-colours fallback', () => {
    const b = rule('.input-base:focus');
    assert.equal(b['border-color'], 'var(--field-focus-border)');
    assert.match(b['box-shadow'], /0 0 0 1px var\(--field-focus-border\)/);
    assert.match(b['box-shadow'], /0 0 0 4px var\(--field-focus-ring\)/);
    assert.equal(b['outline'], '2px solid transparent');
    for (const forbidden of ['border', 'border-width', 'border-top-width', 'background', 'background-color', 'padding', 'transform']) {
      assert.ok(!(forbidden in b), `focus must not set ${forbidden}`);
    }
  });
  it('disabled/locked: ratified tokens, NO opacity reduction, not-allowed cursor, Safari text-fill resolved', () => {
    const b = rule('.input-base:disabled');
    assert.equal(b['background-color'], 'var(--field-disabled-bg)');
    assert.equal(b['color'], 'var(--field-disabled-text)');
    assert.equal(b['-webkit-text-fill-color'], 'var(--field-disabled-text)');
    assert.equal(b['border-color'], 'var(--field-disabled-border)');
    assert.equal(b['cursor'], 'not-allowed');
    assert.equal(b['opacity'], '1');
  });
  it('error state is keyed on aria-invalid and uses --field-error with constant width', () => {
    const b = rule('.input-base[aria-invalid="true"]');
    assert.equal(b['border-color'], 'var(--field-error)');
    assert.ok(!('border-width' in b) && !('border' in b));
    const f = rule('.input-base[aria-invalid="true"]:focus');
    assert.equal(f['border-color'], 'var(--field-error)');
    assert.match(f['box-shadow'], /var\(--field-error\)/);
  });
  it('transition lists explicit properties (never `all`)', () => {
    const tr = rule('.input-base')['transition'];
    assert.ok(!/\ball\b/.test(tr));
    assert.match(tr, /border-color/); assert.match(tr, /box-shadow/);
  });
});

describe('P0 field foundation — source invariants', () => {
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const f of readdirSync(dir)) {
      const full = path.join(dir, f);
      if (statSync(full).isDirectory()) walk(full, out);
      else if (full.endsWith('.tsx')) out.push(full);
    }
    return out;
  };
  const files = [...walk(path.join(ROOT, 'apps/superadmin/src')), ...walk(path.join(ROOT, 'apps/tenant/src'))];

  it('no className that contains input-base also contains type-body (.type-body is unlayered and would override the field text)', () => {
    const offenders: string[] = [];
    for (const f of files) {
      for (const m of read(f).matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
        const cls = m[1] ?? m[2] ?? '';
        if (/\binput-base\b/.test(cls) && /\btype-body\b/.test(cls)) offenders.push(path.relative(ROOT, f));
      }
    }
    assert.deepEqual(offenders, []);
  });
  it('no element combines .input-base with opacity-50/opacity-60 as the disabled mechanism', () => {
    const offenders: string[] = [];
    for (const f of files) {
      for (const m of read(f).matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
        const cls = m[1] ?? m[2] ?? '';
        if (/\binput-base\b/.test(cls) && /\bopacity-(50|60)\b/.test(cls)) offenders.push(path.relative(ROOT, f));
      }
    }
    assert.deepEqual(offenders, []);
  });
  it('tenant .tsx files do not use .input-base in P0 (tenant migration is P1+)', () => {
    const offenders = files.filter(f => f.includes(`${path.sep}apps${path.sep}tenant${path.sep}`) && /\binput-base\b/.test(read(f)));
    assert.deepEqual(offenders.map(f => path.relative(ROOT, f)), []);
  });
});

describe('P0 field foundation — NFR-1 (Superadmin bundle isolation)', () => {
  it('a built Superadmin bundle contains no apps/tenant reference (skipped if no build output exists)', (t) => {
    // Scope: the JS/CSS bundle under assets/ (the NFR-1 subject). A pre-existing HTML *comment* in
    // apps/superadmin/index.html ("Same type system as apps/tenant") is not part of the bundle and
    // predates P0 — index.html is out of P0 scope and is reported, not edited, in the P0 evidence.
    const dist = path.join(ROOT, 'dist-superadmin', 'assets');
    if (!existsSync(dist)) { t.skip('dist-superadmin not built; run `npm run build:superadmin` first'); return; }
    const offenders: string[] = [];
    const scan = (d: string) => {
      for (const f of readdirSync(d)) {
        const full = path.join(d, f);
        if (statSync(full).isDirectory()) scan(full);
        else if (/\.(js|css|map)$/.test(f) && read(full).includes('apps/tenant')) offenders.push(path.relative(ROOT, full));
      }
    };
    scan(dist);
    assert.deepEqual(offenders, []);
  });
});
