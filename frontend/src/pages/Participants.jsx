import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Plus, Search, Upload, Download, Filter,
  Trash2, Edit2, ChevronLeft, ChevronRight, UserCheck
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const ROLES = ['all', 'participant', 'speaker', 'chairperson', 'vip', 'staff'];
const ROLE_STYLES = {
  participant: 'bg-gray-100 text-gray-600 border-gray-200',
  speaker: 'bg-purple-50 text-purple-700 border-purple-200',
  chairperson: 'bg-amber-50 text-amber-700 border-amber-200',
  vip: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  staff: 'bg-blue-50 text-blue-700 border-blue-200',
};

function AddParticipantModal({ events, onClose, onAdded }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ event_id: events[0]?.id || '', name: '', email: '', organization: '', role: 'participant', ticket_number: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.event_id || !form.name) return;
    setLoading(true);
    try {
      await api.post('/participants', form);
      toast.success(t('success'));
      onAdded();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || t('error'));
    } finally {
      setLoading(false);
    }
  };

  const field = (label, key, type = 'text', options = null) => (
    <div>
      <label className="block text-[11px] font-medium text-[#374151] mb-1">{label}</label>
      {options ? (
        <select
          value={form[key]}
          onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="w-full px-2.5 py-2 text-[12px] border border-[#CBD5E1] rounded-sm bg-[#F9FAFB] focus:outline-none focus:border-[#64748B]"
        >
          {options}
        </select>
      ) : (
        <input
          type={type}
          value={form[key]}
          onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="w-full px-2.5 py-2 text-[12px] border border-[#CBD5E1] rounded-sm bg-[#F9FAFB] focus:outline-none focus:border-[#64748B]"
        />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-[14px] font-semibold text-[#111827] mb-4">{t('add_participant')}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          {field(t('select_event'), 'event_id', 'text', events.map(e => <option key={e.id} value={e.id}>{e.name}</option>))}
          {field(`${t('name')} *`, 'name')}
          {field(t('email'), 'email', 'email')}
          {field(t('organization'), 'organization')}
          {field(t('role'), 'role', 'text', ROLES.filter(r => r !== 'all').map(r => <option key={r} value={r}>{t(r)}</option>))}
          {field(t('ticket_no'), 'ticket_number')}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-[12px] border border-slate-200 rounded-lg hover:bg-slate-50 transition-all font-medium text-slate-600">{t('cancel')}</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 text-[12px] bg-slate-900 text-white rounded-lg font-medium shadow-sm transition-all hover:bg-slate-800 disabled:opacity-50">
              {loading ? '...' : t('add_participant')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function Participants() {
  const { isManager } = useAuth();
  const { lang, t } = useLanguage();
  const [data, setData] = useState({ participants: [], total: 0, pages: 1 });
  const [events, setEvents] = useState([]);
  const [filters, setFilters] = useState({ search: '', role: 'all', event_id: '', page: 1, limit: 50 });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    api.get('/events').then(r => setEvents(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    loadParticipants();
  }, [filters]);

  const loadParticipants = async () => {
    setLoading(true);
    try {
      const params = {
        page: filters.page,
        limit: filters.limit,
        ...(filters.search && { search: filters.search }),
        ...(filters.role !== 'all' && { role: filters.role }),
        ...(filters.event_id && { event_id: filters.event_id }),
      };
      const res = await api.get('/participants', { params });
      setData(res.data);
    } catch (err) {
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('delete_confirm'))) return;
    try {
      await api.delete(`/participants/${id}`);
      toast.success(t('success'));
      loadParticipants();
    } catch (err) {
      toast.error(t('error'));
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!filters.event_id) { toast.error(t('select_event')); return; }
    setCsvLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('event_id', filters.event_id);
    try {
      const res = await api.post('/participants/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(t('success'));
      if (res.data.errors?.length > 0) toast.error(t('error'));
      loadParticipants();
    } catch (err) {
      toast.error(err.response?.data?.error || t('error'));
    } finally {
      setCsvLoading(false);
      fileRef.current.value = '';
    }
  };

  const handleExport = async () => {
    if (!filters.event_id) { toast.error(t('select_event')); return; }
    try {
      const link = document.createElement('a');
      link.href = `/api/participants/export/${filters.event_id}`;
      link.download = `participants_event_${filters.event_id}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(t('success'));
    } catch { toast.error(t('error')); }
  };

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val, page: key !== 'page' ? 1 : val }));

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" strokeWidth={1.5} />
          <input
            type="text"
            placeholder={t('search_participants')}
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-[12px] border border-slate-200 rounded-lg shadow-sm bg-white focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all"
          />
        </div>

        {/* Role filter */}
        <select
          value={filters.role}
          onChange={(e) => setFilter('role', e.target.value)}
          className="px-3 py-2 text-[12px] border border-slate-200 rounded-lg shadow-sm bg-white focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all"
        >
          {ROLES.map(r => <option key={r} value={r}>{r === 'all' ? t('all_roles') : t(r)}</option>)}
        </select>

        {/* Event filter */}
        <select
          value={filters.event_id}
          onChange={(e) => setFilter('event_id', e.target.value)}
          className="px-3 py-2 text-[12px] border border-slate-200 rounded-lg shadow-sm bg-white focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all max-w-48 text-slate-700"
        >
          <option value="">{t('events')}</option>
          {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>

        {/* Per page */}
        <select
          value={filters.limit}
          onChange={(e) => setFilter('limit', parseInt(e.target.value))}
          className="px-3 py-2 text-[12px] border border-slate-200 rounded-lg shadow-sm bg-white focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all text-slate-700"
        >
          {[25, 50, 100].map(n => <option key={n} value={n}>{n} / {t('page_label')}</option>)}
        </select>

        <div className="flex items-center gap-2 justify-between w-full sm:w-auto mt-2 sm:mt-0">
          {isManager && (
            <>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={csvLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-[12px] border border-slate-200 rounded-lg bg-white shadow-sm hover:bg-slate-50 transition-all font-medium disabled:opacity-50 text-slate-700"
              >
                <Upload size={14} strokeWidth={1.5} /> {csvLoading ? t('importing') : t('import_csv')}
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-2 text-[12px] border border-slate-200 rounded-lg bg-white shadow-sm hover:bg-slate-50 transition-all font-medium text-slate-700"
              >
                <Download size={14} strokeWidth={1.5} /> {t('export_csv')}
              </button>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-[12px] bg-slate-900 text-white rounded-lg shadow-sm hover:bg-slate-800 transition-all font-medium"
              >
                <Plus size={14} strokeWidth={2} /> {t('add_participant')}
              </motion.button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-[#F3F4F6] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={13} strokeWidth={1.5} className="text-[#6B7280]" />
            <span className="text-[12px] font-semibold text-[#374151]">
              {data.total.toLocaleString()} {t('participants')} · {t('page_label')} {filters.page} / {data.pages}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F3F4F6] bg-[#F9FAFB]">
                {[t('name'), t('email'), t('organization'), t('role'), t('qr_code_label'), `${t('stage')} 1`, `${t('stage')} 2`, `${t('stage')} 3`, t('actions')].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="w-5 h-5 border border-[#CBD5E1] border-t-[#64748B] rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : data.participants.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-[12px] text-[#9CA3AF]">
                    {t('no_participants')}
                  </td>
                </tr>
              ) : (
                data.participants.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-[#F3F4F6] border border-[#CBD5E1] rounded-sm flex items-center justify-center text-[10px] font-bold text-[#6B7280]">
                          {p.name?.charAt(0)}
                        </div>
                        <div>
                          <div className="text-[12px] font-medium text-[#374151]">{p.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-[#6B7280]">{p.email || '—'}</td>
                    <td className="px-4 py-3 text-[11px] text-[#6B7280]">{p.organization || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge text-[10px] ${ROLE_STYLES[p.role] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>{p.role}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-[#9CA3AF]">{p.qr_code}</td>
                    {[1, 2, 3].map(s => (
                      <td key={s} className="px-4 py-3">
                        {p[`checkin_at_${s}`] ? (
                          <div className="flex items-center gap-1 text-[10px] text-green-600">
                            <UserCheck size={10} />
                            {new Date(p[`checkin_at_${s}`]).toLocaleTimeString(lang === 'ja' ? 'ja-JP' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#CBD5E1]">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      {isManager && (
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 text-[#CBD5E1] hover:text-red-500 hover:bg-red-50 rounded-sm transition-all border border-transparent hover:border-red-200"
                        >
                          <Trash2 size={12} strokeWidth={1.5} />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data.pages > 1 && (
          <div className="px-4 py-3 border-t border-[#F3F4F6] flex items-center justify-between">
            <span className="text-[11px] text-[#9CA3AF]">
              {t('showing')} {((filters.page - 1) * filters.limit) + 1}–{Math.min(filters.page * filters.limit, data.total)} {t('of')} {data.total.toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilter('page', filters.page - 1)}
                disabled={filters.page <= 1}
                className="w-7 h-7 flex items-center justify-center border border-[#CBD5E1] rounded-sm hover:bg-[#F3F4F6] disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={12} strokeWidth={1.5} />
              </button>
              {Array.from({ length: Math.min(5, data.pages) }, (_, i) => {
                const page = Math.max(1, Math.min(data.pages - 4, filters.page - 2)) + i;
                return (
                  <button
                    key={page}
                    onClick={() => setFilter('page', page)}
                    className={`w-7 h-7 flex items-center justify-center text-[11px] border rounded-sm transition-all
                      ${filters.page === page ? 'bg-[#111827] text-white border-[#111827]' : 'border-[#CBD5E1] hover:bg-[#F3F4F6]'}`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setFilter('page', filters.page + 1)}
                disabled={filters.page >= data.pages}
                className="w-7 h-7 flex items-center justify-center border border-[#CBD5E1] rounded-sm hover:bg-[#F3F4F6] disabled:opacity-30 transition-all"
              >
                <ChevronRight size={12} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showAdd && <AddParticipantModal events={events} onClose={() => setShowAdd(false)} onAdded={loadParticipants} />}
    </div>
  );
}
