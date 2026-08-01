"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword as firebaseSignInWithEmailPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { getAuthErrorMessage, createSingleFlightAction } from "./auth-errors";
import { auth, firebaseConfigReady, googleProvider } from "./firebase";

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  firebaseConfigReady: boolean;
  loginPending: boolean;
  emailAuthPending: boolean;
  authError: string | null;
  login: () => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signUpWithEmailPassword: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  firebaseConfigReady: false,
  loginPending: false,
  emailAuthPending: false,
  authError: null,
  login: async () => {},
  signInWithEmailPassword: async () => {},
  signUpWithEmailPassword: async () => {},
  logout: async () => {},
  getIdToken: async () => null,
  clearAuthError: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => Boolean(auth));
  const [loginPending, setLoginPending] = useState(false);
  const [emailAuthPending, setEmailAuthPending] = useState(false);
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

  const signInWithEmailPassword = async (email: string, password: string) => {
    if (!auth || !firebaseConfigReady) {
      setAuthError(getAuthErrorMessage(null, false));
      return;
    }
    setEmailAuthPending(true);
    setAuthError(null);
    try {
      await firebaseSignInWithEmailPassword(auth, email, password);
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, true, "email"));
    } finally {
      setEmailAuthPending(false);
    }
  };

  const signUpWithEmailPassword = async (email: string, password: string) => {
    if (!auth || !firebaseConfigReady) {
      setAuthError(getAuthErrorMessage(null, false));
      return;
    }
    setEmailAuthPending(true);
    setAuthError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, true, "email"));
    } finally {
      setEmailAuthPending(false);
    }
  };

  const getIdToken = async () => {
    if (!auth?.currentUser) return null;
    return auth.currentUser.getIdToken();
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider value={{ user, loading, firebaseConfigReady, loginPending, emailAuthPending, authError, login, signInWithEmailPassword, signUpWithEmailPassword, logout, getIdToken, clearAuthError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
