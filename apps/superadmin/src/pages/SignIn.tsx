import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
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
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} style={{ width: 320, padding: 32, background: '#1e293b', borderRadius: 8 }}>
        <h1 style={{ fontSize: 18, marginBottom: 4 }}>Sabush — SuperAdmin</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24 }}>Operações de Pagamento</p>

        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />

        <label style={{ display: 'block', fontSize: 13, margin: '12px 0 4px' }}>Palavra-passe</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />

        {error && <p style={{ color: '#f87171', fontSize: 13, marginTop: 12 }}>{error}</p>}

        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? 'A entrar…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 4,
  border: '1px solid #334155',
  background: '#0f172a',
  color: '#e2e8f0',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 20,
  padding: '10px 0',
  borderRadius: 4,
  border: 'none',
  background: '#2563eb',
  color: 'white',
  fontWeight: 600,
};
