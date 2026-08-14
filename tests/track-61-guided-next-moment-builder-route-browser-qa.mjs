import assert from "node:assert/strict";
import test from "node:test";

const ROUTE = "/design-lab/lineages/61/61-v1-7";

test("track-61-guided-next-moment-builder: design lab route responds without claiming source fidelity", async () => {
  const baseUrl = process.env.V4_BASE_URL || process.env.LOVETREE_QA_BASE_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}${ROUTE}`, { redirect: "manual" });
  assert.ok(response.ok, `route HTTP ${response.status}`);
  const html = await response.text();
  assert.match(html, /Source fidelity/);
});
