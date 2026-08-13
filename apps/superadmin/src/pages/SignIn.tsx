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
    } catch {
      setError('Email ou palavra-passe inválidos.');
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
