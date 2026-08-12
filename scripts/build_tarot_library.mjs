import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cardsRoot = path.join(root, "public", "cards");

const majorArcana = [
  [0, "the_fool", "The Fool", "愚者"],
  [1, "the_magician", "The Magician", "魔术师"],
  [2, "the_high_priestess", "The High Priestess", "女祭司"],
  [3, "the_empress", "The Empress", "皇后"],
  [4, "the_emperor", "The Emperor", "皇帝"],
  [5, "the_hierophant", "The Hierophant", "教皇"],
  [6, "the_lovers", "The Lovers", "恋人"],
  [7, "the_chariot", "The Chariot", "战车"],
  [8, "strength", "Strength", "力量"],
  [9, "the_hermit", "The Hermit", "隐者"],
  [10, "wheel_of_fortune", "Wheel of Fortune", "命运之轮"],
  [11, "justice", "Justice", "正义"],
  [12, "the_hanged_man", "The Hanged Man", "倒吊人"],
  [13, "death", "Death", "死神"],
  [14, "temperance", "Temperance", "节制"],
  [15, "the_devil", "The Devil", "恶魔"],
  [16, "the_tower", "The Tower", "高塔"],
  [17, "the_star", "The Star", "星星"],
  [18, "the_moon", "The Moon", "月亮"],
  [19, "the_sun", "The Sun", "太阳"],
  [20, "judgement", "Judgement", "审判"],
  [21, "the_world", "The World", "世界"],
];

const suits = [
  ["cups", "圣杯", "water", "水"],
  ["wands", "权杖", "fire", "火"],
  ["swords", "宝剑", "air", "风"],
  ["pentacles", "星币", "earth", "土"],
];

const ranks = [
  [1, "ace", "Ace", "王牌"],
  [2, "two", "Two", "二"],
  [3, "three", "Three", "三"],
  [4, "four", "Four", "四"],
  [5, "five", "Five", "五"],
  [6, "six", "Six", "六"],
  [7, "seven", "Seven", "七"],
  [8, "eight", "Eight", "八"],
  [9, "nine", "Nine", "九"],
  [10, "ten", "Ten", "十"],
  [11, "page", "Page", "侍从"],
  [12, "knight", "Knight", "骑士"],
  [13, "queen", "Queen", "王后"],
  [14, "king", "King", "国王"],
];

const interpretationTemplate = () => ({
  core: "",
  love: "",
  career: "",
  self: "",
  trend: "",
  advice: "",
});

const contentTemplate = () => ({
  keywords: { zh: [], en: [] },
  upright: interpretationTemplate(),
  reversed: interpretationTemplate(),
  editorial_status: "skeleton",
});

const cards = majorArcana.map(([number, slug, nameEn, nameZh]) => {
  const filename = `${String(number).padStart(2, "0")}_${slug}.png`;
  return {
    id: `major_${String(number).padStart(2, "0")}`,
    slug,
    name_en: nameEn,
    name_zh: nameZh,
    arcana: "major",
    suit: null,
    suit_zh: null,
    number,
    rank: null,
    rank_zh: null,
    element: null,
    element_zh: null,
    image: `/cards/major/${filename}`,
    asset_status: "ready",
    ...contentTemplate(),
  };
});

for (const [suit, suitZh, element, elementZh] of suits) {
  for (const [number, rank, rankEn, rankZh] of ranks) {
    const slug = `${rank}_of_${suit}`;
    cards.push({
      id: `${suit}_${String(number).padStart(2, "0")}`,
      slug,
      name_en: `${rankEn} of ${suit[0].toUpperCase()}${suit.slice(1)}`,
      name_zh: `${suitZh}${rankZh}`,
      arcana: "minor",
      suit,
      suit_zh: suitZh,
      number,
      rank,
      rank_zh: rankZh,
      element,
      element_zh: elementZh,
      image: `/cards/${suit}/${String(number).padStart(2, "0")}_${slug}.png`,
      asset_status: "pending_import",
      ...contentTemplate(),
    });
  }
}

const database = {
  schema_version: "0.1.0",
  deck: {
    id: "dreamcore_tarot",
    name: "Dreamcore Tarot",
    system: "Rider-Waite-Smith",
    locale: "zh-CN",
    card_count: 78,
    visual_direction: ["梦核", "疗愈", "神秘", "柔和超现实"],
  },
  product_definition: {
    ai_persona: ["神秘", "直接", "有朋友感"],
    tarot_roles: ["self_exploration", "trend_forecasting"],
    mvp_reading_flow: ["question", "draw", "interpretation", "one_deeper_question", "closing"],
    interpretation_rule: "牌义事实来自本数据库，综合洞察与表达由 AI 完成。",
  },
  assets: {
    base_path: "/cards",
    format: "png",
    aspect_ratio: "897:1497",
    card_back: "/cards/back/card_back.png",
  },
  cards,
};

const manifest = {
  schema_version: "0.1.0",
  expected_card_faces: 78,
  ready_card_faces: cards.filter((card) => card.asset_status === "ready").length,
  pending_card_faces: cards.filter((card) => card.asset_status !== "ready").length,
  card_back: { path: "/cards/back/card_back.png", status: "pending_import" },
  files: cards.map(({ id, image, asset_status }) => ({ id, path: image, status: asset_status })),
};

for (const folder of ["major", "cups", "wands", "swords", "pentacles", "back"]) {
  await mkdir(path.join(cardsRoot, folder), { recursive: true });
}
await mkdir(path.join(root, "data"), { recursive: true });

for (const [number, slug] of majorArcana) {
  const source = path.join(root, "sources", `arcana${String(number).padStart(2, "0")}.jpg`);
  const destination = path.join(cardsRoot, "major", `${String(number).padStart(2, "0")}_${slug}.png`);
  await copyFile(source, destination);
}

await writeFile(path.join(root, "data", "tarot_cards.json"), `${JSON.stringify(database, null, 2)}\n`);
await writeFile(path.join(cardsRoot, "asset_manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Built ${cards.length} card records; copied ${majorArcana.length} normalized major arcana assets.`);
