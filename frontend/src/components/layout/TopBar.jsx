import React from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const pageTitles = {
  '/': 'Command Dashboard',
  '/scanner': 'Check-in Scanner',
  '/sessions': 'Session Attendance Engine',
  '/participants': 'Participant Registry',
  '/events': 'Event Management',
  '/admin': 'Administration',
};

export default function TopBar() {
  const { user } = useAuth();
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'EventHQ';

  const roleBadge = {
    admin: { bg: 'bg-slate-800 text-white', label: 'ADMIN' },
    manager: { bg: 'bg-blue-600 text-white', label: 'MANAGER' },
    staff: { bg: 'bg-gray-500 text-white', label: 'STAFF' },
  }[user?.role] || { bg: 'bg-gray-500 text-white', label: 'USER' };

  return (
    <header className="h-14 border-b border-[#CBD5E1] bg-[#F9FAFB] flex items-center px-6 gap-4 flex-shrink-0">
      <div className="flex-1">
        <h1 className="text-[15px] font-semibold text-[#111827]">{title}</h1>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" strokeWidth={1.5} />
        <input
          type="text"
          placeholder="Search participants..."
          className="pl-8 pr-3 py-1.5 text-[12px] border border-[#CBD5E1] bg-[#F3F4F6] rounded-sm w-56 focus:outline-none focus:border-[#64748B] transition-colors"
        />
      </div>

      {/* Notification */}
      <button className="w-8 h-8 flex items-center justify-center border border-[#CBD5E1] bg-[#F3F4F6] rounded-sm hover:bg-white transition-colors" style={{ boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.05)' }}>
        <Bell size={14} strokeWidth={1.5} className="text-[#6B7280]" />
      </button>

      {/* Role badge */}
      <div className={`px-2.5 py-1 text-[11px] font-bold rounded-sm tracking-widest ${roleBadge.bg}`} style={{ boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.15)' }}>
        {roleBadge.label}
      </div>

      {/* Avatar */}
      <div className="w-8 h-8 bg-[#111827] rounded-sm flex items-center justify-center text-white text-[12px] font-bold" style={{ boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.15)' }}>
        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
      </div>
    </header>
  );
}
