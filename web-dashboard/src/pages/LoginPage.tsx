import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../services/api';
import { useAuthStore, type AuthUser } from '../store/authStore';
import { loginSchema, type LoginInput } from '../schemas/auth.schema';
import { Truck, ShieldAlert, Key, User } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);

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
      navigate('/');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ??
        'Login failed';
      setServerError(message);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-950 text-slate-100 p-6 font-sans relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-brand-500/10 blur-[120px] pointer-events-none select-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none select-none"></div>

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-2xl p-8 sm:p-10 space-y-7 z-10">

        {/* Animated Brand Header */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-14 h-14 bg-gradient-to-tr from-brand-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-500/20 transform rotate-3 hover:rotate-12 transition-transform duration-300">
            <Truck className="w-7 h-7" />
          </div>
          <div className="text-center space-y-1.5">
            <h1 className="text-3xl font-black tracking-tight text-white bg-gradient-to-r from-brand-400 to-indigo-400 bg-clip-text text-transparent">
              PlowPath
            </h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
              Operations Control Console
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* Identity Identifier Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Phone or Email
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                autoComplete="username"
                placeholder="dispatcher@plowpath.com"
                aria-invalid={errors.identifier ? 'true' : 'false'}
                {...register('identifier')}
                className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 hover:border-slate-700/80 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-2xl text-slate-100 placeholder:text-slate-650 text-sm focus:outline-none transition-all font-semibold"
              />
            </div>
            {errors.identifier && (
              <p className="text-xs text-red-400 font-semibold pl-1">{errors.identifier.message}</p>
            )}
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Password
            </label>
            <div className="relative">
              <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••••••"
                aria-invalid={errors.password ? 'true' : 'false'}
                {...register('password')}
                className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 hover:border-slate-700/80 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-2xl text-slate-100 placeholder:text-slate-650 text-sm focus:outline-none transition-all font-semibold"
              />
            </div>
            {errors.password && (
              <p className="text-xs text-red-400 font-semibold pl-1">{errors.password.message}</p>
            )}
          </div>

          {/* Server-side error alert */}
          {serverError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-start gap-2 text-xs font-semibold animate-shake">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Submit Sign-In Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 mt-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 disabled:opacity-40 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-brand-500/15 hover:shadow-brand-500/25 transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Establishing Session...
              </>
            ) : (
              'Access Dashboard'
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest select-none">
            Authorized Personnel Only
          </p>
        </div>
      </div>
    </div>
  );
}
