import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import {
  CalendarDays, Plus, ChevronRight, ChevronDown,
  Trash2, Edit2, AlertCircle, X, MapPin, Users,
  Layers, Clock, Mic2, Shield, Sparkles
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import DatePicker from '../components/ui/DatePicker';
import DateTimePicker from '../components/ui/DateTimePicker';

/* ── Status config ── */
const STATUS_CFG = {
  active:    { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', pulse: true  },
  upcoming:  { pill: 'bg-blue-50 text-blue-600 border-blue-200',          dot: 'bg-blue-400',    pulse: false },
  completed: { pill: 'bg-slate-100 text-slate-500 border-slate-200',      dot: 'bg-slate-400',   pulse: false },
  cancelled: { pill: 'bg-red-50 text-red-500 border-red-200',             dot: 'bg-red-400',     pulse: false },
};
const sc = (s) => STATUS_CFG[s] || STATUS_CFG.completed;

/* ── Input styles ── */
const inputCls = 'w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all placeholder:text-slate-300';

/* ── Field wrapper ── */
const Field = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</label>
    {children}
  </div>
);

/* ── Pulse dot ── */
function PulseDot({ active }) {
  if (!active) return <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />;
  return (
    <span className="relative flex h-2 w-2 flex-shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
  );
}

/* ── Tag Input ── */
function TagInput({ label, value, onChange, placeholder, lang }) {
  const [inputValue, setInputValue] = useState('');

  const addTag = () => {
    const tag = inputValue.trim();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
  };

  return (
    <Field label={label}>
      <div className="min-h-[44px] flex flex-wrap items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl bg-white focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100 transition-all">
        <AnimatePresence>
          {value.map((tag, i) => (
            <motion.span
              key={tag}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="flex items-center gap-1 px-2 py-0.5 bg-slate-900 text-white text-[11px] rounded-lg font-semibold"
            >
              {tag}
              <button type="button" onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="hover:text-red-300 transition-colors ml-0.5">
                <X size={9} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          type="text" value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[60px] bg-transparent text-[12px] focus:outline-none"
        />
      </div>
      <p className="text-[10px] text-slate-400">{lang === 'ja' ? 'Enterまたはカンマで追加' : 'Press Enter or , to add'}</p>
    </Field>
  );
}

/* ── Modal shell ── */
function ModalShell({ title, onClose, children, size = 'max-w-lg' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 backdrop-blur-[3px] flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className={`bg-white w-full ${size} rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {/* drag handle mobile */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 sm:px-6 pt-4 pb-3 border-b border-slate-100">
          <h3 className="text-[15px] font-black text-slate-900 tracking-tight">{title}</h3>
          <motion.button
            whileHover={{ rotate: 90, scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400 }}
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X size={14} strokeWidth={2} />
          </motion.button>
        </div>
        <div className="px-5 sm:px-6 py-4 overflow-y-auto max-h-[80vh] sm:max-h-[75vh]">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Event Modal ── */
function EventModal({ event, onClose, onSaved }) {
  const { t, lang } = useLanguage();
  const isEdit = !!event?.id;
  const [form, setForm] = useState({
    name: event?.name || '', description: event?.description || '',
    start_date: event?.start_date?.slice(0, 10) || '', end_date: event?.end_date?.slice(0, 10) || '',
    venue: event?.venue || '', capacity: event?.capacity || '', status: event?.status || 'upcoming',
  });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (isEdit) await api.put(`/events/${event.id}`, form);
      else await api.post('/events', form);
      toast.success(t('success')); onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || t('error')); }
    finally { setLoading(false); }
  };

  return (
    <ModalShell title={isEdit ? t('edit_event') : t('new_event')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={`${t('event_name')} *`}>
          <input className={inputCls} value={form.name} onChange={set('name')} required />
        </Field>
        <Field label={t('event_description')}>
          <textarea rows={2} className={`${inputCls} resize-none`} value={form.description} onChange={set('description')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <DatePicker label={`${t('start_date')} *`} value={form.start_date}
            onChange={v => setForm(f => ({ ...f, start_date: v }))} placeholder={t('start_date')} lang={lang} />
          <DatePicker label={`${t('end_date')} *`} value={form.end_date}
            onChange={v => setForm(f => ({ ...f, end_date: v }))} placeholder={t('end_date')}
            minDate={form.start_date || undefined} lang={lang} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('venue')}><input className={inputCls} value={form.venue} onChange={set('venue')} /></Field>
          <Field label={t('capacity')}><input type="number" className={inputCls} value={form.capacity} onChange={set('capacity')} /></Field>
        </div>
        {isEdit && (
          <Field label={t('status')}>
            <select value={form.status} onChange={set('status')} className={inputCls}>
              {['upcoming', 'active', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{t(s)}</option>)}
            </select>
          </Field>
        )}
        <div className="flex gap-2 pt-1">
          <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={onClose}
            className="flex-1 py-2.5 text-[13px] border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-semibold text-slate-600">
            {t('cancel')}
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading}
            className="flex-1 py-2.5 text-[13px] bg-slate-900 text-white rounded-xl font-bold transition-all hover:bg-slate-700 disabled:opacity-40 relative overflow-hidden">
            {loading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mx-auto" />
            ) : (isEdit ? t('save') : t('create_event'))}
          </motion.button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ── SubEvent Modal ── */
function SubEventModal({ eventId, subEvent, onClose, onSaved }) {
  const { t } = useLanguage();
  const isEdit = !!subEvent?.id;
  const [form, setForm] = useState({ name: subEvent?.name || '', venue_room: subEvent?.venue_room || '', capacity: subEvent?.capacity || '' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (isEdit) await api.put(`/events/${eventId}/sub-events/${subEvent.id}`, { ...form, status: subEvent.status || 'upcoming' });
      else await api.post(`/events/${eventId}/sub-events`, form);
      toast.success(t('success')); onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || t('error')); }
    finally { setLoading(false); }
  };

  return (
    <ModalShell title={isEdit ? t('edit_sub_event') : t('new_sub_event')} onClose={onClose} size="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={`${t('name')} *`}><input className={inputCls} value={form.name} onChange={set('name')} required /></Field>
        <Field label={t('room_location')}><input className={inputCls} value={form.venue_room} onChange={set('venue_room')} /></Field>
        <Field label={t('capacity')}><input type="number" className={inputCls} value={form.capacity} onChange={set('capacity')} /></Field>
        <div className="flex gap-2 pt-1">
          <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={onClose}
            className="flex-1 py-2.5 text-[13px] border border-slate-200 rounded-xl hover:bg-slate-50 font-semibold text-slate-600">{t('cancel')}</motion.button>
          <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading}
            className="flex-1 py-2.5 text-[13px] bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-700 disabled:opacity-40">
            {loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mx-auto" /> : t('save')}
          </motion.button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ── Session Modal ── */
function SessionModal({ eventId, subEventId, session, onClose, onSaved }) {
  const { t, lang } = useLanguage();
  const isEdit = !!session?.id;
  const toLocalDT = (dt) => { if (!dt) return ''; const d = new Date(dt); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  const parseTags = (str) => str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];

  const [form, setForm] = useState({
    title: session?.title || '',
    speaker_names: parseTags(session?.speaker_names || session?.speaker_name || ''),
    chairperson_names: parseTags(session?.chairperson_names || ''),
    room: session?.room || '',
    start_time: session?.start_time ? toLocalDT(session.start_time) : '',
    end_time: session?.end_time ? toLocalDT(session.end_time) : '',
    capacity: session?.capacity != null ? session.capacity : '',
  });
  const [loading, setLoading] = useState(false);
  const timeInvalid = form.start_time && form.end_time && new Date(form.end_time) <= new Date(form.start_time);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (timeInvalid) { toast.error(lang === 'ja' ? '終了時間は開始時間より後にしてください' : 'End time must be after start time'); return; }
    setLoading(true);
    try {
      const toUTC = dt => dt ? new Date(dt).toISOString() : '';
      const payload = {
        ...form,
        speaker_names: form.speaker_names.join(', '),
        chairperson_names: form.chairperson_names.join(', '),
        start_time: toUTC(form.start_time), end_time: toUTC(form.end_time),
        event_id: eventId, sub_event_id: subEventId,
      };
      if (isEdit) await api.put(`/sessions/${session.id}`, payload);
      else await api.post('/sessions', payload);
      toast.success(isEdit ? t('session_updated') : t('session_created')); onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || t('failed_save_session')); }
    finally { setLoading(false); }
  };

  return (
    <ModalShell title={isEdit ? t('edit_session') : t('new_session')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={`${t('session_title')} *`}>
          <input className={inputCls} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TagInput label={t('speakers')} value={form.speaker_names} onChange={v => setForm(f => ({ ...f, speaker_names: v }))} placeholder="e.g. Tanaka" lang={lang} />
          <TagInput label={t('chairs')} value={form.chairperson_names} onChange={v => setForm(f => ({ ...f, chairperson_names: v }))} placeholder="e.g. Yamamoto" lang={lang} />
        </div>
        <Field label={t('room_location')}>
          <input className={inputCls} value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <DateTimePicker label={`${t('start_time')} *`} value={form.start_time}
            onChange={v => setForm(f => ({ ...f, start_time: v }))} placeholder={t('start_time')} lang={lang} />
          <DateTimePicker label={`${t('end_time')} *`} value={form.end_time}
            onChange={v => setForm(f => ({ ...f, end_time: v }))} placeholder={t('end_time')}
            minDateTime={form.start_time || undefined} lang={lang} />
        </div>
        <AnimatePresence>
          {timeInvalid && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-[12px] text-red-600 font-semibold"
            >
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{lang === 'ja' ? '終了時間は開始時間より後にしてください' : 'End time must be after start time'}</span>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="w-full sm:w-1/2">
          <Field label={t('capacity')}>
            <input type="number" className={inputCls} value={form.capacity}
              placeholder={t('unlimited') || 'Unlimited'}
              onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
          </Field>
        </div>
        <div className="flex gap-2 pt-1">
          <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={onClose}
            className="flex-1 py-2.5 text-[13px] border border-slate-200 rounded-xl font-semibold text-slate-600">{t('cancel')}</motion.button>
          <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading || timeInvalid}
            className="flex-1 py-2.5 text-[13px] bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-700 disabled:opacity-40">
            {loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mx-auto" /> : isEdit ? t('save') : t('create_event')}
          </motion.button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ── Session card ── */
function SessionCard({ session, lang, t, isManager, onEdit, onDelete }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      whileHover={{ y: -1, shadow: 'md' }}
      className="group flex items-start gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition-all"
    >
      <div className="w-0.5 self-stretch bg-gradient-to-b from-slate-300 to-transparent rounded-full flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-slate-800 leading-tight truncate">{session.title}</p>
        <div className="mt-1.5 space-y-0.5">
          {(session.speaker_names || session.speaker_name) && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Mic2 size={10} className="flex-shrink-0 text-slate-400" />
              <span className="truncate">{session.speaker_names || session.speaker_name}</span>
            </div>
          )}
          {session.chairperson_names && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Shield size={10} className="flex-shrink-0 text-slate-400" />
              <span className="truncate">{session.chairperson_names}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-0.5">
            <Clock size={10} className="flex-shrink-0" />
            <span className="tabular-nums">
              {new Date(session.start_time).toLocaleTimeString(lang === 'ja' ? 'ja-JP' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
              {' – '}
              {new Date(session.end_time).toLocaleTimeString(lang === 'ja' ? 'ja-JP' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
      {isManager && (
        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onEdit}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all">
            <Edit2 size={11} strokeWidth={2} />
          </motion.button>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onDelete}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all">
            <Trash2 size={11} strokeWidth={2} />
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

/* ── Sub-event section ── */
function SubEventSection({ se, eventId, sessions, isManager, t, lang, onEditSub, onDeleteSub, onAddSession, onEditSession, onDeleteSession }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="rounded-2xl border border-slate-200 overflow-hidden bg-white"
    >
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
        <div className="w-1 h-8 bg-slate-800 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-slate-800 truncate">{se.name}</p>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
            {se.venue_room && <span className="flex items-center gap-1"><MapPin size={9} />{se.venue_room}</span>}
            {se.capacity  && <span className="flex items-center gap-1"><Users size={9} />{se.capacity}</span>}
          </div>
        </div>
        {isManager && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} onClick={onAddSession}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-700 transition-all">
              <Plus size={10} strokeWidth={2.5} />
              <span className="hidden sm:inline">{t('session')}</span>
            </motion.button>
            <motion.button whileHover={{ scale: 1.1, backgroundColor: '#111827', color: '#fff' }} whileTap={{ scale: 0.9 }}
              onClick={onEditSub}
              className="p-1.5 rounded-lg text-slate-400 border border-transparent hover:border-slate-200 transition-all">
              <Edit2 size={12} strokeWidth={2} />
            </motion.button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onDeleteSub}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all">
              <Trash2 size={12} strokeWidth={2} />
            </motion.button>
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        <AnimatePresence>
          {sessions?.length > 0 ? sessions.map(session => (
            <SessionCard key={session.id} session={session} lang={lang} t={t} isManager={isManager}
              onEdit={() => onEditSession(session, se.id)} onDelete={() => onDeleteSession(session)} />
          )) : (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-[11px] text-slate-400 text-center py-3">{t('no_sessions')}</motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ── Event row ── */
function EventRow({ event, onRefresh, index }) {
  const { t, lang } = useLanguage();
  const { isManager } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [subEvents, setSubEvents] = useState([]);
  const [sessionsBySubEvent, setSessionsBySubEvent] = useState({});
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [modal, setModal] = useState(null);
  const cfg = sc(event.status);

  const handleExpand = async () => {
    if (!expanded) {
      setLoadingSubs(true);
      try {
        const [subsRes, sessionsRes] = await Promise.all([
          api.get(`/events/${event.id}/sub-events`),
          api.get(`/sessions?event_id=${event.id}`)
        ]);
        setSubEvents(subsRes.data);
        const grouped = sessionsRes.data.reduce((acc, s) => {
          if (!acc[s.sub_event_id]) acc[s.sub_event_id] = [];
          acc[s.sub_event_id].push(s);
          return acc;
        }, {});
        setSessionsBySubEvent(grouped);
      } catch (err) { console.error(err); }
      finally { setLoadingSubs(false); }
    }
    setExpanded(v => !v);
  };

  const refreshSubDetails = async () => {
    try {
      const [subsRes, sessionsRes] = await Promise.all([
        api.get(`/events/${event.id}/sub-events`),
        api.get(`/sessions?event_id=${event.id}`)
      ]);
      setSubEvents(subsRes.data);
      const grouped = sessionsRes.data.reduce((acc, s) => {
        if (!acc[s.sub_event_id]) acc[s.sub_event_id] = [];
        acc[s.sub_event_id].push(s);
        return acc;
      }, {});
      setSessionsBySubEvent(grouped);
    } catch {}
  };

  const handleDeleteEvent = async () => {
    if (!confirm(`${t('delete_confirm')} "${event.name}"?`)) return;
    try { await api.delete(`/events/${event.id}`); toast.success(t('success')); onRefresh(); }
    catch (err) { toast.error(err.response?.data?.error || t('error')); }
  };

  const handleDeleteSub = async (se) => {
    if (!confirm(t('delete_confirm'))) return;
    try {
      await api.delete(`/events/${event.id}/sub-events/${se.id}`);
      setSubEvents(s => s.filter(x => x.id !== se.id));
      toast.success(t('success'));
    } catch (err) { toast.error(err.response?.data?.error || t('error')); }
  };

  const handleDeleteSession = async (session) => {
    if (!confirm(t('delete_confirm'))) return;
    try { await api.delete(`/sessions/${session.id}`); toast.success(t('success')); refreshSubDetails(); }
    catch { toast.error(t('error')); }
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: index * 0.055, type: 'spring', stiffness: 280, damping: 24 }}
        className="border border-slate-200 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
      >
        {/* top micro accent */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: index * 0.055 + 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: 'left' }}
          className={`h-0.5 ${cfg.pulse ? 'bg-emerald-400' : 'bg-slate-200'}`}
        />

        <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
          {/* expand button */}
          <motion.button
            whileHover={{ scale: 1.08, backgroundColor: '#f1f5f9' }}
            whileTap={{ scale: 0.92 }}
            onClick={handleExpand}
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 transition-colors"
          >
            <motion.span
              animate={{ rotate: expanded ? 90 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <ChevronRight size={13} strokeWidth={2} className="text-slate-500" />
            </motion.span>
          </motion.button>

          {/* info */}
          <button onClick={handleExpand} className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[14px] font-black text-slate-900 truncate max-w-[200px] sm:max-w-none">{event.name}</span>
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.055 + 0.2, type: 'spring', stiffness: 500 }}
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.pill}`}
              >
                <PulseDot active={cfg.pulse} />
                {t(event.status)}
              </motion.span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
              <span className="flex items-center gap-1"><MapPin size={10} />{event.venue || t('no_venue')}</span>
              <span className="flex items-center gap-1"><Users size={10} />{event.participant_count || 0}</span>
              <span className="flex items-center gap-1"><Layers size={10} />{event.sub_event_count || 0}</span>
              <span className="hidden sm:flex items-center gap-1">
                <CalendarDays size={10} />
                {new Date(event.start_date).toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-GB')}
                {' – '}
                {new Date(event.end_date).toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-GB')}
              </span>
            </div>
          </button>

          {/* manager actions */}
          {isManager && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                onClick={() => setModal({ type: 'subevent', data: null })}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold transition-all">
                <Plus size={10} strokeWidth={2.5} /> {t('sub_event')}
              </motion.button>
              <motion.button whileHover={{ scale: 1.1, backgroundColor: '#111827', color: '#fff' }} whileTap={{ scale: 0.9 }}
                onClick={() => setModal({ type: 'event', data: event })}
                className="p-1.5 rounded-lg text-slate-400 transition-all border border-transparent hover:border-slate-900">
                <Edit2 size={13} strokeWidth={2} />
              </motion.button>
              <motion.button whileHover={{ scale: 1.1, backgroundColor: '#fef2f2', color: '#dc2626' }} whileTap={{ scale: 0.9 }}
                onClick={handleDeleteEvent}
                className="p-1.5 rounded-lg text-slate-400 transition-all">
                <Trash2 size={13} strokeWidth={2} />
              </motion.button>
            </div>
          )}
        </div>

        {/* mobile add sub-event */}
        {isManager && (
          <div className="sm:hidden px-4 pb-3">
            <motion.button whileTap={{ scale: 0.98 }}
              onClick={() => setModal({ type: 'subevent', data: null })}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-[12px] border border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all font-medium">
              <Plus size={11} strokeWidth={2.5} /> {t('sub_event')}
            </motion.button>
          </div>
        )}

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-slate-100"
            >
              {loadingSubs ? (
                <div className="flex items-center justify-center py-8 gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-slate-200 border-t-slate-700 rounded-full"
                  />
                  <span className="text-[12px] text-slate-400">Loading…</span>
                </div>
              ) : subEvents.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 py-8 text-center">
                  <Layers size={22} strokeWidth={1} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-[12px] text-slate-400">{t('no_sub_events')}</p>
                </motion.div>
              ) : (
                <div className="px-4 sm:px-5 py-4 space-y-3">
                  {subEvents.map((se, i) => (
                    <SubEventSection
                      key={se.id} se={se} eventId={event.id}
                      sessions={sessionsBySubEvent[se.id]}
                      isManager={isManager} t={t} lang={lang}
                      onEditSub={() => setModal({ type: 'subevent', data: se })}
                      onDeleteSub={() => handleDeleteSub(se)}
                      onAddSession={() => setModal({ type: 'session', data: null, subEventId: se.id })}
                      onEditSession={(s, subId) => setModal({ type: 'session', data: s, subEventId: subId })}
                      onDeleteSession={handleDeleteSession}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {modal?.type === 'event'    && <EventModal    event={modal.data} onClose={() => setModal(null)} onSaved={() => { setModal(null); onRefresh(); }} />}
        {modal?.type === 'subevent' && <SubEventModal eventId={event.id} subEvent={modal.data} onClose={() => setModal(null)} onSaved={refreshSubDetails} />}
        {modal?.type === 'session'  && <SessionModal  eventId={event.id} subEventId={modal.subEventId} session={modal.data} onClose={() => setModal(null)} onSaved={refreshSubDetails} />}
      </AnimatePresence>
    </>
  );
}

/* ── Main Events page ── */
export default function Events() {
  const { isManager } = useAuth();
  const { t } = useLanguage();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    try { const res = await api.get('/events'); setEvents(res.data); }
    catch { toast.error(t('error')); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadEvents(); }, []);

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-0 space-y-4 sm:space-y-5">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center justify-between gap-3"
      >
        <div>
          <h2 className="text-[16px] sm:text-[18px] font-black text-slate-900 tracking-tight flex items-center gap-2">
            {t('events')}
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 500 }}
              className="text-[13px] font-normal text-slate-400"
            >
              ({events.length})
            </motion.span>
          </h2>
          <p className="text-[11px] sm:text-[12px] text-slate-400 mt-0.5">{t('event_management')}</p>
        </div>
        {isManager && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 400 }}
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-[12px] sm:text-[13px] bg-slate-900 text-white rounded-xl shadow-sm hover:bg-slate-700 transition-colors font-bold"
          >
            <motion.span whileHover={{ rotate: 90 }} transition={{ type: 'spring', stiffness: 400 }}>
              <Plus size={13} strokeWidth={2.5} />
            </motion.span>
            {t('new_event')}
          </motion.button>
        )}
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48 gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            className="w-5 h-5 border-2 border-slate-200 border-t-slate-700 rounded-full"
          />
        </div>
      ) : events.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="border border-dashed border-slate-200 bg-slate-50 rounded-2xl p-12 sm:p-16 text-center"
        >
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <CalendarDays size={32} strokeWidth={1} className="mx-auto text-slate-300 mb-3" />
          </motion.div>
          <p className="text-[14px] font-semibold text-slate-400 mb-1">{t('no_active_events')}</p>
          {isManager && (
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => setShowCreate(true)}
              className="mt-4 px-5 py-2.5 bg-slate-900 text-white text-[12px] rounded-xl font-bold hover:bg-slate-700 transition-all shadow-sm">
              {t('create_event')}
            </motion.button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-3">
          {events.map((event, i) => (
            <EventRow key={event.id} event={event} onRefresh={loadEvents} index={i} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreate && <EventModal onClose={() => setShowCreate(false)} onSaved={loadEvents} />}
      </AnimatePresence>
    </div>
  );
}