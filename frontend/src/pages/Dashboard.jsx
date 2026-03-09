import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  CalendarDays, UserCheck, MonitorPlay, Users,
  ArrowUpRight, ChevronRight, ChevronDown, Activity,
  Clock, TrendingUp, Zap
} from 'lucide-react';
import api from '../lib/api';
import { useLanguage } from '../context/LanguageContext';

/* ── Animated number counter ── */
function AnimatedNumber({ value }) {
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 80, damping: 18 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    motionVal.set(value);
  }, [value]);

  useEffect(() => {
    return spring.on('change', (v) => setDisplay(Math.round(v)));
  }, [spring]);

  return <>{display.toLocaleString()}</>;
}

/* ── Stat card ── */
const statConfig = [
  { key: 'total_events',     labelKey: 'total_events',     icon: CalendarDays, accent: 'from-slate-100 to-white', iconBg: 'bg-slate-100', iconColor: 'text-slate-600' },
  { key: 'live_checkins',    labelKey: 'live_checkins',     icon: UserCheck,    accent: 'from-emerald-50 to-white', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', live: true },
  { key: 'sessions_today',   labelKey: 'sessions_today',   icon: MonitorPlay,  accent: 'from-blue-50 to-white',   iconBg: 'bg-blue-50',   iconColor: 'text-blue-600'   },
  { key: 'total_registered', labelKey: 'total_registered', icon: Users,        accent: 'from-violet-50 to-white', iconBg: 'bg-violet-50', iconColor: 'text-violet-600' },
];

function StatCard({ stat, value, index }) {
  const { t } = useLanguage();
  const Icon = stat.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.09, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2, ease: 'easeOut' } }}
      whileTap={{ scale: 0.98 }}
      className={`relative border border-slate-200 bg-gradient-to-br ${stat.accent} rounded-2xl p-5 cursor-default overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
    >
      {/* subtle grid texture */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      <div className="relative flex items-start justify-between mb-4">
        <motion.div
          whileHover={{ rotate: 8, scale: 1.1 }}
          transition={{ type: 'spring', stiffness: 400 }}
          className={`w-10 h-10 ${stat.iconBg} border border-white rounded-xl flex items-center justify-center shadow-sm`}
        >
          <Icon size={18} strokeWidth={1.5} className={stat.iconColor} />
        </motion.div>

        {stat.live && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.09 + 0.3, type: 'spring', stiffness: 500 }}
            className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"
          >
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"
            />
            {t('live').toUpperCase()}
          </motion.span>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.09 + 0.2 }}
        className="text-[30px] font-black text-slate-900 leading-none mb-1.5 tabular-nums"
      >
        {value != null ? <AnimatedNumber value={value} /> : '—'}
      </motion.div>
      <div className="text-[12px] text-slate-500 font-medium tracking-wide">{t(stat.labelKey)}</div>
    </motion.div>
  );
}

/* ── Hierarchy row ── */
function HierarchyRow({ event, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = event.sub_events?.length > 0 || event.sessions?.length > 0;
  const { t, lang } = useLanguage();

  const statusCfg = {
    active:    { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    upcoming:  { bg: 'bg-blue-50 text-blue-600 border-blue-200',          dot: 'bg-blue-400' },
    completed: { bg: 'bg-slate-100 text-slate-500 border-slate-200',      dot: 'bg-slate-400' },
    cancelled: { bg: 'bg-red-50 text-red-500 border-red-200',             dot: 'bg-red-400' },
  }[event.status] || { bg: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' };

  return (
    <>
      <motion.tr
        layout
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`border-b border-slate-100 transition-colors cursor-pointer group ${depth > 0 ? 'bg-slate-50/40' : 'hover:bg-slate-50'}`}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <td className="px-4 py-3" colSpan={depth === 0 ? 1 : 2}>
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
            {hasChildren ? (
              <motion.span
                animate={{ rotate: expanded ? 90 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="text-slate-400 flex-shrink-0"
              >
                <ChevronRight size={13} strokeWidth={1.5} />
              </motion.span>
            ) : (
              <span className="w-3 h-px bg-slate-300 inline-block ml-1 mr-1" />
            )}
            <span className={`text-[13px] font-medium ${depth === 0 ? 'text-slate-900' : depth === 1 ? 'text-slate-700' : 'text-slate-500'}`}>
              {event.name || event.title}
            </span>
          </div>
        </td>
        {depth === 0 && <td className="px-5 py-3 text-[13px] text-slate-400">—</td>}
        <td className="px-5 py-3">
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusCfg.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
            {t(event.status)}
          </span>
        </td>
        <td className="px-5 py-3 text-[13px] text-slate-500 tabular-nums">
          {event.participant_count || event.attendee_count || event.session_count || '—'}
        </td>
        <td className="px-5 py-3 text-[12px] text-slate-400 tabular-nums">
          {event.start_date
            ? new Date(event.start_date).toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-GB')
            : event.start_time
            ? new Date(event.start_time).toLocaleString(lang === 'ja' ? 'ja-JP' : 'en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : '—'}
        </td>
        <td className="px-4 py-3 text-[12px] text-slate-500">{event.venue || event.venue_room || event.room || '—'}</td>
      </motion.tr>

      <AnimatePresence>
        {expanded && event.sub_events?.map((se) => (
          <HierarchyRow key={`se-${se.id}`} event={se} depth={depth + 1} />
        ))}
        {expanded && event.sessions?.map((s) => (
          <HierarchyRow key={`s-${s.id}`} event={s} depth={depth + 1} />
        ))}
      </AnimatePresence>
    </>
  );
}

/* ── Mobile hierarchy card ── */
function HierarchyCard({ event, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = event.sub_events?.length > 0 || event.sessions?.length > 0;
  const { t, lang } = useLanguage();

  const statusCfg = {
    active:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    upcoming:  'bg-blue-50 text-blue-600 border-blue-200',
    completed: 'bg-slate-100 text-slate-500 border-slate-200',
    cancelled: 'bg-red-50 text-red-500 border-red-200',
  }[event.status] || 'bg-slate-100 text-slate-500 border-slate-200';

  return (
    <div className={depth > 0 ? 'ml-4 border-l-2 border-slate-100 pl-3' : ''}>
      <motion.div
        layout
        className={`py-3 ${depth === 0 ? 'border-b border-slate-100' : 'border-b border-slate-50'} ${hasChildren ? 'cursor-pointer' : ''}`}
        onClick={() => hasChildren && setExpanded(!expanded)}
        whileTap={{ backgroundColor: '#f8fafc' }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {hasChildren && (
              <motion.span
                animate={{ rotate: expanded ? 90 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="text-slate-400 flex-shrink-0"
              >
                <ChevronRight size={12} strokeWidth={1.5} />
              </motion.span>
            )}
            <span className={`text-[13px] font-semibold truncate ${depth === 0 ? 'text-slate-900' : 'text-slate-700'}`}>
              {event.name || event.title}
            </span>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${statusCfg}`}>
            {t(event.status)}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1.5 pl-4 text-[11px] text-slate-400 flex-wrap">
          {(event.participant_count || event.attendee_count) && (
            <span className="flex items-center gap-1"><Users size={10} />{event.participant_count || event.attendee_count}</span>
          )}
          {(event.start_date || event.start_time) && (
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {event.start_date
                ? new Date(event.start_date).toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-GB')
                : new Date(event.start_time).toLocaleString(lang === 'ja' ? 'ja-JP' : 'en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {(event.venue || event.venue_room) && (
            <span className="truncate max-w-[140px]">{event.venue || event.venue_room}</span>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
          >
            {event.sub_events?.map(se => <HierarchyCard key={`se-${se.id}`} event={se} depth={depth + 1} />)}
            {event.sessions?.map(s => <HierarchyCard key={`s-${s.id}`} event={s} depth={depth + 1} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main Dashboard ── */
export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [hierarchy, setHierarchy] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t, lang } = useLanguage();

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
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full"
      />
    </div>
  );

  const checkinPct = stats?.checkin_rate || 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto space-y-5 px-3 sm:px-4 lg:px-0"
    >
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statConfig.map((s, i) => (
          <StatCard key={s.key} stat={s} value={stats?.[s.key]} index={i} />
        ))}
      </div>

      {/* Check-in rate */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="border border-slate-200 bg-white rounded-2xl p-5 shadow-sm overflow-hidden relative"
        >
          {/* bg decoration */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 0.04, x: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="absolute right-4 top-1/2 -translate-y-1/2"
          >
            <TrendingUp size={80} strokeWidth={0.8} className="text-slate-900" />
          </motion.div>

          <div className="relative flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                <Activity size={14} strokeWidth={1.5} className="text-slate-500" />
              </motion.div>
              <span className="text-[13px] font-semibold text-slate-700">{t('checkin_rate_desc')}</span>
            </div>
            <div className="flex items-center gap-2">
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 400 }}
                className="text-[22px] font-black text-slate-900 tabular-nums"
              >
                {checkinPct}%
              </motion.span>
              <span className="text-[11px] text-slate-400 font-medium">
                {stats.live_checkins} / {stats.total_registered}
              </span>
            </div>
          </div>

          {/* Animated progress bar */}
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${checkinPct}%` }}
              transition={{ delay: 0.55, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="h-full bg-slate-900 rounded-full relative overflow-hidden"
            >
              {/* shimmer sweep */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ delay: 1.4, duration: 0.9, ease: 'easeInOut' }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              />
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Hierarchy table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.44, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div>
            <h3 className="text-[14px] font-bold text-slate-900">{t('event_hierarchy')}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{t('event_hierarchy_desc')}</p>
          </div>
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex items-center gap-1 text-[10px] font-bold text-slate-500 border border-slate-200 px-2.5 py-1 rounded-full bg-white"
          >
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"
            />
            {t('live')}
          </motion.span>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden">
          {hierarchy.length === 0 ? (
            <p className="px-4 py-12 text-center text-[13px] text-slate-400">{t('no_events_found')}</p>
          ) : (
            <div className="px-4 py-2">
              {hierarchy.map((event, i) => (
                <motion.div
                  key={`ec-${event.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <HierarchyCard event={event} depth={0} />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60">
                {[t('name'), '—', t('status'), t('count'), t('date_time'), t('venue_room')].map((h, idx) => (
                  <th key={idx} className="px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hierarchy.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[13px] text-slate-400">{t('no_events_found')}</td>
                </tr>
              ) : (
                hierarchy.map(event => (
                  <HierarchyRow key={`e-${event.id}`} event={event} depth={0} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Recent check-ins */}
        {stats?.recent_checkins?.length > 0 && (
          <div className="border-t border-slate-100 px-4 sm:px-5 py-4">
            <h4 className="text-[12px] font-bold text-slate-700 mb-3 flex items-center gap-1.5">
              <Zap size={12} className="text-amber-500" />
              {t('recent_checkins')}
            </h4>
            <div className="space-y-2">
              {stats.recent_checkins.map((c, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.04, duration: 0.3 }}
                  className="flex items-center gap-3 text-[12px] group"
                >
                  <motion.div
                    whileHover={{ scale: 1.15 }}
                    className="w-6 h-6 bg-slate-900 text-white rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  >
                    {c.name?.charAt(0)}
                  </motion.div>
                  <span className="font-semibold text-slate-700 flex-1 truncate">{c.name}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                    c.role === 'speaker'     ? 'bg-violet-50 text-violet-700 border-violet-200' :
                    c.role === 'chairperson' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-slate-100 text-slate-600 border-slate-200'}`}>{t(c.role)}</span>
                  <span className="text-slate-400 hidden sm:block truncate max-w-[120px]">{c.event_name}</span>
                  <span className="text-slate-400 tabular-nums flex-shrink-0">
                    {new Date(c.checkin_at || c.checkin_at_1).toLocaleTimeString(lang === 'ja' ? 'ja-JP' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}