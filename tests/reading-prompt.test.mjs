import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReadingRequest,
  classifyReadingSafety,
  validateReadingOutput,
} from "../src/reading-prompt.mjs";
import { createSeededRandom, drawReading } from "../src/tarot-engine.mjs";


test("builds a Responses API request with strict structured output", async () => {
  const reading = await drawReading({
    question: "如果现状不变，这段关系接下来会怎样？",
    random: createSeededRandom(42),
  });
  const request = buildReadingRequest(reading);
  assert.equal(request.model, "gpt-5.6");
  assert.equal(request.text.format.type, "json_schema");
  assert.equal(request.text.format.strict, true);
  assert.equal(request.input[0].role, "user");
  assert.ok(!request.input[0].content[0].text.includes("/cards_corrected/"));
});


test("detects bounded and crisis-support questions", () => {
  assert.equal(classifyReadingSafety("我这次投资一定会赚钱吗？").mode, "bounded");
  assert.equal(classifyReadingSafety("我不想活了，牌怎么说？").mode, "crisis_support");
});


test("validates card identity and certainty language", async () => {
  const reading = await drawReading({ question: "我现在该看见什么？", random: createSeededRandom(3) });
  const cards = reading.interpretation_brief.cards;
  const output = {
    direct_answer: "目前更像是一次需要放慢判断的阶段。",
    card_readings: cards.map((card) => ({
      position: card.position,
      card_id: card.card_id,
      card_name: card.card_name,
      orientation: card.orientation,
      interpretation: card.selected_meaning,
    })),
    combined_story: "三张牌共同强调先看清，再行动。",
    actionable_advice: "先确认一项事实。",
    deeper_question: "你最害怕确认的事实是什么？",
    closing: "先把这一步走稳就够了。",
    safety: { mode: "standard", note: "" },
  };
  assert.deepEqual(validateReadingOutput(output, cards), []);
  output.direct_answer = "这件事一定会成功。";
  assert.ok(validateReadingOutput(output, cards).some((error) => error.includes("一定会")));
});
