"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { getAuthErrorMessage, createSingleFlightAction } from "./auth-errors";
import { auth, firebaseConfigReady, googleProvider } from "./firebase";

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  firebaseConfigReady: boolean;
  loginPending: boolean;
  authError: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  firebaseConfigReady: false,
  loginPending: false,
  authError: null,
  login: async () => {},
  logout: async () => {},
  getIdToken: async () => null,
  clearAuthError: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => Boolean(auth));
  const [loginPending, setLoginPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const loginActionRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!auth) return;

    return onAuthStateChanged(auth, (u: User | null) => {
      setUser(u);
      setLoading(false);
      if (u) setAuthError(null);
    });
  }, []);

  const login = () => {
    if (!loginActionRef.current) {
      loginActionRef.current = createSingleFlightAction(async () => {
        if (!auth || !googleProvider || !firebaseConfigReady) {
          setAuthError(getAuthErrorMessage(null, false));
          return;
        }

        setLoginPending(true);
        setAuthError(null);
        try {
          await signInWithPopup(auth, googleProvider);
        } catch (error) {
          setAuthError(getAuthErrorMessage(error));
        } finally {
          setLoginPending(false);
        }
      });
    }

    return loginActionRef.current();
  };

  const logout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setAuthError(null);
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
    }
  };

  const getIdToken = async () => {
    if (!auth?.currentUser) return null;
    return auth.currentUser.getIdToken();
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider value={{ user, loading, firebaseConfigReady, loginPending, authError, login, logout, getIdToken, clearAuthError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
