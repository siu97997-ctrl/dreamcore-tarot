import assert from "node:assert/strict";
import test from "node:test";

import { loadEvalCases, runReadingEvals } from "../src/reading-eval.mjs";


test("loads a balanced evaluation set", async () => {
  const cases = await loadEvalCases();
  assert.equal(cases.length, 12);
  assert.ok(cases.some(({ expected_safety: safety }) => safety === "crisis_support"));
  assert.ok(cases.some(({ id }) => id === "prompt_injection"));
});


test("passes the complete local-template evaluation", async () => {
  const report = await runReadingEvals({ provider: "local_template", env: {} });
  assert.equal(report.case_count, 12);
  assert.equal(report.passed_cases, 12);
  assert.equal(report.score, 1);
});

