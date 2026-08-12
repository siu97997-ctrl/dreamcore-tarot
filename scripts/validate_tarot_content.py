from __future__ import annotations

import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CARDS_PATH = ROOT / "data" / "tarot_cards.json"
RULES_PATH = ROOT / "data" / "reading_rules.json"
PUBLIC = ROOT / "public"
FIELDS = {"core", "love", "career", "self", "trend", "advice"}


def main() -> None:
    cards_data = json.loads(CARDS_PATH.read_text(encoding="utf-8"))
    rules = json.loads(RULES_PATH.read_text(encoding="utf-8"))
    cards = cards_data["cards"]
    errors: list[str] = []

    if len(cards) != 78:
        errors.append(f"expected 78 cards, found {len(cards)}")
    if len({card["id"] for card in cards}) != len(cards):
        errors.append("card IDs are not unique")
    if len({card["slug"] for card in cards}) != len(cards):
        errors.append("card slugs are not unique")

    for card in cards:
        card_id = card["id"]
        interpretation = card.get("interpretation")
        if not interpretation:
            errors.append(f"{card_id}: missing interpretation")
            continue
        if len(interpretation.get("keywords", [])) != 5:
            errors.append(f"{card_id}: expected 5 keywords")
        for orientation in ("upright", "reversed"):
            content = interpretation.get(orientation, {})
            if set(content) != FIELDS:
                errors.append(f"{card_id}/{orientation}: wrong fields")
                continue
            for field, text in content.items():
                if not isinstance(text, str) or len(text.strip()) < 8:
                    errors.append(f"{card_id}/{orientation}/{field}: text too short")
        image = PUBLIC / card["image"].lstrip("/")
        if not image.is_file():
            errors.append(f"{card_id}: missing image {card['image']}")

    if rules["draw_config"]["deck_size"] != 78:
        errors.append("reading rules deck size must be 78")
    for spread_id, spread in rules["mvp_spreads"].items():
        if len(spread["positions"]) != 3:
            errors.append(f"{spread_id}: MVP spread must have 3 positions")

    if errors:
        raise SystemExit("\n".join(errors))

    status = Counter(card["editorial_status"] for card in cards)
    print("QA passed")
    print(f"cards={len(cards)}, interpretation_fields={len(cards) * 12}")
    print(f"editorial_status={dict(status)}")
    print(f"spreads={len(rules['mvp_spreads'])}, reversal_probability={rules['draw_config']['reversal_probability']}")


if __name__ == "__main__":
    main()
