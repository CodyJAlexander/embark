import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { StoredUser, DashboardWidgetConfig } from '../types';
import { api, apiFetch, setToken, clearToken } from '../lib/api';
import { migrateClientsFromLocalStorage } from '../utils/migrateLocalStorage';

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  phone?: string;
}

// Shape returned by the API for a user object
interface ApiUser {
  id: string;
  email: string;
  username: string;
  role?: string;
  avatarUrl?: string;
  characterClass?: StoredUser['characterClass'];
  onboardingComplete?: boolean;
  preferences?: Record<string, unknown>;
  teamId?: string;
  createdAt?: string;
}

function mapApiUser(apiUser: ApiUser): StoredUser {
  const prefs = apiUser.preferences as { dashboardConfig?: DashboardWidgetConfig } | undefined;
  return {
    id: apiUser.id,
    username: apiUser.username,
    email: apiUser.email,
    passwordHash: '',           // not returned by API — cleared on migration
    avatarUrl: apiUser.avatarUrl,
    characterClass: apiUser.characterClass,
    onboardingComplete: apiUser.onboardingComplete ?? false,
    createdAt: apiUser.createdAt ?? new Date().toISOString(),
    dashboardConfig: prefs?.dashboardConfig,
  };
}

interface AuthContextType {
  currentUser: StoredUser | null;
  isAuthenticated: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<StoredUser>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  // On mount: if a token exists, restore the session by fetching /me
  useEffect(() => {
    const token = localStorage.getItem('embark-api-token');
    if (!token) {
      setInitializing(false);
      return;
    }
    apiFetch<ApiUser>('/api/v1/auth/me', { skipRedirectOn401: true }).then(response => {
      if (response.data) {
        setCurrentUser(mapApiUser(response.data));
      } else if (response.code === 'UNAUTHORIZED') {
        // Explicit 401 — token is invalid/expired; apiFetch already cleared it
        setCurrentUser(null);
      }
      // NETWORK_ERROR or other transient failure: keep the token so the next
      // page load can restore the session once the API is reachable again.
    }).catch(() => {
      // Don't clear token on unexpected exception (e.g. API cold start)
    }).finally(() => {
      setInitializing(false);
    });
  }, []);

  const login = useCallback(async (usernameOrEmail: string, password: string): Promise<void> => {
    const response = await api.post<{ token: string; user: ApiUser }>(
      '/api/v1/auth/login',
      { email: usernameOrEmail, password }
    );
    if (!response.data) {
      throw new Error(response.error ?? 'Login failed');
    }
    setToken(response.data.token);
    setCurrentUser(mapApiUser(response.data.user));
    // One-time migration: port localStorage clients to API on first login
    if (!localStorage.getItem('embark-migrated-clients')) {
      migrateClientsFromLocalStorage().catch(() => {/* non-fatal */});
    }
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<void> => {
    const response = await api.post<{ token: string; user: ApiUser }>(
      '/api/v1/auth/register',
      { email: data.email, username: data.username, password: data.password, ...(data.phone !== undefined && { phone: data.phone }) }
    );
    if (!response.data) {
      throw new Error(response.error ?? 'Registration failed');
    }
    setToken(response.data.token);
    setCurrentUser(mapApiUser(response.data.user));
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.post('/api/v1/auth/logout', {});
    } finally {
      clearToken();
      setCurrentUser(null);
    }
  }, []);

  const updateUser = useCallback(async (updates: Partial<StoredUser>): Promise<void> => {
    if (!currentUser) return;
    const response = await api.patch<ApiUser>(`/api/v1/users/${currentUser.id}`, updates);
    if (response.data) {
      setCurrentUser(mapApiUser(response.data));
    } else {
      // Optimistically apply local changes even if API call had non-critical issues
      setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [currentUser]);

  if (initializing) {
    // Render nothing (or a loader) while we verify the stored token.
    // Returning null avoids rendering children with a stale null user.
    return null;
  }

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated: currentUser !== null, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
