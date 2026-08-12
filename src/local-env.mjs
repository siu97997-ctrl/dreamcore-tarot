import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";


const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_ENV_PATH = path.join(ROOT, "config", "model-providers.env");


function unquote(value) {
  if (value.length >= 2 && value[0] === value.at(-1) && ["\"", "'"].includes(value[0])) {
    return value.slice(1, -1);
  }
  return value;
}


export function parseEnvFile(text) {
  const parsed = {};
  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) throw new Error(`Invalid environment line: ${rawLine}`);
    const key = line.slice(0, separator).trim();
    const value = unquote(line.slice(separator + 1).trim());
    if (!/^[A-Z][A-Z0-9_]*$/u.test(key)) throw new Error(`Invalid environment key: ${key}`);
    parsed[key] = value;
  }
  return parsed;
}


export async function loadLocalEnv({ filename = DEFAULT_ENV_PATH, baseEnv = process.env } = {}) {
  let fileEnv = {};
  try {
    fileEnv = parseEnvFile(await readFile(filename, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  // Real process variables take priority over the local file.
  return { ...fileEnv, ...baseEnv };
}

