import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { LogOut, ShieldOff, Wallet, ScrollText, Users, Building2, Compass } from 'lucide-react';
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
    return (
      <Centered>
        <p className="type-body" style={{ color: 'var(--muted-foreground)' }}>A verificar sessão…</p>
      </Centered>
    );
  }
  if (phase.kind === 'signed-out') {
    return <SignIn />;
  }
  if (phase.kind === 'not-platform-operator') {
    return (
      <Centered>
        <ShieldOff className="h-8 w-8" style={{ color: 'var(--error)' }} />
        <p className="type-body max-w-sm">Esta conta não é uma conta de operador de plataforma.</p>
        <SignOutButton />
      </Centered>
    );
  }
  if (phase.kind === 'not-superadmin') {
    return (
      <Centered>
        <ShieldOff className="h-8 w-8" style={{ color: 'var(--warning)' }} />
        <p className="type-body max-w-sm">
          Esta conta tem a função <strong className="font-bold">{phase.platformRole}</strong>, mas a Operação de
          Pagamentos está limitada a contas SuperAdmin nesta versão.
        </p>
        <SignOutButton />
      </Centered>
    );
  }

  // phase.kind === 'superadmin'
  const NAV_ITEMS: { id: View['name']; label: string; icon: typeof Wallet }[] = [
    { id: 'queue', label: 'Fila de Pagamentos', icon: Wallet },
    { id: 'audit', label: 'Auditoria', icon: ScrollText },
    { id: 'operators', label: 'Operadores', icon: Users },
    { id: 'businesses', label: 'Negócios', icon: Building2 },
    { id: 'directory', label: 'Directório', icon: Compass },
  ];
  const isNavActive = (id: View['name']) =>
    view.name === id || (view.name === 'businessDetail' && view.from === (id === 'businesses' ? 'businesses' : id === 'directory' ? 'directory' : undefined));

  return (
    <div className="min-h-screen" style={{ background: 'var(--muted)' }}>
      <header className="text-white" style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #132A4A 100%)' }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <div className="flex items-center gap-6">
            <h1 className="font-display text-xl font-semibold tracking-tight text-white">Sabush SuperAdmin</h1>
            <nav className="flex flex-wrap items-center gap-2">
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
                const active = isNavActive(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setView({ name: id } as View)}
                    className={`flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-[12.5px] font-bold tracking-tight transition-all duration-150 active:scale-[0.97] ${
                      active
                        ? 'border-transparent bg-[#D4AF37] text-[#0B1F3A] shadow-[0_4px_14px_-4px_rgba(212,175,55,0.55)]'
                        : 'border-white/[0.14] bg-white/[0.05] text-white/80 hover:border-white/25 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                    {label}
                  </button>
                );
              })}
            </nav>
          </div>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
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
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center"
      style={{ background: '#00020F' }}
    >
      {children}
    </div>
  );
}

function SignOutButton() {
  return (
    <button
      onClick={() => signOut(auth)}
      className="flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-[13px] font-semibold text-white/80 transition-colors hover:border-white/35 hover:text-white"
    >
      <LogOut className="h-3.5 w-3.5" />
      Sair
    </button>
  );
}
