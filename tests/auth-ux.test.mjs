import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createSingleFlightAction, getAuthErrorCode, getAuthErrorMessage } from "../lib/auth-errors.ts";

test("missing Firebase config produces a visible safe message", () => {
  assert.equal(getAuthErrorMessage(null, false), "로그인 설정을 불러오지 못했어요.");
});

test("Google login explicitly asks Google to show the account chooser", async () => {
  const firebase = await readFile(new URL("../lib/firebase.ts", import.meta.url), "utf8");
  assert.match(firebase, /setCustomParameters\(\{ prompt: "select_account" \}\)/);
});

test("Firebase popup errors map to safe user-facing messages", () => {
  assert.equal(
    getAuthErrorMessage({ code: "auth/popup-blocked", message: "secret credential" }),
    "로그인 창이 차단됐어요. 팝업을 허용한 뒤 다시 시도해 주세요."
  );
  assert.equal(
    getAuthErrorMessage({ code: "auth/unauthorized-domain" }),
    "현재 주소는 로그인 허용 도메인에 등록되지 않았어요."
  );
  assert.equal(
    getAuthErrorMessage({ code: "auth/operation-not-allowed" }),
    "Google 로그인이 아직 활성화되지 않았어요."
  );
  assert.equal(getAuthErrorMessage({ code: "auth/popup-closed-by-user" }), null);
});

test("unknown Firebase errors never expose raw credentials", () => {
  const message = getAuthErrorMessage({
    code: "auth/internal-error",
    message: "https://user:password@example.com?token=secret",
  });

  assert.equal(message, "로그인 중 문제가 발생했어요. 다시 시도해 주세요.");
  assert.doesNotMatch(message, /password|secret|example\.com/);
  assert.equal(getAuthErrorCode({ code: 42 }), null);
});

test("single-flight login action blocks duplicate popup calls", async () => {
  let calls = 0;
  let release;
  const action = createSingleFlightAction(async () => {
    calls += 1;
    await new Promise((resolve) => { release = resolve; });
  });

  const first = action();
  const second = action();
  assert.equal(calls, 1);
  assert.strictEqual(first, second);

  release();
  await first;
  const third = action();
  assert.equal(calls, 2);
  release();
  await third;
});
