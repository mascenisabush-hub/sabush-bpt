// Module #20 (Notifications), Phase 1 (Foundations) — Delivery Channel
// Interface, per docs/specs/20-notifications.md §20.4 (Decision Gate 3):
//
//   Notification Event
//           |
//      Delivery Channel Interface
//           |
//           +── In-App (V1 — implemented)
//           +── Email (future — interface only, not built)
//           +── WhatsApp (future — interface only, not built)
//
// The interface is defined now specifically so that adding Email or
// WhatsApp later is an additive new implementation of this interface,
// not a redesign of the notification domain (20.4).
//
// Phase 1 scope note: nothing in this phase creates a real notification
// (no producer exists — Phase 2/3). This file exists so the interface
// contract is real and typed now, per the Rule 8 Assessment's own
// "structurally real but empty system" framing
// (docs/engineering/20-phase1-foundations-rule8-assessment.md §0/§6).

import { Notification, NotificationChannel } from '../../types';

export interface DeliveryChannel {
  readonly name: NotificationChannel;
  send(notification: Notification): Promise<void>;
}

// V1's only channel. For in-app, "delivery" is the notification
// document's own existence in Firestore — NotificationContext's live
// listener is what actually surfaces it to the user (20.4: "a live
// Firestore listener, consistent with NotificationContext's existing
// design intent"). The document itself is written server-side only
// (Decision Gate 2) by the privileged server, Background Worker, or
// payment webhook handler (20.5) — none of which exist for this
// collection yet in Phase 1.
//
// `send()` is therefore intentionally a no-op here: there is no
// additional delivery step beyond the write itself, and no producer in
// this phase calls it. This keeps the interface honest (real, typed,
// satisfiable) without fabricating a client-side write path that
// Decision Gate 2 forbids, or an HTTP contract to a server endpoint
// that hasn't been scoped/authorized yet (that belongs to whichever
// later checkpoint/phase adds the first real producer).
export class InAppChannel implements DeliveryChannel {
  readonly name = 'in_app' as const;

  async send(_notification: Notification): Promise<void> {
    // Intentional no-op — see class comment above.
    return;
  }
}
