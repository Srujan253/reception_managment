import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  // Password strength validation
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[!@#$%^&*]/.test(password),
  };

  const allChecksPassed = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  useEffect(() => {
    if (!token) {
      setValidating(false);
      setTokenValid(false);
      toast.error('Invalid or missing reset token');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }
    // Token is considered valid if it exists - backend will verify on submit
    setValidating(false);
    setTokenValid(true);
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!passwordsMatch) {
      toast.error('Passwords do not match');
      return;
    }

    if (!allChecksPassed) {
      toast.error('Password does not meet security requirements');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        token,
        newPassword: password,
      });
      
      toast.success(res.data.message || 'Password reset successfully!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to reset password';
      
      if (errorMsg.includes('expired')) {
        toast.error('Reset link has expired. Please request a new one.');
        setTimeout(() => navigate('/login'), 3000);
      } else if (errorMsg.includes('Invalid')) {
        toast.error('Invalid reset link. Please request a new one.');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border border-[#CBD5E1] border-t-[#64748B] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#6B7280] text-sm">Validating reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Pane - Branding */}
      <div className="hidden lg:flex w-[45%] bg-slate-900 text-white p-16 flex-col justify-center relative overflow-hidden">
        <div className="relative z-10 w-full max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="text-white" size={24} fill="currentColor" />
            </div>
            <div>
              <div className="font-bold text-white text-2xl leading-none">EventHQ</div>
              <div className="text-[11px] text-emerald-400 font-semibold tracking-widest uppercase mt-1.5">Scoring Platform</div>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-white">
            Secure your account.
          </h1>
          <p className="text-slate-300 text-lg mb-12">
            Set a strong password to protect your EventHQ account and event data.
          </p>
          
          <div className="space-y-6">
            {[
              'Encrypted password storage',
              'Multi-factor authentication ready',
              'Regular security audits',
              'Compliance assured'
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="text-emerald-500" size={16} />
                </div>
                <span className="text-slate-200 text-[15px] font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="absolute bottom-12 left-0 right-0 text-center z-10">
          <p className="text-slate-500 text-sm">© {new Date().getFullYear()} EventHQ</p>
        </div>
      </div>

      {/* Right Pane - Password Reset Form */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo Only */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
              <Zap className="text-white" size={18} fill="currentColor" />
            </div>
            <div className="font-bold text-slate-900 text-xl tracking-tight">EventHQ</div>
          </div>

          <h2 className="text-[28px] md:text-[32px] font-bold text-slate-900 mb-2">Reset Password</h2>
          <p className="text-slate-500 text-[15px] mb-8">Create a new secure password for your account</p>

          {!tokenValid ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3"
            >
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <div>
                <p className="text-red-800 font-semibold text-sm">Invalid Reset Link</p>
                <p className="text-red-700 text-sm mt-1">The reset link is missing or invalid. Please request a new one from the login page.</p>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New Password */}
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 text-[14px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all shadow-sm"
                    placeholder="Enter new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password Requirements */}
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-[11px] font-semibold text-slate-600 mb-2">Password must contain:</p>
                  <div className="space-y-1.5">
                    {[
                      { key: 'length', label: '8+ characters' },
                      { key: 'uppercase', label: 'Uppercase letter (A-Z)' },
                      { key: 'lowercase', label: 'Lowercase letter (a-z)' },
                      { key: 'number', label: 'Number (0-9)' },
                      { key: 'symbol', label: 'Special character (!@#$%^&*)' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] transition-all ${
                            passwordChecks[key]
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-200 text-slate-400'
                          }`}
                        >
                          {passwordChecks[key] ? '✓' : '○'}
                        </div>
                        <span
                          className={`text-[12px] ${
                            passwordChecks[key]
                              ? 'text-emerald-600 font-medium'
                              : 'text-slate-600'
                          }`}
                        >
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-2">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 text-[14px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all shadow-sm"
                    placeholder="Confirm new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {confirmPassword && (
                  <p className={`text-[12px] mt-2 ${passwordsMatch ? 'text-emerald-600' : 'text-red-600'}`}>
                    {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={loading || !allChecksPassed || !passwordsMatch}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3 px-4 rounded-lg text-[14px] font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Resetting...
                  </span>
                ) : (
                  'Reset Password'
                )}
              </motion.button>

              {/* Back to Login */}
              <div className="text-center pt-4 border-t border-slate-200">
                <p className="text-slate-600 text-[13px]">
                  Remember your password?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="text-slate-900 font-semibold hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
