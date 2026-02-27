import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const pageTitles = {
  '/': 'Command Dashboard',
  '/scanner': 'Check-in Scanner',
  '/sessions': 'Session Attendance Engine',
  '/participants': 'Participant Registry',
  '/events': 'Event Management',
  '/admin': 'Administration',
};

export default function TopBar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const title = pageTitles[location.pathname] || 'EventHQ';

  const roleBadge = {
    admin: { bg: 'bg-slate-800 text-white', label: 'ADMIN' },
    manager: { bg: 'bg-blue-600 text-white', label: 'MANAGER' },
    staff: { bg: 'bg-gray-500 text-white', label: 'STAFF' },
  }[user?.role] || { bg: 'bg-gray-500 text-white', label: 'USER' };

  const handleLogout = async () => {
    try {
      logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (err) {
      toast.error('Logout failed');
    }
  };

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center px-4 md:px-6 gap-3 md:gap-4 flex-shrink-0 relative z-50">
      <button 
        onClick={onMenuClick}
        className="md:hidden p-2 -ml-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
      >
        <Menu size={20} />
      </button>
      
      <div className="flex-1 truncate">
        <h1 className="text-[14px] md:text-[15px] font-semibold text-slate-900 truncate">{title}</h1>
      </div>

      {/* Search - hidden on mobile */}
      <div className="relative hidden lg:block">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.5} />
        <input
          type="text"
          placeholder="Search participants..."
          className="pl-8 pr-3 py-1.5 text-[12px] border border-slate-200 bg-slate-50 rounded-lg w-56 focus:outline-none focus:border-slate-400 transition-colors"
        />
      </div>

      {/* Notification */}
      <button className="w-8 h-8 flex items-center justify-center border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
        <Bell size={14} strokeWidth={1.5} className="text-slate-500" />
      </button>

      {/* Role badge */}
      <div className={`px-2.5 py-1 text-[10px] font-bold rounded-full tracking-widest ${roleBadge.bg} shadow-sm`}>
        {roleBadge.label}
      </div>

      {/* User Menu Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center text-white text-[12px] font-bold shadow-sm hover:bg-violet-700 transition-colors"
        >
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </button>

        {/* Dropdown Menu */}
        {showUserMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-[13px] font-semibold text-slate-900">{user?.name}</p>
              <p className="text-[11px] text-slate-500">{user?.email}</p>
            </div>

            {/* Menu Items */}
            <button
              onClick={() => {
                setShowUserMenu(false);
                navigate('/forgot-password');
              }}
              className="w-full px-4 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <User size={14} />
              Reset Password
            </button>

            {/* Logout */}
            <button
              onClick={() => {
                setShowUserMenu(false);
                handleLogout();
              }}
              className="w-full px-4 py-2 text-left text-[13px] text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 border-t border-slate-100"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Close dropdown when clicking outside */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  );
}
