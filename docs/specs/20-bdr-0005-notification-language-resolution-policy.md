Business Decision Record

# BDR-0005 — Notification Language Resolution Policy

**Status:** Proposed (Pending Product Architect Approval). Recorded here
in this status explicitly — not Accepted — pending a separate, explicit
Product Architect approval step. No engineering work is authorized by
this record in its current status.
**Module:** #20 — Notifications
**Record ID:** BDR-0005
**Type:** Business Decision Record — business policy only. Does not
authorize implementation.

---

## 1. Purpose

This Business Decision Record establishes how the platform determines
the language used for server-generated notifications.

This decision applies to notifications created outside the React
application, including notifications produced by:

- Background Worker jobs
- Privileged server endpoints
- Payment webhooks
- Future AI-generated BusinessEvents
- Future SuperAdmin-generated BusinessEvents

This BDR defines business policy only. It does not authorize
implementation.

## 2. Problem Statement

The tenant application currently determines interface language through
the client application.

Background Workers and server-side producers execute independently of
the client.

Therefore a server-side notification cannot depend on:

- React Context
- Browser state
- localStorage
- Current logged-in session

Without a platform policy, engineering would have to invent
language-selection behavior during implementation. This platform does
not permit engineering to create business policy.

## 3. Business Principle

Every notification should be delivered in the language the recipient
would reasonably expect, without depending on the application currently
being open.

Language selection is therefore a property of the recipient — not of
the running client application.

## 4. Decision

The platform shall resolve notification language using the following
deterministic fallback chain.

**Level 1 — User Preference.** If the recipient has an explicitly
stored preferred language, use that language. This represents the
user's own communication preference.

**Level 2 — Business Default Language.** If no user preference exists,
use the Business's configured default language. This ensures
consistent communication across a business whose users have never
chosen their own language.

**Level 3 — Platform Default.** If neither exists, the platform shall
use Portuguese. Portuguese is the initial platform default because it
aligns with SABUSH BPT's primary operating market. This is a platform
configuration, not a hard-coded architectural assumption. Future
platform expansion may change the configured platform default without
changing this policy.

## 5. Deterministic Resolution

Language resolution shall always produce exactly one language. No
notification may be skipped because language cannot be determined.

## 6. Notification Independence

Notification language is determined when the notification is created.
Subsequent user language changes do not rewrite previously created
notifications. Historical notifications remain historical records.

## 7. Separation of Responsibilities

This BDR intentionally separates responsibilities.

**Business Policy decides:** how language is resolved.

**Engineering decides:** where preferences are stored, caching,
retrieval optimization, database queries, implementation details.

No engineering implementation may alter the fallback order defined by
this BDR.

## 8. Future Compatibility

This decision intentionally supports future capabilities without
requiring additional policy changes, including: AI-generated
BusinessEvents, SuperAdmin notifications, and additional delivery
channels (Email, SMS, Push, Webhooks). All future communication
channels shall resolve language using the same policy.

## 9. What This Decision Does Not Decide

This BDR does not decide: where language is stored, User document
schema, Business schema, localization implementation, translation
files, `LanguageContext` implementation, caching strategy, or delivery
channel implementation. Those remain engineering responsibilities.

## 10. Expected Architectural Consequences

This decision is expected to introduce the following architectural
dependency: User Architecture will require a persisted language
preference. This is an Informational Dependency, not an implementation
blocker. No new ADR is required solely because of this BDR.

## 11. Implementation Authorization

None. This Business Decision Record defines business policy only.
Implementation remains subject to Rule 8 Assessment, Implementation
Authorization, and approved engineering planning.

---

## Governance Notes

- This record does not modify `20-notifications.md`, any Decision Gate,
  any Business Rule, POL-20-001, ADR-0002/0003/0004, or any Phase
  close-out.
- This record does not implement code, modify runtime behavior, or edit
  any `firestore.rules`, `src/`, or `server/` file. None were touched to
  produce it.
- **Lifecycle:** Designed → **Proposed**. Not yet Accepted. A separate,
  explicit Product Architect approval step is required before this
  record's fallback chain (§4) may be treated as settled business
  policy for any Rule 8 Assessment or Implementation Plan to build
  against.
