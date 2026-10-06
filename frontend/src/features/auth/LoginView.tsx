import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Lock, User, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { BootstrapModal } from './BootstrapModal';

export const LoginView: React.FC = () => {
  const { login, needsBootstrap, bootstrapTokenHint } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isBootstrapOpen, setIsBootstrapOpen] = useState(needsBootstrap);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      await login(username.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-app text-text-main font-ui select-none p-4 relative overflow-hidden">
      {/* Background ambient accents */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-surface border border-border-main rounded-xl shadow-2xl p-8 z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mb-3 shadow-inner">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-text-main">
            GridShield <span className="text-blue-500 font-mono">AI</span>
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Cyber-Physical Grid Exercise, Analysis &amp; Workbench
          </p>
        </div>

        {/* First run prompt if bootstrap needed */}
        {needsBootstrap ? (
          <div className="mb-6 p-4 bg-blue-950/40 border border-blue-500/40 rounded-lg text-center space-y-2">
            <ShieldCheck className="w-6 h-6 text-blue-400 mx-auto" />
            <h3 className="text-xs font-bold text-blue-200">System Uninitialized</h3>
            <p className="text-[11px] text-blue-300/80">
              No administrator accounts detected. Complete initial setup to unlock the workbench.
            </p>
            <button
              onClick={() => setIsBootstrapOpen(true)}
              className="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-3 rounded text-xs transition-colors cursor-pointer"
            >
              Start One-Time Bootstrap
            </button>
          </div>
        ) : (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg flex items-center gap-2 text-xs text-red-200">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="supervisor, technician, or admin"
                required
                className="w-full bg-app border border-border-main rounded-lg px-3.5 py-2.5 text-xs text-text-main focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full bg-app border border-border-main rounded-lg px-3.5 py-2.5 text-xs text-text-main focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-lg text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-blue-900/20"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Role overview notice */}
        <div className="mt-8 pt-4 border-t border-border-main text-[11px] text-text-muted space-y-1.5">
          <div className="font-semibold text-text-main text-[10px] uppercase tracking-wider">
            Available Role Views:
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>• Supervisor:</span>
            <span className="text-slate-300">Plain-language briefing &amp; decision support</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>• Technician:</span>
            <span className="text-slate-300">Full telemetry, units, residuals &amp; evidence</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>• Administrator:</span>
            <span className="text-slate-300">User governance, audit logs &amp; role preview</span>
          </div>
        </div>
      </div>

      <BootstrapModal
        isOpen={isBootstrapOpen}
        onSuccess={() => setIsBootstrapOpen(false)}
      />
    </div>
  );
};
