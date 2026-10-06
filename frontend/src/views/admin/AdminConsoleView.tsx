import React, { useEffect, useState } from 'react';
import {
  listAdminUsers,
  createAdminUser,
  deleteAdminUser,
  setAdminPreviewRole,
  fetchSecurityAuditLogs,
} from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { UserSummary, SecurityAuditLog, UserRole } from '../../../types/api';
import {
  Users,
  Shield,
  Eye,
  Trash2,
  UserPlus,
  Lock,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export const AdminConsoleView: React.FC = () => {
  const { user, refreshUser, switchPreviewRole } = useAuth();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'preview'>('users');
  const [isLoading, setIsLoading] = useState(true);

  // New User Form State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('SUPERVISOR');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [uList, logs] = await Promise.all([
        listAdminUsers(),
        fetchSecurityAuditLogs(100, 0),
      ]);
      setUsers(uList);
      setAuditLogs(logs);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load admin data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await createAdminUser({
        username: newUsername.trim(),
        password: newPassword,
        role: newRole,
        display_name: newDisplayName.trim(),
      });
      setSuccessMsg(`User '${newUsername}' created successfully.`);
      setIsAddUserOpen(false);
      setNewUsername('');
      setNewPassword('');
      setNewDisplayName('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create user.');
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Are you sure you want to delete user '${username}'?`)) return;
    try {
      await deleteAdminUser(userId);
      setSuccessMsg(`User '${username}' deleted.`);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete user.');
    }
  };

  const handlePreviewSwitch = async (role: UserRole | null) => {
    try {
      await switchPreviewRole(role);
      setSuccessMsg(
        role ? `Preview mode active: viewing as ${role}.` : 'Exited preview mode.'
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to switch preview mode.');
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6 bg-app text-text-main">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-border-main shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/20 text-purple-400 border border-purple-500/30">
              System Administration
            </span>
            <span className="text-xs text-text-muted">Security &amp; Governance Center</span>
          </div>
          <h1 className="text-base font-bold text-text-main mt-1 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            Admin Governance Console
          </h1>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-app p-1 rounded-lg border border-border-main text-xs">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Users &amp; Roles
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'preview' ? 'bg-blue-600 text-white' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Role Preview
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'audit' ? 'bg-blue-600 text-white' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Security Audit Log
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-200 text-xs cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-900/30 border border-emerald-500/50 rounded-lg flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200 text-xs cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: USERS & ROLES */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-text-main flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Registered Accounts ({users.length})
            </h2>
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Create New User
            </button>
          </div>

          <div className="bg-surface rounded-xl border border-border-main overflow-hidden shadow-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-app border-b border-border-main text-[11px] font-semibold text-text-muted">
                <tr>
                  <th className="p-3">Username</th>
                  <th className="p-3">Display Name</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Created</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main">
                {users.map((u) => (
                  <tr key={u.user_id} className="hover:bg-app/50 transition-colors">
                    <td className="p-3 font-semibold text-text-main font-mono">
                      {u.username}
                      {u.user_id === user?.user_id && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-blue-500/20 text-blue-400 font-bold">
                          Current
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-text-muted">{u.display_name || '—'}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-500/20 text-purple-400'
                            : u.role === 'TECHNICIAN'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Active
                      </span>
                    </td>
                    <td className="p-3 text-text-muted">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      {u.user_id !== user?.user_id && (
                        <button
                          onClick={() => handleDeleteUser(u.user_id, u.username)}
                          className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-950/30 transition-colors cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ROLE PREVIEW */}
      {activeTab === 'preview' && (
        <div className="p-6 rounded-xl bg-surface border border-border-main shadow-sm space-y-6 max-w-2xl">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-text-main flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-400" />
              Role Preview Capability
            </h2>
            <p className="text-xs text-text-muted leading-relaxed">
              Administrators can preview the workbench through either role's perspective.
              All actions taken in preview mode are logged to the audit trail under your real administrator identity.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Preview Supervisor */}
            <div className="p-4 rounded-lg bg-app border border-border-main space-y-3 flex flex-col justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  Supervisor Perspective
                </span>
                <h3 className="text-xs font-bold text-text-main">
                  Plain-Language Whitelist
                </h3>
                <p className="text-[11px] text-text-muted">
                  View friendly substation names, plain strain levels, and 4-part non-technical briefings.
                </p>
              </div>

              <button
                onClick={() => handlePreviewSwitch('SUPERVISOR')}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-3 rounded text-xs transition-colors cursor-pointer"
              >
                Preview as Supervisor
              </button>
            </div>

            {/* Preview Technician */}
            <div className="p-4 rounded-lg bg-app border border-border-main space-y-3 flex flex-col justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Technician Perspective
                </span>
                <h3 className="text-xs font-bold text-text-main">
                  Full Engineering Console
                </h3>
                <p className="text-[11px] text-text-muted">
                  View raw telemetry, IEEE bus indexes, detector residuals, and full Evidence JSON tree.
                </p>
              </div>

              <button
                onClick={() => handlePreviewSwitch('TECHNICIAN')}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2 px-3 rounded text-xs transition-colors cursor-pointer"
              >
                Preview as Technician
              </button>
            </div>
          </div>

          {user?.is_preview && (
            <div className="pt-4 border-t border-border-main flex items-center justify-between">
              <span className="text-xs text-amber-300 font-semibold">
                Currently previewing as: {user.effective_role}
              </span>
              <button
                onClick={() => handlePreviewSwitch(null)}
                className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold px-4 py-1.5 rounded transition-colors cursor-pointer"
              >
                Exit Preview Mode
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-text-main flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              Append-Only Security Audit Log ({auditLogs.length} events)
            </h2>
            <button
              onClick={loadData}
              className="text-xs text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          <div className="bg-surface rounded-xl border border-border-main overflow-hidden shadow-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-app border-b border-border-main text-[11px] font-semibold text-text-muted">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Actor / Role</th>
                  <th className="p-3">Target</th>
                  <th className="p-3">IP Address</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-app/50 transition-colors font-mono">
                    <td className="p-3 text-text-muted text-[11px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                    <td className="p-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-200 border border-slate-700 font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-text-main text-[11px]">
                      {log.actor_role || 'ANONYMOUS'}
                    </td>
                    <td className="p-3 text-text-muted text-[11px]">
                      {log.target_type}: {log.target_id}
                    </td>
                    <td className="p-3 text-text-muted text-[11px]">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td className="p-3 text-text-muted text-[10px] max-w-xs truncate">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border-main rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border-main">
              <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-400" />
                Create New Workbench Account
              </h3>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="text-text-muted hover:text-text-main text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-text-muted">Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. operator_smith"
                  required
                  className="w-full bg-app border border-border-main rounded px-3 py-2 text-text-main focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-text-muted">Display Name</label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g. Jane Smith (Shift Lead)"
                  className="w-full bg-app border border-border-main rounded px-3 py-2 text-text-main focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-text-muted">Assigned Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-app border border-border-main rounded px-3 py-2 text-text-main focus:outline-none focus:border-blue-500"
                >
                  <option value="SUPERVISOR">Supervisor (Plain-language brief &amp; decision support)</option>
                  <option value="TECHNICIAN">Technician (Full engineering console &amp; telemetry)</option>
                  <option value="ADMIN">Administrator (Governance &amp; User management)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-text-muted">Password (min. 8 characters)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  minLength={8}
                  className="w-full bg-app border border-border-main rounded px-3 py-2 text-text-main focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-3 py-1.5 rounded bg-app border border-border-main text-text-muted hover:text-text-main transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors cursor-pointer"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
