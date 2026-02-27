'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { apiClient } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.login(email, password, remember);

      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.user && response.token) {
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('token', response.token);
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      setForgotSent(null);
      if (!forgotEmail) {
        setForgotSent('Enter the email associated with your account.');
        return;
      }

      const resp = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') + '/api/auth/forgot-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail }),
        }
      );

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setForgotSent('Reset email sent. Please check your inbox.');
    } catch (e: any) {
      setForgotSent(e.message || 'Failed to send reset email');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f9ff] text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#fef7ff] via-[#f2f7ff] to-[#fffaf2]" />
        <div className="absolute -left-16 top-8 h-72 w-72 rounded-full bg-sky-200/60 blur-[140px]" />
        <div className="absolute bottom-[-120px] right-[-60px] h-96 w-96 rounded-full bg-pink-200/50 blur-[170px]" />
        <div className="absolute inset-y-0 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-200/40 blur-[220px]" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.18) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-md">
          <div className="rounded-[36px] border border-white/60 bg-gradient-to-br from-white/95 via-white/85 to-white/70 p-8 shadow-[0_25px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h1>
              </div>

              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-600">
                  Work email
                </label>
                <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-inner shadow-slate-200 transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
                  <input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border-none bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-600">
                  Password
                </label>
                <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-inner shadow-slate-200 transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
                  <div className="flex items-center">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border-none bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="rounded-full p-2 text-slate-400 transition hover:text-slate-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-500"
                  />
                  Remember me
                </label>

                <button
                  type="button"
                  onClick={() => setShowForgot((prev) => !prev)}
                  className="font-semibold text-indigo-500 transition hover:text-indigo-600"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500 px-6 py-3 text-base font-semibold text-white shadow-[0_15px_45px_rgba(79,70,229,0.25)] transition hover:brightness-110 disabled:opacity-60"
              >
                {isLoading ? 'Signing in…' : 'Continue'}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </form>

            {showForgot && (
              <div className="mt-8 rounded-3xl border border-slate-200/80 bg-white/70 p-5 backdrop-blur">
                <p className="text-sm font-semibold text-slate-800">Send reset link</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <input
                    type="email"
                    placeholder="admin@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="flex-1 rounded-2xl border border-slate-200/80 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Send
                  </button>
                </div>
                {forgotSent && <p className="mt-2 text-xs text-slate-500">{forgotSent}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



