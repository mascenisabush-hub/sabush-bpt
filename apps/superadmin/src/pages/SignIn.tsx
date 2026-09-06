import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Lock, Mail, ShieldAlert } from 'lucide-react';
import { auth } from '../lib/firebase';

// FR-1 — SuperAdmin authentication. No self-service signup exists here
// or anywhere in this app, by design (Architecture §7.4: platform
// operators are "provisioned by an existing SuperAdmin... never
// self-service signup"). This screen only signs an already-provisioned
// Firebase Auth account in; App.tsx is what then checks
// platform_operators/{uid} and shows the "not a platform operator
// account" state if that check fails — this screen itself has no
// opinion on platform authorization.
export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // App.tsx's onAuthStateChanged listener takes it from here.
    } catch (err: any) {
      // [Bug fix — sign-in failing for genuinely correct credentials
      // with no way to tell why] Mirrors apps/tenant's own established
      // convention (AuthView.tsx): log the raw error for devtools, map
      // the common credential-related codes to a friendly message, but
      // ALWAYS include the raw Firebase error code in the displayed
      // string. Previously every failure — wrong password, but also a
      // misconfigured API key/project, email/password sign-in disabled
      // in the Firebase console, a network error, an account disabled,
      // rate-limiting, etc. — showed the identical "invalid
      // credentials" message, making it impossible to distinguish a
      // real credential mistake from a configuration/infrastructure
      // problem that would fail even for a correct password.
      console.error('[SuperAdmin Login Auth Error]:', err);
      let userMsg: string;
      if (err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        userMsg = 'Email ou palavra-passe inválidos.';
      } else if (err?.code === 'auth/user-disabled') {
        userMsg = 'Esta conta foi desativada.';
      } else if (err?.code === 'auth/invalid-email') {
        userMsg = 'Formato de email inválido.';
      } else if (err?.code === 'auth/too-many-requests') {
        userMsg = 'Demasiadas tentativas. Aguarde um momento e tente novamente.';
      } else if (err?.code === 'auth/network-request-failed') {
        userMsg = 'Erro de rede. Verifique a sua ligação à internet.';
      } else if (err?.code === 'auth/api-key-not-valid' || err?.code === 'auth/invalid-api-key') {
        userMsg = 'Erro de configuração (chave de API inválida). Contacte o suporte técnico.';
      } else if (err?.code === 'auth/operation-not-allowed') {
        userMsg = 'A autenticação por email/palavra-passe não está ativada neste projeto. Contacte o suporte técnico.';
      } else {
        userMsg = err?.message || 'Ocorreu um erro ao autenticar.';
      }
      setError(`${userMsg}${err?.code ? ` [${err.code}]` : ''}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    // Full-screen dark surface — deliberately the AuthView/AppLoadingScreen
    // near-black system (DESIGN_SYSTEM.md's "two separate dark-surface
    // systems, do not merge" rule), not .card-dark-gradient's navy
    // gradient, since this is a full-screen auth background rather than a
    // flagship metric card.
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: '#00020F' }}
    >
      <form
        onSubmit={handleSubmit}
        className="card-premium elevation-3 w-full max-w-sm p-8"
      >
        <div className="mb-1 flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'var(--gold-soft)' }}
          >
            <Lock className="h-4.5 w-4.5" style={{ color: 'var(--gold-hover)' }} strokeWidth={2.25} />
          </span>
          <h1 className="font-display type-title-lg">Sabush SuperAdmin</h1>
        </div>
        <p className="type-label mb-7 ml-[46px]">Operações de Pagamento</p>

        <label className="type-label mb-1.5 block">Email</label>
        <div className="relative mb-4">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            className="input-base type-body w-full py-2.5 pl-9 pr-3"
          />
        </div>

        <label className="type-label mb-1.5 block">Palavra-passe</label>
        <div className="relative mb-2">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="input-base type-body w-full py-2.5 pl-9 pr-3"
          />
        </div>

        {error && (
          <div
            className="mt-4 flex items-start gap-2 rounded-lg border p-3"
            style={{ background: 'rgba(220,38,38,0.06)', borderColor: 'rgba(220,38,38,0.25)' }}
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--error)' }} />
            <p className="text-[13px] leading-snug" style={{ color: 'var(--error)' }}>{error}</p>
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn-primary lift mt-6 w-full py-2.5 text-sm">
          {submitting ? 'A entrar…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
