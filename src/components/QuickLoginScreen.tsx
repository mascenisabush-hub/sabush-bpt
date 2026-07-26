import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { Store, User, ArrowLeft, Delete, ShieldCheck, Loader2, KeyRound } from 'lucide-react';

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
          setError('Esta conta foi suspensa. Contacte o dono do negócio.');
        } else if (err.code === 'auth/too-many-requests') {
          setError('Demasiadas tentativas. Aguarde um momento e tente novamente.');
        } else {
          setError('PIN incorreto. Tente novamente.');
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
    <div className="min-h-screen bg-white text-gray-900 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#1B3966]/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#1B3966]/5 border border-[#1B3966]/20 flex items-center justify-center text-[#1B3966] mb-3">
            <Store className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-gray-900">{pairedDevice.businessName}</h1>
          <p className="text-xs text-gray-500 mt-1">
            {selected ? 'Introduza o seu PIN' : 'Quem está a usar este dispositivo?'}
          </p>
        </div>

        {!selected ? (
          <>
            {pairedDevice.staff.length === 0 ? (
              <p className="text-xs text-gray-500 italic bg-gray-100/60 p-3 rounded-xl border border-gray-200 text-center mb-4">
                Ainda não há funcionários configurados para este dispositivo.
              </p>
            ) : (
              <div className="space-y-2 mb-4 max-h-72 overflow-y-auto">
                {pairedDevice.staff.map((s) => (
                  <button
                    key={s.uid}
                    onClick={() => {
                      setSelected(s);
                      setPin('');
                      setError(null);
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl border border-gray-200 hover:border-[#1B3966]/30 hover:bg-[#1B3966]/5 transition text-left"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#1B3966]/5 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-[#1B3966]" />
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{s.name}</span>
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={onUseOwnerLogin}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-[#B8791A] hover:text-[#9C6613] py-2.5 transition"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Entrar como Dono
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
              className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 mb-4 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>

            <p className="text-center text-sm font-bold text-gray-800 mb-4">{selected.name}</p>

            {/* PIN dots */}
            <div className="flex items-center justify-center gap-2.5 mb-2 h-8">
              {loading ? (
                <Loader2 className="w-6 h-6 text-[#1B3966] animate-spin" />
              ) : (
                Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full border-2 transition-colors ${
                      i < pin.length ? 'bg-[#1B3966] border-[#1B3966]' : 'border-gray-300'
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
                  className="py-3.5 rounded-2xl bg-gray-100/70 hover:bg-gray-100 text-lg font-bold text-gray-800 transition disabled:opacity-40"
                >
                  {d}
                </button>
              ))}
              <div />
              <button
                type="button"
                onClick={() => handleDigit('0')}
                disabled={loading}
                className="py-3.5 rounded-2xl bg-gray-100/70 hover:bg-gray-100 text-lg font-bold text-gray-800 transition disabled:opacity-40"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                disabled={loading}
                className="py-3.5 rounded-2xl bg-gray-100/70 hover:bg-gray-100 flex items-center justify-center text-gray-600 transition disabled:opacity-40"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            <p className="flex items-center justify-center gap-1 text-[10px] text-gray-400 mt-5">
              <KeyRound className="w-3 h-3" /> PIN de 6 dígitos
            </p>
          </>
        )}
      </div>
    </div>
  );
};
