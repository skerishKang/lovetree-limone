import assert from "node:assert/strict";
import test from "node:test";
import { handleApiRequest } from "../server/api/handler.ts";
import { sanitizeError } from "../server/api/errors.ts";

test("API database exception becomes a generic 500 with a requestId", async () => {
  const logged = [];
  const originalConsoleError = console.error;
  console.error = (...args) => logged.push(args.join(" "));

  try {
    const response = await handleApiRequest(
      new Request("https://example.com/api/community/trees"),
      { DATABASE_URL: "postgresql://user@example.com/database" },
      async () => {
        const cause = Object.assign(new Error("column does not exist"), {
          code: "42703",
          schema: "public",
          table: "trees",
          column: "memo",
        });
        throw new Error(
          "Failed query: select ... params: public,1",
          { cause },
        );
      },
    );

    assert.equal(response.status, 500);
    const body = await response.json();
    assert.equal(body.error, "Internal server error");
    assert.match(body.requestId, /^[0-9a-f-]{36}$/);
    assert.doesNotMatch(JSON.stringify(body), /password|postgresql|public,1|42703/);
    assert.equal(logged.length, 1);
    assert.match(logged[0], /42703/);
    assert.match(logged[0], /column/);
    assert.doesNotMatch(logged[0], /password|postgresql|public,1/);
  } finally {
    console.error = originalConsoleError;
  }
});

test("error sanitizer retains PostgreSQL fields and redacts credentials and params", () => {
  const cause = Object.assign(new Error("undefined column"), {
    code: "42703",
    severity: "ERROR",
    detail: "column memo is missing",
    hint: "Check the schema",
    schema: "public",
    table: "trees",
    column: "memo",
    constraint: undefined,
  });
  const error = new Error(
    "Failed query: select ... params: secret-value",
    { cause },
  );

  const safe = sanitizeError(error);
  assert.equal(safe.cause.code, "42703");
  assert.equal(safe.cause.table, "trees");
  assert.equal(safe.cause.column, "memo");
  assert.match(safe.message, /params: \[redacted\]/);
  assert.doesNotMatch(JSON.stringify(safe), /secret-value|postgresql:\/\//);
});

test("health endpoint keeps its staging response contract", async () => {
  const response = await handleApiRequest(
    new Request("https://example.com/api/health"),
    { APP_ENV: "staging", DATABASE_URL: "unused" },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok", env: "staging" });
});

test("mutation gate returns 503 while staging mutations are disabled", async () => {
  const response = await handleApiRequest(
    new Request("https://example.com/api/trees", { method: "POST" }),
    { APP_ENV: "staging", API_MUTATIONS_ENABLED: "false", DATABASE_URL: "unused" },
  );

  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /Mutations are temporarily disabled/);
});
