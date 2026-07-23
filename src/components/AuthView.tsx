import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth, db, firebaseConfig } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { TrendingUp, Store, Lock, Mail, User, ShieldCheck, ArrowRight, AlertCircle, Sparkles, UserCheck, Eye, EyeOff } from 'lucide-react';
import { BUSINESS_CATEGORY_GROUPS } from '../data/businessCategories';
import { CURRENCY_OPTIONS } from '../utils/formatters';

export const AuthView: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [roleMode, setRoleMode] = useState<'owner' | 'staff'>('owner');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('Mercearia');
  const [currency, setCurrency] = useState('MT');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    console.log('[handleAuth] Running handleAuth with Firebase Config:', {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 8)}...` : undefined,
    });

    try {
      if (mode === 'login') {
        let userCred;
        try {
          userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
        } catch (err: any) {
          console.error('[Login Auth Error]:', err);
          let userMsg = '';
          if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
            userMsg = 'Email ou palavra-passe incorretos.';
          } else if (err.code === 'auth/invalid-email') {
            userMsg = 'Formato de email inválido.';
          } else {
            userMsg = err.message || 'Erro de autenticação.';
          }
          throw new Error(`[Login Auth | Code: ${err.code || 'N/A'}] ${userMsg}`);
        }

        try {
          const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));
          if (!userDoc.exists()) {
            setError('Perfil de utilizador não encontrado no Firestore.');
          }
        } catch (err: any) {
          console.error('[Login Firestore Error]:', err);
          throw new Error(`[Login Firestore | Code: ${err.code || 'N/A'}] ${err.message || 'Falha ao consultar perfil no banco de dados'}`);
        }
      } else {
        // Register Owner
        if (!name.trim()) {
          setError('Por favor insira o seu nome.');
          setLoading(false);
          return;
        }
        if (!businessName.trim()) {
          setError('Por favor insira o nome do seu negócio.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('As palavras-passe não coincidem. Por favor, verifique e tente novamente.');
          setLoading(false);
          return;
        }

        // Step 1: Firebase Auth Registration
        let userCred;
        try {
          userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        } catch (err: any) {
          console.error('[Registar Step 1 - Auth Error]:', err);
          let userMsg = '';
          if (err.code === 'auth/email-already-in-use') {
            userMsg = 'Este email já está registado na plataforma. Tente fazer login.';
          } else if (err.code === 'auth/weak-password') {
            userMsg = 'A palavra-passe deve ter pelo menos 6 caracteres.';
          } else if (err.code === 'auth/invalid-email') {
            userMsg = 'O formato do email é inválido.';
          } else {
            userMsg = err.message || 'Falha ao criar conta de autenticação.';
          }
          throw new Error(`[Passo 1 (Auth) | Code: ${err.code || 'N/A'}] ${userMsg}`);
        }

        const uid = userCred.user.uid;
        const businessId = 'bus-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

        // Step 2: Create User Profile in Firestore
        try {
          await setDoc(doc(db, 'users', uid), {
            uid,
            email: email.trim(),
            name: name.trim(),
            role: 'owner',
            businessId,
            createdAt: new Date().toISOString(),
          });
        } catch (err: any) {
          console.error('[Registar Step 2 - User Document Firestore Error]:', err);
          throw new Error(`[Passo 2 (Perfil Firestore) | Code: ${err.code || 'N/A'}] ${err.message || 'Erro ao guardar dados do perfil'}`);
        }

        // Step 3: Create Business Document in Firestore
        try {
          await setDoc(doc(db, 'businesses', businessId), {
            id: businessId,
            name: businessName.trim(),
            ownerUid: uid,
            category: category,
            currencySymbol: currency,
            createdAt: new Date().toISOString(),
          });
        } catch (err: any) {
          console.error('[Registar Step 3 - Business Document Firestore Error]:', err);
          throw new Error(`[Passo 3 (Negócio Firestore) | Code: ${err.code || 'N/A'}] ${err.message || 'Erro ao guardar dados do negócio'}`);
        }
      }
    } catch (err: any) {
      console.error('Full Auth Flow Error:', err);
      setError(err.message || 'Ocorreu um erro ao processar o seu pedido.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const userCred = await signInWithPopup(auth, provider);
      const uid = userCred.user.uid;
      const userEmail = userCred.user.email || '';
      const userName = userCred.user.displayName || name || 'Proprietário';

      // Check if user doc exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) {
        const bName = businessName.trim() || 'Meu Negócio';
        const businessId = 'bus-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

        // Step 1: Create User doc
        await setDoc(doc(db, 'users', uid), {
          uid,
          email: userEmail,
          name: userName,
          role: 'owner',
          businessId,
          createdAt: new Date().toISOString(),
        });

        // Step 2: Create Business doc
        await setDoc(doc(db, 'businesses', businessId), {
          id: businessId,
          name: bName,
          ownerUid: uid,
          category: category || 'Mercearia',
          currencySymbol: currency || 'MT',
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      console.error('[Google Auth Error]:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('A janela de autenticação foi fechada antes de concluir.');
      } else if (err.code === 'auth/unauthorized-domain') {
        const domain = typeof window !== 'undefined' ? window.location.hostname : '';
        setError(`[Google Auth | Code: auth/unauthorized-domain] O domínio (${domain}) não está autorizado no Firebase (${firebaseConfig.projectId}). Adicione este domínio na Consola do Firebase (Authentication -> Definições -> Domínios autorizados) ou crie conta com Email e Palavra-passe acima.`);
      } else {
        setError(`[Google Auth | Code: ${err.code || 'N/A'}] ${err.message || 'Erro ao entrar com Google.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousAuth = async () => {
    setError(null);
    setLoading(true);

    try {
      const userCred = await signInAnonymously(auth);
      const uid = userCred.user.uid;
      const businessId = 'bus-demo-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

      // Check if user doc exists
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'businesses', businessId), {
          id: businessId,
          name: businessName.trim() || 'Negócio de Demonstração',
          ownerUid: uid,
          category: category || 'Mercearia',
          currencySymbol: currency || 'MT',
          createdAt: new Date().toISOString(),
        });

        await setDoc(doc(db, 'users', uid), {
          uid,
          email: 'demo@batchprofittracker.local',
          name: name.trim() || 'Proprietário Demo',
          role: 'owner',
          businessId,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      console.error('Anonymous Auth Error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('[Modo Demo | Code: auth/operation-not-allowed] O login Anónimo está desativado na consola do Firebase. Utilize a opção "Entrar com Google".');
      } else {
        setError('[Modo Demo | Code: ' + (err.code || 'N/A') + '] ' + (err.message || String(err)));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-inner">
            <TrendingUp className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
            Batch Profit Tracker
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestão inteligente e controlo de lucro por lote para o seu negócio
          </p>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/80 border border-slate-800 rounded-2xl mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
              setPassword('');
              setConfirmPassword('');
            }}
            className={`py-2 rounded-xl transition ${
              mode === 'login'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setRoleMode('owner');
              setError(null);
              setPassword('');
              setConfirmPassword('');
            }}
            className={`py-2 rounded-xl transition ${
              mode === 'register'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Registar Negócio
          </button>
        </div>

        {/* Role Selector hint on Login */}
        {mode === 'login' && (
          <div className="flex items-center justify-center gap-2 mb-4 bg-slate-950/40 p-1.5 rounded-xl border border-slate-800/60 text-xs">
            <span className="text-slate-400">Entrar como:</span>
            <button
              type="button"
              onClick={() => setRoleMode('owner')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                roleMode === 'owner' ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Dono (Proprietário)
            </button>
            <button
              type="button"
              onClick={() => setRoleMode('staff')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                roleMode === 'staff' ? 'bg-slate-800 text-amber-400 border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Funcionário (Staff)
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  O seu Nome
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome do Negócio / Empresa
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder="Ex: Mercearia Esperança"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ramo de Negócio
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 transition"
                  >
                    {BUSINESS_CATEGORY_GROUPS.map(group => (
                      <optgroup key={group.groupName} label={group.groupName}>
                        {group.categories.map(cat => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Moeda Principal
                  </label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 transition"
                  >
                    {CURRENCY_OPTIONS.map(opt => (
                      <option key={opt.code} value={opt.symbol}>
                        {opt.label} ({opt.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Palavra-passe
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition p-0.5"
                title={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Confirmar Palavra-passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition p-0.5"
                  title={showConfirmPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs sm:text-sm transition flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">A processar...</span>
            ) : (
              <>
                <span>{mode === 'login' ? 'Entrar no Sistema' : 'Criar Conta e Negócio'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col space-y-2">
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-xl text-xs transition flex items-center justify-center space-x-2 shadow"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Entrar com Conta Google</span>
          </button>

          <button
            type="button"
            onClick={handleAnonymousAuth}
            disabled={loading}
            className="w-full py-2.5 px-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-emerald-400 font-semibold rounded-xl text-xs transition flex items-center justify-center space-x-2"
          >
            <UserCheck className="w-4 h-4" />
            <span>Entrar em Modo Demonstração (Sem Email)</span>
          </button>
        </div>

        <div className="mt-4 text-center text-[11px] text-slate-500">
          🔒 Acesso seguro com isolamento total de dados por empresa.
        </div>
      </div>
    </div>
  );
};
