import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, Plus, ChevronRight, ChevronDown,
  Trash2, Edit2, AlertCircle
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

function EventModal({ event, onClose, onSaved }) {
  const isEdit = !!event?.id;
  const [form, setForm] = useState({
    name: event?.name || '', name_ja: event?.name_ja || '',
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
      toast.success(isEdit ? 'Event updated' : 'Event created');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
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
        <h3 className="text-[14px] font-semibold text-[#111827] mb-4">{isEdit ? 'Edit Event' : 'New Event'}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {f('Event Name *', 'name')}
            {f('Name (Japanese)', 'name_ja')}
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#374151] mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
              className="w-full px-2.5 py-2 text-[12px] border border-[#CBD5E1] rounded-sm bg-[#F9FAFB] focus:outline-none focus:border-[#64748B] resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {f('Start Date *', 'start_date', 'date')}
            {f('End Date *', 'end_date', 'date')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {f('Venue', 'venue')}
            {f('Capacity', 'capacity', 'number')}
          </div>
          {isEdit && (
            <div>
              <label className="block text-[11px] font-medium text-[#374151] mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-2.5 py-2 text-[12px] border border-[#CBD5E1] rounded-sm bg-[#F9FAFB] focus:outline-none focus:border-[#64748B]">
                {['upcoming', 'active', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-[12px] border border-slate-200 rounded-lg hover:bg-slate-50 transition-all font-medium text-slate-600">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 text-[12px] bg-slate-900 text-white rounded-lg font-medium shadow-sm transition-all hover:bg-slate-800 disabled:opacity-50">
              {loading ? '...' : (isEdit ? 'Update' : 'Create Event')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function SubEventModal({ eventId, subEvent, onClose, onSaved }) {
  const isEdit = !!subEvent?.id;
  const [form, setForm] = useState({
    name: subEvent?.name || '', name_ja: subEvent?.name_ja || '',
    venue_room: subEvent?.venue_room || '', capacity: subEvent?.capacity || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) await api.put(`/events/${eventId}/sub-events/${subEvent.id}`, { ...form, status: subEvent.status || 'upcoming' });
      else await api.post(`/events/${eventId}/sub-events`, form);
      toast.success(isEdit ? 'Sub-event updated' : 'Sub-event created');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-[14px] font-semibold text-[#111827] mb-4">{isEdit ? 'Edit Sub-Event' : 'New Sub-Event'}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          {[['Name *', 'name'], ['Name (JP)', 'name_ja'], ['Room/Venue', 'venue_room']].map(([label, key]) => (
            <div key={key}>
              <label className="block text-[11px] font-medium text-[#374151] mb-1">{label}</label>
              <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full px-2.5 py-2 text-[12px] border border-[#CBD5E1] rounded-sm bg-[#F9FAFB] focus:outline-none focus:border-[#64748B]" />
            </div>
          ))}
          <div>
            <label className="block text-[11px] font-medium text-[#374151] mb-1">Capacity</label>
            <input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
              className="w-full px-2.5 py-2 text-[12px] border border-[#CBD5E1] rounded-sm bg-[#F9FAFB] focus:outline-none focus:border-[#64748B]" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-[12px] border border-slate-200 rounded-lg hover:bg-slate-50 transition-all font-medium text-slate-600">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 text-[12px] bg-slate-900 text-white rounded-lg font-medium shadow-sm transition-all hover:bg-slate-800 disabled:opacity-50">
              {loading ? '...' : 'Save'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function SessionModal({ eventId, subEventId, session, onClose, onSaved }) {
  const isEdit = !!session?.id;
  const [form, setForm] = useState({
    title: session?.title || '', title_ja: session?.title_ja || '',
    speaker_name: session?.speaker_name || '', room: session?.room || '',
    start_time: session?.start_time ? new Date(session.start_time).toISOString().slice(0, 16) : '',
    end_time: session?.end_time ? new Date(session.end_time).toISOString().slice(0, 16) : '',
    capacity: session?.capacity || 100,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, event_id: eventId, sub_event_id: subEventId };
      if (isEdit) await api.put(`/sessions/${session.id}`, payload);
      else await api.post('/sessions', payload);
      toast.success(isEdit ? 'Session updated' : 'Session created');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save session');
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
        <h3 className="text-[14px] font-semibold text-[#111827] mb-4">{isEdit ? 'Edit Session' : 'New Session'}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {f('Session Title *', 'title')}
            {f('Title (Japanese)', 'title_ja')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {f('Speaker Name', 'speaker_name')}
            {f('Room / Location', 'room')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {f('Start Time *', 'start_time', 'datetime-local')}
            {f('End Time *', 'end_time', 'datetime-local')}
          </div>
          <div className="w-1/2 pr-1.5">
            {f('Capacity', 'capacity', 'number')}
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-[12px] border border-slate-200 rounded-lg hover:bg-slate-50 transition-all font-medium text-slate-600">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 text-[12px] bg-slate-900 text-white rounded-lg font-medium shadow-sm transition-all hover:bg-slate-800 disabled:opacity-50">
              {loading ? '...' : (isEdit ? 'Update' : 'Create Session')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function EventRow({ event, onRefresh }) {
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
    if (!confirm(`Delete "${event.name}"? This will also delete all sub-events and sessions.`)) return;
    try {
      await api.delete(`/events/${event.id}`);
      toast.success('Event deleted');
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Delete failed'); }
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
                <span className={`badge text-[10px] w-fit ${statusColor}`}>{event.status}</span>
              </div>
              {event.name_ja && <div className="text-[11px] text-[#9CA3AF] truncate">{event.name_ja}</div>}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 text-[11px] text-[#9CA3AF]">
                <span className="flex items-center gap-1 shrink-0">📍 {event.venue || 'No venue'}</span>
                <span className="flex items-center gap-1 shrink-0">👥 {event.participant_count || 0}</span>
                <span className="flex items-center gap-1 shrink-0">📁 {event.sub_event_count || 0}</span>
                <span className="hidden sm:inline text-slate-300">|</span>
                <span className="shrink-0">{new Date(event.start_date).toLocaleDateString('en-GB')} – {new Date(event.end_date).toLocaleDateString('en-GB')}</span>
              </div>
            </div>
            {expanded ? <ChevronDown size={14} strokeWidth={1.5} className="text-[#9CA3AF]" /> : <ChevronRight size={14} strokeWidth={1.5} className="text-[#9CA3AF]" />}
          </button>

          {isManager && (
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
              <button onClick={() => setModal({ type: 'subevent', data: null })}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] border border-[#CBD5E1] rounded-sm hover:bg-[#F3F4F6] transition-all">
                <Plus size={11} strokeWidth={2} /> Sub-Event
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => setModal({ type: 'event', data: event })}
                  className="p-1.5 border border-[#CBD5E1] rounded-sm hover:bg-[#F3F4F6] transition-all">
                  <Edit2 size={12} strokeWidth={1.5} className="text-[#6B7280]" />
                </button>
                <button onClick={handleDeleteEvent}
                  className="p-1.5 border border-[#CBD5E1] rounded-sm hover:bg-red-50 hover:border-red-200 transition-all">
                  <Trash2 size={12} strokeWidth={1.5} className="text-[#9CA3AF] hover:text-red-500" />
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
                <div className="px-5 py-4 text-[12px] text-[#9CA3AF] text-center">No sub-events. Add one above.</div>
              ) : (
                <div className="px-5 py-3 space-y-4">
                  {subEvents.map(se => (
                    <div key={se.id} className="border border-[#F3F4F6] rounded-xl bg-[#F9FAFB] overflow-hidden">
                      <div className="flex items-center gap-3 pl-4 py-2.5 bg-white border-b border-[#F3F4F6]">
                        <div className="w-0.5 h-6 bg-[#111827] rounded-full" />
                        <div className="flex-1">
                          <div className="text-[12px] font-semibold text-[#111827]">{se.name}</div>
                          <div className="text-[10px] text-[#9CA3AF]">{se.venue_room} · Cap {se.capacity}</div>
                        </div>
                        {isManager && (
                          <div className="flex items-center gap-1.5 pr-3">
                            <button onClick={() => setModal({ type: 'session', data: null, subEventId: se.id })}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-all">
                              <Plus size={10} /> Session
                            </button>
                            <button onClick={() => setModal({ type: 'subevent', data: se })}
                              className="p-1.5 border border-[#F3F4F6] rounded-sm hover:bg-white hover:border-[#CBD5E1] transition-all">
                              <Edit2 size={11} strokeWidth={1.5} className="text-[#9CA3AF]" />
                            </button>
                            <button onClick={async () => {
                              if (!confirm('Delete sub-event?')) return;
                              try { await api.delete(`/events/${event.id}/sub-events/${se.id}`); setSubEvents(s => s.filter(x => x.id !== se.id)); toast.success('Deleted'); }
                              catch (err) { toast.error(err.response?.data?.error || 'Delete failed'); }
                            }} className="p-1.5 border border-[#F3F4F6] rounded-sm hover:bg-red-50 hover:border-red-200 transition-all">
                              <Trash2 size={11} strokeWidth={1.5} className="text-[#CBD5E1] hover:text-red-500" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Sessions under this sub-event */}
                      <div className="px-4 py-2 space-y-2">
                        {sessionsBySubEvent[se.id]?.length > 0 ? (
                          sessionsBySubEvent[se.id].map(session => (
                            <div key={session.id} className="flex items-center justify-between py-2 px-3 bg-white/50 border border-[#F3F4F6] rounded-lg">
                              <div>
                                <div className="text-[11px] font-medium text-[#374151]">{session.title}</div>
                                <div className="text-[9px] text-[#9CA3AF]">
                                  {session.speaker_name && `${session.speaker_name} · `}
                                  {new Date(session.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                              {isManager && (
                                <div className="flex items-center gap-1">
                                  <button onClick={() => setModal({ type: 'session', data: session, subEventId: se.id })}
                                    className="p-1 text-[#9CA3AF] hover:text-[#111827]">
                                    <Edit2 size={10} />
                                  </button>
                                  <button onClick={async () => {
                                    if (!confirm('Delete session?')) return;
                                    try {
                                      await api.delete(`/sessions/${session.id}`);
                                      toast.success('Session deleted');
                                      refreshSubDetails();
                                    } catch { toast.error('Delete failed'); }
                                  }} className="p-1 text-[#9CA3AF] hover:text-red-500">
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-[10px] text-[#9CA3AF] text-center py-1">No sessions allocated</div>
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
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/events');
      setEvents(res.data);
    } catch { toast.error('Failed to load events'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadEvents(); }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-[#111827]">Events ({events.length})</h2>
          <p className="text-[11px] text-[#9CA3AF]">Manage events and sub-events / イベント管理</p>
        </div>
        {isManager && (
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-[12px] bg-slate-900 text-white rounded-lg shadow-sm hover:bg-slate-800 transition-all font-medium">
            <Plus size={12} strokeWidth={2} /> New Event
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
          <p className="text-[13px] text-slate-500 mb-4">No events yet. Create your first event.</p>
          {isManager && <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-slate-900 text-white text-[12px] rounded-lg shadow-sm font-medium hover:bg-slate-800 transition-all">Create Event</button>}
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
