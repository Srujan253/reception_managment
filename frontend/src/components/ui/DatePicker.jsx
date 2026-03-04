import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays, X } from 'lucide-react';

const DAYS_OF_WEEK    = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAYS_OF_WEEK_JA = ['日', '月', '火', '水', '木', '金', '土'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_JA = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfMonth(y, m) { return new Date(y, m, 1).getDay(); }

function toYMD(date) {
  if (!date) return null;
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/**
 * DatePicker — Lumina / Antigravity glassmorphism calendar (date only)
 * Uses fixed positioning to escape modal overflow clipping.
 *
 * Props:
 *   value: string        YYYY-MM-DD
 *   onChange: fn         (YYYY-MM-DD) => void
 *   placeholder: string
 *   label: string
 *   lang: 'en'|'ja'
 *   minDate: string      YYYY-MM-DD (optional)
 */
export default function DatePicker({ value, onChange, placeholder = 'Select date', label, lang = 'en', minDate }) {
  const today       = new Date();
  const todayYMD    = toYMD(today);
  const parsed      = value ? new Date(value + 'T00:00:00') : null;

  const [open, setOpen]         = useState(false);
  const [dropPos, setDropPos]   = useState({ top: 0, left: 0 });
  const [viewYear, setViewYear] = useState((parsed || today).getFullYear());
  const [viewMonth, setViewMonth] = useState((parsed || today).getMonth());
  const triggerRef  = useRef(null);
  const dropRef     = useRef(null);

  // Sync view when externally controlled value changes
  useEffect(() => {
    if (parsed) { setViewYear(parsed.getFullYear()); setViewMonth(parsed.getMonth()); }
  }, [value]);

  // Calculate fixed position from trigger rect whenever opened
  const openDropdown = useCallback(() => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      // Try to open below; if not enough space open above
      const DROPDOWN_H = 340;
      const spaceBelow = window.innerHeight - r.bottom;
      const top = spaceBelow >= DROPDOWN_H ? r.bottom + 6 : r.top - DROPDOWN_H - 6;
      setDropPos({ top, left: r.left });
    }
    setOpen(true);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropRef.current    && !dropRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const daysInMonth   = getDaysInMonth(viewYear, viewMonth);
  const firstDay      = getFirstDayOfMonth(viewYear, viewMonth);
  const prevMonthDays = getDaysInMonth(viewYear, viewMonth - 1);

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };

  const selectDate = (y, m, d) => {
    const str = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    onChange(str);
    setOpen(false);
  };

  const goToday = () => {
    onChange(todayYMD);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setOpen(false);
  };

  const clearDate = () => { onChange(''); setOpen(false); };

  const formatDisplay = (val) => {
    if (!val) return '';
    const d = new Date(val + 'T00:00:00');
    if (lang === 'ja') {
      const DOW = ['日','月','火','水','木','金','土'];
      return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${DOW[d.getDay()]}）`;
    }
    const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return `${DOW[d.getDay()]}, ${MONTHS_EN[d.getMonth()].slice(0,3)} ${d.getDate()}, ${d.getFullYear()}`;
  };

  const DAYS_LABELS = lang === 'ja' ? DAYS_OF_WEEK_JA : DAYS_OF_WEEK;
  const MONTH_LABEL = lang === 'ja' ? `${viewYear}年 ${MONTHS_JA[viewMonth]}` : `${MONTHS_EN[viewMonth]} ${viewYear}`;

  // Build 6-row grid
  const cells = [];
  for (let i = firstDay-1; i >= 0; i--)
    cells.push({ day: prevMonthDays-i, month: viewMonth-1, year: viewMonth===0 ? viewYear-1 : viewYear, outside: true });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, month: viewMonth, year: viewYear, outside: false });
  while (cells.length < 42)
    cells.push({ day: cells.length-firstDay-daysInMonth+1, month: viewMonth+1, year: viewMonth===11 ? viewYear+1 : viewYear, outside: true });

  return (
    <div className="relative">
      {label && <label className="block text-[11px] font-medium text-[#374151] mb-1">{label}</label>}

      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={open ? () => setOpen(false) : openDropdown}
        className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] border rounded-sm bg-[#F9FAFB] text-left transition-all focus:outline-none
          ${open ? 'border-slate-400 ring-1 ring-slate-200' : 'border-[#CBD5E1] hover:border-slate-400'}
          ${!value ? 'text-[#9CA3AF]' : 'text-[#111827]'}`}
      >
        <CalendarDays size={13} strokeWidth={1.5} className={open ? 'text-slate-700' : 'text-[#9CA3AF]'} />
        <span className="flex-1 truncate">{value ? formatDisplay(value) : placeholder}</span>
        {value && (
          <span onClick={(e) => { e.stopPropagation(); clearDate(); }}
            className="p-0.5 rounded-full hover:bg-slate-200 transition-colors cursor-pointer">
            <X size={10} className="text-slate-400" />
          </span>
        )}
      </button>

      {/* Dropdown — rendered via portal-like fixed positioning to escape modal overflow */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={dropRef}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            style={{
              position: 'fixed',
              top: dropPos.top,
              left: dropPos.left,
              zIndex: 9999,
              width: 292,
            }}
          >
            <div
              className="rounded-2xl border border-white/60 overflow-hidden"
              style={{
                background:          'rgba(255,255,255,0.88)',
                backdropFilter:      'blur(20px)',
                WebkitBackdropFilter:'blur(20px)',
                boxShadow:           '0 24px 64px -12px rgba(0,0,0,0.26), 0 4px 20px -4px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <button type="button" onClick={prevMonth}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white/80 hover:text-slate-900 transition-all hover:shadow-sm">
                  <ChevronLeft size={15} strokeWidth={2} />
                </button>
                <span className="text-[13px] font-bold text-slate-800 tracking-tight select-none">{MONTH_LABEL}</span>
                <button type="button" onClick={nextMonth}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white/80 hover:text-slate-900 transition-all hover:shadow-sm">
                  <ChevronRight size={15} strokeWidth={2} />
                </button>
              </div>

              {/* Day labels */}
              <div className="grid grid-cols-7 px-3 mb-1">
                {DAYS_LABELS.map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1 select-none">{d}</div>
                ))}
              </div>

              {/* Date grid */}
              <div className="grid grid-cols-7 px-3 pb-2 gap-y-0.5">
                {cells.map((cell, i) => {
                  const cellYMD   = `${cell.year}-${String(cell.month+1).padStart(2,'0')}-${String(cell.day).padStart(2,'0')}`;
                  const isSelected = value === cellYMD;
                  const isToday    = todayYMD === cellYMD;
                  const isDisabled = minDate && cellYMD < minDate;

                  return (
                    <motion.button
                      key={i}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => !isDisabled && selectDate(cell.year, cell.month, cell.day)}
                      whileHover={!isDisabled && !isSelected ? { scale: 1.12 } : {}}
                      whileTap={!isDisabled ? { scale: 0.92 } : {}}
                      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                      className={`relative mx-auto w-8 h-8 flex items-center justify-center text-[12px] rounded-full transition-colors select-none
                        ${isSelected  ? 'text-white font-bold'
                          : isToday   ? 'text-blue-600 font-bold ring-1 ring-blue-400/40'
                          : cell.outside ? 'text-slate-300 hover:text-slate-500'
                          : isDisabled   ? 'text-slate-200 cursor-not-allowed'
                          : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700 font-medium'
                        }`}
                      style={isSelected ? {
                        background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                        filter:     'drop-shadow(0 0 7px rgba(99,102,241,0.60))',
                      } : {}}
                    >
                      {cell.day}
                      {isToday && !isSelected && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100/80">
                <motion.button type="button" onClick={goToday}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  className="px-3 py-1.5 text-[11px] font-semibold text-blue-600 border border-blue-200/70 rounded-lg bg-blue-50/50 hover:bg-blue-50 hover:border-blue-300 transition-all">
                  {lang === 'ja' ? '今日' : 'Today'}
                </motion.button>
                <motion.button type="button" onClick={clearDate}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 border border-slate-200/80 rounded-lg bg-white/50 hover:bg-slate-50 hover:text-slate-700 transition-all">
                  {lang === 'ja' ? 'クリア' : 'Clear'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
