import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import {
  MonitorPlay, Users, Clock, LogIn, LogOut, AlertTriangle,
  RefreshCw, Shield, Timer, Activity, MapPin, Mic2,
  ArrowLeft, CheckCircle2, Zap, TrendingUp
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';

/* ── Animated number ── */
function AnimatedNumber({ value }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 90, damping: 20 });
  const [display, setDisplay] = useState(0);
  useEffect(() => { mv.set(value); }, [value]);
  useEffect(() => spring.on('change', v => setDisplay(Math.round(v))), [spring]);
  return <>{display}</>;
}

/* ── Guard countdown badge ── */
function GuardBadge({ expiresAt }) {
  const { lang } = useLanguage();
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const update = () => setRemaining(Math.max(0, Math.ceil((new Date(expiresAt) - Date.now()) / 1000)));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  if (remaining <= 0) return null;
  const mins = Math.floor(remaining / 60), secs = remaining % 60;
  return (
    <motion.span
      animate={{ opacity: [1, 0.6, 1] }}
      transition={{ duration: 1.2, repeat: Infinity }}
      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 font-bold tabular-nums"
    >
      <Timer size={9} />
      {mins}:{secs.toString().padStart(2, '0')}
      <span className="font-normal opacity-70">{lang === 'ja' ? '残' : 'left'}</span>
    </motion.span>
  );
}

/* ── Guard force-exit modal ── */
function GuardWarningModal({ show, onClose, onForce, guardInfo }) {
  const { t } = useLanguage();
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-[3px] flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
        >
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* drag handle mobile */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-8 h-1 bg-slate-200 rounded-full" />
            </div>
            {/* amber top strip */}
            <motion.div
              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: 'left' }}
              className="h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400"
            />
            <div className="p-5 sm:p-6">
              <motion.div
                initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex items-start gap-3 mb-4"
              >
                <motion.div
                  animate={{ rotate: [-3, 3, -3] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                  className="w-10 h-10 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center flex-shrink-0"
                >
                  <Shield size={18} className="text-amber-600" strokeWidth={1.5} />
                </motion.div>
                <div>
                  <p className="text-[14px] font-black text-slate-900">{t('guard_active_title')}</p>
                  <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">
                    {t('guard_active_desc')}
                    {guardInfo?.remaining_seconds && (
                      <span className="font-bold text-amber-600"> {guardInfo.remaining_seconds}s {t('remaining')}.</span>
                    )}
                  </p>
                </div>
              </motion.div>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-5">{t('guard_long_desc')}</p>
              <div className="flex gap-2.5">
                <motion.button whileTap={{ scale: 0.96 }} onClick={onClose}
                  className="flex-1 py-2.5 text-[13px] border border-slate-200 rounded-xl hover:bg-slate-50 font-semibold text-slate-600">
                  {t('dismiss')}
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }} onClick={onForce}
                  className="flex-1 py-2.5 text-[13px] bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold flex items-center justify-center gap-1.5">
                  <AlertTriangle size={12} /> {t('force_exit')}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Pulse dot ── */
function PulseDot({ active, size = 'sm' }) {
  if (!active) return <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />;
  return (
    <span className="relative flex h-2 w-2 flex-shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
  );
}

/* ── Capacity bar ── */
function CapacityBar({ current, max }) {
  const pct = max ? Math.min(100, Math.round((current / max) * 100)) : 0;
  const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-slate-800';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className={`h-full rounded-full ${color} relative overflow-hidden`}
        >
          {/* shimmer */}
          <motion.div
            initial={{ x: '-100%' }} animate={{ x: '200%' }}
            transition={{ delay: 1, duration: 0.7, ease: 'easeInOut' }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          />
        </motion.div>
      </div>
      <span className="text-[11px] font-bold text-slate-700 tabular-nums w-8 text-right">{pct}%</span>
    </div>
  );
}

/* ── Status config ── */
const SS = {
  active:    { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', pulse: true  },
  upcoming:  { pill: 'bg-blue-50 text-blue-600 border-blue-200',          dot: 'bg-blue-400',    pulse: false },
  completed: { pill: 'bg-slate-100 text-slate-500 border-slate-200',      dot: 'bg-slate-400',   pulse: false },
};
const ss = s => SS[s] || SS.completed;

/* ── Session list item ── */
function SessionListItem({ s, isSelected, onClick, t }) {
  const cfg = ss(s.status);
  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 transition-all border-b border-slate-700/30 last:border-0 relative overflow-hidden
        ${isSelected ? 'bg-slate-700' : 'hover:bg-slate-800/60'}`}
    >
      {/* selected indicator */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            layoutId="session-indicator"
            initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} exit={{ scaleY: 0 }}
            className="absolute left-0 top-0 bottom-0 w-0.5 bg-white rounded-r-full"
          />
        )}
      </AnimatePresence>

      <div className="flex items-start gap-2.5 pl-1">
        <PulseDot active={s.status === 'active'} />
        <div className="flex-1 min-w-0 mt-px">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className={`text-[12px] font-bold leading-snug truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
              {s.title}
            </span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0
              ${isSelected ? 'bg-white/10 text-white/80 border-white/20' : cfg.pill}`}>
              {t(s.status)}
            </span>
          </div>
          <div className={`flex items-center gap-2 text-[10px] ${isSelected ? 'text-white/50' : 'text-slate-500'}`}>
            <span className="flex items-center gap-1 flex-shrink-0"><MapPin size={9} />{s.room || '—'}</span>
            <span className="flex items-center gap-1 flex-shrink-0"><Users size={9} />{s.attendee_count}</span>
          </div>
          <div className={`text-[10px] mt-0.5 tabular-nums ${isSelected ? 'text-white/40' : 'text-slate-500'}`}>
            {new Date(s.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            {' – '}
            {new Date(s.end_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

/* ── Stat chip ── */
function StatChip({ icon: Icon, value, label, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 400 }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold ${color}`}
    >
      <Icon size={11} />
      <AnimatedNumber value={value} />
      <span className="font-normal opacity-80">{label}</span>
    </motion.div>
  );
}

/* ── Attendee row ── */
function AttendeeRow({ attendee, index, t, lang, onCheckout }) {
  const isInside = !attendee.exit_time;
  const roleStyle = {
    speaker:     'bg-violet-50 text-violet-700 border-violet-200',
    chairperson: 'bg-amber-50 text-amber-700 border-amber-200',
  }[attendee.role] || 'bg-slate-100 text-slate-600 border-slate-200';

  const durationSecs = isInside ? (attendee.seconds_in || 0) : (attendee.duration_seconds || 0);
  const durMin = Math.floor(durationSecs / 60), durSec = durationSecs % 60;

  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, type: 'spring', stiffness: 300, damping: 25 }}
      className={`group border-b border-slate-50 transition-colors
        ${isInside ? 'hover:bg-slate-50/80' : 'opacity-55 hover:opacity-75 hover:bg-slate-50/40'}`}
    >
      {/* Name */}
      <td className="px-3 sm:px-4 py-3">
        <div className="flex items-center gap-2.5">
          <motion.div
            whileHover={{ scale: 1.12, rotate: 3 }}
            transition={{ type: 'spring', stiffness: 400 }}
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black flex-shrink-0 border
              ${isInside ? 'bg-slate-900 text-white border-slate-800' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
          >
            {attendee.name?.charAt(0)}
          </motion.div>
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-slate-800 truncate leading-tight">{attendee.name}</p>
            {attendee.organization && (
              <p className="text-[10px] text-slate-400 truncate">{attendee.organization}</p>
            )}
          </div>
        </div>
      </td>

      {/* Role */}
      <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">
        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleStyle}`}>
          {t(attendee.role)}
        </span>
      </td>

      {/* Status */}
      <td className="px-3 sm:px-4 py-3 hidden md:table-cell">
        <motion.span
          animate={isInside ? { opacity: [1, 0.7, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border
            ${isInside ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isInside ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {isInside ? (t('in_session') || 'In Session') : (t('exited') || 'Exited')}
        </motion.span>
      </td>

      {/* Entry time */}
      <td className="px-3 sm:px-4 py-3 hidden lg:table-cell">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <LogIn size={10} className="text-emerald-500 flex-shrink-0" strokeWidth={2} />
          <span className="tabular-nums">
            {new Date(attendee.entry_time).toLocaleTimeString(lang === 'ja' ? 'ja-JP' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </td>

      {/* Duration */}
      <td className="px-3 sm:px-4 py-3">
        <div className="flex items-center gap-1 text-[11px] text-slate-500">
          <Clock size={10} className="flex-shrink-0" strokeWidth={1.5} />
          <span className="tabular-nums font-semibold">{durMin}m {durSec}s</span>
        </div>
      </td>

      {/* Guard */}
      <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">
        {attendee.guard_active
          ? <GuardBadge expiresAt={attendee.guard_expires_at} />
          : <span className="text-[10px] text-slate-300">—</span>}
      </td>

      {/* Action */}
      <td className="px-3 sm:px-4 py-3">
        {isInside ? (
          <motion.button
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => onCheckout(attendee.participant_id)}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded-lg font-bold border transition-all
              ${attendee.guard_active
                ? 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100'
                : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-900 hover:text-white hover:border-slate-900'}`}
          >
            <LogOut size={10} strokeWidth={2} />
            <span className="hidden sm:inline">{attendee.guard_active ? t('guard') : t('check_out')}</span>
          </motion.button>
        ) : (
          <span className="text-[11px] text-slate-300">—</span>
        )}
      </td>
    </motion.tr>
  );
}

/* ── Main Sessions page ── */
export default function Sessions() {
  const { t, lang } = useLanguage();
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [guardWarning, setGuardWarning] = useState({ show: false, participantId: null, info: null });
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [mobileView, setMobileView] = useState('list');

  useEffect(() => { loadEvents(); }, []);
  useEffect(() => { loadSessions(); }, [selectedEvent]);
  useEffect(() => { if (selected) loadSessionDetail(selected.id); }, [selected]);
  useEffect(() => {
    if (!selected) return;
    const id = setInterval(() => loadSessionDetail(selected.id, true), 15000);
    return () => clearInterval(id);
  }, [selected]);

  const loadEvents = async () => {
    try { const res = await api.get('/events'); setEvents(res.data); } catch {}
  };

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sessions', { params: { event_id: selectedEvent || undefined } });
      setSessions(res.data);
      if (res.data.length > 0) {
        if (!selected || !res.data.find(s => s.id === selected.id)) setSelected(res.data[0]);
      } else { setSelected(null); setSessionDetail(null); }
    } catch { toast.error(t('failed_load_sessions')); }
    finally { setLoading(false); }
  };

  const loadSessionDetail = async (id, silent = false) => {
    if (!silent) setDetailLoading(true);
    try { const res = await api.get(`/sessions/${id}`); setSessionDetail(res.data); }
    catch { if (!silent) toast.error(t('failed_load_details')); }
    finally { setDetailLoading(false); }
  };

  const handleCheckout = async (participantId, force = false) => {
    try {
      await api.post(`/sessions/${selected.id}/exit`, { participant_id: participantId, force });
      toast.success(t('checkout_success'));
      setGuardWarning({ show: false, participantId: null, info: null });
      loadSessionDetail(selected.id);
    } catch (err) {
      const data = err.response?.data;
      if (data?.error === 'GUARD_ACTIVE') setGuardWarning({ show: true, participantId, info: data });
      else toast.error(data?.error || t('checkout_failed'));
    }
  };

  const handleSelectSession = (s) => { setSelected(s); setMobileView('detail'); };
  const insideCount = sessionDetail?.attendees?.filter(a => !a.exit_time).length || 0;
  const totalCount  = sessionDetail?.attendees?.length || 0;
  const cfg = selected ? ss(selected.status) : null;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
        className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full"
      />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-0"
    >
      <div className="flex gap-0 lg:gap-5">

        {/* ════ SESSION LIST — dark sidebar ════ */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className={`w-full lg:w-72 flex-shrink-0 ${mobileView === 'detail' ? 'hidden lg:block' : 'block'}`}
        >
          <div className="border border-slate-700 bg-slate-900 rounded-2xl overflow-hidden shadow-xl">
            {/* Panel header */}
            <div className="px-4 py-3.5 border-b border-slate-700/60">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-black text-white flex items-center gap-2">
                  <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Activity size={12} className="text-emerald-400" />
                  </motion.span>
                  {t('sessions')}
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring', stiffness: 500 }}
                    className="text-slate-500 font-normal"
                  >
                    ({sessions.length})
                  </motion.span>
                </span>
              </div>
              <select
                value={selectedEvent}
                onChange={e => setSelectedEvent(e.target.value)}
                className="w-full text-[11px] border border-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-slate-500 bg-slate-800 text-slate-200 font-medium"
              >
                <option value="">{t('all_events') || 'All Events'}</option>
                {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>

            {/* Session list */}
            <div className="divide-y-0 max-h-[70vh] overflow-y-auto">
              {sessions.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-10 text-center">
                  <MonitorPlay size={22} strokeWidth={1} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-[12px] text-slate-500">{t('no_sessions_found')}</p>
                </motion.div>
              ) : (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
                >
                  {sessions.map(s => (
                    <SessionListItem
                      key={s.id} s={s}
                      isSelected={selected?.id === s.id}
                      onClick={() => handleSelectSession(s)}
                      t={t}
                    />
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ════ DETAIL PANEL ════ */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className={`flex-1 min-w-0 space-y-4 ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}
        >
          {/* Mobile back */}
          <motion.button
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setMobileView('list')}
            className="lg:hidden flex items-center gap-2 text-[13px] font-bold text-slate-600 hover:text-slate-900 transition-colors mb-1"
          >
            <ArrowLeft size={15} strokeWidth={2} /> {t('sessions')}
          </motion.button>

          {!sessionDetail ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="border border-dashed border-slate-200 bg-slate-50 rounded-2xl p-16 text-center"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <MonitorPlay size={28} strokeWidth={1} className="mx-auto text-slate-300 mb-3" />
              </motion.div>
              <p className="text-[13px] font-semibold text-slate-400">{t('select_session_monitor')}</p>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={sessionDetail.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4"
              >
                {/* Session header card */}
                <div className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm">
                  {/* Animated accent */}
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    style={{ transformOrigin: 'left' }}
                    className={`h-0.5 ${cfg?.pulse ? 'bg-emerald-400' : 'bg-slate-200'}`}
                  />
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <PulseDot active={sessionDetail.status === 'active'} />
                          <h2 className="text-[15px] sm:text-[17px] font-black text-slate-900 leading-tight">
                            {sessionDetail.title}
                          </h2>
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.1, type: 'spring', stiffness: 500 }}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg?.pill}`}
                          >
                            {t(sessionDetail.status)}
                          </motion.span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1.5"><MapPin size={11} className="text-slate-400" />{sessionDetail.room || t('no_room')}</span>
                          <span className="flex items-center gap-1.5"><Mic2 size={11} className="text-slate-400" />{sessionDetail.speaker_name || sessionDetail.speaker_names || t('no_speaker')}</span>
                          <span className="flex items-center gap-1.5 tabular-nums">
                            <Clock size={11} className="text-slate-400" />
                            {new Date(sessionDetail.start_time).toLocaleTimeString(lang === 'ja' ? 'ja-JP' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
                            {' – '}
                            {new Date(sessionDetail.end_time).toLocaleTimeString(lang === 'ja' ? 'ja-JP' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Capacity number */}
                      <div className="flex-shrink-0 text-right min-w-[100px]">
                        <motion.div
                          key={insideCount}
                          initial={{ scale: 1.2, color: '#16a34a' }}
                          animate={{ scale: 1, color: '#0f172a' }}
                          transition={{ duration: 0.4 }}
                          className="text-[28px] sm:text-[32px] font-black leading-none tabular-nums"
                        >
                          <AnimatedNumber value={insideCount} />
                        </motion.div>
                        <div className="text-[11px] text-slate-400 mb-2">/ {sessionDetail.capacity} {t('capacity')}</div>
                        <CapacityBar current={insideCount} max={sessionDetail.capacity} />
                      </div>
                    </div>

                    {/* Stat chips */}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100"
                    >
                      <StatChip icon={Users}       value={insideCount}           label={t('in_session') || 'inside'} color="bg-emerald-50 border-emerald-100 text-emerald-700" delay={0.25} />
                      <StatChip icon={CheckCircle2} value={totalCount - insideCount} label={t('exited') || 'exited'}  color="bg-slate-100 border-slate-200 text-slate-600"    delay={0.30} />
                      <StatChip icon={Activity}    value={totalCount}            label={t('total') || 'total'}     color="bg-blue-50 border-blue-100 text-blue-700"         delay={0.35} />
                    </motion.div>
                  </div>
                </div>

                {/* Attendees table */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.35 }}
                  className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                    <span className="text-[13px] font-black text-slate-800 flex items-center gap-2">
                      <Users size={13} strokeWidth={1.5} className="text-slate-400" />
                      {t('attendees')}
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                      onClick={() => loadSessionDetail(selected.id)}
                      disabled={detailLoading}
                      className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-900 border border-slate-200 px-2.5 py-1.5 rounded-xl hover:bg-white transition-all font-semibold"
                    >
                      <motion.span
                        animate={detailLoading ? { rotate: 360 } : {}}
                        transition={{ duration: 0.7, repeat: detailLoading ? Infinity : 0, ease: 'linear' }}
                      >
                        <RefreshCw size={11} strokeWidth={1.5} />
                      </motion.span>
                      <span className="hidden sm:inline">{t('refresh')}</span>
                    </motion.button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/40">
                          {[
                            { label: t('name'),       cls: '' },
                            { label: t('role'),        cls: 'hidden sm:table-cell' },
                            { label: t('status'),      cls: 'hidden md:table-cell' },
                            { label: t('entry_time'),  cls: 'hidden lg:table-cell' },
                            { label: t('duration'),    cls: '' },
                            { label: t('guard'),       cls: 'hidden sm:table-cell' },
                            { label: t('actions'),     cls: '' },
                          ].map(({ label, cls }, i) => (
                            <motion.th
                              key={label}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.1 + i * 0.03 }}
                              className={`px-3 sm:px-4 py-2.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap ${cls}`}
                            >
                              {label}
                            </motion.th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence>
                          {(sessionDetail.attendees || []).length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-12 text-center">
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                  <Users size={24} strokeWidth={1} className="mx-auto text-slate-300 mb-2" />
                                  <p className="text-[13px] text-slate-400">{t('no_active_attendees')}</p>
                                </motion.div>
                              </td>
                            </tr>
                          ) : (
                            (sessionDetail.attendees || []).map((attendee, i) => (
                              <AttendeeRow
                                key={attendee.id}
                                attendee={attendee}
                                index={i}
                                t={t}
                                lang={lang}
                                onCheckout={handleCheckout}
                              />
                            ))
                          )}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          )}
        </motion.div>
      </div>

      <GuardWarningModal
        show={guardWarning.show}
        guardInfo={guardWarning.info}
        onClose={() => setGuardWarning({ show: false, participantId: null, info: null })}
        onForce={() => handleCheckout(guardWarning.participantId, true)}
      />
    </motion.div>
  );
}