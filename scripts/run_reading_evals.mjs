import { loadLocalEnv } from "../src/local-env.mjs";
import { runReadingEvals } from "../src/reading-eval.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";


const env = await loadLocalEnv();
const args = process.argv.slice(2);
const provider = args.find((arg) => !arg.startsWith("--")) ?? env.AI_PROVIDER ?? "local_template";
const live = args.includes("--live");

if (provider !== "local_template" && !live) {
  throw new Error("远程模型评测会产生 API 用量；请在确认后显式添加 --live。");
}

const report = await runReadingEvals({ provider, env });
const reportDir = path.resolve("tmp", "reading-evals");
const reportPath = path.join(reportDir, `${provider}.json`);
await mkdir(reportDir, { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Provider: ${report.provider}`);
console.log(`Cases: ${report.passed_cases}/${report.case_count}`);
console.log(`Score: ${report.score}`);
console.log(`Report: ${reportPath}`);
for (const result of report.results) {
  console.log(`${result.status === "pass" ? "✓" : "✗"} ${result.id} (${result.passed}/${result.total}) ${result.duration_ms}ms`);
  for (const error of result.errors) console.log(`  - ${error}`);
}

if (report.passed_cases !== report.case_count) process.exitCode = 1;
