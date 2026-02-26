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

const MODES = [
  { id: 'stage1', label: 'Event Arrival', label_ja: 'イベント受付', icon: '①' },
  { id: 'stage2', label: 'Venue Check-in', label_ja: '会場受付', icon: '②' },
  { id: 'stage3', label: 'Speaker Verify', label_ja: 'スピーカー確認', icon: '③' },
];

const ENDPOINTS = { stage1: '/checkin/stage1', stage2: '/checkin/stage2', stage3: '/checkin/stage3' };

function FeedbackModal({ result, onClose }) {
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
          initial={{ scale: 0.92, y: -20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white border border-[#CBD5E1] rounded-sm w-full max-w-sm p-6"
          style={{ boxShadow: '8px 8px 0px 0px rgba(0,0,0,0.08)' }}
        >
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0 ${isSuccess ? 'bg-green-50 border border-green-200' : isAlreadyIn ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
              {isSuccess ? <CheckCircle2 size={18} className="text-green-600" strokeWidth={1.5} /> :
               isAlreadyIn ? <AlertTriangle size={18} className="text-amber-600" strokeWidth={1.5} /> :
               <XCircle size={18} className="text-red-600" strokeWidth={1.5} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-[13px] font-semibold mb-1 ${isSuccess ? 'text-green-700' : isAlreadyIn ? 'text-amber-700' : 'text-red-700'}`}>
                {isSuccess ? 'Check-in Successful' : isAlreadyIn ? 'Already Checked In' : 'Check-in Failed'}
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
                    }`}>{result.participant.role}</span>
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
                        Stage {s} {result.participant[`checkin_at_${s}`] ? '✓' : '○'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="mt-4 w-full py-2 text-[12px] font-medium border border-[#CBD5E1] rounded-sm hover:bg-[#F3F4F6] transition-all"
          >
            Continue Scanning
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Scanner() {
  const [mode, setMode] = useState('stage1');
  const [inputMode, setInputMode] = useState('manual'); // 'qr' | 'manual'
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);

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
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Mode Toggle */}
      <div className="border border-[#CBD5E1] bg-white rounded-sm p-1 flex gap-1" style={{ boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.05)' }}>
        {MODES.map((m) => (
          <motion.button
            key={m.id}
            onClick={() => setMode(m.id)}
            whileHover={{ scale: 1.01 }}
            className={`flex-1 py-2.5 px-4 rounded-sm text-[12px] font-semibold transition-all flex items-center justify-center gap-2
              ${mode === m.id ? 'bg-[#111827] text-white shadow-hard-sm' : 'text-[#6B7280] hover:bg-[#F3F4F6]'}`}
          >
            <span className="text-[10px] font-bold">{m.icon}</span>
            <span>{m.label}</span>
            <span className="text-[10px] opacity-60 hidden sm:block">{m.label_ja}</span>
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Scanner Area */}
        <div className="col-span-3 space-y-4">
          {/* Input Mode Toggle */}
          <div className="border border-[#CBD5E1] bg-white rounded-sm p-4" style={{ boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.05)' }}>
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setInputMode('manual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-sm border transition-all
                  ${inputMode === 'manual' ? 'bg-[#111827] text-white border-[#111827]' : 'border-[#CBD5E1] text-[#6B7280] hover:bg-[#F3F4F6]'}`}
              >
                <Keyboard size={12} strokeWidth={1.5} /> Manual Entry
              </button>
              <button
                onClick={() => setInputMode('qr')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-sm border transition-all
                  ${inputMode === 'qr' ? 'bg-[#111827] text-white border-[#111827]' : 'border-[#CBD5E1] text-[#6B7280] hover:bg-[#F3F4F6]'}`}
              >
                <QrCode size={12} strokeWidth={1.5} /> Camera QR
              </button>
              <div className={`ml-auto flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-sm border ${loading ? 'border-amber-200 bg-amber-50 text-amber-600' : 'border-green-200 bg-green-50 text-green-600'}`}>
                <Wifi size={10} strokeWidth={1.5} /> {loading ? 'Processing...' : 'Active'}
              </div>
            </div>

            {inputMode === 'manual' ? (
              <div className="space-y-3">
                <div className="relative">
                  <ScanLine size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" strokeWidth={1.5} />
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && processCheckin(manualCode)}
                    placeholder="Enter QR code or ticket number — Press Enter"
                    className="w-full pl-8 pr-3 py-3 text-[13px] border border-[#CBD5E1] rounded-sm bg-[#F9FAFB] focus:outline-none focus:border-[#64748B] focus:bg-white transition-all font-mono"
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <motion.button
                  onClick={() => processCheckin(manualCode)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  disabled={loading || !manualCode.trim()}
                  className="w-full py-2.5 bg-[#111827] text-white text-[13px] font-semibold rounded-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
                  style={{ boxShadow: '3px 3px 0px 0px rgba(0,0,0,0.15)' }}
                >
                  {loading ? (
                    <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><CheckCircle2 size={14} strokeWidth={2} /> Process Check-in</>
                  )}
                </motion.button>
              </div>
            ) : (
              <div>
                <div id="qr-reader" ref={scannerRef} className="rounded-sm overflow-hidden border border-[#CBD5E1]" />
              </div>
            )}
          </div>

          {/* Mode description */}
          <div className="border border-[#CBD5E1] bg-[#F9FAFB] rounded-sm px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="text-[20px]">{MODES.find(m => m.id === mode)?.icon}</div>
              <div>
                <div className="text-[13px] font-semibold text-[#111827]">{MODES.find(m => m.id === mode)?.label}</div>
                <div className="text-[11px] text-[#9CA3AF] mt-0.5">
                  {mode === 'stage1' && 'Validates participant registration. Marks event arrival timestamp.'}
                  {mode === 'stage2' && 'Grants venue access. Requires Stage 1 to be completed first.'}
                  {mode === 'stage3' && 'Verifies speakers, chairpersons, and VIPs. Requires Stage 1.'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History Panel */}
        <div className="col-span-2">
          <div className="border border-[#CBD5E1] bg-white rounded-sm overflow-hidden h-full" style={{ boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.05)' }}>
            <div className="px-4 py-3 border-b border-[#F3F4F6] flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[#374151]">Validation History</span>
              <span className="text-[11px] text-[#9CA3AF]">{history.length} scans</span>
            </div>
            <div className="divide-y divide-[#F3F4F6] max-h-96 overflow-y-auto">
              {history.length === 0 ? (
                <div className="px-4 py-8 text-center text-[12px] text-[#9CA3AF]">No scans yet</div>
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
                        <Clock size={9} /> {h.time?.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
