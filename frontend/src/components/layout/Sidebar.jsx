import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, QrCode, Users, CalendarDays,
  MonitorPlay, ShieldCheck, LogOut, Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/scanner', icon: QrCode, label: 'Scanner' },
  { to: '/sessions', icon: MonitorPlay, label: 'Sessions' },
  { to: '/participants', icon: Users, label: 'Participants' },
  { to: '/events', icon: CalendarDays, label: 'Events', managerOnly: true },
  { to: '/admin', icon: ShieldCheck, label: 'Admin', adminOnly: true },
];

export default function Sidebar() {
  const { user, logout, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleBadgeColor = {
    admin: 'bg-slate-100 text-slate-700 border-slate-300',
    manager: 'bg-blue-50 text-blue-700 border-blue-200',
    staff: 'bg-gray-100 text-gray-600 border-gray-300',
  }[user?.role] || 'bg-gray-100 text-gray-600 border-gray-300';

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-[220px] flex-shrink-0 border-r border-[#CBD5E1] bg-[#F9FAFB] flex flex-col h-full"
      style={{ boxShadow: '2px 0 0 0 rgba(0,0,0,0.04)' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#CBD5E1]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#111827] flex items-center justify-center rounded-sm" style={{ boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.2)' }}>
            <Zap size={14} className="text-white" strokeWidth={1.8} />
          </div>
          <div>
            <div className="font-semibold text-[#111827] text-sm leading-none">EventHQ</div>
            <div className="text-[10px] text-[#9CA3AF] mt-0.5">Enterprise</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, end, adminOnly, managerOnly }) => {
          if (adminOnly && !isAdmin) return null;
          if (managerOnly && !isManager) return null;

          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-sm text-[13px] font-medium transition-all group
                ${isActive
                  ? 'bg-[#111827] text-white shadow-hard-sm'
                  : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={15} strokeWidth={isActive ? 2 : 1.5} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User info */}
      <div className="px-3 py-4 border-t border-[#CBD5E1]">
        <div className="mb-3 px-3">
          <div className="text-[12px] font-medium text-[#111827] truncate">{user?.name}</div>
          <div className="text-[11px] text-[#9CA3AF] truncate">{user?.email}</div>
          <span className={`mt-1 inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border rounded-sm ${roleBadgeColor}`}>
            {user?.role}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-[#6B7280] hover:text-[#DC2626] hover:bg-red-50 rounded-sm transition-all"
        >
          <LogOut size={14} strokeWidth={1.5} />
          <span>Sign out</span>
        </button>
      </div>
    </motion.aside>
  );
}
