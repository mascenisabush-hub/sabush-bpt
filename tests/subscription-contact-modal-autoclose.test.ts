// SubscriptionContactModal — auto-close on the authoritative transition
// to 'active' during a pending payment workflow (Track B correctness
// fix, scoped narrowly per docs/engineering/19-v1-customer-validation-plan.md
// §2 item 4's investigation).
//
// SCOPE: SubscriptionContactModal.tsx is a React component with no
// jsdom/testing-library harness in this repo — same documented
// constraint as tests/initial-stock-confirmation.test.ts and
// tests/periodic-stock-draft-resurrection.test.ts, whose own
// source-inspection technique this file matches exactly.
//
// WHAT THIS PROVES:
//   1. The bug this fix closes: `justSubmitted` is set true on submit
//      and never reset anywhere else in the component — meaning without
//      this fix, a mounted modal would show "pending" forever regardless
//      of the actual subscription/payment state.
//   2. The fix's specific shape: a transition check (previous status vs
//      current status), not a "current value" check — so opening the
//      modal while the business is already 'active' must NOT trigger an
//      auto-close, only a genuine non-active -> active change observed
//      while mounted does.
//   3. The fix does not touch payment-confirmation logic, the
//      subscription engine, or add any new visible "success" UI branch —
//      it only closes the modal.
//
// HOW TO RUN:
//   npx tsx --test tests/subscription-contact-modal-autoclose.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../apps/tenant/src/components/SubscriptionContactModal.tsx', import.meta.url), 'utf-8');

describe('the pre-existing staleness bug this fix closes', () => {
  it('justSubmitted is set true on submit and is never set false anywhere else in the file', () => {
    const setTrueMatches = source.match(/setJustSubmitted\(true\)/g) ?? [];
    const setFalseMatches = source.match(/setJustSubmitted\(false\)/g) ?? [];
    assert.equal(setTrueMatches.length, 1, 'Expected exactly one setJustSubmitted(true) call, in handleSubmit.');
    assert.equal(
      setFalseMatches.length,
      0,
      'justSubmitted must never be reset directly — the fix closes the stale-pending workflow by closing the modal (onClose), not by resetting this flag and falling through to the payment form again.'
    );
  });

  it('the pending view render condition still includes the justSubmitted disjunct — confirms the latch this bug depends on is still the actual mechanism, not something a future refactor silently changed underneath this test', () => {
    assert.match(
      source,
      /\(showPendingView \|\| justSubmitted\)/,
      'Expected the pending-view render condition to still be (showPendingView || justSubmitted).'
    );
  });
});

describe('the fix — subscription is consumed and watched for a transition to active', () => {
  it('destructures subscription from useApp()', () => {
    assert.match(
      source,
      /const \{ payments, submitPayment, subscription \} = useApp\(\);/,
      'Expected subscription to be destructured from useApp() alongside the existing payments/submitPayment.'
    );
  });

  it('watches subscription?.status via a useEffect dependency array', () => {
    assert.match(
      source,
      /useEffect\(\(\) => \{[\s\S]*?\}, \[subscription\?\.status, onClose\]\);/,
      'Expected a useEffect keyed on [subscription?.status, onClose].'
    );
  });

  it('calls onClose() when the status becomes active — the ONLY call to onClose from inside this effect body', () => {
    const effectMatch = source.match(/useEffect\(\(\) => \{([\s\S]*?)\}, \[subscription\?\.status, onClose\]\);/);
    assert.notEqual(effectMatch, null, 'Could not locate the auto-close useEffect.');
    const effectBody = effectMatch![1];
    assert.match(effectBody, /onClose\(\);/, 'Expected the effect to call onClose().');
    const onCloseCallsInEffect = effectBody.match(/onClose\(\)/g) ?? [];
    assert.equal(onCloseCallsInEffect.length, 1, 'Expected exactly one onClose() call inside the effect body.');
  });
});

describe('the fix — transition check, not a current-value check (the specific subtlety this fix must get right)', () => {
  const effectMatch = source.match(/useEffect\(\(\) => \{([\s\S]*?)\}, \[subscription\?\.status, onClose\]\);/);
  const effectBody = effectMatch ? effectMatch[1] : '';

  it('effect body is non-empty (guards the two tests below against a false pass if the marker regex ever stops matching)', () => {
    assert.notEqual(effectBody.trim(), '', 'Expected to find and extract the auto-close effect body.');
  });

  it('reads a previous-status ref BEFORE updating it to the current value, in that order', () => {
    const readIndex = effectBody.indexOf('previousStatusRef.current');
    const updateIndex = effectBody.indexOf('previousStatusRef.current = subscription?.status');
    assert.notEqual(readIndex, -1, 'Expected the effect to read previousStatusRef.current.');
    assert.notEqual(updateIndex, -1, 'Expected the effect to update previousStatusRef.current = subscription?.status.');
    assert.ok(
      readIndex < updateIndex,
      'The previous status must be captured into a local variable BEFORE the ref is updated to the current value — otherwise "previous" and "current" would read as the same value and no transition could ever be detected.'
    );
  });

  it('the onClose condition checks previousStatus is a known prior value (not null/undefined) AND was not already active AND current status is active', () => {
    assert.match(
      effectBody,
      /if \(previousStatus != null && previousStatus !== 'active' && subscription\?\.status === 'active'\)/,
      "Expected the guard to require a genuine known-non-active prior status before treating a change to 'active' as a transition worth closing for."
    );
  });

  it('a subscription that is already active on the modal\'s first render must not auto-close it (previousStatusRef is seeded from the same render, so previousStatus === current status on the first effect run)', () => {
    assert.match(
      source,
      /const previousStatusRef = useRef\(subscription\?\.status\);/,
      "Expected previousStatusRef to be seeded with useRef(subscription?.status) — seeding from the CURRENT render's value (not e.g. useRef(undefined) or useRef(null)) is what makes 'already active on mount' a no-op: previousStatus equals the current status on the first effect run, so the transition guard (previousStatus !== 'active') correctly evaluates false."
    );
  });
});

describe('scope discipline — this fix does not touch payment confirmation, the subscription engine, or add a new success UI branch', () => {
  it('does not import or reference anything from server/paymentConfirmation.ts or server/subscriptionEngine.ts', () => {
    assert.doesNotMatch(source, /paymentConfirmation/);
    assert.doesNotMatch(source, /subscriptionEngine/);
  });

  it('does not add a new rendered branch for an "active"/"success" state — the JSX still only has pending, rejected, and the default submission-form branches', () => {
    const jsxConditionals = source.match(/\{(showPendingView|justSubmitted|showRejectedView)[^}]*&&/g) ?? [];
    // Every conditional render branch in the JSX body must reference
    // only the three pre-existing view flags — a new branch keyed on
    // subscription.status === 'active' would show up here as an
    // additional distinct condition and fail this assertion.
    for (const cond of jsxConditionals) {
      assert.match(
        cond,
        /showPendingView|justSubmitted|showRejectedView/,
        `Unexpected new render-condition variable found: ${cond}`
      );
    }
    assert.doesNotMatch(
      source,
      /subscription\?\.status === 'active'[^)]*&&\s*\(/,
      'Expected no new JSX branch gated on subscription.status === \'active\' — the fix closes the modal, it does not add a visible success state inside it.'
    );
  });
});
