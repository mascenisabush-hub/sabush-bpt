// [Bug fix — Owner-reported: "digits typed are hidden" in Periodic
// Contagem's quantity field]
//
// ROOT CAUSE: `<input type="number">` requires a period as the decimal
// separator per the HTML5 value-sanitization spec — but this app's
// numeric-keypad fields are used almost entirely in Portuguese-locale
// contexts (Mozambique), where a mobile keyboard's decimal key is a
// comma. The moment a comma (or anything else the browser's own
// number-parsing considers invalid) is typed, a `type="number"`
// input's own `.value` becomes the empty string at the DOM level —
// and because every quantity/price field in this app is a
// React-controlled input (`value={row.quantity}`), the very next
// render then wipes the field back to blank, even though the digit
// visually appeared for a moment as the browser first accepted the
// keystroke. This never reproduces for a whole-number entry — only
// once a decimal is actually typed — which is why it was reported as
// "the first product was fine, the next ones aren't": whichever
// product happens to need a fractional quantity is simply the first
// one to trigger it.
//
// FIX SHAPE: pair this sanitizer with `type="text"` + `inputMode=
// "decimal"` on the input itself (never `type="number"`) — a text
// input never rejects or blanks a keystroke at the DOM level, so
// nothing the Owner types can vanish; `inputMode="decimal"` still
// brings up the numeric/decimal keypad on mobile. This function then
// does the actual numeric sanitization app-side: a comma is treated
// as a decimal separator and normalized to a period (every quantity/
// price field elsewhere in this codebase is read via `parseFloat`,
// which requires one), anything that isn't a digit or separator is
// stripped, and only the FIRST decimal separator survives (mirrors
// what a native number input would have allowed anyway — never two
// decimal points).
//
// Pure, no side effects — independently unit-testable, and reusable
// anywhere else in the app a decimal-capable text-mode numeric field
// is needed.

/**
 * Sanitizes raw text-input content into a numeric string safe to pass
 * to `parseFloat`/`Number()` — digits and at most one decimal point
 * (accepting a comma as an equivalent, normalized to a period).
 * Never throws; an input with nothing numeric in it returns ''.
 */
export function sanitizeDecimalInput(raw: string): string {
  let value = raw.replace(/,/g, '.');
  value = value.replace(/[^0-9.]/g, '');
  const firstDot = value.indexOf('.');
  if (firstDot !== -1) {
    value = value.slice(0, firstDot + 1) + value.slice(firstDot + 1).replace(/\./g, '');
  }
  return value;
}
