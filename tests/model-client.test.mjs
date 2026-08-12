import assert from "node:assert/strict";
import test from "node:test";

import {
  createProviderRequest,
  generateReading,
  parseProviderResponse,
  resolveProviderConfig,
} from "../src/model-client.mjs";
import { createSeededRandom, drawReading } from "../src/tarot-engine.mjs";


const fakeEnv = {
  OPENAI_API_KEY: "test-openai-key",
  DEEPSEEK_API_KEY: "test-deepseek-key",
  COMPATIBLE_API_KEY: "test-compatible-key",
  COMPATIBLE_BASE_URL: "https://example.invalid/v1/",
  COMPATIBLE_MODEL: "example-model",
};


test("builds an OpenAI Responses request", async () => {
  const reading = await drawReading({ question: "我现在该看清什么？", random: createSeededRandom(1) });
  const config = resolveProviderConfig({ provider: "openai", env: fakeEnv });
  const request = createProviderRequest(reading, config);
  assert.equal(request.url, "https://api.openai.com/v1/responses");
  assert.equal(request.body.text.format.type, "json_schema");
});


test("builds a DeepSeek JSON Output request", async () => {
  const reading = await drawReading({ question: "这段关系接下来会怎样？", random: createSeededRandom(2) });
  const config = resolveProviderConfig({ provider: "deepseek", env: fakeEnv });
  const request = createProviderRequest(reading, config);
  assert.equal(config.model, "deepseek-v4-flash");
  assert.equal(request.url, "https://api.deepseek.com/chat/completions");
  assert.deepEqual(request.body.response_format, { type: "json_object" });
  assert.match(request.body.messages[0].content, /JSON/iu);
});


test("supports a generic OpenAI-compatible endpoint", () => {
  const config = resolveProviderConfig({ provider: "openai_compatible", env: fakeEnv });
  assert.equal(config.base_url, "https://example.invalid/v1");
  assert.equal(config.model, "example-model");
});


test("builds a complete local response without credentials", async () => {
  const reading = await drawReading({ question: "我现在该看见什么？", random: createSeededRandom(8) });
  const output = await generateReading({
    reading,
    provider: "local_template",
    env: {},
    fetchImpl: async () => { throw new Error("network must not be called"); },
  });
  assert.equal(output.card_readings.length, 3);
  assert.equal(output.safety.mode, "standard");
});


test("parses Responses and Chat Completions payloads", () => {
  const expected = { ok: true };
  assert.deepEqual(
    parseProviderResponse(
      { api_style: "responses" },
      { output: [{ content: [{ type: "output_text", text: JSON.stringify(expected) }] }] },
    ),
    expected,
  );
  assert.deepEqual(
    parseProviderResponse(
      { api_style: "chat_completions" },
      { choices: [{ message: { content: JSON.stringify(expected) } }] },
    ),
    expected,
  );
});


test("bypasses remote models for an immediate-danger question", async () => {
  const reading = await drawReading({ question: "我不想活了，牌怎么说？", random: createSeededRandom(4) });
  const output = await generateReading({
    reading,
    provider: "openai",
    env: {},
    fetchImpl: async () => { throw new Error("network must not be called"); },
  });
  assert.equal(output.safety.mode, "crisis_support");
});
