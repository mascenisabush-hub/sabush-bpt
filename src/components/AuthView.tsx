import React, { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth, db, firebaseConfig } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Store, Lock, Mail, User, ShieldCheck, ArrowRight, AlertCircle, Sparkles, UserCheck, Eye, EyeOff } from 'lucide-react';
import { BUSINESS_CATEGORY_GROUPS, detectCategoryFromName } from '../data/businessCategories';
import { CURRENCY_OPTIONS } from '../utils/formatters';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';

interface AuthViewProps {
  onBackToQuickLogin?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onBackToQuickLogin }) => {
  const { suspensionNotice, clearSuspensionNotice } = useApp();
  const { t } = useLanguage();
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
  const [category, setCategory] = useState('');
  const [categoryTouchedManually, setCategoryTouchedManually] = useState(false);
  const [currency, setCurrency] = useState('MT');

  // Auto-detect category from the business name as it's typed, unless the
  // owner has already manually picked one from the dropdown.
  useEffect(() => {
    if (categoryTouchedManually) return;
    const detected = detectCategoryFromName(businessName);
    if (detected) setCategory(detected);
  }, [businessName, categoryTouchedManually]);

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
            userMsg = t('auth.errors.wrongCredentials');
          } else if (err.code === 'auth/user-disabled') {
            userMsg = t('auth.errors.accountSuspended');
          } else if (err.code === 'auth/invalid-email') {
            userMsg = t('auth.errors.invalidEmail');
          } else {
            userMsg = err.message || t('auth.errors.genericAuth');
          }
          throw new Error(`[Login Auth | Code: ${err.code || 'N/A'}] ${userMsg}`);
        }

        try {
          const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));
          if (!userDoc.exists()) {
            setError(t('auth.errors.profileNotFound'));
          }
        } catch (err: any) {
          console.error('[Login Firestore Error]:', err);
          throw new Error(`[Login Firestore | Code: ${err.code || 'N/A'}] ${err.message || t('auth.errors.profileFetchFailed')}`);
        }
      } else {
        // Register Owner
        if (!name.trim()) {
          setError(t('auth.errors.enterName'));
          setLoading(false);
          return;
        }
        if (!businessName.trim()) {
          setError(t('auth.errors.enterBusinessName'));
          setLoading(false);
          return;
        }
        if (!category) {
          setError(t('auth.errors.selectCategory'));
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError(t('auth.errors.passwordMismatch'));
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
            userMsg = t('auth.errors.emailInUse');
          } else if (err.code === 'auth/weak-password') {
            userMsg = t('auth.errors.weakPassword');
          } else if (err.code === 'auth/invalid-email') {
            userMsg = t('auth.errors.invalidEmailFormat');
          } else {
            userMsg = err.message || t('auth.errors.createAccountFailed');
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
            businessIds: [businessId],
            activeBusinessId: businessId,
            createdAt: new Date().toISOString(),
          });
        } catch (err: any) {
          console.error('[Registar Step 2 - User Document Firestore Error]:', err);
          throw new Error(`[Passo 2 (Perfil Firestore) | Code: ${err.code || 'N/A'}] ${err.message || t('auth.errors.saveProfileFailed')}`);
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
          throw new Error(`[Passo 3 (Negócio Firestore) | Code: ${err.code || 'N/A'}] ${err.message || t('auth.errors.saveBusinessFailed')}`);
        }
      }
    } catch (err: any) {
      console.error('Full Auth Flow Error:', err);
      setError(err.message || t('auth.errors.genericRequest'));
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
      const userName = userCred.user.displayName || name || t('auth.defaults.ownerFallback');

      // Check if user doc exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) {
        const bName = businessName.trim() || t('auth.defaults.businessNameFallback');
        const businessId = 'bus-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

        // Step 1: Create User doc
        await setDoc(doc(db, 'users', uid), {
          uid,
          email: userEmail,
          name: userName,
          role: 'owner',
          businessId,
          businessIds: [businessId],
          activeBusinessId: businessId,
          createdAt: new Date().toISOString(),
        });

        // Step 2: Create Business doc
        // NOTE: category must NOT be hardcoded here. Saving a fixed value
        // would look like the owner manually chose it, which permanently
        // disables auto-detection from the business name in the
        // first-time setup modal (BusinessProfileSetupModal). Fall back to
        // name-based detection, and leave it blank otherwise so the setup
        // modal can auto-detect (or the owner can pick/search manually)
        // once the business name is entered/confirmed.
        await setDoc(doc(db, 'businesses', businessId), {
          id: businessId,
          name: bName,
          ownerUid: uid,
          category: category || detectCategoryFromName(bName) || '',
          currencySymbol: currency || 'MT',
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      console.error('[Google Auth Error]:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError(t('auth.errors.googlePopupClosed'));
      } else if (err.code === 'auth/unauthorized-domain') {
        const domain = typeof window !== 'undefined' ? window.location.hostname : '';
        const unauthorizedDomainMsg = t('auth.errors.unauthorizedDomain', {
          domain,
          project: firebaseConfig.projectId,
        });
        setError(`[Google Auth | Code: auth/unauthorized-domain] ${unauthorizedDomainMsg}`);
      } else {
        setError(`[Google Auth | Code: ${err.code || 'N/A'}] ${err.message || t('auth.errors.googleGenericError')}`);
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
        // See note above: never hardcode a fallback category — it would
        // block auto-detection later in BusinessProfileSetupModal.
        const demoBName = businessName.trim() || t('auth.defaults.demoBusinessNameFallback');
        await setDoc(doc(db, 'businesses', businessId), {
          id: businessId,
          name: demoBName,
          ownerUid: uid,
          category: category || detectCategoryFromName(demoBName) || '',
          currencySymbol: currency || 'MT',
          createdAt: new Date().toISOString(),
        });

        await setDoc(doc(db, 'users', uid), {
          uid,
          email: 'demo@batchprofittracker.local',
          name: name.trim() || t('auth.defaults.demoOwnerFallback'),
          role: 'owner',
          businessId,
          businessIds: [businessId],
          activeBusinessId: businessId,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      console.error('Anonymous Auth Error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError(`[Modo Demo | Code: auth/operation-not-allowed] ${t('auth.errors.demoOperationNotAllowed')}`);
      } else {
        setError('[Modo Demo | Code: ' + (err.code || 'N/A') + '] ' + (err.message || String(err)));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-center items-center p-4 sm:p-6 font-sans overflow-hidden bg-[#00020F] text-white">
      {/* Cinematic ambient background — layered blue/violet glows, a slowly
          rotating conic "aura", faint rotating god-rays, and a vignette to
          keep focus on the card. Background color is matched to the logo
          asset's own near-black backdrop so the artwork blends in cleanly
          with no visible edges. */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="av-orb av-orb-1" />
        <div className="av-orb av-orb-2" />
        <div className="av-orb av-orb-3" />
        <div className="av-rays" />
        <div className="av-conic" />
        <div className="av-vignette" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="relative rounded-3xl p-6 sm:p-8 overflow-hidden av-card">
          {/* Decorative inner glow */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center justify-between mb-2 relative z-10">
            {onBackToQuickLogin ? (
              <button
                type="button"
                onClick={onBackToQuickLogin}
                className="text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                ← {t('auth.backToQuickLogin')}
              </button>
            ) : (
              <span />
            )}
            <LanguageSwitcher />
          </div>

          {/* Brand Header — cinematic logo reveal: a slow-rotating blue
              conic halo and a soft breathing glow sit behind the logo, a
              light sweep glare passes across it periodically, and the logo
              itself settles into place with a one-time entrance animation
              on mount. */}
          <div className="flex flex-col items-center text-center mb-5 relative z-10">
            <div className="relative w-full flex items-center justify-center av-logo-stage" style={{ perspective: '900px' }}>
              <div className="av-halo" />
              <div className="av-halo-breathe" />
              <div className="relative av-logo-wrap">
                <img
                  src="/branding/sabush-tech-logo.webp"
                  alt="Sabush Tech"
                  draggable={false}
                  className="relative w-full max-w-[260px] sm:max-w-[300px] h-auto select-none av-logo-img"
                />
                <div className="av-sweep" />
              </div>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-1">
              Batch Profit Tracker
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
              {t('auth.subtitle')}
            </p>
          </div>

          {/* Mode Toggle Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-white/5 border border-white/10 rounded-2xl mb-6 text-xs font-semibold relative z-10">
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
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('auth.tabs.login')}
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
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('auth.tabs.register')}
            </button>
          </div>

          {/* Role Selector hint on Login */}
          {mode === 'login' && (
            <div className="flex items-center justify-center gap-2 mb-4 bg-white/5 p-1.5 rounded-xl border border-white/10 text-xs relative z-10">
              <span className="text-slate-400">{t('auth.loginAs')}</span>
              <button
                type="button"
                onClick={() => setRoleMode('owner')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                  roleMode === 'owner' ? 'bg-white/10 text-blue-300 border border-blue-400/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('auth.roleOwner')}
              </button>
              <button
                type="button"
                onClick={() => setRoleMode('staff')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                  roleMode === 'staff' ? 'bg-white/10 text-blue-300 border border-blue-400/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('auth.roleStaff')}
              </button>
            </div>
          )}

          {/* Suspension notice — shown once, right after a suspended staff
              session gets force-signed-out mid-use (see AppContext's user
              profile listener). Distinct from the normal login error banner
              below since it explains *why* they were logged out, not a
              failed login attempt. */}
          {suspensionNotice && (
            <div className="mb-4 p-3 rounded-xl bg-orange-500/15 border border-orange-400/30 text-orange-200 text-xs flex items-start gap-2 relative z-10">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="flex-1">{suspensionNotice}</span>
              <button
                type="button"
                onClick={clearSuspensionNotice}
                className="text-orange-300/70 hover:text-orange-200 font-bold shrink-0"
                aria-label={t('common.close')}
              >
                ×
              </button>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-200 text-xs flex items-center gap-2 relative z-10">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleAuth} className="space-y-4 relative z-10">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('auth.form.yourName')}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder={t('auth.form.namePlaceholder')}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('auth.form.businessName')}
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                      placeholder={t('auth.form.businessNamePlaceholder')}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                      {t('auth.form.category')}
                      {category && !categoryTouchedManually && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-blue-400 normal-case">
                          <Sparkles className="w-2.5 h-2.5" /> {t('auth.form.categoryAuto')}
                        </span>
                      )}
                    </label>
                    <select
                      value={category}
                      onChange={e => {
                        setCategory(e.target.value);
                        setCategoryTouchedManually(true);
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-400 transition [color-scheme:dark]"
                    >
                      {!category && (
                        <option value="" disabled>
                          {t('auth.form.selectCategory')}
                        </option>
                      )}
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
                      {t('auth.form.currency')}
                    </label>
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-400 transition [color-scheme:dark]"
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
                {t('auth.form.email')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('auth.form.emailPlaceholder')}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('auth.form.password')}
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition p-0.5"
                  title={showPassword ? t('auth.form.hidePassword') : t('auth.form.showPassword')}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t('auth.form.confirmPassword')}
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
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition p-0.5"
                    title={showConfirmPassword ? t('auth.form.hidePassword') : t('auth.form.showPassword')}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs sm:text-sm transition flex items-center justify-center space-x-2 shadow-[0_0_30px_-6px_rgba(59,130,246,0.7)] disabled:opacity-50"
            >
              {loading ? (
                <span className="animate-pulse">{t('auth.submitting')}</span>
              ) : (
                <>
                  <span>{mode === 'login' ? t('auth.submitLogin') : t('auth.submitRegister')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 pt-3 border-t border-white/10 flex flex-col space-y-2 relative z-10">
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-2.5 px-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold rounded-xl text-xs transition flex items-center justify-center space-x-2 shadow"
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
              <span>{t('auth.googleLogin')}</span>
            </button>

            <button
              type="button"
              onClick={handleAnonymousAuth}
              disabled={loading}
              className="w-full py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-blue-300 font-semibold rounded-xl text-xs transition flex items-center justify-center space-x-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>{t('auth.demoLogin')}</span>
            </button>
          </div>

          <div className="mt-4 text-center text-[11px] text-slate-500 relative z-10">
            {t('auth.secureFooter')}
          </div>
        </div>
      </div>

      <style>{`
        /* ---- Ambient background: drifting blue/violet orbs ---- */
        .av-orb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(20px);
        }
        .av-orb-1 {
          width: 620px; height: 620px; top: -220px; left: -200px;
          background: radial-gradient(circle, rgba(37,99,235,0.38), transparent 65%);
          animation: av-drift-1 15s ease-in-out infinite alternate;
        }
        .av-orb-2 {
          width: 560px; height: 560px; bottom: -240px; right: -200px;
          background: radial-gradient(circle, rgba(99,102,241,0.32), transparent 65%);
          animation: av-drift-2 19s ease-in-out infinite alternate;
        }
        .av-orb-3 {
          width: 420px; height: 420px; top: 12%; right: 4%;
          background: radial-gradient(circle, rgba(56,189,248,0.24), transparent 65%);
          animation: av-drift-3 12s ease-in-out infinite alternate;
        }
        @keyframes av-drift-1 { from { transform: translate(0,0) scale(1); } to { transform: translate(45px,35px) scale(1.15); } }
        @keyframes av-drift-2 { from { transform: translate(0,0) scale(1); } to { transform: translate(-35px,-28px) scale(1.12); } }
        @keyframes av-drift-3 { from { transform: translate(0,0) scale(1); } to { transform: translate(-28px,22px) scale(1.2); } }

        /* ---- Faint rotating "god rays" behind the whole hero ---- */
        .av-rays {
          position: absolute;
          top: 50%; left: 50%;
          width: 1000px; height: 1000px;
          transform: translate(-50%, -50%);
          background: repeating-conic-gradient(from 0deg, rgba(96,165,250,0.10) 0deg 2deg, transparent 2deg 18deg);
          mix-blend-mode: screen;
          opacity: 0.55;
          animation: av-spin-slow 46s linear infinite reverse;
        }

        /* ---- Large slow-rotating conic aura wash ---- */
        .av-conic {
          position: absolute;
          top: 50%; left: 50%;
          width: 1300px; height: 1300px;
          transform: translate(-50%, -50%);
          background: conic-gradient(from 0deg,
            rgba(37,99,235,0) 0deg, rgba(56,189,248,0.16) 70deg, rgba(99,102,241,0.14) 150deg,
            rgba(37,99,235,0) 230deg, rgba(56,189,248,0.10) 300deg, rgba(37,99,235,0) 360deg);
          filter: blur(60px);
          mix-blend-mode: screen;
          opacity: 0.7;
          animation: av-spin-slow 34s linear infinite;
        }
        @keyframes av-spin-slow { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }

        /* ---- Vignette to keep focus centered ---- */
        .av-vignette {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 90% 80% at 50% 45%, transparent 40%, rgba(0,2,15,0.55) 100%);
        }

        /* ---- Logo halo: rotating ring + separate breathing glow ---- */
        .av-logo-stage { min-height: 168px; }
        .av-halo {
          position: absolute; top: 50%; left: 50%;
          width: 420px; height: 420px;
          transform: translate(-50%, -50%);
          background: conic-gradient(from 0deg,
            rgba(37,99,235,0) 0deg, rgba(56,189,248,0.55) 55deg, rgba(99,102,241,0.5) 130deg,
            rgba(37,99,235,0) 210deg, rgba(56,189,248,0.4) 290deg, rgba(37,99,235,0) 360deg);
          filter: blur(38px);
          mix-blend-mode: screen;
          opacity: 0.85;
          animation: av-halo-spin 16s linear infinite;
          z-index: 0;
        }
        @keyframes av-halo-spin { from { transform: translate(-50%,-50%) rotate(0deg); } to { transform: translate(-50%,-50%) rotate(360deg); } }
        .av-halo-breathe {
          position: absolute; top: 50%; left: 50%;
          width: 260px; height: 260px;
          transform: translate(-50%, -50%) scale(1);
          border-radius: 9999px;
          background: radial-gradient(circle, rgba(59,130,246,0.45), transparent 70%);
          filter: blur(22px);
          animation: av-breathe 4.5s ease-in-out infinite;
          z-index: 0;
        }
        @keyframes av-breathe {
          0%, 100% { opacity: 0.5; transform: translate(-50%,-50%) scale(1); }
          50% { opacity: 0.9; transform: translate(-50%,-50%) scale(1.12); }
        }

        /* ---- Logo entrance: fades/settles into place once on mount ---- */
        .av-logo-wrap { z-index: 1; }
        .av-logo-img {
          animation: av-logo-in 1.1s cubic-bezier(0.16, 1, 0.3, 1) both;
          filter: drop-shadow(0 0 24px rgba(59,130,246,0.35));
        }
        @keyframes av-logo-in {
          0% { opacity: 0; transform: scale(0.82) rotateX(14deg) translateY(16px); filter: blur(6px) drop-shadow(0 0 0 rgba(59,130,246,0)); }
          65% { opacity: 1; filter: blur(0px) drop-shadow(0 0 24px rgba(59,130,246,0.35)); }
          100% { opacity: 1; transform: scale(1) rotateX(0deg) translateY(0); filter: blur(0px) drop-shadow(0 0 24px rgba(59,130,246,0.35)); }
        }

        /* ---- Periodic light sweep glare across the logo ---- */
        .av-sweep {
          position: absolute; inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 2;
        }
        .av-sweep::before {
          content: '';
          position: absolute;
          top: -60%; left: -60%;
          width: 35%; height: 220%;
          background: linear-gradient(75deg, transparent, rgba(255,255,255,0.30), rgba(147,197,253,0.22), transparent);
          transform: rotate(8deg);
          animation: av-sweep-move 7s ease-in-out infinite;
          animation-delay: 1.4s;
        }
        @keyframes av-sweep-move {
          0% { left: -60%; opacity: 0; }
          6% { opacity: 1; }
          20% { left: 130%; opacity: 1; }
          26% { opacity: 0; }
          100% { left: 130%; opacity: 0; }
        }

        /* ---- Glass card ---- */
        .av-card {
          background: rgba(255,255,255,0.045);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.10);
          box-shadow: 0 25px 70px -12px rgba(0,0,0,0.6), 0 0 90px -20px rgba(59,130,246,0.35);
        }

        @media (prefers-reduced-motion: reduce) {
          .av-orb, .av-rays, .av-conic, .av-halo, .av-halo-breathe, .av-logo-img, .av-sweep::before {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};
