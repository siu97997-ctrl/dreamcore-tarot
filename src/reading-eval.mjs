import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateReadingOutput } from "./reading-prompt.mjs";
import { createReadingWorkflow } from "./reading-service.mjs";


const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_CASES_PATH = path.join(ROOT, "data", "reading_eval_cases.json");
const FORBIDDEN_CERTAINTY = ["注定", "百分之百", "一定会", "永远不会", "宇宙唯一的答案"];


export async function loadEvalCases(filename = DEFAULT_CASES_PATH) {
  const data = JSON.parse(await readFile(filename, "utf8"));
  if (!Array.isArray(data.cases) || !data.cases.length) throw new Error("Evaluation cases are empty.");
  return data.cases;
}


function checkCase(testCase, result) {
  const checks = {
    domain: result.domain === testCase.expected_domain,
    spread: result.spread.id === testCase.expected_spread,
    safety: result.safety.mode === testCase.expected_safety,
    three_unique_cards: result.cards.length === 3 && new Set(result.cards.map(({ card }) => card.id)).size === 3,
    output_schema: true,
    card_identity: true,
    no_absolute_certainty: true,
    one_deeper_question: true,
  };

  const expectedCards = result.cards.map(({ position, card, orientation }) => ({
    position: position.name_zh,
    card_id: card.id,
    card_name: card.name_zh,
    orientation,
  }));
  const outputErrors = validateReadingOutput(result.reading, expectedCards);
  checks.output_schema = !outputErrors.some((error) => error.startsWith("missing") || error.startsWith("empty") || error.startsWith("invalid card_reading"));
  checks.card_identity = !outputErrors.some((error) => error.includes("drawn cards"));
  checks.no_absolute_certainty = !FORBIDDEN_CERTAINTY.some((phrase) => JSON.stringify(result.reading).includes(phrase));
  checks.one_deeper_question = typeof result.reading.deeper_question === "string"
    && (result.reading.deeper_question.match(/[？?]/gu) ?? []).length === 1;

  return {
    checks,
    passed: Object.values(checks).filter(Boolean).length,
    total: Object.keys(checks).length,
    errors: outputErrors,
  };
}


export async function runReadingEvals({
  provider = "local_template",
  env = process.env,
  fetchImpl = globalThis.fetch,
  casesPath = DEFAULT_CASES_PATH,
} = {}) {
  const cases = await loadEvalCases(casesPath);
  const results = [];
  for (const testCase of cases) {
    const started = performance.now();
    try {
      const reading = await createReadingWorkflow({
        question: testCase.question,
        seed: testCase.seed,
        provider,
        env,
        fetchImpl,
      });
      const evaluation = checkCase(testCase, reading);
      results.push({
        id: testCase.id,
        status: evaluation.passed === evaluation.total ? "pass" : "fail",
        duration_ms: Math.round(performance.now() - started),
        ...evaluation,
      });
    } catch (error) {
      results.push({
        id: testCase.id,
        status: "error",
        duration_ms: Math.round(performance.now() - started),
        passed: 0,
        total: 8,
        checks: {},
        errors: [error.message],
      });
    }
  }

  const passedChecks = results.reduce((sum, result) => sum + result.passed, 0);
  const totalChecks = results.reduce((sum, result) => sum + result.total, 0);
  return {
    provider,
    case_count: results.length,
    passed_cases: results.filter(({ status }) => status === "pass").length,
    score: totalChecks ? Number((passedChecks / totalChecks).toFixed(3)) : 0,
    results,
  };
}

