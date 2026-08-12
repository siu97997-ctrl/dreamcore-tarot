import { loadLocalEnv } from "../src/local-env.mjs";
import { createReadingWorkflow } from "../src/reading-service.mjs";


const env = await loadLocalEnv();
const question = process.argv[2] ?? "如果现状不变，这段关系接下来会怎样？";
const provider = process.argv[3] ?? env.AI_PROVIDER ?? "local_template";
const seed = Number(process.argv[4] ?? 42);
const result = await createReadingWorkflow({ question, provider, seed, env });

console.log(JSON.stringify(result, null, 2));
