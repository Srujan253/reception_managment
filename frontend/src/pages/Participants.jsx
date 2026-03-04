import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Search, Upload, Download, Filter,
  Trash2, Edit2, ChevronLeft, ChevronRight, UserCheck,
  ChevronDown, QrCode, Phone, Mail, ExternalLink, Send
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const ROLES = ['all', 'participant', 'speaker', 'chairperson', 'vip', 'staff'];
const ROLE_STYLES = {
  participant: 'bg-gray-100 text-gray-600 border-gray-200',
  speaker:     'bg-purple-50 text-purple-700 border-purple-200',
  chairperson: 'bg-amber-50 text-amber-700 border-amber-200',
  vip:         'bg-yellow-50 text-yellow-700 border-yellow-200',
  staff:       'bg-blue-50 text-blue-700 border-blue-200',
};

/** Download individual QR code as PNG via qr-server API */
function downloadQR(qrCode, name) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrCode)}`;
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.download = `QR_${name?.replace(/\s+/g, '_') || 'participant'}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ─── Add / Edit participant modal ─── */
function ParticipantFormModal({ events, participant, onClose, onSaved }) {
  const { t } = useLanguage();
  const isEdit = !!participant?.id;
  const [form, setForm] = useState({
    event_id:      participant?.event_id || events[0]?.id || '',
    name:          participant?.name || '',
    email:         participant?.email || '',
    phone:         participant?.phone || '',
    organization:  participant?.organization || '',
    role:          participant?.role || 'participant',
    ticket_number: participant?.ticket_number || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.event_id || !form.name) return;
    setLoading(true);
    try {
      if (isEdit) await api.put(`/participants/${participant.id}`, form);
      else        await api.post('/participants', form);
      toast.success(t('success'));
      onSaved();
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
        <select value={form[key]} onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="w-full px-2.5 py-2 text-[12px] border border-[#CBD5E1] rounded-sm bg-[#F9FAFB] focus:outline-none focus:border-[#64748B]">
          {options}
        </select>
      ) : (
        <input type={type} value={form[key]} onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="w-full px-2.5 py-2 text-[12px] border border-[#CBD5E1] rounded-sm bg-[#F9FAFB] focus:outline-none focus:border-[#64748B]" />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h3 className="text-[14px] font-semibold text-[#111827] mb-4">
          {isEdit ? t('edit_participant') : t('add_participant')}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          {!isEdit && field(t('select_event'), 'event_id', 'text',
            events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)
          )}
          {field(`${t('name')} *`, 'name')}
          <div className="grid grid-cols-2 gap-3">
            {field(t('email'), 'email', 'email')}
            {field(t('phone'), 'phone', 'tel')}
          </div>
          {field(t('organization'), 'organization')}
          {field(t('role'), 'role', 'text',
            ROLES.filter(r => r !== 'all').map(r => <option key={r} value={r}>{t(r)}</option>)
          )}
          {!isEdit && field(t('ticket_no'), 'ticket_number')}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 text-[12px] border border-slate-200 rounded-lg hover:bg-slate-50 transition-all font-medium text-slate-600">
              {t('cancel')}
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 text-[12px] bg-slate-900 text-white rounded-lg font-medium shadow-sm transition-all hover:bg-slate-800 disabled:opacity-50">
              {loading ? '...' : (isEdit ? t('save') : t('add_participant'))}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ─── Participant row with expandable detail + QR download ─── */
function ParticipantRow({ p, lang, t, isManager, checked, onToggle, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors ${checked ? 'bg-indigo-50/40' : ''}`}
      >
        {/* Row checkbox */}
        <td className="pl-4 pr-2 py-3" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={!!checked} onChange={onToggle}
            className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer" />
        </td>

        {/* Name — click to expand */}
        <td className="px-4 py-3">
          <button onClick={() => setExpanded(x => !x)}
            className="flex items-center gap-2 text-left group w-full">
            <div className="w-7 h-7 bg-gradient-to-br from-slate-100 to-slate-200 border border-[#CBD5E1] rounded-full flex items-center justify-center text-[11px] font-bold text-[#6B7280] shrink-0">
              {p.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-[#374151] group-hover:text-[#111827] transition-colors flex items-center gap-1">
                <span className="truncate">{p.name}</span>
                <ChevronDown size={10} className={`text-[#9CA3AF] transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />
              </div>
              {p.organization && <div className="text-[10px] text-[#9CA3AF] truncate">{p.organization}</div>}
            </div>
          </button>
        </td>

        {/* Role badge */}
        <td className="px-4 py-3">
          <span className={`badge text-[10px] px-2 py-0.5 rounded-full border ${ROLE_STYLES[p.role] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {t(p.role) || p.role}
          </span>
        </td>

        {/* Checkin stages */}
        {/* Checkin stages: Event Arrival (1) and Speaker Verify (3) only */}
          {[{ s: 1, key: 'checkin_at_1' }, { s: 3, key: 'checkin_at_3' }].map(({ s, key }) => (
          <td key={s} className="px-4 py-3">
            {p[key] ? (
              <div className="flex items-center gap-1 text-[10px] text-green-600">
                <UserCheck size={10} />
                {new Date(p[key]).toLocaleTimeString(
                  lang === 'ja' ? 'ja-JP' : 'en-GB',
                  { hour: '2-digit', minute: '2-digit' }
                )}
              </div>
            ) : (
              <span className="text-[10px] text-[#CBD5E1]">—</span>
            )}
          </td>
        ))}

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            {/* QR download — always visible */}
            {p.qr_code && (
              <button
                onClick={() => downloadQR(p.qr_code, p.name)}
                className="p-1.5 text-[#CBD5E1] hover:text-indigo-500 hover:bg-indigo-50 rounded-sm transition-all border border-transparent hover:border-indigo-200"
                title={lang === 'ja' ? 'QRコードをダウンロード' : 'Download QR Code'}
              >
                <QrCode size={12} strokeWidth={1.5} />
              </button>
            )}
            {isManager && (
              <>
                <button onClick={() => onEdit(p)}
                  className="p-1.5 text-[#CBD5E1] hover:text-blue-500 hover:bg-blue-50 rounded-sm transition-all border border-transparent hover:border-blue-200"
                  title={t('edit_participant')}>
                  <Edit2 size={12} strokeWidth={1.5} />
                </button>
                <button onClick={() => onDelete(p.id)}
                  className="p-1.5 text-[#CBD5E1] hover:text-red-500 hover:bg-red-50 rounded-sm transition-all border border-transparent hover:border-red-200"
                  title={t('delete')}>
                  <Trash2 size={12} strokeWidth={1.5} />
                </button>
              </>
            )}
          </div>
        </td>
      </motion.tr>

      {/* Expanded detail row */}
      <AnimatePresence>
        {expanded && (
          <motion.tr
            key={`expand-${p.id}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gradient-to-r from-slate-50 to-white border-b border-[#F3F4F6]"
          >
            <td colSpan={7} className="px-6 py-3">
              <div className="flex flex-wrap items-center gap-5">
                {/* Email */}
                {p.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail size={11} className="text-slate-400 shrink-0" />
                    <span className="text-[11px] font-mono text-slate-600 select-all">{p.email}</span>
                  </div>
                )}
                {/* Phone */}
                {p.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone size={11} className="text-slate-400 shrink-0" />
                    <span className="text-[11px] font-mono text-slate-600 select-all">{p.phone}</span>
                  </div>
                )}
                {/* QR code text + download */}
                {p.qr_code && (
                  <div className="flex items-center gap-1.5">
                    <QrCode size={11} className="text-slate-400 shrink-0" />
                    <span className="text-[10px] font-mono text-[#9CA3AF] select-all">{p.qr_code}</span>
                    <button
                      onClick={() => downloadQR(p.qr_code, p.name)}
                      className="inline-flex items-center gap-1 ml-1 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full hover:bg-indigo-100 transition-all"
                    >
                      <Download size={9} />
                      {lang === 'ja' ? 'QRをDL' : 'DL QR'}
                    </button>
                  </div>
                )}
                {/* Ticket Number */}
                {p.ticket_number && (
                  <div className="text-[10px] text-slate-400 font-mono">
                    #{p.ticket_number}
                  </div>
                )}
              </div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Main Page ─── */
export default function Participants() {
  const { isManager } = useAuth();
  const { lang, t } = useLanguage();
  const [data, setData]       = useState({ participants: [], total: 0, pages: 1 });
  const [events, setEvents]   = useState([]);
  const [filters, setFilters] = useState({ search: '', role: 'all', event_id: '', page: 1, limit: 50 });
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sendingQR, setSendingQR]     = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    api.get('/events').then(r => setEvents(r.data)).catch(() => {});
  }, []);

  useEffect(() => { loadParticipants(); }, [filters]);

  const loadParticipants = async () => {
    setLoading(true);
    try {
      const params = {
        page:  filters.page,
        limit: filters.limit,
        ...(filters.search   && { search:   filters.search }),
        ...(filters.role !== 'all' && { role: filters.role }),
        ...(filters.event_id && { event_id: filters.event_id }),
      };
      const res = await api.get('/participants', { params });
      setData(res.data);
    } catch { toast.error(t('error')); }
    finally  { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('delete_confirm'))) return;
    try {
      await api.delete(`/participants/${id}`);
      toast.success(t('success'));
      loadParticipants();
    } catch { toast.error(t('error')); }
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
    try {
      // Build query params to match the current filter view
      const params = new URLSearchParams();
      if (filters.event_id) params.set('event_id', filters.event_id);
      if (filters.role && filters.role !== 'all') params.set('role', filters.role);
      if (filters.search) params.set('search', filters.search);

      const a = document.createElement('a');
      a.href = `/api/participants/export?${params.toString()}`;
      a.download = 'participants_export.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(t('success'));
    } catch { toast.error(t('error')); }
  };

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val, page: key !== 'page' ? 1 : val }));

  // ── Checkbox helpers ──────────────────────────────────
  const allIds   = data.participants.map(p => p.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
  const toggleAll  = () => setSelectedIds(allSelected ? new Set() : new Set(allIds));
  const toggleOne  = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleSendQR = async () => {
    if (selectedIds.size === 0) return;
    setSendingQR(true);
    try {
      const res = await api.post('/email/send-qr', { 
        participant_ids: [...selectedIds],
        lang 
      });
      const { sent_count, failed_count, skipped_count } = res.data;
      toast.success(
        lang === 'ja'
          ? `QRメール送信: 成功 ${sent_count}件 / スキップ ${skipped_count}件 / 失敗 ${failed_count}件`
          : `QR emails: ${sent_count} sent, ${skipped_count} skipped (no email), ${failed_count} failed`
      );
      setSelectedIds(new Set());
    } catch (err) {
      toast.error(err.response?.data?.error || t('error'));
    } finally {
      setSendingQR(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-3">

      {/* ── Row 1: Action buttons — Export | Import | Add ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-[12px] text-[#9CA3AF]">
          {data.total.toLocaleString()} {t('participants')}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />

          {/* Send QR Email — appears when rows are selected */}
          {selectedIds.size > 0 && (
            <motion.button onClick={handleSendQR} disabled={sendingQR}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 px-3 py-2 text-[12px] bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-all font-medium disabled:opacity-50">
              {sendingQR
                ? <div className="w-3.5 h-3.5 border border-indigo-300 border-t-white rounded-full animate-spin" />
                : <Send size={13} strokeWidth={2} />}
              {lang === 'ja' ? `QRメール送信 (${selectedIds.size}名)` : `Send QR Email (${selectedIds.size})`}
            </motion.button>
          )}

          {/* Export CSV */}
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-[12px] border border-slate-200 rounded-lg bg-white shadow-sm hover:bg-slate-50 transition-all font-medium text-slate-700">
            <Download size={14} strokeWidth={1.5} /> {t('export_csv')}
          </button>

          {/* Import CSV */}
          {isManager && (
            <button onClick={() => fileRef.current?.click()} disabled={csvLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-[12px] border border-slate-200 rounded-lg bg-white shadow-sm hover:bg-slate-50 transition-all font-medium disabled:opacity-50 text-slate-700">
              <Upload size={14} strokeWidth={1.5} /> {csvLoading ? t('importing') : t('import_csv')}
            </button>
          )}

          {/* Add Participant */}
          {isManager && (
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              onClick={() => setModal('add')}
              className="flex items-center gap-1.5 px-3 py-2 text-[12px] bg-slate-900 text-white rounded-lg shadow-sm hover:bg-slate-800 transition-all font-medium">
              <Plus size={14} strokeWidth={2} /> {t('add_participant')}
            </motion.button>
          )}
        </div>
      </div>

      {/* ── Row 2: Filters — Search | Role | Event | Limit ── */}
      <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" strokeWidth={1.5} />
          <input type="text" placeholder={t('search_participants')}
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-[12px] border border-slate-200 rounded-lg shadow-sm bg-white focus:outline-none focus:border-slate-400 transition-all"
          />
        </div>

        {/* Role filter */}
        <select value={filters.role} onChange={(e) => setFilter('role', e.target.value)}
          className="px-3 py-2 text-[12px] border border-slate-200 rounded-lg shadow-sm bg-white focus:outline-none focus:border-slate-400 transition-all text-slate-700">
          {ROLES.map(r => <option key={r} value={r}>{r === 'all' ? t('all_roles') : t(r)}</option>)}
        </select>

        {/* Event filter */}
        <select value={filters.event_id} onChange={(e) => setFilter('event_id', e.target.value)}
          className="px-3 py-2 text-[12px] border border-slate-200 rounded-lg shadow-sm bg-white focus:outline-none focus:border-slate-400 transition-all max-w-52 text-slate-700">
          <option value="">{t('all_events')}</option>
          {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>

        {/* Display limit */}
        <select value={filters.limit} onChange={(e) => setFilter('limit', parseInt(e.target.value))}
          className="px-3 py-2 text-[12px] border border-slate-200 rounded-lg shadow-sm bg-white focus:outline-none focus:border-slate-400 transition-all text-slate-700">
          {[25, 50, 100].map(n => <option key={n} value={n}>{n} / {t('page_label')}</option>)}
        </select>
      </div>

      {/* ── Table ── */}
      <div className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-[#F3F4F6] flex items-center gap-2">
          <Users size={13} strokeWidth={1.5} className="text-[#6B7280]" />
          <span className="text-[12px] font-semibold text-[#374151]">
            {t('page_label')} {filters.page} / {data.pages}
          </span>
          {selectedIds.size > 0 && (
            <span className="ml-2 text-[11px] px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full font-semibold">
              {selectedIds.size} {lang === 'ja' ? '名選択中' : 'selected'}
            </span>
          )}
          <span className="text-[11px] text-[#9CA3AF] ml-1">
            · {t('click_name_to_expand')}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F3F4F6] bg-[#F9FAFB]">
                {/* Select-all checkbox */}
                <th className="pl-4 pr-2 py-2.5 w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll}
                    className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer" />
                </th>
                {[t('name'), t('role'), t('event_arrival') || 'Event Arrival ①', t('speaker_verify') || 'Speaker Verify ③', t('actions')].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="w-5 h-5 border border-[#CBD5E1] border-t-[#64748B] rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : data.participants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[12px] text-[#9CA3AF]">
                    {t('no_participants')}
                  </td>
                </tr>
              ) : (
                data.participants.map((p) => (
                  <ParticipantRow
                    key={p.id}
                    p={p}
                    lang={lang}
                    t={t}
                    isManager={isManager}
                    checked={selectedIds.has(p.id)}
                    onToggle={() => toggleOne(p.id)}
                    onDelete={handleDelete}
                    onEdit={(participant) => setModal(participant)}
                  />
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
              <button onClick={() => setFilter('page', filters.page - 1)} disabled={filters.page <= 1}
                className="w-7 h-7 flex items-center justify-center border border-[#CBD5E1] rounded-sm hover:bg-[#F3F4F6] disabled:opacity-30 transition-all">
                <ChevronLeft size={12} strokeWidth={1.5} />
              </button>
              {Array.from({ length: Math.min(5, data.pages) }, (_, i) => {
                const page = Math.max(1, Math.min(data.pages - 4, filters.page - 2)) + i;
                return (
                  <button key={page} onClick={() => setFilter('page', page)}
                    className={`w-7 h-7 flex items-center justify-center text-[11px] border rounded-sm transition-all
                      ${filters.page === page ? 'bg-[#111827] text-white border-[#111827]' : 'border-[#CBD5E1] hover:bg-[#F3F4F6]'}`}>
                    {page}
                  </button>
                );
              })}
              <button onClick={() => setFilter('page', filters.page + 1)} disabled={filters.page >= data.pages}
                className="w-7 h-7 flex items-center justify-center border border-[#CBD5E1] rounded-sm hover:bg-[#F3F4F6] disabled:opacity-30 transition-all">
                <ChevronRight size={12} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <ParticipantFormModal
          events={events}
          participant={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={loadParticipants}
        />
      )}
    </div>
  );
}
