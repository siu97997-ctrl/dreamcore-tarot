import { createSeededRandom, drawReading } from "../src/tarot-engine.mjs";


const question = process.argv[2] ?? "如果现状不变，这段关系接下来会怎样？";
const seed = Number(process.argv[3] ?? 42);
const reading = await drawReading({ question, random: createSeededRandom(seed) });

console.log(JSON.stringify(reading, null, 2));

