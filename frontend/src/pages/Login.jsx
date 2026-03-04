import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useLanguage } from '../context/LanguageContext';

export default function Login() {
  const { lang, setLang, t } = useLanguage();
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
      const res = await api.post('auth/login', { email, password });
      login(res.data.user, res.data.token);
      toast.success(`${t('welcome_back')}, ${res.data.user.name}`);
      navigate('/');
    } catch (err) {
      console.error('Login error details:', err.response?.data || err.message || err);
      toast.error(err.response?.data?.error || t('login_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Pane - Branding */}
      <div className="hidden lg:flex w-[45%] bg-slate-900 text-white p-16 flex-col justify-center relative overflow-hidden">
        <div className="relative z-10 w-full max-w-md mx-auto">
          <div className="flex items-center justify-between mb-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="text-white" size={24} fill="currentColor" />
              </div>
              <div>
                <div className="font-bold text-white text-2xl leading-none">EventHQ</div>
                <div className="text-[11px] text-emerald-400 font-semibold tracking-widest uppercase mt-1.5">{t('scoring_platform')}</div>
              </div>
            </div>

            {/* Language Toggle */}
            <div className="flex bg-slate-800/50 p-0.5 rounded-lg border border-slate-700">
              <button
                onClick={() => setLang('en')}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                  lang === 'en' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('ja')}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                  lang === 'ja' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                JP
              </button>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-white">
            {t('manage_contests')}
          </h1>
          <p className="text-slate-300 text-lg mb-12">
            {t('platform_description')}
          </p>
          
          <div className="space-y-6">
            {[
              t('feature_realtime'),
              t('feature_multi_judge'),
              t('feature_custom_templates'),
              t('feature_instant_results')
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

      {/* Right Pane - Login Form */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo & Lang Toggle */}
          <div className="lg:hidden flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
                <Zap className="text-white" size={18} fill="currentColor" />
              </div>
              <div className="font-bold text-slate-900 text-xl tracking-tight">EventHQ</div>
            </div>

            <div className="flex bg-slate-200 p-0.5 rounded-lg border border-slate-300">
              <button
                onClick={() => setLang('en')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                  lang === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('ja')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                  lang === 'ja' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                JP
              </button>
            </div>
          </div>

          <h2 className="text-[28px] md:text-[32px] font-bold text-slate-900 mb-2">{t('welcome_back')}</h2>
          <p className="text-slate-500 text-[15px] mb-10">{t('sign_in_to_account')}</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t('email')}</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 text-[14px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all shadow-sm"
                  placeholder="admin@example.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t('password')}</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-12 py-3 text-[14px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all shadow-sm"
                  placeholder={t('password')}
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPass ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3 mt-4 bg-slate-800 hover:bg-slate-900 text-white text-[15px] font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-70 transition-all shadow-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                t('login')
              )}
            </motion.button>
          </form>




          {/* Demo accounts */}
          <div className="mt-12 pt-8 border-t border-slate-200">
            <p className="text-[11px] text-slate-400 mb-4 font-bold uppercase tracking-widest text-center">{t('demo_accounts')}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: t('admin_role'), email: 'admin@eventhq.com', pass: 'admin123' },
                { label: t('manager_role'), email: 'manager@eventhq.com', pass: 'manager123' },
                { label: t('staff_role'), email: 'staff@eventhq.com', pass: 'staff123' },
              ].map(({ label, email: e, pass }) => (
                <button
                  key={e}
                  onClick={() => { setEmail(e); setPassword(pass); }}
                  className="w-full px-4 py-2.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900 transition-all shadow-sm bg-slate-50 flex items-center justify-center"
                >
                  <span className="font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
