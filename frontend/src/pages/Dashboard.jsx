import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays, Users, MonitorPlay, TrendingUp,
  ArrowUpRight, ChevronRight, ChevronDown, Activity,
  UserCheck, Clock
} from 'lucide-react';
import api from '../lib/api';

const statConfig = [
  { key: 'total_events', label: 'Total Events', label_ja: '総イベント数', icon: CalendarDays, color: 'text-[#374151]' },
  { key: 'live_checkins', label: 'Live Check-ins', label_ja: 'チェックイン数', icon: UserCheck, color: 'text-[#16A34A]', positive: true },
  { key: 'sessions_today', label: 'Sessions Today', label_ja: '本日のセッション', icon: MonitorPlay, color: 'text-[#2563EB]' },
  { key: 'total_registered', label: 'Total Registered', label_ja: '登録者数', icon: Users, color: 'text-[#7C3AED]' },
];

function StatCard({ stat, value, index }) {
  const Icon = stat.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="border border-slate-200 bg-white rounded-2xl p-6 cursor-default transition-all shadow-sm"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center">
          <Icon size={18} strokeWidth={1.5} className={stat.color} />
        </div>
        {stat.positive && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-[#16A34A] bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-sm">
            <ArrowUpRight size={10} /> LIVE
          </span>
        )}
      </div>
      <div className="text-[32px] font-bold text-slate-900 leading-none mb-1.5">
        {value?.toLocaleString() ?? '—'}
      </div>
      <div className="text-[13px] text-slate-500 font-medium">{stat.label}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{stat.label_ja}</div>
    </motion.div>
  );
}

function HierarchyRow({ event, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = event.sub_events?.length > 0;

  const statusColor = {
    active: 'bg-green-100 text-green-700 border-green-200',
    upcoming: 'bg-blue-50 text-blue-600 border-blue-200',
    completed: 'bg-gray-100 text-gray-500 border-gray-200',
    cancelled: 'bg-red-50 text-red-500 border-red-200',
  }[event.status] || 'bg-gray-100 text-gray-500 border-gray-200';

  return (
    <>
      <tr
        className={`border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${depth > 0 ? 'bg-slate-50/50' : ''}`}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
            {hasChildren ? (
              <span className="text-[#9CA3AF]">
                {expanded ? <ChevronDown size={12} strokeWidth={1.5} /> : <ChevronRight size={12} strokeWidth={1.5} />}
              </span>
            ) : (
              <span className="w-3 h-px bg-[#CBD5E1] inline-block ml-1 mr-1" />
            )}
            <span className={`text-[13px] font-medium ${depth === 0 ? 'text-[#111827]' : depth === 1 ? 'text-[#374151]' : 'text-[#6B7280]'}`}>
              {event.name || event.title}
            </span>
          </div>
        </td>
        <td className="px-5 py-4 text-[13px] text-slate-500">{event.name_ja || event.title_ja || '—'}</td>
        <td className="px-5 py-4">
          <span className={`badge text-[11px] px-2.5 py-1 ${statusColor}`}>{event.status || '—'}</span>
        </td>
        <td className="px-5 py-4 text-[13px] text-slate-500">
          {event.participant_count || event.attendee_count || event.session_count || '—'}
        </td>
        <td className="px-5 py-4 text-[12px] text-slate-400">
          {event.start_date ? new Date(event.start_date).toLocaleDateString('en-GB') :
           event.start_time ? new Date(event.start_time).toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
        </td>
        <td className="px-4 py-3 text-[12px] text-[#6B7280]">{event.venue || event.venue_room || event.room || '—'}</td>
      </tr>
      {expanded && event.sub_events?.map((se) => (
        <HierarchyRow key={`se-${se.id}`} event={se} depth={depth + 1} />
      ))}
      {expanded && event.sessions?.map((s) => (
        <HierarchyRow key={`s-${s.id}`} event={s} depth={depth + 1} />
      ))}
    </>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [hierarchy, setHierarchy] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/hierarchy'),
    ]).then(([statsRes, hierRes]) => {
      setStats(statsRes.data);
      setHierarchy(hierRes.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border border-[#CBD5E1] border-t-[#64748B] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statConfig.map((s, i) => (
          <StatCard key={s.key} stat={s} value={stats?.[s.key]} index={i} />
        ))}
      </div>

      {/* Check-in rate bar */}
      {stats && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="border border-slate-200 bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity size={13} strokeWidth={1.5} className="text-[#6B7280]" />
              <span className="text-[13px] font-medium text-[#374151]">Overall Check-in Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[20px] font-bold text-[#111827]">{stats.checkin_rate}%</span>
              <span className="text-[11px] text-[#9CA3AF]">{stats.live_checkins} / {stats.total_registered}</span>
            </div>
          </div>
          <div className="h-3 bg-slate-100 border border-slate-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.checkin_rate}%` }}
              transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-slate-800 rounded-full"
            />
          </div>
        </motion.div>
      )}

      {/* Hierarchy Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.35 }}
        className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm"
      >
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">Event Hierarchy</h3>
            <p className="text-[12px] text-slate-500 mt-1">イベント階層 — Global Events → Sub-Events → Sessions → Participants</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-[10px] text-[#6B7280] border border-[#CBD5E1] px-2 py-1 rounded-sm bg-[#F9FAFB]">
              <Clock size={10} /> Live
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {['Name / 名前', 'Japanese / 日本語', 'Status', 'Count', 'Date / Time', 'Venue/Room'].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-[12px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hierarchy.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[13px] text-[#9CA3AF]">
                    No events found. Create your first event to get started.
                  </td>
                </tr>
              ) : (
                hierarchy.map((event) => (
                  <HierarchyRow key={`e-${event.id}`} event={event} depth={0} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Recent check-ins */}
        {stats?.recent_checkins?.length > 0 && (
          <div className="border-t border-[#F3F4F6] px-5 py-4">
            <h4 className="text-[12px] font-semibold text-[#374151] mb-3">Recent Check-ins</h4>
            <div className="space-y-1.5">
              {stats.recent_checkins.map((c, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 text-[12px]"
                >
                  <div className="w-5 h-5 bg-[#F3F4F6] border border-[#CBD5E1] rounded-sm flex items-center justify-center text-[9px] font-bold text-[#6B7280]">
                    {c.name?.charAt(0)}
                  </div>
                  <span className="font-medium text-[#374151] flex-1">{c.name}</span>
                  <span className={`badge text-[10px] ${
                    c.role === 'speaker' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    c.role === 'chairperson' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-gray-100 text-gray-600 border-gray-200'
                  }`}>{c.role}</span>
                  <span className="text-[#9CA3AF]">{c.event_name}</span>
                  <span className="text-[#9CA3AF]">{new Date(c.checkin_at_1).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
