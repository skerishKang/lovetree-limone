import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readApp(path) {
  return readFile(new URL(`app/${path}`, root), "utf8");
}

async function readRoot(path) {
  return readFile(new URL(path, root), "utf8");
}

// 1. email 회원가입이 createUserWithEmailAndPassword 사용
test("auth layer uses createUserWithEmailAndPassword for signup", async () => {
  const auth = await readRoot("lib/auth.tsx");
  assert.match(auth, /createUserWithEmailAndPassword/);
  assert.match(auth, /signUpWithEmailPassword/);
});

// 2. email 로그인이 signInWithEmailPassword 사용
test("auth layer uses signInWithEmailPassword for email login", async () => {
  const auth = await readRoot("lib/auth.tsx");
  assert.match(auth, /signInWithEmailPassword/);
  assert.match(auth, /firebaseSignInWithEmailPassword/);
});

// 3. 기존 Google 로그인 유지
test("Google login is retained in the shared auth layer", async () => {
  const auth = await readRoot("lib/auth.tsx");
  assert.match(auth, /signInWithPopup/);
  assert.match(auth, /googleProvider/);
  assert.match(auth, /login/);
});

test("Google login buttons retained in V1 UI", async () => {
  const home = await readApp("page.tsx");
  assert.match(home, /Google로 로그인|login\(\)/);
  const myTrees = await readApp("my-trees/page.tsx");
  assert.match(myTrees, /Google로 로그인/);
});

test("Google login buttons retained in V2 UI", async () => {
  const home = await readApp("components/v2/V2Home.tsx");
  assert.match(home, /Google 로그인/);
  const myTrees = await readApp("components/v2/V2MyTrees.tsx");
  assert.match(myTrees, /Google로 로그인/);
  const detail = await readApp("components/v2/V2TreeDetail.tsx");
  assert.match(detail, /Google로 로그인/);
});

// 4. 로그인 후 기존 Firebase UID/token 흐름 유지
test("existing ID token flow retained (currentUser.getIdToken)", async () => {
  const auth = await readRoot("lib/auth.tsx");
  assert.match(auth, /auth\.currentUser\.getIdToken/);
  assert.match(auth, /onAuthStateChanged/);
  const api = await readRoot("lib/api.ts");
  assert.match(api, /authorization/);
  assert.match(api, /Bearer/);
});

test("no separate auth backend or session introduced", async () => {
  const api = await readRoot("lib/api.ts");
  assert.doesNotMatch(api, /session|login\(|password/);
  const schema = await readRoot("db/schema.ts");
  assert.doesNotMatch(schema, /UserAccount|user_session|email_login/i);
});

// 5. V1 이메일 로그인 UI
test("V1 home exposes an email login entry", async () => {
  const page = await readApp("page.tsx");
  assert.match(page, /EmailAuthForm/);
  assert.match(page, /email-auth\.css/);
  assert.match(page, /isAuthOpen/);
});

test("V1 my-trees exposes an email login entry", async () => {
  const page = await readApp("my-trees/page.tsx");
  assert.match(page, /EmailAuthForm/);
  assert.match(page, /이메일로 로그인/);
});

// 6. V2 이메일 로그인 UI
test("V2 home exposes an email login entry", async () => {
  const home = await readApp("components/v2/V2Home.tsx");
  assert.match(home, /EmailAuthForm/);
  assert.match(home, /이메일 로그인/);
});

test("V2 my-trees and tree detail expose email login entries", async () => {
  const myTrees = await readApp("components/v2/V2MyTrees.tsx");
  assert.match(myTrees, /EmailAuthForm/);
  assert.match(myTrees, /이메일로 로그인/);
  const detail = await readApp("components/v2/V2TreeDetail.tsx");
  assert.match(detail, /EmailAuthForm/);
  assert.match(detail, /이메일로 로그인/);
});

test("V2 route pages import the shared email auth stylesheet", async () => {
  const home = await readApp("v2/page.tsx");
  assert.match(home, /email-auth\.css/);
  const myTrees = await readApp("v2/my-trees/page.tsx");
  assert.match(myTrees, /email-auth\.css/);
  const detail = await readApp("v2/trees/[id]/page.tsx");
  assert.match(detail, /email-auth\.css/);
});

// 7. 회원가입 비밀번호 확인
test("signup mode has a password confirmation field", async () => {
  const form = await readApp("components/EmailAuthForm.tsx");
  assert.match(form, /auth-confirm-password/);
  assert.match(form, /confirmPassword/);
  assert.match(form, /isSignup/);
});

// 8. 빈 입력 검증
test("email form validates empty input", async () => {
  const form = await readApp("components/EmailAuthForm.tsx");
  assert.match(form, /이메일과 비밀번호를 입력해 주세요\./);
  assert.match(form, /유효하지 않은 이메일 주소입니다\./);
  assert.match(form, /비밀번호는 최소 8자 이상이어야 합니다\./);
});

// 9. 중복 제출 방지
test("email form prevents duplicate submission", async () => {
  const form = await readApp("components/EmailAuthForm.tsx");
  assert.match(form, /if \(busy\) return/);
  assert.match(form, /disabled=\{busy\}/);
  assert.match(form, /aria-busy=\{busy\}/);
});

test("single-flight login guard is retained in auth-errors", async () => {
  const errors = await readRoot("lib/auth-errors.ts");
  assert.match(errors, /createSingleFlightAction/);
});

// 10. Firebase 오류 메시지 표준화
test("email auth error codes map to friendly messages", async () => {
  const errors = await readRoot("lib/auth-errors.ts");
  assert.match(errors, /auth\/email-already-in-use/);
  assert.match(errors, /auth\/invalid-email/);
  assert.match(errors, /auth\/weak-password/);
  assert.match(errors, /auth\/user-not-found/);
  assert.match(errors, /auth\/wrong-password/);
  assert.match(errors, /auth\/invalid-credential/);
  assert.match(errors, /auth\/too-many-requests/);
  assert.match(errors, /auth\/network-request-failed/);
  assert.match(errors, /이메일 또는 비밀번호가 올바르지 않습니다\./);
  assert.match(errors, /이미 사용 중인 이메일 주소입니다\./);
});

// 11. 기존 V1/V2 API 비회귀
test("V1 and V2 still use the shared api client", async () => {
  const v1Home = await readApp("page.tsx");
  assert.match(v1Home, /apiFetch/);
  const v2Home = await readApp("components/v2/V2Home.tsx");
  assert.match(v2Home, /apiFetch/);
  const v2MyTrees = await readApp("components/v2/V2MyTrees.tsx");
  assert.match(v2MyTrees, /apiFetch/);
  const v2Detail = await readApp("components/v2/V2TreeDetail.tsx");
  assert.match(v2Detail, /apiFetch/);
});

test("shared api client unchanged (Bearer + firebase token)", async () => {
  const api = await readRoot("lib/api.ts");
  assert.match(api, /auth\?\.currentUser\?\.getIdToken\(\)/);
  assert.match(api, /authorization/);
});

// 12. 자격 증명이 repository에 포함되지 않음
test("QA credential file is git-ignored", async () => {
  const gitignore = await readRoot(".gitignore");
  assert.match(gitignore, /qa-auth\.env/);
  assert.match(gitignore, /\.kilo\/qa-auth\.env/);
});

test("no QA credentials are hardcoded in source files", async () => {
  const libFiles = ["lib/auth.tsx", "lib/auth-errors.ts", "lib/firebase.ts"];
  for (const file of libFiles) {
    const content = await readRoot(file);
    assert.doesNotMatch(content, /LOVETREE_QA_/, `LOVETREE_QA_ leaked into ${file}`);
    assert.doesNotMatch(content, /lovetree\.dev/, `QA account email leaked into ${file}`);
  }
  const appFiles = [
    "components/EmailAuthForm.tsx",
    "page.tsx",
    "my-trees/page.tsx",
    "trees/[id]/page.tsx",
    "components/v2/V2Home.tsx",
    "components/v2/V2MyTrees.tsx",
    "components/v2/V2TreeDetail.tsx",
  ];
  for (const file of appFiles) {
    const content = await readApp(file);
    assert.doesNotMatch(content, /LOVETREE_QA_/, `LOVETREE_QA_ leaked into ${file}`);
    assert.doesNotMatch(content, /lovetree\.dev/, `QA account email leaked into ${file}`);
  }
});
