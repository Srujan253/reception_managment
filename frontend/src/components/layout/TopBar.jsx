import React from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const getPageTitle = (pathname, t) => {
  const titles = {
    '/': t('command_dashboard'),
    '/scanner': t('checkin_scanner'),
    '/sessions': t('session_attendance_engine'),
    '/participants': t('participant_registry'),
    '/events': t('event_management'),
    '/admin': t('administration'),
  };
  return titles[pathname] || 'EventHQ';
};

export default function TopBar({ onMenuClick }) {
  const { user } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const location = useLocation();
  const title = getPageTitle(location.pathname, t);

  const roleLabels = {
    admin: t('admin_role'),
    manager: t('manager'),
    staff: t('staff'),
  };

  const roleBadge = {
    admin: { bg: 'bg-slate-800 text-white' },
    manager: { bg: 'bg-blue-600 text-white' },
    staff: { bg: 'bg-gray-500 text-white' },
  }[user?.role] || { bg: 'bg-gray-500 text-white' };

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center px-4 md:px-6 gap-3 md:gap-4 flex-shrink-0">
      <button 
        onClick={onMenuClick}
        className="md:hidden p-2 -ml-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
      >
        <Menu size={20} />
      </button>
      
      <div className="flex-1 truncate">
        <h1 className="text-[16px] md:text-[17px] font-bold text-slate-900 truncate">{title}</h1>
      </div>

      {/* Language Toggle */}
      <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
        <button
          onClick={() => setLang('en')}
          className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all ${
            lang === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          EN
        </button>
        <button
          onClick={() => setLang('ja')}
          className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all ${
            lang === 'ja' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          JP
        </button>
      </div>

      {/* Search - hidden on mobile */}
      <div className="relative hidden lg:block">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" strokeWidth={1.5} />
        <input
          type="text"
          placeholder={t('search_participants')}
          className="pl-8 pr-3 py-1.5 text-[13px] border border-slate-200 bg-slate-50 rounded-lg w-56 focus:outline-none focus:border-slate-400 transition-colors text-slate-800"
        />
      </div>

      {/* Notification */}
      <button className="w-8 h-8 flex items-center justify-center border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
        <Bell size={15} strokeWidth={1.5} className="text-slate-600" />
      </button>

      {/* Role badge */}
      <div className={`px-2.5 py-1 text-[11px] font-bold rounded-full tracking-widest ${roleBadge.bg} shadow-sm uppercase`}>
        {roleLabels[user?.role] || 'USER'}
      </div>

      {/* Avatar */}
      <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center text-white text-[13px] font-bold shadow-sm">
        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
      </div>
    </header>
  );
}
