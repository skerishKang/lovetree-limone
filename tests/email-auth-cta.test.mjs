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

const FORM_PATH = "components/EmailAuthForm.tsx";
const CSS_PATH = "styles/email-auth.css";

// 1. 이메일 CTA에 아이콘이 존재
test("email CTA includes an envelope icon", async () => {
  const form = await readApp(FORM_PATH);
  assert.match(form, /EnvelopeIcon/);
  assert.match(form, /<rect x="3" y="5" width="18" height="14" rx="2"/);
});

// 2. 이메일 아이콘이 currentColor 사용
test("email icon inherits the button color via currentColor", async () => {
  const form = await readApp(FORM_PATH);
  assert.match(form, /stroke="currentColor"/);
  const css = await readApp(CSS_PATH);
  assert.match(css, /\.auth-cta-icon/);
});

// 3. Google CTA에 다색 G SVG 존재
test("Google CTA uses the multicolor official G SVG", async () => {
  const form = await readApp(FORM_PATH);
  assert.match(form, /GoogleIcon/);
  assert.match(form, /fill="#4285F4"/);
  assert.match(form, /fill="#EA4335"/);
  assert.match(form, /fill="#FBBC05"/);
  assert.match(form, /fill="#34A853"/);
});

// 4. Google 버튼 텍스트가 렌더링됨
test("Google button text renders", async () => {
  const form = await readApp(FORM_PATH);
  assert.match(form, /Google로 로그인/);
});

// 5. Google 버튼 foreground/background 대비를 없애는 클래스가 없음
test("Google button has no white-on-white contrast-breaking class", async () => {
  const form = await readApp(FORM_PATH);
  assert.doesNotMatch(form, /className="[^"]*v2-button[^"]*"/);
  assert.doesNotMatch(form, /className="[^"]*button-primary[^"]*"/);
});

test("Google button CSS keeps dark text on white background", async () => {
  const css = await readApp(CSS_PATH);
  assert.match(css, /\.auth-modal \.auth-google\s*\{[^}]*color:\s*#3c4043/);
  assert.match(css, /\.auth-modal \.auth-google\s*\{[^}]*background:\s*#ffffff/);
  assert.match(css, /\.auth-modal \.auth-google\s*\{[^}]*border:\s*1px solid #dadce0/);
});

// 6. 아이콘이 aria-hidden 처리됨
test("CTA icons are aria-hidden", async () => {
  const form = await readApp(FORM_PATH);
  assert.match(form, /aria-hidden="true"/);
  const iconBlocks = form.split("function GoogleIcon").slice(1)[0] || "";
  const emailBlock = form.split("function EnvelopeIcon")[1] || "";
  assert.match(emailBlock, /aria-hidden="true"/);
  assert.match(iconBlocks, /aria-hidden="true"/);
});

// 7. 기존 버튼 accessible name 유지 (아이콘은 aria-hidden이라 텍스트가 이름)
test("buttons keep their text-based accessible names", async () => {
  const form = await readApp(FORM_PATH);
  assert.match(form, /이메일로 로그인/);
  assert.match(form, /이메일로 회원가입/);
  assert.match(form, /Google로 로그인/);
  assert.match(form, /<span>\{busy \?/);
  assert.match(form, /<span>\{loginPending \?/);
});

// 8. 로그인 함수 연결 비회귀
test("Google and email auth handlers stay wired", async () => {
  const form = await readApp(FORM_PATH);
  assert.match(form, /onClick=\{\(\) => void login\(\)\}/);
  assert.match(form, /signInWithEmailPassword/);
  assert.match(form, /signUpWithEmailPassword/);
  const auth = await readRoot("lib/auth.tsx");
  assert.match(auth, /signInWithPopup/);
  assert.match(auth, /googleProvider/);
});

test("email CTA still submits via the shared auth methods", async () => {
  const form = await readApp(FORM_PATH);
  assert.match(form, /type="submit"/);
  assert.match(form, /if \(busy\) return/);
  assert.match(form, /disabled=\{busy\}/);
});

// 9. Legacy V1/V2 모두 공유 스타일 사용
test("Legacy V1 pages use the shared email auth stylesheet and component", async () => {
  for (const file of ["legacy/page.tsx", "my-trees/page.tsx", "trees/[id]/page.tsx"]) {
    const page = await readApp(file);
    assert.match(page, /email-auth\.css/, `${file} missing email-auth.css`);
    assert.match(page, /EmailAuthForm/, `${file} missing EmailAuthForm`);
  }
});

test("V2 route pages use the shared email auth stylesheet", async () => {
  for (const file of ["v2/page.tsx", "v2/my-trees/page.tsx", "v2/trees/[id]/page.tsx"]) {
    const page = await readApp(file);
    assert.match(page, /email-auth\.css/, `${file} missing email-auth.css`);
  }
});

test("V2 components render the shared EmailAuthForm", async () => {
  for (const file of ["components/v2/V2Home.tsx", "components/v2/V2MyTrees.tsx", "components/v2/V2TreeDetail.tsx"]) {
    const page = await readApp(file);
    assert.match(page, /EmailAuthForm/, `${file} missing EmailAuthForm`);
  }
});
