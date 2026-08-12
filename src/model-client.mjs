import {
  READING_INSTRUCTIONS,
  TAROT_READING_SCHEMA,
  buildReadingRequest,
  classifyReadingSafety,
  validateReadingOutput,
} from "./reading-prompt.mjs";


const PROVIDERS = {
  local_template: {
    api_style: "local",
    base_url: "local",
    default_model: "deterministic-template-v1",
    api_key_env: null,
  },
  openai: {
    api_style: "responses",
    base_url: "https://api.openai.com/v1",
    default_model: "gpt-5.6",
    api_key_env: "OPENAI_API_KEY",
  },
  deepseek: {
    api_style: "chat_completions",
    base_url: "https://api.deepseek.com",
    default_model: "deepseek-v4-flash",
    api_key_env: "DEEPSEEK_API_KEY",
  },
  openai_compatible: {
    api_style: "chat_completions",
    base_url: null,
    default_model: null,
    api_key_env: "COMPATIBLE_API_KEY",
  },
};


function trimSlash(value) {
  return value.replace(/\/+$/, "");
}


export function resolveProviderConfig({ provider, env = process.env } = {}) {
  const providerId = provider ?? env.AI_PROVIDER ?? "local_template";
  const preset = PROVIDERS[providerId];
  if (!preset) throw new Error(`Unsupported AI provider: ${providerId}`);

  const baseUrl = providerId === "openai_compatible"
    ? env.COMPATIBLE_BASE_URL
    : preset.base_url;
  const model = providerId === "local_template"
    ? preset.default_model
    : providerId === "openai"
    ? env.OPENAI_MODEL ?? preset.default_model
    : providerId === "deepseek"
      ? env.DEEPSEEK_MODEL ?? preset.default_model
      : env.COMPATIBLE_MODEL;
  const apiKey = preset.api_key_env ? env[preset.api_key_env] : null;

  if (!baseUrl) throw new Error("COMPATIBLE_BASE_URL is required for an OpenAI-compatible provider.");
  if (!model) throw new Error("COMPATIBLE_MODEL is required for an OpenAI-compatible provider.");
  if (preset.api_key_env && !apiKey) throw new Error(`${preset.api_key_env} is not configured.`);

  return {
    id: providerId,
    api_style: preset.api_style,
    base_url: trimSlash(baseUrl),
    model,
    api_key: apiKey,
  };
}


function compactPayload(reading) {
  const safety = classifyReadingSafety(reading.question);
  const brief = reading.interpretation_brief;
  return {
    safety,
    reading: {
      question: brief.question,
      domain: brief.domain,
      forecast_intent: brief.forecast_intent,
      spread: brief.spread,
      cards: brief.cards,
      combination: brief.combination,
    },
  };
}


function jsonModeInstructions() {
  return `${READING_INSTRUCTIONS}\n\n只输出一个合法 JSON 对象，不要使用 Markdown 代码块。JSON 必须严格符合以下 Schema：\n${JSON.stringify(TAROT_READING_SCHEMA)}\n\nJSON 输出示例：\n${JSON.stringify({
    direct_answer: "简短直接回答",
    card_readings: [
      { position: "牌位一", card_id: "card_id_1", card_name: "牌名一", orientation: "upright", interpretation: "结合牌位的解读" },
      { position: "牌位二", card_id: "card_id_2", card_name: "牌名二", orientation: "reversed", interpretation: "结合牌位的解读" },
      { position: "牌位三", card_id: "card_id_3", card_name: "牌名三", orientation: "upright", interpretation: "结合牌位的解读" },
    ],
    combined_story: "三张牌的综合关系",
    actionable_advice: "一项现实可执行建议",
    deeper_question: "一个更深的问题？",
    closing: "自然收束",
    safety: { mode: "standard", note: "边界说明" },
  })}`;
}


export function createProviderRequest(reading, config) {
  const safety = classifyReadingSafety(reading.question);
  if (safety.mode === "crisis_support") {
    return { kind: "local_safety_response", response: buildCrisisResponse(reading) };
  }
  if (config.api_style === "local") {
    return { kind: "local_template_response", response: buildLocalTemplateReading(reading) };
  }

  if (config.api_style === "responses") {
    return {
      kind: "remote",
      url: `${config.base_url}/responses`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.api_key}`,
      },
      body: buildReadingRequest(reading, { model: config.model }),
    };
  }

  const body = {
    model: config.model,
    messages: [
      { role: "system", content: jsonModeInstructions() },
      { role: "user", content: JSON.stringify(compactPayload(reading)) },
    ],
    response_format: { type: "json_object" },
    max_tokens: 4096,
    stream: false,
  };
  if (config.id === "deepseek") body.thinking = { type: "disabled" };

  return {
    kind: "remote",
    url: `${config.base_url}/chat/completions`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.api_key}`,
    },
    body,
  };
}


function extractResponsesText(response) {
  if (typeof response.output_text === "string") return response.output_text;
  const text = [];
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "refusal") throw new Error(`Model refusal: ${content.refusal ?? "unspecified"}`);
      if (content.type === "output_text" && typeof content.text === "string") text.push(content.text);
    }
  }
  if (!text.length) throw new Error("OpenAI response did not contain output text.");
  return text.join("");
}


export function parseProviderResponse(config, response) {
  const text = config.api_style === "responses"
    ? extractResponsesText(response)
    : response?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error("Model returned empty content.");
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Model returned invalid JSON: ${error.message}`);
  }
}


function normalizeModelOutput(output) {
  const replacements = new Map([
    ["宇宙唯一的答案", "唯一解释"],
    ["百分之百", "高度可能"],
    ["永远不会", "目前不太可能"],
    ["一定会", "更可能"],
    ["注定", "倾向于"],
  ]);
  function normalize(value) {
    if (typeof value === "string") {
      let result = value;
      for (const [phrase, replacement] of replacements) result = result.replaceAll(phrase, replacement);
      return result;
    }
    if (Array.isArray(value)) return value.map(normalize);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
    }
    return value;
  }
  const normalized = normalize(output);
  if (typeof normalized.deeper_question === "string") {
    const firstQuestion = normalized.deeper_question.split(/[？?]/u)[0].trim();
    normalized.deeper_question = `${firstQuestion.replace(/[。！!]+$/u, "")}？`;
  }
  return normalized;
}


export function buildCrisisResponse(reading) {
  return {
    direct_answer: "先不看牌。你现在的安全比任何占卜结果都重要。",
    card_readings: reading.interpretation_brief.cards.map((card) => ({
      position: card.position,
      card_id: card.card_id,
      card_name: card.card_name,
      orientation: card.orientation,
      interpretation: "本次暂停塔罗解读，优先处理现实安全。",
    })),
    combined_story: "这次不使用牌面推断你的处境。请把注意力放在此刻能联系到的现实支持上。",
    actionable_advice: "如果你可能立即伤害自己，请马上联系当地紧急服务，或让一位可信任的人现在陪着你，并远离可能伤害自己的物品。",
    deeper_question: "你现在是否处于立即危险中，或者身边有没有能马上联系的人？",
    closing: "你不需要独自撑过这一刻，先让现实中的人知道你需要帮助。",
    safety: { mode: "crisis_support", note: "Tarot interpretation bypassed locally." },
  };
}


function orientationZh(orientation) {
  return orientation === "upright" ? "正位" : "逆位";
}


export function buildLocalTemplateReading(reading) {
  const cards = reading.interpretation_brief.cards;
  const [first, second, third] = cards;
  const dominantCard = cards.find(({ card_id: cardId }) => cardId === reading.combination.dominant.card_id);
  const pattern = reading.combination.pattern_messages[0];
  const relation = reading.combination.element_relations.find(({ relation: value }) => value === "tension")
    ? "牌与牌之间存在张力，需要同时承认两股不同方向的力量。"
    : "三张牌的方向可以被整理成一条连续的发展线。";
  const deeperQuestions = {
    love: "你希望这段关系通过哪些可观察的行动证明它值得继续投入？",
    career: "在这件事里，哪一个现实条件最值得你先验证？",
    self: "如果暂时不考虑别人期待，你真正想保护的是什么？",
    trend: "你愿意先改变哪个行动，让趋势不再只是被动发生？",
  };

  return {
    direct_answer: reading.forecast_intent
      ? `目前的趋势由${first.card_name}开始，并向${second.card_name}所代表的状态发展；它不是固定结果，第三张牌给出了可以改变走向的抓手。`
      : `这件事的核心首先落在${first.card_name}，而${second.card_name}指出了你还没有完全看见的影响。`,
    card_readings: cards.map((card) => ({
      position: card.position,
      card_id: card.card_id,
      card_name: card.card_name,
      orientation: card.orientation,
      interpretation: `${card.card_name}${orientationZh(card.orientation)}：${card.selected_meaning}`,
    })),
    combined_story: `${relation}${pattern ? ` ${pattern}` : ""} 主导牌是${dominantCard?.card_name ?? "其中的核心牌"}，因此综合判断应优先围绕它所在的牌位展开。`,
    actionable_advice: third.selected_meaning,
    deeper_question: deeperQuestions[reading.domain] ?? deeperQuestions.self,
    closing: "先把这一小步走稳，再观察现实如何回应你。",
    safety: { mode: classifyReadingSafety(reading.question).mode, note: "Local deterministic fallback; no remote model used." },
  };
}


export async function generateReading({ reading, provider, env = process.env, fetchImpl = globalThis.fetch } = {}) {
  if (classifyReadingSafety(reading.question).mode === "crisis_support") {
    return buildCrisisResponse(reading);
  }
  const config = resolveProviderConfig({ provider, env });
  const request = createProviderRequest(reading, config);
  if (request.kind === "local_safety_response") return request.response;
  if (request.kind === "local_template_response") return request.response;

  const attempts = config.id === "deepseek" ? 2 : 1;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetchImpl(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(request.body),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`${config.id} request failed (${response.status}): ${detail.slice(0, 300)}`);
    }
    try {
      const output = normalizeModelOutput(parseProviderResponse(config, await response.json()));
      const errors = validateReadingOutput(output, reading.interpretation_brief.cards);
      if (errors.length) throw new Error(`Model output validation failed: ${errors.join("; ")}`);
      return output;
    } catch (error) {
      lastError = error;
      if (attempt === attempts) throw error;
    }
  }
  throw lastError;
}
