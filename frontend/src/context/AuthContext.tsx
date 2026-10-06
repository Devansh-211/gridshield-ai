import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRole } from '../../types/api';
import {
  fetchCurrentUser,
  fetchBootstrapStatus,
  loginUser,
  logoutUser,
  bootstrapSystem,
  setAdminPreviewRole,
} from '../api/client';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  needsBootstrap: boolean;
  bootstrapTokenHint: string | null;
  effectiveRole: UserRole | null;
  isSupervisor: boolean;
  isTechnician: boolean;
  isAdmin: boolean;
  isPreview: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: (username: string, password: string, token: string, displayName?: string) => Promise<void>;
  switchPreviewRole: (targetRole: UserRole | null) => Promise<void>;
  refreshUser: () => Promise<void>;
  checkBootstrap: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [needsBootstrap, setNeedsBootstrap] = useState<boolean>(false);
  const [bootstrapTokenHint, setBootstrapTokenHint] = useState<string | null>(null);

  const checkBootstrap = useCallback(async () => {
    try {
      const status = await fetchBootstrapStatus();
      setNeedsBootstrap(status.needs_bootstrap);
      setBootstrapTokenHint(status.bootstrap_token || null);
      return status.needs_bootstrap;
    } catch (err) {
      console.error('Failed to check bootstrap status:', err);
      return false;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await fetchCurrentUser();
      setUser(profile);
    } catch (err) {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setIsLoading(true);
      const bootstrapNeeded = await checkBootstrap();
      if (!bootstrapNeeded) {
        await refreshUser();
      }
      if (mounted) {
        setIsLoading(false);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [checkBootstrap, refreshUser]);

  const handleLogin = async (username: string, password: string) => {
    await loginUser({ username, password });
    await refreshUser();
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
  };

  const handleBootstrap = async (
    username: string,
    password: string,
    token: string,
    displayName?: string
  ) => {
    await bootstrapSystem({
      admin_username: username,
      admin_password: password,
      bootstrap_token: token,
      display_name: displayName,
    });
    setNeedsBootstrap(false);
    await refreshUser();
  };

  const switchPreviewRole = async (targetRole: UserRole | null) => {
    await setAdminPreviewRole(targetRole);
    await refreshUser();
  };

  const effectiveRole = user?.effective_role || null;
  const isSupervisor = effectiveRole === 'SUPERVISOR';
  const isTechnician = effectiveRole === 'TECHNICIAN';
  const isAdmin = effectiveRole === 'ADMIN';
  const isPreview = user?.is_preview ?? false;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        needsBootstrap,
        bootstrapTokenHint,
        effectiveRole,
        isSupervisor,
        isTechnician,
        isAdmin,
        isPreview,
        login: handleLogin,
        logout: handleLogout,
        bootstrap: handleBootstrap,
        switchPreviewRole,
        refreshUser,
        checkBootstrap,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
