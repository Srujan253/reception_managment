import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode, Keyboard, CheckCircle2, XCircle,
  User, Building2, Wifi, Clock, ScanLine, LogIn, LogOut,
  AlertTriangle, ChevronRight, Timer, ShieldCheck, CalendarDays
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';

const STAGES = [
  { id: 'stage1', label: 'Event Arrival',   icon: '①', color: 'emerald' },
  { id: 'stage2', label: 'Venue Check-in',  icon: '②', color: 'blue'    },
  { id: 'stage3', label: 'Speaker Verify',  icon: '③', color: 'purple'  },
];

const ENDPOINTS = { stage1: '/checkin/stage1', stage2: '/checkin/stage2', stage3: '/checkin/stage3' };

// ── Status badge colours ───────────────────────────────────
const STATUS_MAP = {
  SUCCESS:          { bg: 'bg-green-50  border-green-200',  icon: <CheckCircle2 size={18} className="text-green-600"  strokeWidth={1.5} />, text: 'text-green-700'  },
  ENTRY:            { bg: 'bg-emerald-50 border-emerald-200', icon: <LogIn       size={18} className="text-emerald-600" strokeWidth={1.5} />, text: 'text-emerald-700' },
  EXIT:             { bg: 'bg-blue-50   border-blue-200',   icon: <LogOut      size={18} className="text-blue-600"   strokeWidth={1.5} />, text: 'text-blue-700'   },
  ALREADY_CHECKED_IN: { bg: 'bg-amber-50 border-amber-200', icon: <AlertTriangle size={18} className="text-amber-600" strokeWidth={1.5} />, text: 'text-amber-700'  },
  ALREADY_EXITED:   { bg: 'bg-slate-50  border-slate-200',  icon: <XCircle     size={18} className="text-slate-500"  strokeWidth={1.5} />, text: 'text-slate-600'  },
  COOLDOWN_ACTIVE:  { bg: 'bg-orange-50 border-orange-200', icon: <Timer       size={18} className="text-orange-600" strokeWidth={1.5} />, text: 'text-orange-700' },
  NOT_AUTHORIZED:   { bg: 'bg-red-50    border-red-200',    icon: <XCircle     size={18} className="text-red-600"    strokeWidth={1.5} />, text: 'text-red-700'    },
  NOT_FOUND:        { bg: 'bg-red-50    border-red-200',    icon: <XCircle     size={18} className="text-red-600"    strokeWidth={1.5} />, text: 'text-red-700'    },
  WRONG_EVENT:      { bg: 'bg-red-50    border-red-200',    icon: <XCircle     size={18} className="text-red-600"    strokeWidth={1.5} />, text: 'text-red-700'    },
  ERROR:            { bg: 'bg-red-50    border-red-200',    icon: <XCircle     size={18} className="text-red-600"    strokeWidth={1.5} />, text: 'text-red-700'    },
};

function FeedbackModal({ result, onClose }) {
  const { t, lang } = useLanguage();
  if (!result) return null;
  const s = STATUS_MAP[result.status] || STATUS_MAP.ERROR;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4"
        onClick={onClose}>
        <motion.div initial={{ scale: 0.95, y: -20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }} onClick={(e) => e.stopPropagation()}
          className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-xl">

          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border ${s.bg}`}>
              {s.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-[13px] font-semibold mb-1 ${s.text}`}>
                {result.status === 'ENTRY'           ? (lang === 'ja' ? '入場記録' : 'Session Entry')
                 : result.status === 'EXIT'          ? (lang === 'ja' ? '退場記録' : 'Session Exit')
                 : result.status === 'COOLDOWN_ACTIVE' ? (lang === 'ja' ? 'クールダウン中' : 'Exit Cooldown Active')
                 : result.status === 'SUCCESS'       ? t('checkin_success')
                 : result.status === 'ALREADY_CHECKED_IN' ? t('already_checked_in')
                 : result.status === 'NOT_AUTHORIZED' ? (lang === 'ja' ? 'アクセス拒否' : 'Access Denied')
                 : result.status === 'WRONG_EVENT'   ? (lang === 'ja' ? 'イベント不一致' : 'Wrong Event')
                 : t('checkin_failed')}
              </div>
              <div className="text-[12px] text-[#6B7280] mb-3">
                {result.message || result.error}
              </div>

              {/* Cooldown countdown */}
              {result.status === 'COOLDOWN_ACTIVE' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-[11px] text-orange-700 font-semibold mb-3">
                  <Timer size={12} />
                  {lang === 'ja'
                    ? `あと ${result.seconds_remaining} 秒待ってから退場スキャンしてください`
                    : `Wait ${result.seconds_remaining}s before scanning exit`}
                </div>
              )}

              {/* Duration on exit */}
              {result.status === 'EXIT' && result.duration_seconds != null && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-700 font-medium mb-3">
                  <Clock size={12} />
                  {lang === 'ja' ? '滞在時間' : 'Duration'}:&nbsp;
                  <strong>{Math.floor(result.duration_seconds / 60)}m {result.duration_seconds % 60}s</strong>
                </div>
              )}

              {/* Session */}
              {result.session_title && (
                <div className="text-[11px] text-slate-500 mb-2">
                  📅 {result.session_title}
                </div>
              )}

              {/* Participant card */}
              {result.participant && (
                <div className="space-y-1.5 border border-[#F3F4F6] rounded-sm p-3 bg-[#F9FAFB]">
                  <div className="flex items-center gap-2">
                    <User size={11} strokeWidth={1.5} className="text-[#9CA3AF]" />
                    <span className="text-[12px] font-medium text-[#374151]">{result.participant.name}</span>
                    <span className={`badge text-[10px] px-1.5 py-0.5 rounded-full border ${
                      result.participant.role === 'speaker'     ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      result.participant.role === 'chairperson' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      result.participant.role === 'vip'         ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>{result.participant.role}</span>
                  </div>
                  {result.participant.organization && (
                    <div className="flex items-center gap-2">
                      <Building2 size={11} strokeWidth={1.5} className="text-[#9CA3AF]" />
                      <span className="text-[11px] text-[#6B7280]">{result.participant.organization}</span>
                    </div>
                  )}
                  <div className="flex gap-2 mt-2 pt-2 border-t border-[#F3F4F6] flex-wrap">
                    {[
                      { label: lang === 'ja' ? 'イベント' : 'Arrival', val: result.participant.checkin_at_1 },
                      { label: lang === 'ja' ? '会場' : 'Venue',     val: result.participant.checkin_at_2 },
                      { label: lang === 'ja' ? '登壇者' : 'Speaker',  val: result.participant.checkin_at_3 },
                    ].map(({ label, val }) => (
                      <div key={label} className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-sm border ${
                        val ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'
                      }`}>{label} {val ? '✓' : '○'}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button onClick={onClose}
            className="mt-5 w-full py-2.5 text-[13px] font-medium border border-slate-200 rounded-xl bg-white shadow-sm hover:bg-slate-50 transition-all text-slate-700">
            {t('continue_scanning')}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Selector row (event / session dropdowns) ───────────────
function SelectorRow({ stage, events, selectedEvent, setSelectedEvent, sessions, selectedSession, setSelectedSession, lang }) {
  if (stage === 'stage1') {
    return (
      <div className="mb-5">
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          {lang === 'ja' ? '🗓 イベントを選択' : '🗓 Select Event'}
        </label>
        <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}
          className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-xl bg-white shadow-sm focus:outline-none focus:border-slate-400 text-slate-700">
          <option value="">{lang === 'ja' ? 'イベントを選択...' : 'Select an event...'}</option>
          {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>
    );
  }

  if (stage === 'stage2') {
    return (
      <div className="mb-5 space-y-2">
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          {lang === 'ja' ? '🗓 イベントとセッションを選択' : '🗓 Select Event & Session'}
        </label>
        <select value={selectedEvent} onChange={e => { setSelectedEvent(e.target.value); setSelectedSession(''); }}
          className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-xl bg-white shadow-sm focus:outline-none focus:border-slate-400 text-slate-700">
          <option value="">{lang === 'ja' ? 'イベントを選択...' : 'Select an event...'}</option>
          {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select value={selectedSession} onChange={e => setSelectedSession(e.target.value)}
          disabled={!selectedEvent || sessions.length === 0}
          className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-xl bg-white shadow-sm focus:outline-none focus:border-slate-400 text-slate-700 disabled:opacity-50">
          <option value="">{lang === 'ja' ? 'セッションを選択...' : 'Select a session...'}</option>
          {sessions.map(s => (
            <option key={s.id} value={s.id}>
              {s.title} {s.start_time ? `· ${new Date(s.start_time).toLocaleTimeString(lang === 'ja' ? 'ja-JP' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Stage 3: no selector needed
  return (
    <div className="mb-5 flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-xl text-[12px] text-purple-700 font-medium">
      <ShieldCheck size={14} />
      {lang === 'ja'
        ? '登壇者（座長・スピーカー）のみスキャン可能'
        : 'Only Chairpersons and Speakers can be scanned'}
    </div>
  );
}

// ── Main Scanner page ──────────────────────────────────────
export default function Scanner() {
  const { t, lang } = useLanguage();
  const [stage, setStage]         = useState('stage1');
  const [inputMode, setInputMode] = useState('manual');
  const [manualCode, setManualCode] = useState('');
  const [result, setResult]       = useState(null);
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(false);

  // Event + session selectors
  const [events, setEvents]           = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [sessions, setSessions]         = useState([]);
  const [selectedSession, setSelectedSession] = useState('');

  const scannerRef         = useRef(null);
  const scannerInstanceRef = useRef(null);
  const processRef         = useRef(null);

  // Load events on mount
  useEffect(() => {
    api.get('/events').then(r => setEvents(r.data)).catch(() => {});
  }, []);

  // Load sessions when event changes (for stage2)
  useEffect(() => {
    if (stage === 'stage2' && selectedEvent) {
      api.get('/sessions', { params: { event_id: selectedEvent } })
        .then(r => setSessions(r.data?.sessions || r.data || []))
        .catch(() => setSessions([]));
    } else {
      setSessions([]);
      setSelectedSession('');
    }
  }, [selectedEvent, stage]);

  // Reset selectors when switching stage
  useEffect(() => {
    setSelectedEvent('');
    setSelectedSession('');
    setSessions([]);
  }, [stage]);

  // QR scanner lifecycle
  useEffect(() => {
    if (inputMode === 'qr') {
      setTimeout(() => {
        if (scannerRef.current && !scannerInstanceRef.current) {
          scannerInstanceRef.current = new Html5QrcodeScanner(
            'qr-reader',
            { fps: 10, qrbox: { width: 260, height: 260 }, rememberLastUsedCamera: true },
            false
          );
          scannerInstanceRef.current.render(
            (code) => processRef.current?.(code),
            () => {}
          );
        }
      }, 200);
    }
    return () => {
      scannerInstanceRef.current?.clear().catch(() => {});
      scannerInstanceRef.current = null;
    };
  }, [inputMode]);

  // Keep processCheckin ref fresh
  useEffect(() => { processRef.current = processCheckin; });

  const processCheckin = async (code) => {
    if (!code?.trim() || loading) return;

    // Validate required selectors
    if (stage === 'stage1' && !selectedEvent) {
      toast.error(lang === 'ja' ? 'イベントを選択してください' : 'Please select an event first');
      return;
    }
    if (stage === 'stage2' && (!selectedEvent || !selectedSession)) {
      toast.error(lang === 'ja' ? 'イベントとセッションを選択してください' : 'Please select an event and session first');
      return;
    }

    setLoading(true);
    try {
      const body = { qr_code: code.trim() };
      if (stage === 'stage1') body.event_id   = selectedEvent;
      if (stage === 'stage2') body.session_id = selectedSession;

      const res = await api.post(ENDPOINTS[stage], body);
      const data = res.data;
      setResult(data);
      setHistory(prev => [{
        ...data,
        stage,
        time: new Date(),
        code,
        sessionTitle: data.session_title || sessions.find(s => s.id === parseInt(selectedSession))?.title,
      }, ...prev.slice(0, 49)]);
      toast.success(data.message);
    } catch (err) {
      const errData = err.response?.data || { status: 'ERROR', error: err.message };
      setResult(errData);
      setHistory(prev => [{ ...errData, stage, time: new Date(), code, isError: true }, ...prev.slice(0, 49)]);
      // Don't toast on cooldown — modal explains it
      if (errData.status !== 'COOLDOWN_ACTIVE') toast.error(errData.error || errData.message);
    } finally {
      setLoading(false);
      setManualCode('');
    }
  };

  const activeStage = STAGES.find(s => s.id === stage);

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Stage toggle */}
      <div className="border border-slate-200 bg-white rounded-2xl p-1.5 flex flex-wrap sm:flex-nowrap gap-1.5 shadow-sm max-w-3xl mx-auto">
        {STAGES.map((s) => (
          <motion.button key={s.id} onClick={() => setStage(s.id)} whileHover={{ scale: 1.01 }}
            className={`flex-1 min-w-[100px] py-3 px-2 sm:px-4 rounded-xl text-[12px] sm:text-[13px] font-semibold transition-all flex items-center justify-center gap-2
              ${stage === s.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
            <span className="text-[12px] font-bold">{s.icon}</span>
            <span className="truncate">{lang === 'ja' ? t(s.id === 'stage1' ? 'event_arrival' : s.id === 'stage2' ? 'venue_checkin' : 'speaker_verify') : s.label}</span>
          </motion.button>
        ))}
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-5 gap-6">
        {/* Scanner area */}
        <div className="lg:col-span-3 space-y-5">
          <div className="border border-slate-200 bg-white rounded-3xl p-6 shadow-sm">

            {/* Input mode tabs */}
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => setInputMode('manual')}
                className={`flex items-center gap-2 px-4 py-2 text-[13px] rounded-xl border transition-all font-medium whitespace-nowrap
                  ${inputMode === 'manual' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                <Keyboard size={14} strokeWidth={2} /> {t('manual_entry')}
              </button>
              <button onClick={() => setInputMode('qr')}
                className={`flex items-center gap-2 px-4 py-2 text-[13px] rounded-xl border transition-all font-medium whitespace-nowrap
                  ${inputMode === 'qr' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                <QrCode size={14} strokeWidth={2} /> {t('camera_qr')}
              </button>
              <div className={`ml-auto flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-sm border ${loading ? 'border-amber-200 bg-amber-50 text-amber-600' : 'border-green-200 bg-green-50 text-green-600'}`}>
                <Wifi size={10} strokeWidth={1.5} /> {loading ? t('processing') : t('active')}
              </div>
            </div>

            {/* Dropdowns (event / session selectors) */}
            <SelectorRow
              stage={stage}
              events={events}
              selectedEvent={selectedEvent}
              setSelectedEvent={setSelectedEvent}
              sessions={sessions}
              selectedSession={selectedSession}
              setSelectedSession={setSelectedSession}
              lang={lang}
            />

            {/* Input area */}
            {inputMode === 'manual' ? (
              <div className="space-y-3">
                <div className="relative">
                  <ScanLine size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.5} />
                  <input type="text" value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && processCheckin(manualCode)}
                    placeholder={t('manual_entry_desc')}
                    className="w-full pl-11 pr-4 py-3.5 text-[14px] border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all font-mono shadow-inner"
                    disabled={loading} autoFocus
                  />
                </div>
                <motion.button onClick={() => processCheckin(manualCode)}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  disabled={loading || !manualCode.trim()}
                  className="w-full py-3 bg-slate-900 text-white text-[14px] font-semibold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 transition-all shadow-md hover:bg-slate-800">
                  {loading
                    ? <div className="w-5 h-5 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                    : <><CheckCircle2 size={14} strokeWidth={2} /> {t('process_checkin')}</>}
                </motion.button>
              </div>
            ) : (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-tr from-slate-200 to-slate-100 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
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

          {/* Stage description */}
          <div className="border border-slate-200 bg-slate-50/50 rounded-2xl px-6 py-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="text-[20px]">{activeStage?.icon}</div>
              <div>
                <div className="text-[13px] font-semibold text-[#111827]">{activeStage?.label}</div>
                <div className="text-[11px] text-[#9CA3AF] mt-0.5">
                  {stage === 'stage1' && (lang === 'ja' ? 'イベントを選択してQRコードをスキャンし、イベント受付を処理します。' : 'Select an event, then scan the participant QR code to record event arrival.')}
                  {stage === 'stage2' && (lang === 'ja' ? 'イベントとセッションを選択してスキャン。1回目は入場、3分後の2回目は退場として記録されます。' : 'Select event and session. First scan = entry, second scan (after 3 min cooldown) = exit.')}
                  {stage === 'stage3' && (lang === 'ja' ? '座長・スピーカー役割の参加者のみ認証できます。' : 'Only participants registered as Chairperson or Speaker can be verified.')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History panel */}
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
                history.map((h, i) => {
                  const statusConfig = STATUS_MAP[h.status] || STATUS_MAP.ERROR;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                      className="px-4 py-3 flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-sm flex-shrink-0 flex items-center justify-center mt-0.5 border ${statusConfig.bg}`}>
                        {h.status === 'SUCCESS' || h.status === 'ENTRY' ? <CheckCircle2 size={10} className="text-green-600" />
                         : h.status === 'EXIT'         ? <LogOut      size={10} className="text-blue-600"   />
                         : h.status === 'COOLDOWN_ACTIVE' ? <Timer    size={10} className="text-orange-600" />
                         : h.status === 'ALREADY_CHECKED_IN' ? <AlertTriangle size={10} className="text-amber-600" />
                         : <XCircle size={10} className="text-red-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium text-[#374151] truncate">
                          {h.participant?.name || h.code || 'Unknown'}
                        </div>
                        <div className="text-[10px] text-[#9CA3AF] flex items-center gap-1 flex-wrap">
                          <Clock size={9} />
                          {h.time?.toLocaleTimeString(lang === 'ja' ? 'ja-JP' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          <span className="mx-1">·</span>
                          {STAGES.find(s => s.id === h.stage)?.label}
                          {h.sessionTitle && <><span className="mx-1">·</span>{h.sessionTitle}</>}
                        </div>
                      </div>
                      <ChevronRight size={12} className="text-[#CBD5E1] flex-shrink-0 mt-1" />
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <FeedbackModal result={result} onClose={() => setResult(null)} />
    </div>
  );
}
