import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MonitorPlay, Users, Clock, LogIn, LogOut, AlertTriangle,
  RefreshCw, Shield, XCircle, CheckCircle2, Timer
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';

function GuardBadge({ expiresAt }) {
  const { lang } = useLanguage();
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const updateRemaining = () => {
      const secs = Math.max(0, Math.ceil((new Date(expiresAt) - Date.now()) / 1000));
      setRemaining(secs);
    };
    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (remaining <= 0) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-sm border bg-amber-50 text-amber-700 border-amber-200 font-semibold">
      <Timer size={9} />
      {mins}:{secs.toString().padStart(2, '0')} {lang === 'ja' ? '残り' : 'left'}
    </span>
  );
}

function GuardWarningModal({ show, onClose, onForce, guardInfo }) {
  const { t } = useLanguage();
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.95, y: -16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95 }}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-xl"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-50 border border-amber-200 rounded-sm flex items-center justify-center">
                <Shield size={18} className="text-amber-600" strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[#111827]">{t('guard_active_title')}</div>
                <div className="text-[12px] text-[#6B7280] mt-1">
                  {t('guard_active_desc')}
                  {guardInfo?.remaining_seconds && (
                    <span className="font-semibold text-amber-600"> {guardInfo.remaining_seconds}s {t('remaining')}.</span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-[#9CA3AF] mb-4 leading-relaxed">
              {t('guard_long_desc')}
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2 text-[12px] border border-[#CBD5E1] rounded-sm hover:bg-[#F3F4F6] transition-all font-medium"
              >
                {t('dismiss')}
              </button>
              <button
                onClick={onForce}
                className="flex-1 py-2 text-[12px] bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium flex items-center justify-center gap-1.5 shadow-sm"
              >
                <AlertTriangle size={12} /> {t('force_exit')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Sessions() {
  const { t } = useLanguage();
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [guardWarning, setGuardWarning] = useState({ show: false, participantId: null, info: null });

  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    loadSessions();
  }, [selectedEvent]);

  const loadEvents = async () => {
    try {
      const res = await api.get('/events');
      setEvents(res.data);
    } catch (err) { }
  };

  useEffect(() => {
    if (selected) loadSessionDetail(selected.id);
  }, [selected]);

  // Auto-refresh session detail
  useEffect(() => {
    if (!selected) return;
    const interval = setInterval(() => loadSessionDetail(selected.id, true), 15000);
    return () => clearInterval(interval);
  }, [selected]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sessions', { params: { event_id: selectedEvent || undefined } });
      setSessions(res.data);
      if (res.data.length > 0) {
        if (!selected || !res.data.find(s => s.id === selected.id)) {
          setSelected(res.data[0]);
        }
      } else {
        setSelected(null);
      }
    } catch (err) {
      toast.error(t('failed_load_sessions'));
    } finally {
      setLoading(false);
    }
  };

  const loadSessionDetail = async (id, silent = false) => {
    if (!silent) setDetailLoading(true);
    try {
      const res = await api.get(`/sessions/${id}`);
      setSessionDetail(res.data);
    } catch (err) {
      if (!silent) toast.error(t('failed_load_details'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCheckout = async (participantId, force = false) => {
    try {
      await api.post(`/sessions/${selected.id}/exit`, { participant_id: participantId, force });
      toast.success(t('checkout_success'));
      setGuardWarning({ show: false, participantId: null, info: null });
      loadSessionDetail(selected.id);
    } catch (err) {
      const data = err.response?.data;
      if (data?.error === 'GUARD_ACTIVE') {
        setGuardWarning({ show: true, participantId, info: data });
      } else {
        toast.error(data?.error || t('checkout_failed'));
      }
    }
  };

  const statusColor = {
    active: 'bg-green-100 text-green-700 border-green-200',
    upcoming: 'bg-blue-50 text-blue-600 border-blue-200',
    completed: 'bg-gray-100 text-gray-500 border-gray-200',
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border border-[#CBD5E1] border-t-[#64748B] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="grid grid-cols-7 gap-5">
        {/* Session list */}
        <div className="col-span-2">
          <div className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-[#F3F4F6]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-semibold text-[#374151]">{t('sessions')} ({sessions.length})</span>
              </div>
              <select 
                value={selectedEvent} 
                onChange={e => setSelectedEvent(e.target.value)}
                className="w-full text-[12px] border border-[#CBD5E1] rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500"
              >
                <option value="">{t('all_events') || 'All Events'}</option>
                {events.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div className="divide-y divide-[#F3F4F6] max-h-[600px] overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="px-4 py-8 text-center text-[12px] text-[#9CA3AF]">{t('no_sessions_found')}</div>
              ) : sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className={`w-full text-left px-4 py-3.5 transition-all hover:bg-[#F9FAFB]
                    ${selected?.id === s.id ? 'bg-[#F3F4F6] border-l-2 border-[#111827]' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-[12px] font-medium text-[#374151] leading-snug">{s.title}</span>
                    <span className={`badge text-[9px] flex-shrink-0 ${statusColor[s.status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>{t(s.status)}</span>
                  </div>
                  <div className="text-[10px] text-[#9CA3AF]">{s.room} · {s.attendee_count} {t('attending')}</div>
                  <div className="text-[10px] text-[#9CA3AF]">
                    {new Date(s.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} –
                    {new Date(s.end_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Session Detail */}
        <div className="col-span-5 space-y-4">
          {!sessionDetail ? (
            <div className="border border-slate-200 bg-slate-50 rounded-2xl p-12 text-center border-dashed">
              <MonitorPlay size={24} strokeWidth={1} className="mx-auto text-slate-400 mb-3" />
              <p className="text-[13px] text-slate-500">{t('select_session_monitor')}</p>
            </div>
          ) : (
            <>
              {/* Session info card */}
              <div className="border border-slate-200 bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-[16px] font-semibold text-[#111827]">{sessionDetail.title}</h2>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[11px] text-[#6B7280]">📍 {sessionDetail.room || t('no_room')}</span>
                      <span className="text-[11px] text-[#6B7280]">👤 {sessionDetail.speaker_name || t('no_speaker')}</span>
                      <span className={`badge text-[10px] ${statusColor[sessionDetail.status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>{t(sessionDetail.status)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[22px] font-bold text-[#111827]">
                      {sessionDetail.attendees?.length || 0}
                    </div>
                    <div className="text-[11px] text-[#9CA3AF]">/ {sessionDetail.capacity} {t('capacity')}</div>
                    <div className="w-24 h-1.5 bg-[#F3F4F6] border border-[#CBD5E1] rounded-sm overflow-hidden mt-2">
                      <div
                        className="h-full bg-[#111827]"
                        style={{ width: `${Math.min(100, ((sessionDetail.attendees?.length || 0) / sessionDetail.capacity) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendees table */}
              <div className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-[#F3F4F6] flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[#374151] flex items-center gap-2">
                    <Users size={13} strokeWidth={1.5} /> {t('attendees')}
                  </span>
                  <button
                    onClick={() => loadSessionDetail(selected.id)}
                    disabled={detailLoading}
                    className="flex items-center gap-1.5 text-[11px] text-[#6B7280] hover:text-[#374151] border border-[#CBD5E1] px-2 py-1 rounded-sm hover:bg-[#F3F4F6] transition-all"
                  >
                    <RefreshCw size={11} className={detailLoading ? 'animate-spin' : ''} strokeWidth={1.5} /> {t('refresh')}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#F3F4F6] bg-[#F9FAFB]">
                        {[t('name'), t('role'), t('status') || 'Status', t('entry_time'), t('duration'), t('guard'), t('actions')].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(sessionDetail.attendees || []).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-[12px] text-[#9CA3AF]">{t('no_active_attendees')}</td>
                        </tr>
                      ) : (
                        (sessionDetail.attendees || [])
                          .map((attendee, i) => (
                            <motion.tr
                              key={attendee.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.02 }}
                              className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors"
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-[#F3F4F6] border border-[#CBD5E1] rounded-sm flex items-center justify-center text-[10px] font-bold text-[#6B7280]">
                                    {attendee.name?.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="text-[12px] font-medium text-[#374151]">{attendee.name}</div>
                                    <div className="text-[10px] text-[#9CA3AF]">{attendee.organization}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`badge text-[10px] ${
                                  attendee.role === 'speaker' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                  attendee.role === 'chairperson' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  'bg-gray-100 text-gray-600 border-gray-200'
                                }`}>{t(attendee.role)}</span>
                              </td>
                              <td className="px-4 py-3">
                                {attendee.exit_time ? (
                                  <span className="badge bg-slate-100 text-slate-600 border-slate-200 text-[9px]">{t('exited') || 'Exited'}</span>
                                ) : (
                                  <span className="badge bg-green-50 text-green-700 border-green-200 text-[9px]">{t('in_session') || 'In Session'}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-[11px] text-[#6B7280]">
                                <div className="flex items-center gap-1">
                                  <LogIn size={10} strokeWidth={1.5} className="text-green-500" />
                                  {new Date(attendee.entry_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-[11px] text-[#6B7280]">
                                <div className="flex items-center gap-1">
                                  <Clock size={10} strokeWidth={1.5} />
                                  {attendee.exit_time ? (
                                    <span>{Math.floor((attendee.duration_seconds || 0) / 60)}m {(attendee.duration_seconds || 0) % 60}s</span>
                                  ) : (
                                    <span>{Math.floor((attendee.seconds_in || 0) / 60)}m {(attendee.seconds_in || 0) % 60}s</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {attendee.guard_active ? (
                                  <GuardBadge expiresAt={attendee.guard_expires_at} />
                                ) : (
                                  <span className="text-[10px] text-[#9CA3AF] font-medium">{t('cleared')}</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {attendee.exit_time ? (
                                  <span className="text-[10px] text-[#9CA3AF]">-</span>
                                ) : (
                                  <button
                                    onClick={() => handleCheckout(attendee.participant_id)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-lg shadow-sm border font-medium transition-all
                                      ${attendee.guard_active
                                        ? 'border-amber-200 text-amber-600 bg-amber-50 hover:bg-amber-100'
                                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                  >
                                    <LogOut size={10} strokeWidth={1.5} />
                                    {attendee.guard_active ? t('guard') : t('check_out')}
                                  </button>
                                )}
                              </td>
                            </motion.tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <GuardWarningModal
        show={guardWarning.show}
        guardInfo={guardWarning.info}
        onClose={() => setGuardWarning({ show: false, participantId: null, info: null })}
        onForce={() => handleCheckout(guardWarning.participantId, true)}
      />
    </div>
  );
}
