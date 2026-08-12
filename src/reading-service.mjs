import { createSeededRandom, drawReading, loadTarotSystem } from "./tarot-engine.mjs";
import { classifyReadingSafety } from "./reading-prompt.mjs";
import { generateReading } from "./model-client.mjs";


const SUPPORTED_PROVIDERS = ["local_template", "openai", "deepseek", "openai_compatible"];


function publicDraw(draw) {
  return {
    position: draw.position,
    card: {
      id: draw.card.id,
      name_en: draw.card.name_en,
      name_zh: draw.card.name_zh,
      image: draw.card.image,
    },
    orientation: draw.orientation,
  };
}


export async function getPublicConfig(env = process.env) {
  const { rules } = await loadTarotSystem();
  const defaultProvider = env.AI_PROVIDER ?? "local_template";
  return {
    supported_providers: SUPPORTED_PROVIDERS,
    default_provider: SUPPORTED_PROVIDERS.includes(defaultProvider) ? defaultProvider : "local_template",
    reversals: {
      enabled: rules.draw_config.reversals_enabled,
      probability: rules.draw_config.reversal_probability,
    },
    spreads: Object.entries(rules.mvp_spreads).map(([id, spread]) => ({
      id,
      name_zh: spread.name_zh,
      positions: spread.positions.map(({ id: positionId, name_zh }) => ({ id: positionId, name_zh })),
    })),
  };
}


export async function getCardCatalog() {
  const { database } = await loadTarotSystem();
  return {
    deck: database.deck,
    assets: database.assets,
    cards: database.cards.map((card) => ({
      id: card.id,
      slug: card.slug,
      name_en: card.name_en,
      name_zh: card.name_zh,
      arcana: card.arcana,
      number: card.number,
      suit: card.suit,
      rank: card.rank,
      image: card.image,
    })),
  };
}


export async function createReadingWorkflow({
  question,
  spread_id: spreadId,
  seed,
  provider,
  dry_run: dryRun = false,
  env = process.env,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof question !== "string" || question.trim().length < 2) {
    throw new Error("请输入一个完整问题。");
  }
  if (question.length > 500) throw new Error("问题不能超过 500 个字符。");
  if (provider && !SUPPORTED_PROVIDERS.includes(provider)) throw new Error(`不支持的模型供应商：${provider}`);
  if (seed !== undefined && (!Number.isInteger(Number(seed)) || Number(seed) < 0)) {
    throw new Error("seed 必须是非负整数。");
  }

  const random = seed === undefined ? Math.random : createSeededRandom(Number(seed));
  const reading = await drawReading({ question: question.trim(), spreadId, random });
  const safety = classifyReadingSafety(reading.question);
  const selectedProvider = provider ?? env.AI_PROVIDER ?? "local_template";
  const base = {
    status: dryRun ? "preview" : "completed",
    provider: safety.mode === "crisis_support" ? "local_safety" : selectedProvider,
    safety,
    question: reading.question,
    domain: reading.domain,
    forecast_intent: reading.forecast_intent,
    spread: reading.spread,
    cards: reading.draws.map(publicDraw),
    combination: reading.combination,
  };

  if (dryRun) {
    return {
      ...base,
      interpretation_brief: reading.interpretation_brief,
      reading: null,
    };
  }

  return {
    ...base,
    reading: await generateReading({ reading, provider: selectedProvider, env, fetchImpl }),
  };
}
