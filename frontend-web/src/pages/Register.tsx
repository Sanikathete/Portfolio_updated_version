import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { registerUser } from '../api/axios';

const securityQuestions = [
  "What was your first pet's name?",
  'What city were you born in?',
  "What is your mother's maiden name?",
  'What was your childhood nickname?',
  'What was the name of your first school?',
];

type RecoveryMethod = 'telegram' | 'security';

const Spinner = () => (
  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
);

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [recoveryMethod, setRecoveryMethod] = useState<RecoveryMethod>('telegram');
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    telegram_username: '',
    telegram_phone: '',
    telegram_chat_id: '',
    security_question: securityQuestions[0],
    security_answer: '',
  });

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleNext = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.username || !form.email || !form.password || !form.confirmPassword) {
      toast.error('Please complete all Step 1 fields.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (recoveryMethod === 'telegram') {
      if (!form.telegram_username || !form.telegram_phone ) {
        toast.error('Please complete all Telegram recovery fields.');
        return;
      }
    } else if (!form.security_question || !form.security_answer) {
      toast.error('Please choose a security question and answer it.');
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        username: form.username,
        email: form.email,
        password: form.password,
        use_telegram_recovery: recoveryMethod === 'telegram',
        telegram_username: recoveryMethod === 'telegram' ? form.telegram_username : undefined,
        telegram_phone: recoveryMethod === 'telegram' ? form.telegram_phone : undefined,
        telegram_chat_id: recoveryMethod === 'telegram' ? form.telegram_chat_id : undefined,
        security_question: recoveryMethod === 'security' ? form.security_question : undefined,
        security_answer: recoveryMethod === 'security' ? form.security_answer : undefined,
      });
      toast.success('Registration successful! Please login.');
      navigate('/login');
    } catch (error: any) {
      const payload = error?.response?.data;
      const message = typeof payload === 'string'
        ? payload
        : payload?.detail || Object.values(payload ?? {})[0] || 'Registration failed.';
      toast.error(String(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.22),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(240,180,41,0.08),transparent_30%),var(--bg-main)] px-4 py-16 text-white">
      <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950/75 shadow-2xl shadow-violet-950/30 backdrop-blur">
        <div className="border-b border-white/10 bg-slate-950/70 px-6 py-5 sm:px-8">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/80">Create Workspace Access</div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-slate-100 sm:text-4xl">Register</h1>
              <p className="mt-2 text-sm text-slate-400">Step {step} of 2</p>
            </div>
            <div className="flex items-center gap-3">
              {[1, 2].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold ${
                    step >= item
                      ? 'border-violet-400 bg-violet-500/20 text-violet-100'
                      : 'border-slate-700 bg-slate-900 text-slate-500'
                  }`}>
                    {item}
                  </div>
                  {item !== 2 && <div className={`h-px w-8 ${step > item ? 'bg-violet-400' : 'bg-slate-700'}`} />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={step === 1 ? handleNext : handleSubmit} className="space-y-8 px-6 py-8 sm:px-8">
          {step === 1 && (
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Username</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
                  value={form.username}
                  onChange={(event) => updateField('username', event.target.value)}
                  placeholder="Choose a username"
                />
              </label>
      <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Email</span>
                <input
                  type="email"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Password</span>
                <input
                  type="password"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  placeholder="Create a strong password"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Confirm Password</span>
                <input
                  type="password"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
                  value={form.confirmPassword}
                  onChange={(event) => updateField('confirmPassword', event.target.value)}
                  placeholder="Re-enter your password"
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-semibold text-slate-100">Choose your password recovery method</h2>
                <p className="mt-2 text-sm text-slate-400">Set up one recovery option now so you can securely regain access later.</p>
              </div>

              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-4 text-sm text-amber-100">
                <p className="font-semibold">⚠️ Important: If you choose Telegram recovery, you must first message @StockSphereBot on Telegram and press Start before registering.</p>
                <p className="mt-2 text-amber-100/80">This allows the bot to send you password reset codes.</p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setRecoveryMethod('telegram')}
                  className={`rounded-3xl border px-5 py-5 text-left transition ${
                    recoveryMethod === 'telegram'
                      ? 'border-violet-400 bg-violet-500/15 shadow-lg shadow-violet-950/30'
                      : 'border-white/10 bg-slate-950/70 hover:border-violet-500/50'
                  }`}
                >
                  <div className="inline-flex rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-violet-200">Use Telegram</div>
                  <div className="mt-4 font-display text-xl font-semibold text-slate-100">Fast bot delivery</div>
                  <p className="mt-2 text-sm text-slate-400">Receive a 15-minute reset token through @StockSphereBot.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setRecoveryMethod('security')}
                  className={`rounded-3xl border px-5 py-5 text-left transition ${
                    recoveryMethod === 'security'
                      ? 'border-slate-300/40 bg-slate-900 shadow-lg shadow-slate-950/30'
                      : 'border-white/10 bg-slate-950/70 hover:border-slate-400/30'
                  }`}
                >
                  <div className="inline-flex rounded-full border border-slate-400/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">Use Security Question</div>
                  <div className="mt-4 font-display text-xl font-semibold text-slate-100">Offline recovery fallback</div>
                  <p className="mt-2 text-sm text-slate-400">Answer a personal question to unlock a reset token.</p>
                </button>
              </div>

              {recoveryMethod === 'telegram' ? (
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Telegram Username</span>
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
                      value={form.telegram_username}
                      onChange={(event) => updateField('telegram_username', event.target.value)}
                      placeholder="Without the @"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Telegram Phone Number</span>
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
                      value={form.telegram_phone}
                      onChange={(event) => updateField('telegram_phone', event.target.value)}
                      placeholder="+1 555 000 0000"
                    />
                  </label>
                </div>
              ) : (
                <div className="grid gap-5">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Security Question</span>
                    <select
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
                      value={form.security_question}
                      onChange={(event) => updateField('security_question', event.target.value)}
                    >
                      {securityQuestions.map((question) => (
                        <option key={question} value={question}>
                          {question}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Answer</span>
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
                      value={form.security_answer}
                      onChange={(event) => updateField('security_answer', event.target.value)}
                      placeholder="Enter your answer"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-500">
              Already have an account? <Link to="/login" className="font-semibold text-violet-300 transition hover:text-violet-200">Login</Link>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading && <Spinner />}
                {step === 1 ? 'Next' : 'Register'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
