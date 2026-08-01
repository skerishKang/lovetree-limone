"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";

interface EmailAuthFormProps {
  open: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
}

type AuthMode = "login" | "signup";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function EnvelopeIcon() {
  return (
    <svg
      className="auth-cta-icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg
      className="auth-cta-icon"
      width="20"
      height="20"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function EmailAuthForm({ open, onClose, initialMode = "login" }: EmailAuthFormProps) {
  const {
    user,
    login,
    loginPending,
    signInWithEmailPassword,
    signUpWithEmailPassword,
    emailAuthPending,
    authError,
    clearAuthError,
  } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const clearAuthErrorRef = useRef(clearAuthError);

  useEffect(() => {
    clearAuthErrorRef.current = clearAuthError;
  });

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setMode(initialMode);
      setError(null);
      clearAuthErrorRef.current();
      emailInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, initialMode]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open && user) onClose();
  }, [open, user, onClose]);

  if (!open) return null;

  const isSignup = mode === "signup";
  const busy = loginPending || emailAuthPending;

  function switchMode() {
    setMode(isSignup ? "login" : "signup");
    setError(null);
    setConfirmPassword("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError("유효하지 않은 이메일 주소입니다.");
      return;
    }
    if (password.length < 8) {
      setError("비밀번호는 최소 8자 이상이어야 합니다.");
      return;
    }
    if (isSignup && password !== confirmPassword) {
      setError("비밀번호 확인이 일치하지 않아요.");
      return;
    }

    setError(null);
    clearAuthErrorRef.current();
    try {
      if (isSignup) {
        await signUpWithEmailPassword(trimmedEmail, password);
      } else {
        await signInWithEmailPassword(trimmedEmail, password);
      }
    } catch {
      // Errors are surfaced through the shared authError state.
    }
  }

  const displayError = error || authError;

  return (
    <div className="auth-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="auth-modal-close" type="button" onClick={onClose} aria-label="닫기">×</button>
        <p className="auth-eyebrow">LoveTree</p>
        <h2 id="auth-modal-title">{isSignup ? "이메일로 회원가입" : "이메일로 로그인"}</h2>
        <p className="auth-helper">
          {isSignup ? "새 이메일 계정을 만들고 로그인합니다." : "이미 만든 이메일 계정으로 로그인합니다."}
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="auth-email">이메일</label>
          <input
            id="auth-email"
            ref={emailInputRef}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={busy}
            required
          />

          <label htmlFor="auth-password">비밀번호</label>
          <input
            id="auth-password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8자 이상"
            disabled={busy}
            required
          />

          {isSignup ? (
            <>
              <label htmlFor="auth-confirm-password">비밀번호 확인</label>
              <input
                id="auth-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호 다시 입력"
                disabled={busy}
                required
              />
            </>
          ) : null}

          {displayError ? <p className="auth-error" role="alert">{displayError}</p> : null}

          <button className="auth-submit" type="submit" disabled={busy} aria-busy={busy}>
            <EnvelopeIcon />
            <span>{busy ? (isSignup ? "이메일 가입 중…" : "이메일 로그인 중…") : isSignup ? "이메일로 회원가입" : "이메일로 로그인"}</span>
          </button>
        </form>

        <button className="auth-toggle" type="button" onClick={switchMode} disabled={busy}>
          {isSignup ? "이미 계정이 있나요? 로그인으로 전환" : "계정이 없나요? 회원가입으로 전환"}
        </button>

        <div className="auth-divider" aria-hidden="true"><span>또는</span></div>

        <button className="auth-google" type="button" onClick={() => void login()} disabled={busy} aria-busy={loginPending}>
          <GoogleIcon />
          <span>{loginPending ? "Google 로그인 중…" : "Google로 로그인"}</span>
        </button>
      </div>
    </div>
  );
}
