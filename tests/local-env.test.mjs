import assert from "node:assert/strict";
import test from "node:test";

import { parseEnvFile } from "../src/local-env.mjs";


test("parses provider settings without transforming secrets", () => {
  const parsed = parseEnvFile(`
    # local settings
    AI_PROVIDER=deepseek
    DEEPSEEK_API_KEY="secret-value"
    DEEPSEEK_MODEL=deepseek-v4-flash
  `);
  assert.deepEqual(parsed, {
    AI_PROVIDER: "deepseek",
    DEEPSEEK_API_KEY: "secret-value",
    DEEPSEEK_MODEL: "deepseek-v4-flash",
  });
});

