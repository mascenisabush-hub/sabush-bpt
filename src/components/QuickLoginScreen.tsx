import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { Store, User, ArrowLeft, Delete, ShieldCheck, Loader2, KeyRound, Info } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';

interface QuickLoginScreenProps {
  onUseOwnerLogin: () => void;
}

// Shown instead of the normal email/password AuthView on a device that's
// been paired to a shop (see AppContext's pairDevice). Staff pick their
// name from a list — no emails or passwords ever shown or typed by hand —
// then enter their 6-digit PIN, which is their real Firebase Auth password
// under the hood.
export const QuickLoginScreen: React.FC<QuickLoginScreenProps> = ({ onUseOwnerLogin }) => {
  const { pairedDevice } = useApp();
  const { t } = useLanguage();
  const [selected, setSelected] = useState<{ uid: string; name: string; email: string } | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!pairedDevice) return null; // App.tsx only renders this when paired

  const handleDigit = async (digit: string) => {
    if (loading || pin.length >= 6 || !selected) return;
    const next = pin + digit;
    setPin(next);
    setError(null);

    if (next.length === 6) {
      setLoading(true);
      try {
        await signInWithEmailAndPassword(auth, selected.email, next);
        // Success — onAuthStateChanged in AppContext takes over from here.
      } catch (err: any) {
        if (err.code === 'auth/user-disabled') {
          setError(t('quickLogin.errors.suspended'));
        } else if (err.code === 'auth/too-many-requests') {
          setError(t('quickLogin.errors.tooManyAttempts'));
        } else {
          setError(t('quickLogin.errors.wrongPin'));
        }
        setPin('');
        setLoading(false);
      }
    }
  };

  const handleBackspace = () => {
    if (loading) return;
    setPin((p) => p.slice(0, -1));
    setError(null);
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-center items-center p-4 sm:p-6 font-sans overflow-hidden">
      {/* Layered background — pure white base + a very soft navy radial glow
          top-right, so the screen reads as alive/premium instead of flat. */}
      <div className="absolute inset-0 bg-white" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 900px 700px at 88% 8%, rgba(11,31,58,0.07), transparent 60%)',
        }}
      />

      <div
        className="w-full max-w-[440px] rounded-[20px] p-8 sm:p-9 relative animate-[quicklogin-in_0.4s_ease]"
        style={{
          background: 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(0,0,0,0.05)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
        }}
      >
        <div className="flex justify-end mb-3">
          <LanguageSwitcher />
        </div>

        <div className="flex flex-col items-center text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{
              background: 'linear-gradient(135deg, #0B1F3A, #1E3A5F)',
              boxShadow: '0 8px 20px rgba(11,31,58,0.25)',
            }}
          >
            <Store className="w-6 h-6" />
          </div>
          <h1 className="text-[21px] font-semibold tracking-[0.3px] text-[#111827] mt-4">
            {pairedDevice.businessName}
          </h1>
          <p className="text-sm text-[#6B7280] mt-1.5">
            {selected ? t('quickLogin.enterPin') : t('quickLogin.whoIsUsing')}
          </p>
        </div>

        {!selected ? (
          <>
            {pairedDevice.staff.length === 0 ? (
              <p className="text-[13px] text-[#6B7280] bg-[#F9FAFB] p-3.5 rounded-xl border border-dashed border-[#E5E7EB] text-center mt-5 flex items-center justify-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                {t('quickLogin.noStaffConfigured')}
              </p>
            ) : (
              <div className="space-y-2 mt-5 mb-5 max-h-72 overflow-y-auto">
                {pairedDevice.staff.map((s) => (
                  <button
                    key={s.uid}
                    onClick={() => {
                      setSelected(s);
                      setPin('');
                      setError(null);
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl border border-[#0B1F3A]/[0.06] bg-white/60 hover:border-[#2563EB]/40 hover:bg-white transition text-left"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#0B1F3A]/5 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-[#0B1F3A]" />
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{s.name}</span>
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={onUseOwnerLogin}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-[#111] font-medium mt-5 transition-all hover:-translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50"
              style={{
                background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                boxShadow: '0 8px 20px rgba(37,99,235,0.25)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 12px 25px rgba(37,99,235,0.35)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 8px 20px rgba(37,99,235,0.25)')}
            >
              <ShieldCheck className="w-4 h-4" />
              {t('quickLogin.loginAsOwner')}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setPin('');
                setError(null);
              }}
              className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 mt-6 mb-4 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {t('quickLogin.back')}
            </button>

            <p className="text-center text-sm font-bold text-gray-800 mb-4">{selected.name}</p>

            {/* PIN dots */}
            <div className="flex items-center justify-center gap-2.5 mb-2 h-8">
              {loading ? (
                <Loader2 className="w-6 h-6 text-[#0B1F3A] animate-spin" />
              ) : (
                Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full border-2 transition-colors ${
                      i < pin.length ? 'bg-[#0B1F3A] border-[#0B1F3A]' : 'border-gray-300'
                    }`}
                  />
                ))
              )}
            </div>

            <div className="h-5 mb-3 text-center">
              {error && <p className="text-[11px] text-rose-600 font-semibold">{error}</p>}
            </div>

            {/* Numeric keypad */}
            <div className="grid grid-cols-3 gap-2.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDigit(d)}
                  disabled={loading}
                  className="py-3.5 rounded-2xl bg-[#F5F7FA] hover:bg-[#0B1F3A]/[0.06] text-lg font-bold text-gray-800 transition disabled:opacity-40"
                >
                  {d}
                </button>
              ))}
              <div />
              <button
                type="button"
                onClick={() => handleDigit('0')}
                disabled={loading}
                className="py-3.5 rounded-2xl bg-[#F5F7FA] hover:bg-[#0B1F3A]/[0.06] text-lg font-bold text-gray-800 transition disabled:opacity-40"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                disabled={loading}
                className="py-3.5 rounded-2xl bg-[#F5F7FA] hover:bg-[#0B1F3A]/[0.06] flex items-center justify-center text-gray-600 transition disabled:opacity-40"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            <p className="flex items-center justify-center gap-1 text-[10px] text-gray-400 mt-5">
              <KeyRound className="w-3 h-3" /> {t('quickLogin.pinDigits')}
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes quicklogin-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
