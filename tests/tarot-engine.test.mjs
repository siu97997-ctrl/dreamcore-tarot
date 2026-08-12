import assert from "node:assert/strict";
import test from "node:test";

import {
  createSeededRandom,
  drawReading,
  loadTarotSystem,
  routeQuestion,
} from "../src/tarot-engine.mjs";


test("routes an ordinary self-exploration question to the insight spread", async () => {
  const { rules } = await loadTarotSystem();
  const route = routeQuestion("我为什么最近总觉得迷茫？", rules);
  assert.equal(route.domain, "self");
  assert.equal(route.forecast_intent, false);
  assert.equal(route.spread_id, "insight_3");
});


test("keeps the relationship domain while selecting the trend spread", async () => {
  const { rules } = await loadTarotSystem();
  const route = routeQuestion("如果现状不变，这段感情接下来会怎样？", rules);
  assert.equal(route.domain, "love");
  assert.equal(route.forecast_intent, true);
  assert.equal(route.spread_id, "trend_3");
});


test("draws three unique cards and binds them to three positions", async () => {
  const reading = await drawReading({
    question: "这个工作机会接下来会怎样？",
    random: createSeededRandom(20260811),
  });
  assert.equal(reading.draws.length, 3);
  assert.equal(new Set(reading.draws.map(({ card }) => card.id)).size, 3);
  assert.deepEqual(
    reading.draws.map(({ position }) => position.id),
    ["current_energy", "developing_trend", "change_lever"],
  );
  assert.equal(reading.draws[2].selected_meaning.field, "advice");
});


test("a seeded draw is reproducible", async () => {
  const options = { question: "我该如何看待现在的选择？" };
  const first = await drawReading({ ...options, random: createSeededRandom(7) });
  const second = await drawReading({ ...options, random: createSeededRandom(7) });
  assert.deepEqual(
    first.draws.map(({ card, orientation }) => [card.id, orientation]),
    second.draws.map(({ card, orientation }) => [card.id, orientation]),
  );
});


test("produces a complete interpretation brief", async () => {
  const reading = await drawReading({
    question: "这段关系里我没有看见什么？",
    random: createSeededRandom(99),
  });
  assert.equal(reading.interpretation_brief.cards.length, 3);
  assert.ok(reading.interpretation_brief.combination.dominant.card_id);
  assert.deepEqual(reading.interpretation_brief.persona, ["神秘", "直接", "有朋友感"]);
});

