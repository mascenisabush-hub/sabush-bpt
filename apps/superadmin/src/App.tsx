import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import SignIn from './pages/SignIn';
import PendingPaymentsQueue from './pages/PendingPaymentsQueue';
import PaymentDetail from './pages/PaymentDetail';
import AuditTrail from './pages/AuditTrail';
import Operators from './pages/Operators';
import BusinessSearch from './pages/BusinessSearch';
import BusinessDirectory from './pages/BusinessDirectory';
import BusinessDetail from './pages/BusinessDetail';

type AuthPhase =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'not-platform-operator' }
  | { kind: 'not-superadmin'; platformRole: string }
  | { kind: 'superadmin' };

type View = { name: 'queue' } | { name: 'detail'; businessId: string; paymentId: string } | { name: 'audit' } | { name: 'operators' } | { name: 'businesses' } | { name: 'directory' } | { name: 'businessDetail'; businessId: string; from: 'businesses' | 'directory' };

// FR-1 / Architecture §9.1: "the shell reads platform_operators/{uid}.
// platformRole once at load and builds the nav from it." A screen a
// role cannot see is not rendered, not merely disabled — this V1 slice
// has exactly one screen set (Payment Operations), gated to
// 'superadmin' only (BDS §3/§11); a real, provisioned 'support' or
// 'developer' platform operator is told plainly why they can't proceed
// here, not shown a broken or empty queue.
export default function App() {
  const [phase, setPhase] = useState<AuthPhase>({ kind: 'loading' });
  const [view, setView] = useState<View>({ name: 'queue' });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (!user) {
        setPhase({ kind: 'signed-out' });
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'platform_operators', user.uid));
        if (!snap.exists()) {
          setPhase({ kind: 'not-platform-operator' });
          return;
        }
        const platformRole = (snap.data().platformRole as string) ?? '';
        if (platformRole !== 'superadmin') {
          setPhase({ kind: 'not-superadmin', platformRole });
          return;
        }
        setPhase({ kind: 'superadmin' });
      } catch {
        // Firestore rules deny read for anything but the caller's own
        // platform_operators doc — a genuine read failure here (not a
        // "document doesn't exist" case, which resolves above) means
        // something is misconfigured, not that the operator lacks
        // access; fail safe to the same "not a platform operator"
        // message rather than a raw error screen.
        setPhase({ kind: 'not-platform-operator' });
      }
    });
    return unsubscribe;
  }, []);

  if (phase.kind === 'loading') {
    return <Centered>A verificar sessão…</Centered>;
  }
  if (phase.kind === 'signed-out') {
    return <SignIn />;
  }
  if (phase.kind === 'not-platform-operator') {
    return (
      <Centered>
        <p>Esta conta não é uma conta de operador de plataforma.</p>
        <SignOutButton />
      </Centered>
    );
  }
  if (phase.kind === 'not-superadmin') {
    return (
      <Centered>
        <p>
          Esta conta tem a função <strong>{phase.platformRole}</strong>, mas a Operação de Pagamentos está limitada a
          contas SuperAdmin nesta versão.
        </p>
        <SignOutButton />
      </Centered>
    );
  }

  // phase.kind === 'superadmin'
  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <strong>Sabush SuperAdmin</strong>
          <NavLink active={view.name === 'queue'} onClick={() => setView({ name: 'queue' })}>Fila de Pagamentos</NavLink>
          <NavLink active={view.name === 'audit'} onClick={() => setView({ name: 'audit' })}>Auditoria</NavLink>
          <NavLink active={view.name === 'operators'} onClick={() => setView({ name: 'operators' })}>Operadores</NavLink>
          <NavLink active={view.name === 'businesses' || (view.name === 'businessDetail' && view.from === 'businesses')} onClick={() => setView({ name: 'businesses' })}>Negócios</NavLink>
          <NavLink active={view.name === 'directory' || (view.name === 'businessDetail' && view.from === 'directory')} onClick={() => setView({ name: 'directory' })}>Directório</NavLink>
        </div>
        <SignOutButton />
      </header>
      <main style={{ padding: 24 }}>
        {view.name === 'queue' && (
          <PendingPaymentsQueue onOpenPayment={(businessId, paymentId) => setView({ name: 'detail', businessId, paymentId })} />
        )}
        {view.name === 'detail' && (
          <PaymentDetail businessId={view.businessId} paymentId={view.paymentId} onBack={() => setView({ name: 'queue' })} />
        )}
        {view.name === 'audit' && <AuditTrail />}
        {view.name === 'operators' && <Operators />}
        {view.name === 'businesses' && (
          <BusinessSearch onOpenBusiness={(businessId) => setView({ name: 'businessDetail', businessId, from: 'businesses' })} />
        )}
        {view.name === 'directory' && (
          <BusinessDirectory onOpenBusiness={(businessId) => setView({ name: 'businessDetail', businessId, from: 'directory' })} />
        )}
        {view.name === 'businessDetail' && (
          <BusinessDetail
            businessId={view.businessId}
            onBack={() => setView(view.from === 'directory' ? { name: 'directory' } : { name: 'businesses' })}
          />
        )}
      </main>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', padding: 24 }}>
      {children}
    </div>
  );
}

function SignOutButton() {
  return (
    <button
      onClick={() => signOut(auth)}
      style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', borderRadius: 4, padding: '6px 12px', fontSize: 13 }}
    >
      Sair
    </button>
  );
}

function NavLink({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        color: active ? '#e2e8f0' : '#64748b',
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        padding: 0,
        fontSize: 14,
      }}
    >
      {children}
    </button>
  );
}
