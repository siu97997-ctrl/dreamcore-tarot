import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";


const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_CARDS_PATH = path.join(ROOT, "data", "tarot_cards.json");
const DEFAULT_RULES_PATH = path.join(ROOT, "data", "reading_rules.json");


async function readJson(filename) {
  return JSON.parse(await readFile(filename, "utf8"));
}


export async function loadTarotSystem({ cardsPath = DEFAULT_CARDS_PATH, rulesPath = DEFAULT_RULES_PATH } = {}) {
  const [database, rules] = await Promise.all([readJson(cardsPath), readJson(rulesPath)]);
  if (database.cards?.length !== rules.draw_config.deck_size) {
    throw new Error("Card database and reading rules use different deck sizes.");
  }
  return { database, rules };
}


export function createSeededRandom(seed = 1) {
  let state = Number(seed) >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}


function keywordHits(question, keywords) {
  return keywords.reduce((count, keyword) => count + (question.includes(keyword) ? 1 : 0), 0);
}


export function routeQuestion(question, rules) {
  const normalized = String(question ?? "").trim().toLowerCase();
  if (!normalized) throw new Error("Question cannot be empty.");

  const routing = rules.question_routing;
  const forecastIntent = keywordHits(normalized, routing.trend) > 0;
  const domainScores = ["love", "career", "self"].map((domain) => ({
    domain,
    score: keywordHits(normalized, routing[domain]),
  }));
  domainScores.sort((a, b) => b.score - a.score);

  return {
    question: normalized,
    domain: domainScores[0].score > 0 ? domainScores[0].domain : forecastIntent ? "trend" : "self",
    forecast_intent: forecastIntent,
    spread_id: forecastIntent ? "trend_3" : "insight_3",
  };
}


function sampleWithoutReplacement(cards, count, random) {
  if (count > cards.length) throw new Error("Cannot draw more cards than the deck contains.");
  const pool = [...cards];
  for (let index = pool.length - 1; index > pool.length - 1 - count; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool.slice(pool.length - count);
}


function cardClass(card) {
  if (card.arcana === "major") return "major";
  if (["page", "knight", "queen", "king"].includes(card.rank)) return "court";
  return "numbered_minor";
}


function selectMeaning(card, orientation, domain, positionId) {
  const content = card.interpretation[orientation];
  if (["advice", "change_lever"].includes(positionId)) return { field: "advice", text: content.advice };
  const field = ["love", "career", "self", "trend"].includes(domain) ? domain : "core";
  return { field, text: content[field] || content.core };
}


function unorderedPair(left, right) {
  return [left, right].sort().join(":");
}


function analyzeElements(draws, rules) {
  const configured = Object.fromEntries(
    ["supportive", "tension", "neutral"].flatMap((relation) =>
      rules.element_relations[relation].map(([left, right]) => [unorderedPair(left, right), relation]),
    ),
  );
  const relations = [];
  for (let left = 0; left < draws.length; left += 1) {
    for (let right = left + 1; right < draws.length; right += 1) {
      const a = draws[left].card.element;
      const b = draws[right].card.element;
      if (!a || !b) continue;
      const relation = a === b ? "same" : configured[unorderedPair(a, b)] ?? "neutral";
      relations.push({
        cards: [draws[left].card.id, draws[right].card.id],
        elements: [a, b],
        relation,
      });
    }
  }
  return relations;
}


function repeatedValues(values, minimum = 2) {
  const counts = new Map();
  for (const value of values.filter((item) => item !== null && item !== undefined)) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= minimum)
    .map(([value, count]) => ({ value, count }));
}


export function analyzeCombination(draws, rules) {
  const majorCount = draws.filter(({ card }) => card.arcana === "major").length;
  const courtCount = draws.filter(({ card }) => cardClass(card) === "court").length;
  const reversedCount = draws.filter(({ orientation }) => orientation === "reversed").length;
  const repeatedSuits = repeatedValues(draws.map(({ card }) => card.suit));
  const repeatedNumbers = repeatedValues(draws.map(({ card }) => card.number));

  const dominant = [...draws]
    .map((draw) => ({
      card_id: draw.card.id,
      position_id: draw.position.id,
      score: rules.dominance_rules.arcana_priority[cardClass(draw.card)] * draw.position.weight,
    }))
    .sort((a, b) => b.score - a.score)[0];

  const patternMessages = [];
  if (repeatedSuits.length) patternMessages.push(rules.pattern_rules.same_suit_2_plus);
  if (majorCount >= 2) patternMessages.push(rules.pattern_rules.major_arcana_2_plus);
  if (courtCount >= 2) patternMessages.push(rules.pattern_rules.court_cards_2_plus);
  if (repeatedNumbers.length) patternMessages.push(rules.pattern_rules.same_number_2_plus);
  if (reversedCount >= 2) patternMessages.push(rules.pattern_rules.reversed_2_plus);

  return {
    dominant,
    counts: { major: majorCount, court: courtCount, reversed: reversedCount },
    repeated_suits: repeatedSuits,
    repeated_numbers: repeatedNumbers,
    element_relations: analyzeElements(draws, rules),
    pattern_messages: patternMessages,
  };
}


export function buildInterpretationBrief(reading, rules) {
  return {
    persona: rules.language_rules.persona,
    question: reading.question,
    domain: reading.domain,
    forecast_intent: reading.forecast_intent,
    spread: reading.spread,
    cards: reading.draws.map((draw) => ({
      position: draw.position.name_zh,
      card_id: draw.card.id,
      card_name: draw.card.name_zh,
      orientation: draw.orientation,
      keywords: draw.card.interpretation.keywords,
      selected_field: draw.selected_meaning.field,
      selected_meaning: draw.selected_meaning.text,
    })),
    combination: reading.combination,
    response_contract: rules.response_contract,
    language_rules: rules.language_rules,
    contradiction_rule: rules.contradiction_rule,
  };
}


export async function drawReading({ question, spreadId, random = Math.random } = {}) {
  const { database, rules } = await loadTarotSystem();
  const route = routeQuestion(question, rules);
  const selectedSpreadId = spreadId ?? route.spread_id;
  const spread = rules.mvp_spreads[selectedSpreadId];
  if (!spread) throw new Error(`Unknown spread: ${selectedSpreadId}`);

  const selectedCards = sampleWithoutReplacement(database.cards, spread.positions.length, random);
  const draws = selectedCards.map((card, index) => {
    const orientation = rules.draw_config.reversals_enabled && random() < rules.draw_config.reversal_probability
      ? "reversed"
      : "upright";
    const position = spread.positions[index];
    return {
      position,
      card,
      orientation,
      selected_meaning: selectMeaning(card, orientation, route.domain, position.id),
    };
  });

  const reading = {
    question: route.question,
    domain: route.domain,
    forecast_intent: route.forecast_intent,
    spread: { id: selectedSpreadId, name_zh: spread.name_zh },
    draws,
    combination: analyzeCombination(draws, rules),
  };
  reading.interpretation_brief = buildInterpretationBrief(reading, rules);
  return reading;
}

