import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, QrCode, Users, CalendarDays,
  MonitorPlay, ShieldCheck, LogOut, Zap, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { AnimatePresence } from 'framer-motion';

const getNavItems = (t) => [
  { to: '/', icon: LayoutDashboard, label: t('dashboard'), end: true },
  { to: '/events', icon: CalendarDays, label: t('events'), managerOnly: true },
  { to: '/sessions', icon: MonitorPlay, label: t('sessions') },
  { to: '/participants', icon: Users, label: t('participants') },
  { to: '/scanner', icon: QrCode, label: t('scanner') },
  { to: '/admin', icon: ShieldCheck, label: t('admin'), adminOnly: true },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, isAdmin, isManager } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const navItems = getNavItems(t);

  const handleLogout = () => {
    logout();
    navigate('/login');
    if (onClose) onClose();
  };

  const roleLabels = {
    admin: t('admin_role'),
    manager: t('manager'),
    staff: t('staff'),
  };

  const roleBadgeColor = {
    admin: 'bg-slate-100 text-slate-700 border-slate-300',
    manager: 'bg-blue-50 text-blue-700 border-blue-200',
    staff: 'bg-gray-100 text-gray-600 border-gray-300',
  }[user?.role] || 'bg-gray-100 text-gray-600 border-gray-300';

  const sidebarContent = (
    <div className="w-[240px] flex-shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col h-full shadow-xl md:shadow-none">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-slate-900 flex items-center justify-center rounded-lg">
            <Zap size={14} className="text-white" strokeWidth={1.8} />
          </div>
          <div>
            <div className="font-semibold text-[#111827] text-sm leading-none">EventHQ</div>
            <div className="text-[10px] text-[#9CA3AF] mt-0.5">{t('enterprise')}</div>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="md:hidden p-1.5 hover:bg-slate-200 rounded-lg text-slate-500"
        >
          <X size={18} />
        </button>
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
              onClick={() => {
                if (window.innerWidth < 768) onClose();
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all group
                ${isActive
                  ? 'bg-slate-200 text-slate-900'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
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
      <div className="px-3 py-4 border-t border-slate-200">
        <div className="mb-3 px-3">
          <div className="text-[12px] font-medium text-[#111827] truncate">{user?.name}</div>
          <div className="text-[11px] text-[#9CA3AF] truncate">{user?.email}</div>
          <span className={`mt-1 inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border rounded-sm ${roleBadgeColor}`}>
            {roleLabels[user?.role] || 'USER'}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
        >
          <LogOut size={14} strokeWidth={1.5} />
          <span>{t('sign_out')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="fixed inset-y-0 left-0 z-50 md:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
