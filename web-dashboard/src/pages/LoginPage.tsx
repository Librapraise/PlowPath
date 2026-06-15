import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../services/api';
import { useAuthStore, type AuthUser } from '../store/authStore';
import { loginSchema, type LoginInput } from '../schemas/auth.schema';
import { Truck, ShieldAlert, Key, User, Eye, EyeOff, Snowflake } from 'lucide-react';

// Floating snowflake particle
function SnowParticle({ delay, size, x }: { delay: number; size: number; x: number }) {
  return (
    <div
      className="absolute pointer-events-none select-none text-white/[0.06] animate-float"
      style={{
        left: `${x}%`,
        top: `${-10 + delay * 3}%`,
        fontSize: `${size}px`,
        animationDelay: `${delay}s`,
        animationDuration: `${6 + delay * 0.5}s`,
      }}
    >
      <Snowflake className="w-full h-full" />
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot/Reset Password State
  const [view, setView] = useState<'login' | 'forgot' | 'reset'>('login');
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    try {
      const { data } = await api.post<{ token: string; refresh_token: string; user: AuthUser }>(
        '/auth/login',
        values,
      );
      setSession({ token: data.token, refreshToken: data.refresh_token, user: data.user });
      navigate('/dashboard');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ??
        'Login failed';
      setServerError(message);
    }
  }

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);
    setSendingCode(true);
    try {
      await api.post('/auth/forgot-password', { identifier: resetIdentifier });
      setView('reset');
    } catch (err: any) {
      const message = err?.response?.data?.error?.message ?? 'Failed to send verification code';
      setResetError(message);
    } finally {
      setSendingCode(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);
    if (newPassword !== confirmNewPassword) {
      setResetError('Confirm password does not match new password');
      return;
    }
    setResettingPassword(true);
    try {
      await api.post('/auth/reset-password', {
        identifier: resetIdentifier,
        token: resetCode,
        newPassword,
      });
      setView('login');
      setResetIdentifier('');
      setResetCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setServerError(null);
      alert('Password updated successfully! Please log in with your new password.');
    } catch (err: any) {
      const message = err?.response?.data?.error?.message ?? 'Failed to reset password';
      setResetError(message);
    } finally {
      setResettingPassword(false);
    }
  }

  // Generate random snowflakes on mount
  const snowflakes = useRef(
    Array.from({ length: 12 }, (_, i) => ({
      delay: Math.random() * 4,
      size: 12 + Math.random() * 20,
      x: Math.random() * 100,
      key: i,
    }))
  ).current;

  return (
    <div className="min-h-screen grid place-items-center bg-[#0a0f1a] text-slate-100 p-6 font-sans relative overflow-hidden">
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60"></div>

      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-brand-500/[0.06] blur-[140px] pointer-events-none select-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/[0.06] blur-[140px] pointer-events-none select-none"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-radial-glow pointer-events-none"></div>

      {/* Floating snowflakes */}
      {snowflakes.map((s) => (
        <SnowParticle key={s.key} delay={s.delay} size={s.size} x={s.x} />
      ))}

      <div className="w-full max-w-md glass-card rounded-3xl shadow-2xl p-8 sm:p-10 space-y-7 z-10 gradient-border animate-scale-up">

        {/* Animated Brand Header */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-tr from-brand-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-500/25 transform rotate-3 hover:rotate-12 transition-transform duration-500 ring-1 ring-white/10 cursor-pointer">
            <Truck className="w-8 h-8" />
          </div>
          <div className="text-center space-y-1.5">
            <h1 className="text-3xl font-black tracking-tight text-gradient">
              PlowPath
            </h1>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-[0.2em]">
              Operations Control Console
            </p>
          </div>
        </div>

        {view === 'login' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Identity Identifier Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Phone or Email
              </label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-brand-400 transition-colors" />
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="dispatcher@plowpath.com"
                  aria-invalid={errors.identifier ? 'true' : 'false'}
                  {...register('identifier')}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 rounded-xl text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none transition-all font-medium"
                />
              </div>
              {errors.identifier && (
                <p className="text-xs text-red-400 font-semibold pl-1">{errors.identifier.message}</p>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setView('forgot');
                    setServerError(null);
                  }}
                  className="text-[10px] font-bold text-brand-400 hover:text-brand-300 transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative group">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-brand-400 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  aria-invalid={errors.password ? 'true' : 'false'}
                  {...register('password')}
                  className="w-full pl-10 pr-11 py-3 bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 rounded-xl text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-white/5 cursor-pointer flex items-center justify-center"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 font-semibold pl-1">{errors.password.message}</p>
              )}
            </div>

            {/* Server-side error alert */}
            {serverError && (
              <div className="p-3 bg-red-500/[0.08] border border-red-500/20 text-red-400 rounded-xl flex items-start gap-2 text-xs font-semibold animate-shake">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Submit Sign-In Action */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 mt-2 bg-gradient-to-r from-brand-500 to-indigo-500 hover:from-brand-400 hover:to-indigo-400 disabled:opacity-40 text-white font-bold text-sm rounded-xl shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition-all btn-press cursor-pointer flex items-center justify-center gap-2 ring-1 ring-white/10"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin"></span>
                  Establishing Session...
                </>
              ) : (
                'Access Dashboard'
              )}
            </button>
          </form>
        )}

        {view === 'forgot' && (
          <form onSubmit={handleRequestCode} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Phone or Email
              </label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-brand-400 transition-colors" />
                <input
                  type="text"
                  required
                  value={resetIdentifier}
                  onChange={(e) => setResetIdentifier(e.target.value)}
                  placeholder="dispatcher@plowpath.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 rounded-xl text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none transition-all font-medium"
                />
              </div>
            </div>

            {resetError && (
              <div className="p-3 bg-red-500/[0.08] border border-red-500/20 text-red-400 rounded-xl flex items-start gap-2 text-xs font-semibold">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{resetError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={sendingCode}
              className="w-full py-3.5 bg-gradient-to-r from-brand-500 to-indigo-500 hover:from-brand-400 hover:to-indigo-400 disabled:opacity-40 text-white font-bold text-sm rounded-xl shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition-all btn-press cursor-pointer flex items-center justify-center gap-2 ring-1 ring-white/10"
            >
              {sendingCode ? 'Sending reset code...' : 'Request Reset Code'}
            </button>

            <button
              type="button"
              onClick={() => {
                setView('login');
                setResetError(null);
              }}
              className="w-full py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-350 hover:text-slate-200 transition-all text-xs font-bold rounded-xl cursor-pointer"
            >
              Back to Login
            </button>
          </form>
        )}

        {view === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="p-3.5 bg-brand-500/[0.04] border border-brand-500/10 text-brand-400/90 rounded-xl text-xs font-medium leading-relaxed">
              If an active account exists, a 6-digit verification code has been dispatched.
            </div>

            {/* Token Code Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                placeholder="e.g. 123456"
                className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800/80 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 rounded-xl text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none transition-all font-mono font-black text-center tracking-[0.2em] text-lg"
              />
            </div>

            {/* New Password Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 chars"
                className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800/80 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 rounded-xl text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none transition-all font-medium"
              />
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800/80 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 rounded-xl text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none transition-all font-medium"
              />
            </div>

            {resetError && (
              <div className="p-3 bg-red-500/[0.08] border border-red-500/20 text-red-400 rounded-xl flex items-start gap-2 text-xs font-semibold">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{resetError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={resettingPassword}
              className="w-full py-3.5 bg-gradient-to-r from-brand-500 to-indigo-500 hover:from-brand-400 hover:to-indigo-400 disabled:opacity-40 text-white font-bold text-sm rounded-xl shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition-all btn-press cursor-pointer flex items-center justify-center gap-2 ring-1 ring-white/10"
            >
              {resettingPassword ? 'Resetting password...' : 'Establish New Password'}
            </button>

            <button
              type="button"
              onClick={() => {
                setView('forgot');
                setResetError(null);
              }}
              className="w-full py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-350 hover:text-slate-200 transition-all text-xs font-bold rounded-xl cursor-pointer"
            >
              Back
            </button>
          </form>
        )}

        <div className="text-center pt-1">
          <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-[0.15em] select-none">
            Authorized Personnel Only
          </p>
        </div>
      </div>
    </div>
  );
}
