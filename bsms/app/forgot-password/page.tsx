'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import { apiRequest } from '@/lib/api/client';
import { Shield, Mail, ArrowLeft, CheckCircle, KeyRound, Lock } from 'lucide-react';

type Step = 'request' | 'verify' | 'reset' | 'done';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast('Email is required', 'error');
      return;
    }

    setLoading(true);
    try {
      await apiRequest<{ message: string }>('/forgot-password/request-otp', {
        method: 'POST',
        body: { email: email.trim() },
      });
      setStep('verify');
      toast('OTP sent to your email');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to send OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length !== 6) {
      toast('Enter 6 digit OTP', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = await apiRequest<{ message: string; resetToken: string }>('/forgot-password/verify-otp', {
        method: 'POST',
        body: { email: email.trim(), otp: otp.trim() },
      });
      setResetToken(payload.resetToken);
      setStep('reset');
      toast('Email verified successfully');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'OTP verification failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast('Password must be at least 8 characters', 'error');
      return;
    }
    if (newPassword !== retypePassword) {
      toast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      await apiRequest<{ message: string }>('/forgot-password/reset', {
        method: 'POST',
        body: {
          email: email.trim(),
          resetToken,
          password: newPassword,
          password_confirmation: retypePassword,
        },
      });
      setStep('done');
      toast('Password updated successfully');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Password update failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Forgot Password</h1>
          <p className="text-slate-400">
            {step === 'request' && 'Enter your email to receive OTP'}
            {step === 'verify' && 'Verify your email using OTP'}
            {step === 'reset' && 'Set your new password'}
            {step === 'done' && 'Password reset complete'}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
          {step === 'request' && (
            <form onSubmit={requestOtp} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold py-3 rounded-xl transition-all shadow-lg disabled:opacity-50"
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={verifyOtp} className="space-y-5">
              <div className="text-sm text-slate-300">
                OTP sent to <span className="font-medium text-white">{email}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Enter OTP</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="6 digit OTP"
                    className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm tracking-[0.2em]"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="w-1/2 bg-white/10 text-white font-semibold py-3 rounded-xl border border-white/20"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-1/2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={resetPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Retype Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={retypePassword}
                    onChange={e => setRetypePassword(e.target.value)}
                    placeholder="Retype password"
                    className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !newPassword || !retypePassword}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Password Updated</h3>
              <p className="text-slate-400 text-sm mb-6">Your password has been changed successfully.</p>
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold py-3 rounded-xl"
              >
                Go to Login
              </button>
            </div>
          )}
        </div>

        <Link href="/login" className="flex items-center justify-center gap-2 text-slate-400 hover:text-slate-300 text-sm mt-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>
      </div>
    </div>
  );
}

