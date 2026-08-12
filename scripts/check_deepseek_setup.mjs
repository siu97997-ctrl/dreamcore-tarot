import { loadLocalEnv } from "../src/local-env.mjs";


const env = await loadLocalEnv();
const configured = Boolean(env.DEEPSEEK_API_KEY?.trim());

console.log(`Provider: ${env.AI_PROVIDER ?? "not set"}`);
console.log(`Model: ${env.DEEPSEEK_MODEL ?? "not set"}`);
console.log(`API key configured: ${configured ? "yes" : "no"}`);
if (!configured) {
  console.log("Next: paste the key locally into config/model-providers.env. Do not send it in chat.");
  process.exitCode = 1;
}

