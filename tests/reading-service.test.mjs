import assert from "node:assert/strict";
import test from "node:test";

import { createReadingWorkflow, getPublicConfig } from "../src/reading-service.mjs";


test("returns safe public configuration without credentials", async () => {
  const config = await getPublicConfig({ AI_PROVIDER: "deepseek", DEEPSEEK_API_KEY: "must-not-leak" });
  assert.equal(config.default_provider, "deepseek");
  assert.equal(config.spreads.length, 2);
  assert.ok(!JSON.stringify(config).includes("must-not-leak"));
});


test("creates a deterministic dry-run reading without a model key", async () => {
  const result = await createReadingWorkflow({
    question: "如果现状不变，这段关系接下来会怎样？",
    seed: 42,
    provider: "deepseek",
    dry_run: true,
    env: {},
  });
  assert.equal(result.status, "preview");
  assert.equal(result.provider, "deepseek");
  assert.equal(result.cards.length, 3);
  assert.equal(new Set(result.cards.map(({ card }) => card.id)).size, 3);
  assert.equal(result.reading, null);
});


test("completes an end-to-end local reading without a model key", async () => {
  const result = await createReadingWorkflow({
    question: "我现在该看见什么？",
    seed: 11,
    provider: "local_template",
    env: {},
  });
  assert.equal(result.status, "completed");
  assert.equal(result.provider, "local_template");
  assert.equal(result.reading.card_readings.length, 3);
});


test("rejects invalid input before drawing", async () => {
  await assert.rejects(() => createReadingWorkflow({ question: "", dry_run: true }), /完整问题/u);
  await assert.rejects(
    () => createReadingWorkflow({ question: "测试问题", provider: "unknown", dry_run: true }),
    /不支持/u,
  );
});
