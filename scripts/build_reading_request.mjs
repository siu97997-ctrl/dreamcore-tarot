import { mkdir, writeFile } from "node:fs/promises";

import { buildReadingRequest } from "../src/reading-prompt.mjs";
import { createSeededRandom, drawReading } from "../src/tarot-engine.mjs";


const question = process.argv[2] ?? "如果现状不变，这段关系接下来会怎样？";
const seed = Number(process.argv[3] ?? 42);
const reading = await drawReading({ question, random: createSeededRandom(seed) });
const request = buildReadingRequest(reading);
const destination = new URL("../tmp/reading-request.example.json", import.meta.url);

await mkdir(new URL("../tmp/", import.meta.url), { recursive: true });
await writeFile(destination, `${JSON.stringify(request, null, 2)}\n`);
console.log(fileURLToPath(destination));

function fileURLToPath(url) {
  return decodeURIComponent(url.pathname);
}
