import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  forgotPasswordSecurity,
  forgotPasswordTelegram,
  getSecurityQuestion,
  resetPassword,
} from '../api/axios';

const Spinner = () => (
  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
);

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [recoveryMethod, setRecoveryMethod] = useState<'telegram' | 'security' | null>(null);
  const [securityQuestion, setSecurityQuestion] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [username, setUsername] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username) {
      toast.error('Please enter your username.');
      return;
    }

    setLoading(true);
    try {
      const response = await getSecurityQuestion(username);
      const method = response.use_telegram_recovery ? 'telegram' : 'security';
      setRecoveryMethod(method);
      setSecurityQuestion(response.security_question);
      setStep(2);
      setCodeSent(false);
      setTelegramToken('');
      setResetToken('');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Unable to find recovery details for that username.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTelegramCode = async () => {
    setLoading(true);
    try {
      const response = await forgotPasswordTelegram(username);
      toast.success(response.message || 'Code sent! Check your Telegram messages.');
      setCodeSent(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Unable to send your Telegram reset token.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySecurityAnswer = async () => {
    if (!securityAnswer) {
      toast.error('Please enter your security answer.');
      return;
    }

    setLoading(true);
    try {
      const response = await forgotPasswordSecurity(username, securityAnswer);
      setResetToken(response.token);
      setStep(3);
      toast.success('Answer verified. Set your new password.');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Incorrect security answer');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueWithTelegramToken = () => {
    if (!telegramToken) {
      toast.error('Please enter the code you received on Telegram.');
      return;
    }

    setResetToken(telegramToken);
    setStep(3);
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast.error('Please complete both password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (!resetToken) {
      toast.error('A reset token is required to continue.');
      return;
    }

    setLoading(true);
    try {
      const response = await resetPassword(resetToken, newPassword);
      toast.success(response.message || 'Password reset successful!');
      navigate('/login');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Unable to reset your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.22),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(240,180,41,0.08),transparent_30%),var(--bg-main)] px-4 py-16 text-white">
      <div className="mx-auto w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950/75 shadow-2xl shadow-violet-950/30 backdrop-blur">
        <div className="border-b border-white/10 px-6 py-5 sm:px-8">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-200/80">Recover Access</div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-slate-100">Forgot Password</h1>
              <p className="mt-2 text-sm text-slate-400">Step {step} of 3</p>
            </div>
            <div className="flex items-center gap-3">
              {[1, 2, 3].map((item, index) => (
                <div key={item} className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold ${
                    step >= item
                      ? 'border-violet-400 bg-violet-500/20 text-violet-100'
                      : 'border-slate-700 bg-slate-900 text-slate-500'
                  }`}>
                    {item}
                  </div>
                  {index < 2 && <div className={`h-px w-8 ${step > item ? 'bg-violet-400' : 'bg-slate-700'}`} />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8 px-6 py-8 sm:px-8">
          {step === 1 && (
            <form onSubmit={handleLookup} className="space-y-5">
              <div>
                <h2 className="font-display text-2xl font-semibold text-slate-100">Find your recovery method</h2>
                <p className="mt-2 text-sm text-slate-400">Enter your username and we’ll guide you through the matching reset flow.</p>
              </div>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Username</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Enter your username"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading && <Spinner />}
                Continue
              </button>
            </form>
          )}

          {step === 2 && recoveryMethod === 'telegram' && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-2xl font-semibold text-slate-100">Telegram recovery</h2>
                <p className="mt-2 text-sm text-slate-400">We&apos;ll send a password reset code to your Telegram (@StockSphereBot).</p>
              </div>
              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-4 text-sm text-violet-100">
                Make sure you have started a chat with @StockSphereBot on Telegram.
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={handleSendTelegramCode}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading && <Spinner />}
                Send Code
              </button>
              {codeSent && (
                <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/70 p-5">
                  <p className="text-sm text-emerald-300">Code sent! Check your Telegram messages.</p>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Reset Code</span>
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
                      value={telegramToken}
                      onChange={(event) => setTelegramToken(event.target.value)}
                      placeholder="Enter the code from Telegram"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleContinueWithTelegramToken}
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/10 px-6 py-3 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/20"
                  >
                    Continue to Reset
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 2 && recoveryMethod === 'security' && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-2xl font-semibold text-slate-100">Security question recovery</h2>
                <p className="mt-2 text-sm text-slate-400">Answer your saved question to unlock a short-lived reset token.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-4 text-sm text-slate-200">
                {securityQuestion || 'No security question is configured for this account.'}
              </div>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Answer</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
                  value={securityAnswer}
                  onChange={(event) => setSecurityAnswer(event.target.value)}
                  placeholder="Enter your answer"
                />
              </label>
              <button
                type="button"
                disabled={loading}
                onClick={handleVerifySecurityAnswer}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading && <Spinner />}
                Verify Answer
              </button>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <h2 className="font-display text-2xl font-semibold text-slate-100">Reset password</h2>
                <p className="mt-2 text-sm text-slate-400">Choose a new password for your StockSphere account.</p>
              </div>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">New Password</span>
                <input
                  type="password"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Enter your new password"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Confirm Password</span>
                <input
                  type="password"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm your new password"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading && <Spinner />}
                Reset Password
              </button>
            </form>
          )}

          <div className="border-t border-white/10 pt-6 text-sm text-slate-500">
            Remembered it? <Link to="/login" className="font-semibold text-violet-300 transition hover:text-violet-200">Back to login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
