from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "tarot_cards.json"
PILOT = ROOT / "data" / "tarot_interpretations_pilot.json"
PROFILES = ROOT / "data" / "tarot_interpretation_profiles.json"

MAJOR = [
    ("the_fool", "The Fool", "愚人"),
    ("the_magician", "The Magician", "魔术师"),
    ("the_high_priestess", "The High Priestess", "女祭司"),
    ("the_empress", "The Empress", "皇后"),
    ("the_emperor", "The Emperor", "皇帝"),
    ("the_hierophant", "The Hierophant", "教皇"),
    ("the_lovers", "The Lovers", "恋人"),
    ("the_chariot", "The Chariot", "战车"),
    ("strength", "Strength", "力量"),
    ("the_hermit", "The Hermit", "隐士"),
    ("wheel_of_fortune", "Wheel of Fortune", "命运之轮"),
    ("justice", "Justice", "正义"),
    ("the_hanged_man", "The Hanged Man", "倒吊人"),
    ("death", "Death", "死神"),
    ("temperance", "Temperance", "节制"),
    ("the_devil", "The Devil", "恶魔"),
    ("the_tower", "The Tower", "高塔"),
    ("the_star", "The Star", "星星"),
    ("the_moon", "The Moon", "月亮"),
    ("the_sun", "The Sun", "太阳"),
    ("judgement", "Judgement", "审判"),
    ("the_world", "The World", "世界"),
]

SUITS = {
    "cups": {"en": "Cups", "zh": "圣杯", "element": "water", "element_zh": "水"},
    "wands": {"en": "Wands", "zh": "权杖", "element": "fire", "element_zh": "火"},
    "swords": {"en": "Swords", "zh": "宝剑", "element": "air", "element_zh": "风"},
    "pentacles": {"en": "Pentacles", "zh": "星币", "element": "earth", "element_zh": "土"},
}

RANKS = {
    1: ("ace", "Ace", "一"),
    2: ("two", "Two", "二"),
    3: ("three", "Three", "三"),
    4: ("four", "Four", "四"),
    5: ("five", "Five", "五"),
    6: ("six", "Six", "六"),
    7: ("seven", "Seven", "七"),
    8: ("eight", "Eight", "八"),
    9: ("nine", "Nine", "九"),
    10: ("ten", "Ten", "十"),
    11: ("page", "Page", "侍从"),
    12: ("knight", "Knight", "骑士"),
    13: ("queen", "Queen", "王后"),
    14: ("king", "King", "国王"),
}


def expand_profile(profile: list[str]) -> dict:
    keywords, up_core, up_advice, rev_core, rev_advice = profile

    def orientation(core: str, advice: str) -> dict:
        return {
            "core": core,
            "love": f"关系层面：{core}",
            "career": f"事业与现实层面：{core}",
            "self": f"自我探索中：{core}",
            "trend": f"若当前条件延续，{core}",
            "advice": advice,
        }

    return {
        "keywords": keywords.split("|"),
        "upright": orientation(up_core, up_advice),
        "reversed": orientation(rev_core, rev_advice),
    }


def build_cards(interpretations: dict[str, dict], pilot_ids: set[str]) -> list[dict]:
    cards = []
    for number, (slug, name_en, name_zh) in enumerate(MAJOR):
        card = {
                "id": f"major_{number:02d}",
                "slug": slug,
                "name_en": name_en,
                "name_zh": name_zh,
                "arcana": "major",
                "number": number,
                "suit": None,
                "rank": None,
                "element": None,
                "image": f"/cards_corrected/major/{number:02d}_{slug}.png",
                "asset_status": "qa_passed",
                "editorial_status": "pilot_complete" if f"major_{number:02d}" in pilot_ids else "draft_complete",
                "interpretation": interpretations.get(f"major_{number:02d}"),
            }
        cards.append(card)

    for suit, suit_data in SUITS.items():
        for number, (rank, rank_en, rank_zh) in RANKS.items():
            slug = f"{rank}_of_{suit}"
            card_id = f"{suit}_{number:02d}"
            cards.append(
                {
                    "id": card_id,
                    "slug": slug,
                    "name_en": f"{rank_en} of {suit_data['en']}",
                    "name_zh": f"{suit_data['zh']}{rank_zh}",
                    "arcana": "minor",
                    "number": number,
                    "suit": suit,
                    "rank": rank,
                    "element": suit_data["element"],
                    "image": f"/cards_corrected/{suit}/{number:02d}_{slug}.png",
                    "asset_status": "qa_passed",
                    "editorial_status": "pilot_complete" if card_id in pilot_ids else "draft_complete",
                    "interpretation": interpretations.get(card_id),
                }
            )
    return cards


def main() -> None:
    with PILOT.open(encoding="utf-8") as handle:
        pilot = json.load(handle)["cards"]
    with PROFILES.open(encoding="utf-8") as handle:
        profiles = json.load(handle)["cards"]
    interpretations = {card_id: expand_profile(profile) for card_id, profile in profiles.items()}
    interpretations.update(pilot)
    pilot_ids = set(pilot)
    data = {
        "schema_version": "0.4.0",
        "content_status": "interpretation_first_draft_complete",
        "deck": {
            "id": "dreamcore_tarot",
            "name": "Dreamcore Tarot",
            "system": "Rider-Waite-Smith",
            "locale": "zh-CN",
            "card_count": 78,
            "visual_direction": ["梦核", "疗愈", "神秘", "柔和超现实"],
        },
        "product_definition": {
            "ai_persona": ["神秘", "直接", "有朋友感"],
            "tarot_roles": ["self_exploration", "trend_forecasting"],
            "mvp_reading_flow": [
                "question",
                "draw",
                "interpretation",
                "one_deeper_question",
                "closing",
            ],
        },
        "assets": {
            "base_path": "/cards_corrected",
            "format": "png",
            "width": 1024,
            "height": 1707,
            "card_back": "/cards_corrected/back/card_back.png",
            "manifest": "/cards_corrected/asset_manifest.json",
        },
        "interpretation_content": {
            "status": "first_draft_complete",
            "completed_cards": len(interpretations),
            "total_cards": 78,
            "pilot_calibrated_cards": len(pilot_ids),
            "draft_cards": len(interpretations) - len(pilot_ids),
            "orientation_fields": ["core", "love", "career", "self", "trend", "advice"],
            "forecasting_rule": "描述当前条件下更可能的发展倾向，不宣称确定命运。",
            "editorial_rule": "直接但不制造恐惧；指出问题，同时给出用户可执行的选择。",
        },
        "cards": build_cards(interpretations, pilot_ids),
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(f"Built {len(data['cards'])} card index records")


if __name__ == "__main__":
    main()
