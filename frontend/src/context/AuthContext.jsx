import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService, USE_MOCK } from '../services/api.js';
import { currentUser } from '../data/mockData.js';

const AuthContext = createContext(null);
const STORAGE_KEY = 'aimds.session';

function readSession() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : null;
    if (!stored) return null;
    const user = stored.user || (stored.email ? stored : null);
    const token = stored.token || '';
    if (!user) return null;
    // In live API mode, a stored session without a bearer token cannot make authenticated requests.
    if (!USE_MOCK && !token) return null;
    return { user, token };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const user = session?.user ?? null;

  const persist = (profile, token, remember) => {
    setSession({ user: profile, token });
    if (remember) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: profile, token }));
      } catch {
        /* Storage may be unavailable in an opaque preview frame. */
      }
    }
  };

  const login = useCallback(async ({ identifier, password, remember }) => {
    setPending(true);
    setError(null);
    try {
      const res = await authService.login({ identifier, password });
      const profile = { ...currentUser, ...res.user };
      persist(profile, res.token, remember);
      return profile;
    } catch (e) {
      setError(e.message || 'Unable to sign in');
      throw e;
    } finally {
      setPending(false);
    }
  }, []);

  const googleLogin = useCallback(async ({ credential, email, name, picture, remember = true }) => {
    setPending(true);
    setError(null);
    try {
      const res = await authService.googleLogin({ credential, email, name, picture });
      const profile = {
        ...currentUser,
        ...res.user,
        picture: res?.user?.picture || picture || null,
      };
      persist(profile, res.token, remember);
      return profile;
    } catch (e) {
      setError(e.message || 'Google sign-in was unsuccessful');
      throw e;
    } finally {
      setPending(false);
    }
  }, []);

  const signup = useCallback(async ({ name, email, password, role, remember = true }) => {
    setPending(true);
    setError(null);
    try {
      const res = await authService.signup({ name, email, password, role });
      const profile = { ...currentUser, ...res.user };
      persist(profile, res.token, remember);
      return profile;
    } catch (e) {
      setError(e.message || 'Unable to create account');
      throw e;
    } finally {
      setPending(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setSession(null);
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setSession(null);
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* storage may be unavailable */
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('aimds:unauthorized', handleUnauthorized);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('aimds:unauthorized', handleUnauthorized);
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      token: session?.token ?? '',
      isAuthenticated: Boolean(user && (USE_MOCK || session?.token)),
      pending,
      error,
      login,
      googleLogin,
      signup,
      logout,
    }),
    [user, session?.token, pending, error, login, googleLogin, signup, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
