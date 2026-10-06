'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, UserRole } from '@/types/auth';
import { useRouter, usePathname } from 'next/navigation';
import { authApi } from '@/api/auth';
import { wsManager } from '@/services/websocket/WebSocketManager';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  canAccess: (requiredRole?: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Load session from backend via stored JWT on mount
  useEffect(() => {
    async function initSession() {
      try {
        const token = localStorage.getItem('vv_mgmt_token');
        if (token) {
          const rawProfile: any = await authApi.getMe();
          const profile = rawProfile?.data || rawProfile;
          if (profile && profile.role) {
            const avatar = profile.role === 'ADMIN' ? '👨‍💼' : '👨‍🍳';
            setUser({
              ...profile,
              role: profile.role as UserRole,
              assignedStation: profile.assignedStation || profile.assigned_station,
              avatar,
            });
            wsManager.connect(token);
          }
        }
      } catch {
        localStorage.removeItem('vv_mgmt_token');
        localStorage.removeItem('vv_mgmt_auth');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    initSession();
  }, []);

  const login = useCallback(
    async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res: any = await authApi.login(email.trim(), pass);
        const loginData = res?.data || res;
        const user = loginData?.user || loginData;
        const token = loginData?.access_token || res?.access_token;

        if (!user || !user.role) {
          throw new Error('Authentication response did not contain user credentials.');
        }

        const avatar = user.role === 'ADMIN' ? '👨‍💼' : '👨‍🍳';
        const userObj: User = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as UserRole,
          shift: user.shift || (user.role === 'ADMIN' ? 'Morning & Evening' : 'Kitchen Main Shift'),
          assignedStation:
            user.assignedStation ||
            user.assigned_station ||
            (user.role === 'ADMIN' ? 'Operations & Management' : 'Head Chef (Hot Line & Espresso)'),
          avatar,
        };

        if (token) {
          localStorage.setItem('vv_mgmt_token', token);
          wsManager.connect(token);
        }
        localStorage.setItem(
          'vv_mgmt_auth',
          JSON.stringify({
            email: userObj.email,
            role: userObj.role,
            timestamp: Date.now(),
          })
        );

        setUser(userObj);

        // Redirect based on authoritative role
        if (userObj.role === 'CHEF') {
          router.push('/chef');
        } else {
          router.push('/dashboard');
        }

        return { success: true };
      } catch (err: any) {
        return {
          success: false,
          error: err?.message || 'Invalid credentials. Please check your email and password.',
        };
      }
    },
    [router]
  );

  const logout = useCallback(() => {
    setUser(null);
    wsManager.disconnect();
    try {
      localStorage.removeItem('vv_mgmt_token');
      localStorage.removeItem('vv_mgmt_auth');
    } catch {
      // ignore
    }
    router.push('/login');
  }, [router]);

  const canAccess = useCallback(
    (requiredRole?: UserRole | UserRole[]) => {
      if (!user) return false;
      if (!requiredRole) return true;
      if (user.role === 'ADMIN') return true;
      if (Array.isArray(requiredRole)) {
        return requiredRole.includes(user.role);
      }
      return user.role === requiredRole;
    },
    [user]
  );

  // Auto-protect routes when loaded
  useEffect(() => {
    if (isLoading) return;
    const isLoginPage = pathname === '/login';

    if (!user && !isLoginPage) {
      router.push('/login');
    }
  }, [user, isLoading, pathname, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        canAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
