import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function Login() {
  const [email, setEmail] = useState('admin@eventhq.com');
  const [password, setPassword] = useState('admin123');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.user, res.data.token);
      toast.success(`Welcome back, ${res.data.user.name}`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 bg-[#111827] flex items-center justify-center rounded-sm" style={{ boxShadow: '3px 3px 0px 0px rgba(0,0,0,0.2)' }}>
            <Zap size={18} className="text-white" strokeWidth={1.8} />
          </div>
          <div>
            <div className="font-bold text-[#111827] text-lg leading-none">EventHQ</div>
            <div className="text-[11px] text-[#9CA3AF]">Enterprise Check-in System</div>
          </div>
        </div>

        {/* Card */}
        <div className="border border-[#CBD5E1] bg-white rounded-sm p-8" style={{ boxShadow: '6px 6px 0px 0px rgba(0,0,0,0.06)' }}>
          <h2 className="text-[18px] font-semibold text-[#111827] mb-1">Sign in</h2>
          <p className="text-[13px] text-[#6B7280] mb-6">Access your management console</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-[13px] border border-[#CBD5E1] rounded-sm bg-[#F9FAFB] focus:outline-none focus:border-[#64748B] focus:bg-white transition-all"
                placeholder="admin@eventhq.com"
                required
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 text-[13px] border border-[#CBD5E1] rounded-sm bg-[#F9FAFB] focus:outline-none focus:border-[#64748B] focus:bg-white transition-all"
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]">
                  {showPass ? <EyeOff size={13} strokeWidth={1.5} /> : <Eye size={13} strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-2.5 bg-[#111827] text-white text-[13px] font-semibold rounded-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
              style={{ boxShadow: '3px 3px 0px 0px rgba(0,0,0,0.2)' }}
            >
              {loading ? (
                <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={14} strokeWidth={2} />
                  Sign in
                </>
              )}
            </motion.button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-5 border-t border-[#F3F4F6]">
            <p className="text-[11px] text-[#9CA3AF] mb-2 font-medium uppercase tracking-wide">Demo Accounts</p>
            <div className="space-y-1">
              {[
                { label: 'Admin', email: 'admin@eventhq.com', pass: 'admin123' },
                { label: 'Manager', email: 'manager@eventhq.com', pass: 'manager123' },
                { label: 'Staff', email: 'staff@eventhq.com', pass: 'staff123' },
              ].map(({ label, email: e, pass }) => (
                <button
                  key={e}
                  onClick={() => { setEmail(e); setPassword(pass); }}
                  className="w-full text-left px-2.5 py-1.5 text-[11px] rounded-sm border border-[#F3F4F6] hover:border-[#CBD5E1] hover:bg-[#F9FAFB] transition-all flex justify-between"
                >
                  <span className="font-medium text-[#374151]">{label}</span>
                  <span className="text-[#9CA3AF]">{e}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
