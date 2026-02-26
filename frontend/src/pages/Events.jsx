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
      <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white border border-[#CBD5E1] rounded-sm w-full max-w-lg p-6"
        style={{ boxShadow: '8px 8px 0px 0px rgba(0,0,0,0.08)' }} onClick={e => e.stopPropagation()}>
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
            <button type="button" onClick={onClose} className="flex-1 py-2 text-[12px] border border-[#CBD5E1] rounded-sm hover:bg-[#F3F4F6] transition-all">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 text-[12px] bg-[#111827] text-white rounded-sm font-medium disabled:opacity-50" style={{ boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.15)' }}>
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
      <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white border border-[#CBD5E1] rounded-sm w-full max-w-sm p-6"
        style={{ boxShadow: '8px 8px 0px 0px rgba(0,0,0,0.08)' }} onClick={e => e.stopPropagation()}>
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
            <button type="button" onClick={onClose} className="flex-1 py-2 text-[12px] border border-[#CBD5E1] rounded-sm hover:bg-[#F3F4F6] transition-all">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 text-[12px] bg-[#111827] text-white rounded-sm font-medium disabled:opacity-50" style={{ boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.15)' }}>
              {loading ? '...' : 'Save'}
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
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [modal, setModal] = useState(null); // { type: 'event'|'subevent', data }
  const { isManager } = useAuth();

  const statusColor = {
    active: 'bg-green-100 text-green-700 border-green-200',
    upcoming: 'bg-blue-50 text-blue-600 border-blue-200',
    completed: 'bg-gray-100 text-gray-500 border-gray-200',
    cancelled: 'bg-red-50 text-red-500 border-red-200',
  }[event.status] || 'bg-gray-100 text-gray-500 border-gray-200';

  const handleExpand = async () => {
    if (!expanded && subEvents.length === 0) {
      setLoadingSubs(true);
      try {
        const res = await api.get(`/events/${event.id}/sub-events`);
        setSubEvents(res.data);
      } catch {} finally { setLoadingSubs(false); }
    }
    setExpanded(!expanded);
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
      <div className="border border-[#CBD5E1] bg-white rounded-sm" style={{ boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.05)' }}>
        <div className="px-5 py-4 flex items-center gap-4">
          <button onClick={handleExpand} className="flex items-center gap-3 flex-1 text-left">
            <div className="w-8 h-8 bg-[#F3F4F6] border border-[#CBD5E1] rounded-sm flex items-center justify-center">
              <CalendarDays size={14} strokeWidth={1.5} className="text-[#6B7280]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-[#111827]">{event.name}</span>
                <span className={`badge text-[10px] ${statusColor}`}>{event.status}</span>
              </div>
              {event.name_ja && <div className="text-[11px] text-[#9CA3AF]">{event.name_ja}</div>}
              <div className="flex items-center gap-3 mt-1 text-[11px] text-[#9CA3AF]">
                <span>📍 {event.venue || 'No venue'}</span>
                <span>👥 {event.participant_count || 0} registered</span>
                <span>📁 {event.sub_event_count || 0} sub-events</span>
                <span>{new Date(event.start_date).toLocaleDateString('en-GB')} – {new Date(event.end_date).toLocaleDateString('en-GB')}</span>
              </div>
            </div>
            {expanded ? <ChevronDown size={14} strokeWidth={1.5} className="text-[#9CA3AF]" /> : <ChevronRight size={14} strokeWidth={1.5} className="text-[#9CA3AF]" />}
          </button>

          {isManager && (
            <div className="flex items-center gap-2">
              <button onClick={() => setModal({ type: 'subevent', data: null })}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] border border-[#CBD5E1] rounded-sm hover:bg-[#F3F4F6] transition-all">
                <Plus size={11} strokeWidth={2} /> Sub-Event
              </button>
              <button onClick={() => setModal({ type: 'event', data: event })}
                className="p-1.5 border border-[#CBD5E1] rounded-sm hover:bg-[#F3F4F6] transition-all">
                <Edit2 size={12} strokeWidth={1.5} className="text-[#6B7280]" />
              </button>
              <button onClick={handleDeleteEvent}
                className="p-1.5 border border-[#CBD5E1] rounded-sm hover:bg-red-50 hover:border-red-200 transition-all">
                <Trash2 size={12} strokeWidth={1.5} className="text-[#9CA3AF] hover:text-red-500" />
              </button>
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
                <div className="px-5 py-3 space-y-2">
                  {subEvents.map(se => (
                    <div key={se.id} className="flex items-center gap-3 pl-4 py-2.5 border border-[#F3F4F6] rounded-sm bg-[#F9FAFB]">
                      <div className="w-0.5 h-6 bg-[#CBD5E1] rounded-full" />
                      <div className="flex-1">
                        <div className="text-[12px] font-medium text-[#374151]">{se.name}</div>
                        <div className="text-[10px] text-[#9CA3AF]">{se.venue_room} · {se.session_count || 0} sessions · cap {se.capacity}</div>
                      </div>
                      {isManager && (
                        <div className="flex items-center gap-1.5">
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
        <SubEventModal eventId={event.id} subEvent={modal.data} onClose={() => setModal(null)} onSaved={() => {
          setModal(null);
          api.get(`/events/${event.id}/sub-events`).then(r => setSubEvents(r.data));
        }} />
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
            className="flex items-center gap-1.5 px-3 py-2 text-[12px] bg-[#111827] text-white rounded-sm font-medium"
            style={{ boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.15)' }}>
            <Plus size={12} strokeWidth={2} /> New Event
          </motion.button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border border-[#CBD5E1] border-t-[#64748B] rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="border border-[#CBD5E1] bg-white rounded-sm p-12 text-center" style={{ boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.05)' }}>
          <CalendarDays size={28} strokeWidth={1} className="mx-auto text-[#CBD5E1] mb-3" />
          <p className="text-[13px] text-[#9CA3AF] mb-4">No events yet. Create your first event.</p>
          {isManager && <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-[#111827] text-white text-[12px] rounded-sm font-medium">Create Event</button>}
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
