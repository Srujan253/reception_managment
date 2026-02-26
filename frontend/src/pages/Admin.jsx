import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, UserCog, Trash2, Key, ToggleLeft, ToggleRight, Lock } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const ROLE_STYLES = {
  admin: 'bg-slate-100 text-slate-700 border-slate-300',
  manager: 'bg-blue-50 text-blue-700 border-blue-200',
  staff: 'bg-gray-100 text-gray-600 border-gray-200',
};

const RBAC_GUIDE = [
  {
    role: 'Admin',
    style: 'bg-slate-800 text-white',
    permissions: ['All features', 'User management', 'Delete events', 'Force exit sessions', 'Role assignment', 'System config'],
  },
  {
    role: 'Manager',
    style: 'bg-blue-600 text-white',
    permissions: ['Create/edit events', 'Add participants', 'Import/export CSV', 'Manage sessions', 'View all reports'],
    restricted: ['User management', 'Delete events', 'System config'],
  },
  {
    role: 'Staff',
    style: 'bg-gray-500 text-white',
    permissions: ['View dashboard', 'Run scanner', 'View participants', 'Session check-ins'],
    restricted: ['Create/edit events', 'Import/export CSV', 'Admin panel'],
  },
];

export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pwModal, setPwModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await api.put(`/users/${userId}/role`, { role });
      setUsers(u => u.map(x => x.id === userId ? { ...x, role } : x));
      toast.success('Role updated');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleToggleActive = async (u) => {
    try {
      await api.put(`/users/${u.id}/status`, { is_active: !u.is_active });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !u.is_active } : x));
      toast.success(u.is_active ? 'User deactivated' : 'User activated');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (u) => {
    if (!confirm(`Delete user "${u.name}"?`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      setUsers(prev => prev.filter(x => x.id !== u.id));
      toast.success('User deleted');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handlePasswordReset = async () => {
    if (!newPassword || newPassword.length < 6) { toast.error('Password must be 6+ characters'); return; }
    try {
      await api.put(`/users/${pwModal.id}/password`, { password: newPassword });
      toast.success('Password updated');
      setPwModal(null);
      setNewPassword('');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* RBAC Guide */}
      <div className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5 bg-slate-50/50">
          <Shield size={16} strokeWidth={2} className="text-slate-500" />
          <span className="text-[14px] font-semibold text-slate-800">Role-Based Access Control (RBAC)</span>
          <span className="text-[12px] text-slate-400 ml-1 font-medium">— 役割別アクセス制御</span>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          {RBAC_GUIDE.map((r) => (
            <div key={r.role} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className={`px-4 py-3 ${r.style} bg-opacity-90`}>
                <span className="text-[13px] font-bold">{r.role}</span>
              </div>
              <div className="px-3 py-3 space-y-1.5">
                <div className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Allowed</div>
                {r.permissions.map(p => (
                  <div key={p} className="flex items-center gap-1.5 text-[11px] text-[#374151]">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0" />
                    {p}
                  </div>
                ))}
                {r.restricted && (
                  <>
                    <div className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide mt-3 mb-2">Restricted</div>
                    {r.restricted.map(p => (
                      <div key={p} className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF]">
                        <Lock size={9} strokeWidth={1.5} className="flex-shrink-0" />
                        {p}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Users table */}
      <div className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <UserCog size={16} strokeWidth={2} className="text-slate-500" />
            <span className="text-[14px] font-semibold text-slate-800">Staff Management ({users.length})</span>
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#F3F4F6] bg-[#F9FAFB]">
              {['User / ユーザー', 'Email', 'Role / 役割', 'Status', 'Joined', 'Actions'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center"><div className="w-5 h-5 border border-[#CBD5E1] border-t-[#64748B] rounded-full animate-spin mx-auto" /></td></tr>
            ) : users.map((u, i) => (
              <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center text-indigo-700 text-[12px] font-bold shadow-sm">
                      {u.name?.charAt(0)}
                    </div>
                    <div>
                      <div className="text-[12px] font-medium text-[#374151]">{u.name}</div>
                      {u.id === user?.id && <div className="text-[10px] text-[#9CA3AF]">(you)</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-[11px] text-[#6B7280]">{u.email}</td>
                <td className="px-4 py-3">
                  {u.id === user?.id ? (
                    <span className={`badge text-[10px] ${ROLE_STYLES[u.role]}`}>{u.role}</span>
                  ) : (
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className={`text-[11px] px-2 py-1 rounded-sm border font-semibold cursor-pointer focus:outline-none ${ROLE_STYLES[u.role]}`}
                    >
                      {['admin', 'manager', 'staff'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => u.id !== user?.id && handleToggleActive(u)}
                    disabled={u.id === user?.id}
                    className="flex items-center gap-1.5 text-[11px] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    {u.is_active
                      ? <><ToggleRight size={16} strokeWidth={1.5} className="text-green-500" /><span className="text-green-600">Active</span></>
                      : <><ToggleLeft size={16} strokeWidth={1.5} className="text-[#9CA3AF]" /><span className="text-[#9CA3AF]">Inactive</span></>
                    }
                  </button>
                </td>
                <td className="px-4 py-3 text-[11px] text-[#9CA3AF]">{new Date(u.created_at).toLocaleDateString('en-GB')}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => { setPwModal(u); setNewPassword(''); }}
                      className="p-1.5 border border-[#CBD5E1] rounded-sm hover:bg-[#F3F4F6] transition-all" title="Reset password">
                      <Key size={11} strokeWidth={1.5} className="text-[#6B7280]" />
                    </button>
                    {u.id !== user?.id && (
                      <button onClick={() => handleDelete(u)}
                        className="p-1.5 border border-[#CBD5E1] rounded-sm hover:bg-red-50 hover:border-red-200 transition-all" title="Delete user">
                        <Trash2 size={11} strokeWidth={1.5} className="text-[#9CA3AF] hover:text-red-500" />
                      </button>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Password Reset Modal */}
      {pwModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4" onClick={() => setPwModal(null)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-[14px] font-semibold text-[#111827] mb-1">Reset Password</h3>
            <p className="text-[12px] text-[#6B7280] mb-4">Set a new password for <strong>{pwModal.name}</strong></p>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              className="w-full px-4 py-3 text-[13px] border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all font-mono shadow-inner mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setPwModal(null)} className="flex-1 py-2.5 text-[13px] border border-slate-200 rounded-lg hover:bg-slate-50 font-medium text-slate-600 transition-all">Cancel</button>
              <button onClick={handlePasswordReset} className="flex-1 py-2.5 text-[13px] bg-slate-900 text-white rounded-lg font-medium shadow-md hover:bg-slate-800 transition-all">
                Update Password
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
