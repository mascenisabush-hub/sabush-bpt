// Periodic Contagem — decides whether a write to an existing draft row is the
// same person correcting their OWN value (accept, advance rev) or must be
// routed to CONFLICT (a different writer, or a stale copy on a dormant device).
//
// Pure so the rule can be tested directly. The rule is unchanged from the
// original same-writer check (same UID AND the write was based on the current
// server rev, or no base rev supplied) with ONE addition: the write is also a
// genuine self-correction when the server's current document is EXACTLY this
// device's own last committed write. The live listener that supplies `baseRev`
// can lag a commit this device just made (slow/flaky connection); without this
// addition the person's own consecutive edits were flagged as a conflict with
// themselves, locking the row and blocking Review & Confirm.
//
// A dormant second device never satisfies the new clause: some other write
// has since changed the row's `rev` and `lastWriteAt`, so its remembered
// commit no longer matches, and it still falls through to CONFLICT.

export interface OwnCommittedWrite {
  rev: number;
  lastWriteAt: string;
}

export interface SelfCorrectionInputs {
  currentLastWriterUid: string | undefined;
  currentUserUid: string;
  /** Server rev the caller believed it was editing (from its listener). */
  baseRev: number | undefined;
  /** The rev actually on the server, read inside the transaction. */
  currentRev: number;
  /** `lastWriteAt` actually on the server, read inside the transaction. */
  currentLastWriteAt: string | undefined;
  /** What this device itself last committed for this row, if anything. */
  ownLastCommit: OwnCommittedWrite | undefined;
}

export function isSameWriterSelfCorrection(input: SelfCorrectionInputs): boolean {
  if (input.currentLastWriterUid !== input.currentUserUid) return false;
  if (input.baseRev === undefined || input.baseRev === input.currentRev) return true;
  const own = input.ownLastCommit;
  return (
    !!own &&
    own.rev === input.currentRev &&
    input.currentLastWriteAt !== undefined &&
    own.lastWriteAt === input.currentLastWriteAt
  );
}
