import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, setSignedIn, setUnauthorizedHandler } from './api';
import type { AuthResponse, UserProfile } from './types';

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  signIn: (res: AuthResponse) => void;
  signOut: () => void;
  refresh: () => Promise<void>;
  setCoins: (coins: number) => void;
}

const AuthContext = createContext<AuthState | null>(null);
const USER_KEY = 'rex_user';

// Only the public profile is cached (for a fast first paint). The login itself is an HttpOnly cookie.
function readCachedUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch { return null; }
}
function cacheUser(u: UserProfile | null) {
  try {
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  } catch { /* storage blocked */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => readCachedUser());
  const [loading, setLoading] = useState(true);
  // Bumped on every sign-in / sign-out. A profile response that started under an older session
  // is ignored, so a slow request can't bring a user back after logout.
  const session = useRef(0);

  const update = useCallback((u: UserProfile | null) => {
    setUser(u);
    cacheUser(u);
    setSignedIn(!!u);
  }, []);

  useEffect(() => { setSignedIn(!!readCachedUser()); }, []);

  /** Loads the profile, but only applies it if the session hasn't changed meanwhile. */
  const loadProfile = useCallback(async () => {
    const mine = session.current;
    try {
      const profile = await api.profile();
      if (session.current === mine) update(profile);
    } catch (e) {
      // 401: not logged in (or session ended). Network errors keep the cached user.
      const status = (e as { status?: number }).status;
      if (status === 401 && session.current === mine) update(null);
    }
  }, [update]);

  const signOut = useCallback(() => {
    session.current++;
    update(null);
    api.logout().catch(() => { /* cookie expires anyway */ });
  }, [update]);

  const refresh = useCallback(async () => {
    try { await loadProfile(); } finally { setLoading(false); }
  }, [loadProfile]);

  useEffect(() => {
    setUnauthorizedHandler(() => { session.current++; update(null); });
    refresh();
  }, [refresh, update]);

  const signIn = useCallback((res: AuthResponse) => {
    session.current++;
    update({
      id: res.userId,
      name: res.name,
      email: res.email,
      mobile: null,
      profilePicture: res.profilePicture,
      coins: res.coins ?? 0,
      referCode: res.referCode,
      isPremium: res.isPremium,
    });
    // Pull mobile number and latest coins in the background.
    loadProfile();
  }, [update, loadProfile]);

  const setCoins = useCallback((coins: number) => {
    setUser(prev => {
      if (!prev) return prev;
      const next = { ...prev, coins };
      cacheUser(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, signOut, refresh, setCoins }), [user, loading, signIn, signOut, refresh, setCoins]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
