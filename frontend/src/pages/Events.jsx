import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, Plus, ChevronRight, ChevronDown,
  Trash2, Edit2, AlertCircle, X
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import DatePicker from '../components/ui/DatePicker';
import DateTimePicker from '../components/ui/DateTimePicker';

function EventModal({ event, onClose, onSaved }) {
  const { t, lang } = useLanguage();

  const isEdit = !!event?.id;
  const [form, setForm] = useState({
    name: event?.name || '',
    description: event?.description || '', start_date: event?.start_date?.slice(0, 10) || '',
    end_date: event?.end_date?.slice(0, 10) || '', venue: event?.venue || '',
    capacity: event?.capacity || '', status: event?.status || 'upcoming',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) await api.put(`/events/${event.id}`, form);
      else await api.post('/events', form);
      toast.success(isEdit ? t('success') : t('success'));
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || t('error'));
    } finally {
      setLoading(false);
    }
  };

  const f = (label, key, type = 'text') => (
    <div>
      <label className="block text-[11px] font-medium text-[#374151] mb-1">{label}</label>
      <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full px-2.5 py-2 text-[12px] border border-[#CBD5E1] rounded-sm bg-[#F9FAFB] focus:outline-none focus:border-[#64748B]" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-[14px] font-semibold text-[#111827] mb-4">{isEdit ? t('edit_event') : t('new_event')}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            {f(`${t('event_name')} *`, 'name')}
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#374151] mb-1">{t('event_description')}</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
              className="w-full px-2.5 py-2 text-[12px] border border-[#CBD5E1] rounded-sm bg-[#F9FAFB] focus:outline-none focus:border-[#64748B] resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DatePicker
              label={`${t('start_date')} *`}
              value={form.start_date}
              onChange={(v) => setForm(f => ({ ...f, start_date: v }))}
              placeholder={t('start_date')}
              lang={lang}
            />
            <DatePicker
              label={`${t('end_date')} *`}
              value={form.end_date}
              onChange={(v) => setForm(f => ({ ...f, end_date: v }))}
              placeholder={t('end_date')}
              minDate={form.start_date || undefined}
              lang={lang}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {f(t('venue'), 'venue')}
            {f(t('capacity'), 'capacity', 'number')}
          </div>
          {isEdit && (
            <div>
              <label className="block text-[11px] font-medium text-[#374151] mb-1">{t('status')}</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-2.5 py-2 text-[12px] border border-[#CBD5E1] rounded-sm bg-[#F9FAFB] focus:outline-none focus:border-[#64748B]">
                {['upcoming', 'active', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{t(s)}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-[12px] border border-slate-200 rounded-lg hover:bg-slate-50 transition-all font-medium text-slate-600">{t('cancel')}</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 text-[12px] bg-slate-900 text-white rounded-lg font-medium shadow-sm transition-all hover:bg-slate-800 disabled:opacity-50">
              {loading ? '...' : (isEdit ? t('save') : t('create_event'))}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function SubEventModal({ eventId, subEvent, onClose, onSaved }) {
  const { t } = useLanguage();
  const isEdit = !!subEvent?.id;
  const [form, setForm] = useState({
    name: subEvent?.name || '',
    venue_room: subEvent?.venue_room || '', capacity: subEvent?.capacity || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) await api.put(`/events/${eventId}/sub-events/${subEvent.id}`, { ...form, status: subEvent.status || 'upcoming' });
      else await api.post(`/events/${eventId}/sub-events`, form);
      toast.success(isEdit ? t('success') : t('success'));
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-[14px] font-semibold text-[#111827] mb-4">{isEdit ? t('edit_sub_event') : t('new_sub_event')}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            [`${t('name')} *`, 'name'],
            [t('room_location'), 'venue_room']
          ].map(([label, key]) => (
            <div key={key}>
              <label className="block text-[11px] font-medium text-[#374151] mb-1">{label}</label>
              <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full px-2.5 py-2 text-[12px] border border-[#CBD5E1] rounded-sm bg-[#F9FAFB] focus:outline-none focus:border-[#64748B]" />
            </div>
          ))}
          <div>
            <label className="block text-[11px] font-medium text-[#374151] mb-1">{t('capacity')}</label>
            <input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
              className="w-full px-2.5 py-2 text-[12px] border border-[#CBD5E1] rounded-sm bg-[#F9FAFB] focus:outline-none focus:border-[#64748B]" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-[12px] border border-slate-200 rounded-lg hover:bg-slate-50 transition-all font-medium text-slate-600">{t('cancel')}</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 text-[12px] bg-slate-900 text-white rounded-lg font-medium shadow-sm transition-all hover:bg-slate-800 disabled:opacity-50">
              {loading ? '...' : t('save')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function TagInput({ label, value, onChange, placeholder, lang }) {
  const [inputValue, setInputValue] = useState('');
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !value.includes(newTag)) {
        onChange([...value, newTag]);
      }
      setInputValue('');
    }
  };

  const removeTag = (indexToRemove) => {
    onChange(value.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div>
      <label className="block text-[11px] font-medium text-[#374151] mb-1">{label}</label>
      <div className="w-full px-2.5 py-1.5 min-h-[38px] flex flex-wrap items-center gap-1.5 border border-[#CBD5E1] rounded-sm bg-[#F9FAFB] focus-within:border-[#64748B]">
        {value.map((tag, index) => (
          <span key={index} className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[11px] rounded-sm">
            {tag}
            <button type="button" onClick={() => removeTag(index)} className="hover:text-red-500">
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[60px] bg-transparent text-[12px] focus:outline-none"
        />
      </div>
      <p className="text-[9px] text-slate-400 mt-0.5">{lang === 'ja' ? 'Enterまたはカンマで追加' : 'Press Enter or comma to add'}</p>
    </div>
  );
}

function SessionModal({ eventId, subEventId, session, onClose, onSaved }) {
  const { t, lang } = useLanguage();
  const isEdit = !!session?.id;

  // Convert UTC datetime string to local datetime-local input value
  const toLocalDT = (dt) => {
    if (!dt) return '';
    const d = new Date(dt);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const parseTags = (str) => {
    if (!str) return [];
    return str.split(',').map(s => s.trim()).filter(Boolean);
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate: end time must be after start time
    if (form.start_time && form.end_time) {
      if (new Date(form.end_time) <= new Date(form.start_time)) {
        toast.error(lang === 'ja' ? '終了時間は開始時間より後にしてください' : 'End time must be after start time');
        return;
      }
    }

    setLoading(true);
    try {
      // Convert local datetime-local strings (YYYY-MM-DDTHH:mm) to UTC ISO.
      // new Date("YYYY-MM-DDTHH:mm") in browsers = local time → .toISOString() gives UTC.
      // This prevents PostgreSQL TIMESTAMPTZ from interpreting the value as UTC server time.
      const toUTC = (localDT) => (localDT ? new Date(localDT).toISOString() : '');
      const payload = {
        ...form,
        speaker_names: form.speaker_names.join(', '),
        chairperson_names: form.chairperson_names.join(', '),
        start_time: toUTC(form.start_time),
        end_time:   toUTC(form.end_time),
        event_id:     eventId,
        sub_event_id: subEventId,
      };
      if (isEdit) await api.put(`/sessions/${session.id}`, payload);
      else await api.post('/sessions', payload);
      toast.success(isEdit ? t('session_updated') : t('session_created'));
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || t('failed_save_session'));
    } finally {
      setLoading(false);
    }
  };

  const f = (label, key, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-[11px] font-medium text-[#374151] mb-1">{label}</label>
      <input type={type} value={form[key]} placeholder={placeholder}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full px-2.5 py-2 text-[12px] border border-[#CBD5E1] rounded-sm bg-[#F9FAFB] focus:outline-none focus:border-[#64748B]" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-xl">
        <h3 className="text-[14px] font-semibold text-[#111827] mb-4">{isEdit ? t('edit_session') : t('new_session')}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            {f(`${t('session_title')} *`, 'title')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TagInput 
              label={t('speakers')} 
              value={form.speaker_names} 
              onChange={v => setForm(f => ({ ...f, speaker_names: v }))} 
              placeholder="e.g. Tanaka" 
              lang={lang}
            />
            <TagInput 
              label={t('chairs')} 
              value={form.chairperson_names} 
              onChange={v => setForm(f => ({ ...f, chairperson_names: v }))} 
              placeholder="e.g. Yamamoto" 
              lang={lang}
            />
          </div>
          <div className="grid grid-cols-1 gap-3">
            {f(t('room_location'), 'room')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DateTimePicker
              label={`${t('start_time')} *`}
              value={form.start_time}
              onChange={(v) => setForm(f => ({ ...f, start_time: v }))}
              placeholder={t('start_time')}
              lang={lang}
            />
            <DateTimePicker
              label={`${t('end_time')} *`}
              value={form.end_time}
              onChange={(v) => setForm(f => ({ ...f, end_time: v }))}
              placeholder={t('end_time')}
              minDateTime={form.start_time || undefined}
              lang={lang}
            />
          </div>

          {/* Live warning when end ≤ start */}
          {form.start_time && form.end_time && new Date(form.end_time) <= new Date(form.start_time) && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-600 font-medium">
              <span>⚠</span>
              <span>{lang === 'ja' ? '終了時間は開始時間より後にしてください' : 'End time must be after start time'}</span>
            </div>
          )}

          <div className="w-1/2 pr-1.5">
            {f(t('capacity'), 'capacity', 'number', t('unlimited') || 'Unlimited')}
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-[12px] border border-slate-200 rounded-lg hover:bg-slate-50 transition-all font-medium text-slate-600">{t('cancel')}</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 text-[12px] bg-slate-900 text-white rounded-lg font-medium shadow-sm transition-all hover:bg-slate-800 disabled:opacity-50">
              {loading ? '...' : (isEdit ? t('save') : t('create_event'))}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}


function EventRow({ event, onRefresh }) {
  const { t, lang } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [subEvents, setSubEvents] = useState([]);
  const [sessionsBySubEvent, setSessionsBySubEvent] = useState({});
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [modal, setModal] = useState(null); // { type: 'event'|'subevent'|'session', data, subEventId }
  const { isManager } = useAuth();

  const statusColor = {
    active: 'bg-green-100 text-green-700 border-green-200',
    upcoming: 'bg-blue-50 text-blue-600 border-blue-200',
    completed: 'bg-gray-100 text-gray-500 border-gray-200',
    cancelled: 'bg-red-50 text-red-500 border-red-200',
  }[event.status] || 'bg-gray-100 text-gray-500 border-gray-200';

  const handleExpand = async () => {
    if (!expanded) {
      setLoadingSubs(true);
      try {
        const [subsRes, sessionsRes] = await Promise.all([
          api.get(`/events/${event.id}/sub-events`),
          api.get(`/sessions?event_id=${event.id}`)
        ]);
        setSubEvents(subsRes.data);
        
        // Group sessions by sub_event_id
        const grouped = sessionsRes.data.reduce((acc, s) => {
          if (!acc[s.sub_event_id]) acc[s.sub_event_id] = [];
          acc[s.sub_event_id].push(s);
          return acc;
        }, {});
        setSessionsBySubEvent(grouped);
      } catch (err) {
        console.error('Failed to load sub-details', err);
      } finally { setLoadingSubs(false); }
    }
    setExpanded(!expanded);
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
    try {
      await api.delete(`/events/${event.id}`);
      toast.success(t('success'));
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.error || t('error')); }
  };

  return (
    <>
      <div className="border border-slate-200 bg-white rounded-2xl shadow-sm transition-shadow hover:shadow-md">
        <div className="px-5 py-4 flex items-center gap-4">
          <button onClick={handleExpand} className="flex items-center gap-3 flex-1 text-left">
            <div className="w-8 h-8 bg-[#F3F4F6] border border-[#CBD5E1] rounded-sm flex items-center justify-center">
              <CalendarDays size={14} strokeWidth={1.5} className="text-[#6B7280]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="text-[14px] font-semibold text-[#111827] truncate">{event.name}</span>
                <span className={`badge text-[10px] w-fit ${statusColor}`}>{t(event.status)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 text-[11px] text-[#9CA3AF]">
                <span className="flex items-center gap-1 shrink-0">📍 {event.venue || t('no_venue')}</span>
                <span className="flex items-center gap-1 shrink-0">👥 {event.participant_count || 0}</span>
                <span className="flex items-center gap-1 shrink-0">📁 {event.sub_event_count || 0}</span>
                <span className="hidden sm:inline text-slate-300">|</span>
                <span className="shrink-0">{new Date(event.start_date).toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-GB')} – {new Date(event.end_date).toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-GB')}</span>
              </div>
            </div>
            {expanded ? <ChevronDown size={14} strokeWidth={1.5} className="text-[#9CA3AF]" /> : <ChevronRight size={14} strokeWidth={1.5} className="text-[#9CA3AF]" />}
          </button>

          {isManager && (
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
              <button onClick={() => setModal({ type: 'subevent', data: null })}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] border border-[#CBD5E1] rounded-sm hover:bg-[#F9FAFB] transition-all">
                <Plus size={11} strokeWidth={2} /> {t('sub_event')}
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => setModal({ type: 'event', data: event })}
                  className="p-1.5 text-black hover:text-white hover:bg-black rounded-md shadow-sm transition-all border border-transparent hover:border-black">
                  <Edit2 size={12} strokeWidth={2} />
                </button>
                <button onClick={handleDeleteEvent}
                  className="p-1.5 text-white bg-black hover:bg-red-600 rounded-md shadow-sm transition-all border border-transparent">
                  <Trash2 size={12} strokeWidth={2} />
                </button>
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-[#F3F4F6]"
            >
              {loadingSubs ? (
                <div className="px-5 py-4 text-center">
                  <div className="w-4 h-4 border border-[#CBD5E1] border-t-[#64748B] rounded-full animate-spin mx-auto" />
                </div>
              ) : subEvents.length === 0 ? (
                <div className="px-5 py-4 text-[12px] text-[#9CA3AF] text-center">{t('no_sub_events')}</div>
              ) : (
                <div className="px-5 py-3 space-y-4">
                  {subEvents.map(se => (
                    <div key={se.id} className="border border-[#F3F4F6] rounded-xl bg-[#F9FAFB] overflow-hidden">
                      <div className="flex items-center gap-3 pl-4 py-2.5 bg-white border-b border-[#F3F4F6]">
                        <div className="w-0.5 h-6 bg-[#111827] rounded-full" />
                        <div className="flex-1">
                          <div className="text-[12px] font-semibold text-[#111827]">{se.name}</div>
                          <div className="text-[10px] text-[#9CA3AF]">{se.venue_room} · {t('capacity_short')} {se.capacity}</div>
                        </div>
                        {isManager && (
                          <div className="flex items-center gap-1.5 pr-3">
                            <button onClick={() => setModal({ type: 'session', data: null, subEventId: se.id })}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-all">
                              <Plus size={10} /> {t('session')}
                            </button>
                            <button onClick={() => setModal({ type: 'subevent', data: se })}
                              className="p-1.5 text-black hover:text-white hover:bg-black rounded-md shadow-sm transition-all border border-transparent hover:border-black">
                              <Edit2 size={12} strokeWidth={2} />
                            </button>
                            <button onClick={async () => {
                              if (!confirm(t('delete_confirm'))) return;
                              try { await api.delete(`/events/${event.id}/sub-events/${se.id}`); setSubEvents(s => s.filter(x => x.id !== se.id)); toast.success(t('success')); }
                              catch (err) { toast.error(err.response?.data?.error || t('error')); }
                            }} className="p-1.5 text-white bg-black hover:bg-red-600 rounded-md shadow-sm transition-all border border-transparent">
                              <Trash2 size={12} strokeWidth={2} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Sessions under this sub-event */}
                      <div className="px-4 py-2 space-y-2">
                        {sessionsBySubEvent[se.id]?.length > 0 ? (
                          sessionsBySubEvent[se.id].map(session => (
                            <div key={session.id} className="flex items-center justify-between py-2 px-3 bg-white/50 border border-[#F3F4F6] rounded-lg">
                              <div className="flex-1 mr-4">
                                <div className="text-[12px] font-medium text-[#111827] mb-1">{session.title}</div>
                                <div className="flex flex-col gap-0.5 text-[10px] text-[#6B7280]">
                                  {(session.speaker_names || session.speaker_name) && (
                                    <div className="flex items-start gap-1">
                                      <span className="font-semibold whitespace-nowrap">{lang === 'ja' ? 'スピーカー:' : 'Speakers:'}</span>
                                      <span className="text-[#4B5563]">{session.speaker_names || session.speaker_name}</span>
                                    </div>
                                  )}
                                  {session.chairperson_names && (
                                    <div className="flex items-start gap-1">
                                      <span className="font-semibold whitespace-nowrap">{lang === 'ja' ? '座長:' : 'Chairs:'}</span>
                                      <span className="text-[#4B5563]">{session.chairperson_names}</span>
                                    </div>
                                  )}
                                  <div className="flex items-start gap-1 mt-0.5">
                                    <span className="font-semibold whitespace-nowrap">{lang === 'ja' ? '時間:' : 'Time:'}</span>
                                    <span className="text-[#4B5563]">
                                      {new Date(session.start_time).toLocaleTimeString(lang === 'ja' ? 'ja-JP' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
                                      {' - '}
                                      {new Date(session.end_time).toLocaleTimeString(lang === 'ja' ? 'ja-JP' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {isManager && (
                                <div className="flex items-center gap-1">
                                  <button onClick={() => setModal({ type: 'session', data: session, subEventId: se.id })}
                                    className="p-1 text-black hover:text-white hover:bg-black rounded-md transition-all shadow-sm">
                                    <Edit2 size={12} strokeWidth={2} />
                                  </button>
                                  <button onClick={async () => {
                                    if (!confirm(t('delete_confirm'))) return;
                                    try {
                                      await api.delete(`/sessions/${session.id}`);
                                      toast.success(t('success'));
                                      refreshSubDetails();
                                    } catch { toast.error(t('error')); }
                                  }} className="p-1 text-white bg-black hover:bg-red-600 rounded-md transition-all shadow-sm">
                                    <Trash2 size={12} strokeWidth={2} />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-[10px] text-[#9CA3AF] text-center py-1">{t('no_sessions')}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {modal?.type === 'event' && (
        <EventModal event={modal.data} onClose={() => setModal(null)} onSaved={() => { setModal(null); onRefresh(); }} />
      )}
      {modal?.type === 'subevent' && (
        <SubEventModal eventId={event.id} subEvent={modal.data} onClose={() => setModal(null)} onSaved={refreshSubDetails} />
      )}
      {modal?.type === 'session' && (
        <SessionModal
          eventId={event.id}
          subEventId={modal.subEventId}
          session={modal.data}
          onClose={() => setModal(null)}
          onSaved={refreshSubDetails}
        />
      )}
    </>
  );
}

export default function Events() {
  const { isManager } = useAuth();
  const { t } = useLanguage();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/events');
      setEvents(res.data);
    } catch { toast.error(t('error')); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadEvents(); }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-[#111827]">{t('events')} ({events.length})</h2>
          <p className="text-[11px] text-[#9CA3AF]">{t('event_management')}</p>
        </div>
        {isManager && (
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-[12px] bg-slate-900 text-white rounded-lg shadow-sm hover:bg-slate-800 transition-all font-medium">
            <Plus size={12} strokeWidth={2} /> {t('new_event')}
          </motion.button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border border-[#CBD5E1] border-t-[#64748B] rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="border border-slate-200 border-dashed bg-slate-50 rounded-2xl p-12 text-center shadow-sm">
          <CalendarDays size={28} strokeWidth={1} className="mx-auto text-slate-400 mb-3" />
          <p className="text-[13px] text-slate-500 mb-4">{t('no_active_events')}</p>
          {isManager && <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-slate-900 text-white text-[12px] rounded-lg shadow-sm font-medium hover:bg-slate-800 transition-all">{t('create_event')}</button>}
        </div>
      ) : (
        <motion.div className="space-y-3" initial="hidden" animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}>
          {events.map(event => (
            <motion.div key={event.id} variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}>
              <EventRow event={event} onRefresh={loadEvents} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {showCreate && <EventModal onClose={() => setShowCreate(false)} onSaved={loadEvents} />}
    </div>
  );
}
