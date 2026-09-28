// Single source of truth for the user-facing text shown when a periodic Contagem cannot be reviewed
// or confirmed. Used by BOTH handleRequestConfirmation (Review) and handleConfirmSave (Confirm):
// state can change between the two (a late recovery-evidence scan, a row save that fails after the
// Review screen opened), and before this module handleConfirmSave ended in bare `return`s, so the
// "Confirmar Contagem" button silently did nothing with no message.

export const identityCheckPendingMessage = (ambiguousCount: number): string =>
  `Existem ${ambiguousCount} linha(s) desta Contagem com um estado de identidade não resolvido e precisam de revisão antes de poder confirmar.`;

export const identityCheckNotRunMessage =
  'Ainda não foi possível verificar as linhas desta Contagem. Volte atrás e toque de novo em "Rever e Confirmar Contagem".';

export const unresolvedRecoveryEvidenceMessage = (rowCount: number): string =>
  `Existem ${rowCount} linha(s) com alterações não confirmadas encontradas ao retomar esta Contagem — reveja-as antes de confirmar.`;

export const unsafeRowsMessage = (rowCount: number): string =>
  `Existem ${rowCount} linha(s) com um problema de gravação por resolver — reveja-as antes de confirmar.`;
