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
            {busy ? (isSignup ? "가입 중…" : "로그인 중…") : isSignup ? "회원가입" : "로그인"}
          </button>
        </form>

        <button className="auth-toggle" type="button" onClick={switchMode} disabled={busy}>
          {isSignup ? "이미 계정이 있나요? 로그인으로 전환" : "계정이 없나요? 회원가입으로 전환"}
        </button>

        <div className="auth-divider" aria-hidden="true"><span>또는</span></div>

        <button className="auth-google" type="button" onClick={() => void login()} disabled={busy} aria-busy={loginPending}>
          {loginPending ? "Google 로그인 중…" : "Google로 계속하기"}
        </button>
      </div>
    </div>
  );
}
