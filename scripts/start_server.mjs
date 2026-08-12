import { loadLocalEnv } from "../src/local-env.mjs";
import { startServer } from "../src/server.mjs";


startServer({ env: await loadLocalEnv() });
