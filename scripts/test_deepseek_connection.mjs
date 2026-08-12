import { loadLocalEnv } from "../src/local-env.mjs";
import { resolveProviderConfig } from "../src/model-client.mjs";


if (!process.argv.includes("--live")) {
  throw new Error("此操作会连接 DeepSeek；确认后请显式添加 --live。");
}

const env = await loadLocalEnv();
const config = resolveProviderConfig({ provider: "deepseek", env });
const response = await fetch(`${config.base_url}/models`, {
  headers: { Authorization: `Bearer ${config.api_key}` },
});
if (!response.ok) throw new Error(`DeepSeek connection failed (${response.status}).`);
const data = await response.json();
const models = (data.data ?? []).map(({ id }) => id).filter(Boolean);
console.log("DeepSeek connection: ok");
console.log(`Configured model: ${config.model}`);
console.log(`Available models: ${models.join(", ") || "not returned"}`);

