import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode, Keyboard, CheckCircle2, XCircle,
  User, Building2, Wifi, Clock, ScanLine,
  AlertTriangle, ChevronRight
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';

const getModes = (t) => [
  { id: 'stage1', label: t('event_arrival'), icon: '①' },
  { id: 'stage2', label: t('venue_checkin'), icon: '②' },
  { id: 'stage3', label: t('speaker_verify'), icon: '③' },
];

const ENDPOINTS = { stage1: '/checkin/stage1', stage2: '/checkin/stage2', stage3: '/checkin/stage3' };

function FeedbackModal({ result, onClose }) {
  const { t } = useLanguage();
  if (!result) return null;
  const isSuccess = result.status === 'SUCCESS';
  const isAlreadyIn = result.status === 'ALREADY_CHECKED_IN';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: -20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-xl"
        >
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${isSuccess ? 'bg-green-50 border border-green-200' : isAlreadyIn ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
              {isSuccess ? <CheckCircle2 size={18} className="text-green-600" strokeWidth={1.5} /> :
               isAlreadyIn ? <AlertTriangle size={18} className="text-amber-600" strokeWidth={1.5} /> :
               <XCircle size={18} className="text-red-600" strokeWidth={1.5} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-[13px] font-semibold mb-1 ${isSuccess ? 'text-green-700' : isAlreadyIn ? 'text-amber-700' : 'text-red-700'}`}>
                {isSuccess ? t('checkin_success') : isAlreadyIn ? t('already_checked_in') : t('checkin_failed')}
              </div>
              <div className="text-[12px] text-[#6B7280] mb-3">{result.message || result.error}</div>
              {result.participant && (
                <div className="space-y-1.5 border border-[#F3F4F6] rounded-sm p-3 bg-[#F9FAFB]">
                  <div className="flex items-center gap-2">
                    <User size={11} strokeWidth={1.5} className="text-[#9CA3AF]" />
                    <span className="text-[12px] font-medium text-[#374151]">{result.participant.name}</span>
                    <span className={`badge text-[10px] ${
                      result.participant.role === 'speaker' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      result.participant.role === 'chairperson' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      result.participant.role === 'vip' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>{t(result.participant.role)}</span>
                  </div>
                  {result.participant.organization && (
                    <div className="flex items-center gap-2">
                      <Building2 size={11} strokeWidth={1.5} className="text-[#9CA3AF]" />
                      <span className="text-[11px] text-[#6B7280]">{result.participant.organization}</span>
                    </div>
                  )}
                  <div className="flex gap-2 mt-2 pt-2 border-t border-[#F3F4F6]">
                    {[1, 2, 3].map((s) => (
                      <div key={s} className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-sm border ${
                        result.participant[`checkin_at_${s}`] ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'
                      }`}>
                        {t('stage')} {s} {result.participant[`checkin_at_${s}`] ? '✓' : '○'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="mt-5 w-full py-2.5 text-[13px] font-medium border border-slate-200 rounded-xl bg-white shadow-sm hover:bg-slate-50 transition-all text-slate-700"
          >
            {t('continue_scanning')}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Scanner() {
  const { t } = useLanguage();
  const [mode, setMode] = useState('stage1');
  const [inputMode, setInputMode] = useState('manual'); // 'qr' | 'manual'
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);

  const MODES = getModes(t);

  useEffect(() => {
    if (inputMode === 'qr') {
      setTimeout(() => {
        if (scannerRef.current) {
          scannerInstanceRef.current = new Html5QrcodeScanner(
            'qr-reader',
            { fps: 10, qrbox: { width: 280, height: 280 }, rememberLastUsedCamera: true },
            false
          );
          scannerInstanceRef.current.render(handleScan, (err) => {});
        }
      }, 200);
    }
    return () => {
      scannerInstanceRef.current?.clear().catch(() => {});
    };
  }, [inputMode]);

  const handleScan = async (code) => {
    await processCheckin(code);
  };

  const processCheckin = async (code) => {
    if (!code.trim() || loading) return;
    setLoading(true);
    try {
      const res = await api.post(ENDPOINTS[mode], { qr_code: code.trim() });
      const data = res.data;
      setResult(data);
      setHistory(prev => [{ ...data, mode, time: new Date(), code }, ...prev.slice(0, 49)]);
      toast.success(data.message);
    } catch (err) {
      const errData = err.response?.data || { status: 'ERROR', error: err.message };
      setResult(errData);
      setHistory(prev => [{ ...errData, mode, time: new Date(), code, error: true }, ...prev.slice(0, 49)]);
    } finally {
      setLoading(false);
      setManualCode('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Mode Toggle */}
      <div className="border border-slate-200 bg-white rounded-2xl p-1.5 flex flex-wrap sm:flex-nowrap gap-1.5 shadow-sm max-w-3xl mx-auto">
        {MODES.map((m) => (
          <motion.button
            key={m.id}
            onClick={() => setMode(m.id)}
            whileHover={{ scale: 1.01 }}
            className={`flex-1 min-w-[100px] py-3 px-2 sm:px-4 rounded-xl text-[12px] sm:text-[13px] font-semibold transition-all flex items-center justify-center gap-2
              ${mode === m.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <span className="text-[12px] font-bold">{m.icon}</span>
            <span className="truncate">{m.label}</span>
          </motion.button>
        ))}
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-5 gap-6">
        {/* Scanner Area */}
        <div className="lg:col-span-3 space-y-5">
          {/* Input Mode Toggle */}
          <div className="border border-slate-200 bg-white rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setInputMode('manual')}
                className={`flex items-center gap-2 px-4 py-2 text-[13px] rounded-xl border transition-all font-medium whitespace-nowrap
                  ${inputMode === 'manual' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              >
                <Keyboard size={14} strokeWidth={2} /> {t('manual_entry')}
              </button>
              <button
                onClick={() => setInputMode('qr')}
                className={`flex items-center gap-2 px-4 py-2 text-[13px] rounded-xl border transition-all font-medium whitespace-nowrap
                  ${inputMode === 'qr' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              >
                <QrCode size={14} strokeWidth={2} /> {t('camera_qr')}
              </button>
              <div className={`ml-auto flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-sm border ${loading ? 'border-amber-200 bg-amber-50 text-amber-600' : 'border-green-200 bg-green-50 text-green-600'}`}>
                <Wifi size={10} strokeWidth={1.5} /> {loading ? t('processing') : t('active')}
              </div>
            </div>

            {inputMode === 'manual' ? (
              <div className="space-y-3">
                <div className="relative">
                  <ScanLine size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.5} />
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && processCheckin(manualCode)}
                    placeholder={t('manual_entry_desc')}
                    className="w-full pl-11 pr-4 py-3.5 text-[14px] border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all font-mono shadow-inner"
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <motion.button
                  onClick={() => processCheckin(manualCode)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  disabled={loading || !manualCode.trim()}
                  className="w-full py-3 bg-slate-900 text-white text-[14px] font-semibold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 transition-all shadow-md hover:bg-slate-800"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><CheckCircle2 size={14} strokeWidth={2} /> {t('process_checkin')}</>
                  )}
                </motion.button>
              </div>
            ) : (
              <div className="relative group">
                {/* Visual Scanner Frame Decoration */}
                <div className="absolute -inset-1 bg-gradient-to-tr from-slate-200 to-slate-100 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                
                <div className="relative bg-white pt-2">
                  <div className="flex flex-col items-center mb-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-2 border border-slate-100 shadow-sm">
                      <QrCode size={20} className="text-slate-900" strokeWidth={1.5} />
                    </div>
                    <p className="text-[12px] text-slate-400 font-medium">{t('scan_frame_desc')}</p>
                  </div>
                  
                  <div id="qr-reader" ref={scannerRef} className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm" />
                </div>
              </div>
            )}
          </div>

          {/* Mode description */}
          <div className="border border-slate-200 bg-slate-50/50 rounded-2xl px-6 py-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="text-[20px]">{MODES.find(m => m.id === mode)?.icon}</div>
              <div>
                <div className="text-[13px] font-semibold text-[#111827]">{MODES.find(m => m.id === mode)?.label}</div>
                <div className="text-[11px] text-[#9CA3AF] mt-0.5">
                  {t(`${mode}_desc`)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History Panel */}
        <div className="lg:col-span-2">
          <div className="border border-slate-200 bg-white rounded-3xl overflow-hidden h-full shadow-sm flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[#374151]">{t('validation_history')}</span>
              <span className="text-[11px] text-[#9CA3AF]">{history.length} {t('scans')}</span>
            </div>
            <div className="divide-y divide-[#F3F4F6] max-h-96 overflow-y-auto">
              {history.length === 0 ? (
                <div className="px-4 py-8 text-center text-[12px] text-[#9CA3AF]">{t('no_scans')}</div>
              ) : (
                history.map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i === 0 ? 0 : 0 }}
                    className="px-4 py-3 flex items-start gap-3"
                  >
                    <div className={`w-5 h-5 rounded-sm flex-shrink-0 flex items-center justify-center mt-0.5 ${
                      h.status === 'SUCCESS' ? 'bg-green-50 border border-green-200' :
                      h.status === 'ALREADY_CHECKED_IN' ? 'bg-amber-50 border border-amber-200' :
                      'bg-red-50 border border-red-200'
                    }`}>
                      {h.status === 'SUCCESS' ? <CheckCircle2 size={10} className="text-green-600" /> :
                       h.status === 'ALREADY_CHECKED_IN' ? <AlertTriangle size={10} className="text-amber-600" /> :
                       <XCircle size={10} className="text-red-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-[#374151] truncate">
                        {h.participant?.name || h.code || 'Unknown'}
                      </div>
                      <div className="text-[10px] text-[#9CA3AF] flex items-center gap-1">
                        <Clock size={9} /> {h.time?.toLocaleTimeString(lang === 'ja' ? 'ja-JP' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        <span className="mx-1">·</span>
                        {MODES.find(m => m.id === h.mode)?.label}
                      </div>
                    </div>
                    <ChevronRight size={12} className="text-[#CBD5E1] flex-shrink-0 mt-1" />
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      <FeedbackModal result={result} onClose={() => setResult(null)} />
    </div>
  );
}
