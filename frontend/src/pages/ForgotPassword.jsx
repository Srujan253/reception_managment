import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      toast.success(res.data.message || 'Check your email for reset instructions');
      setSubmitted(true);
      setEmail('');
      
      // Redirect to login after 5 seconds
      setTimeout(() => navigate('/login'), 5000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to send reset email';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

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
            Password recovery made easy.
          </h1>
          <p className="text-slate-300 text-lg mb-12">
            Enter your email address and we'll send you a link to reset your password in just a few minutes.
          </p>
          
          <div className="space-y-6">
            {[
              'Instant reset link delivery',
              '1-hour secure token',
              'No password sharing needed',
              'Complete privacy assured'
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle className="text-emerald-500" size={16} />
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

      {/* Right Pane - Form */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo Only */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <button
              onClick={() => navigate('/login')}
              className="p-2 -ml-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1 text-right">
              <div className="font-bold text-slate-900 text-xl tracking-tight">EventHQ</div>
            </div>
          </div>

          {!submitted ? (
            <>
              <h2 className="text-[28px] md:text-[32px] font-bold text-slate-900 mb-2">Forgot Password?</h2>
              <p className="text-slate-500 text-[15px] mb-8">No worries! Enter your email and we'll send you a reset link.</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 text-[14px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all shadow-sm"
                    placeholder="admin@eventhq.com"
                    required
                  />
                  <p className="text-[12px] text-slate-500 mt-1.5">
                    We'll never share your email with anyone else
                  </p>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full py-3 px-4 rounded-lg text-[14px] font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    'Send Reset Link'
                  )}
                </motion.button>
              </form>

              {/* Back to Login */}
              <div className="text-center pt-6 border-t border-slate-200 mt-8">
                <button
                  onClick={() => navigate('/login')}
                  className="text-slate-600 hover:text-slate-900 text-[13px] font-medium transition-colors flex items-center justify-center gap-1 mx-auto"
                >
                  <ArrowLeft size={14} />
                  Back to Sign In
                </button>
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="text-emerald-600" size={32} />
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 mb-2">Check your email!</h3>
              <p className="text-slate-600 text-[14px] mb-6">
                We've sent a password reset link to<br />
                <span className="font-semibold text-slate-900">{email}</span>
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex gap-3">
                  <AlertCircle className="text-blue-600 flex-shrink-0" size={16} />
                  <div className="text-left">
                    <p className="text-[12px] text-blue-800 font-semibold">Tip:</p>
                    <p className="text-[12px] text-blue-700">The link will expire in 1 hour for security.</p>
                  </div>
                </div>
              </div>

              <p className="text-slate-500 text-[12px] mb-6">
                Redirecting to login in 5 seconds...
              </p>

              <button
                onClick={() => navigate('/login')}
                className="text-slate-600 hover:text-slate-900 text-[13px] font-medium transition-colors"
              >
                Go back now
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
