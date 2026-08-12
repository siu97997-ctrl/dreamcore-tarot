from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ORIGINAL = ROOT / "public" / "cards"
RAW_MAJOR = ROOT / "assets" / "corrected_raw" / "major"
RAW_MINOR = ROOT / "assets" / "corrected_raw" / "minor"
OUT = ROOT / "public" / "cards_corrected"

SIZE = (1024, 1707)
GOLD = (210, 168, 92, 255)
CREAM = (242, 225, 194, 255)
PANEL = (6, 8, 16, 242)
EN_FONT = "/System/Library/Fonts/Supplemental/Times New Roman.ttf"
ZH_FONT = "/System/Library/Fonts/PingFang.ttc"

MAJOR = [
    ("the_fool", "THE FOOL", "愚人"),
    ("the_magician", "THE MAGICIAN", "魔术师"),
    ("the_high_priestess", "THE HIGH PRIESTESS", "女祭司"),
    ("the_empress", "THE EMPRESS", "皇后"),
    ("the_emperor", "THE EMPEROR", "皇帝"),
    ("the_hierophant", "THE HIEROPHANT", "教皇"),
    ("the_lovers", "THE LOVERS", "恋人"),
    ("the_chariot", "THE CHARIOT", "战车"),
    ("strength", "STRENGTH", "力量"),
    ("the_hermit", "THE HERMIT", "隐士"),
    ("wheel_of_fortune", "WHEEL OF FORTUNE", "命运之轮"),
    ("justice", "JUSTICE", "正义"),
    ("the_hanged_man", "THE HANGED MAN", "倒吊人"),
    ("death", "DEATH", "死神"),
    ("temperance", "TEMPERANCE", "节制"),
    ("the_devil", "THE DEVIL", "恶魔"),
    ("the_tower", "THE TOWER", "高塔"),
    ("the_star", "THE STAR", "星星"),
    ("the_moon", "THE MOON", "月亮"),
    ("the_sun", "THE SUN", "太阳"),
    ("judgement", "JUDGEMENT", "审判"),
    ("the_world", "THE WORLD", "世界"),
]

SUITS = {
    "cups": ("CUPS", "圣杯"),
    "wands": ("WANDS", "权杖"),
    "swords": ("SWORDS", "宝剑"),
    "pentacles": ("PENTACLES", "星币"),
}
RANKS = {
    1: ("ace", "ACE", "一"),
    2: ("two", "TWO", "二"),
    3: ("three", "THREE", "三"),
    4: ("four", "FOUR", "四"),
    5: ("five", "FIVE", "五"),
    6: ("six", "SIX", "六"),
    7: ("seven", "SEVEN", "七"),
    8: ("eight", "EIGHT", "八"),
    9: ("nine", "NINE", "九"),
    10: ("ten", "TEN", "十"),
    11: ("page", "PAGE", "侍从"),
    12: ("knight", "KNIGHT", "骑士"),
    13: ("queen", "QUEEN", "王后"),
    14: ("king", "KING", "国王"),
}


def roman(number: int) -> str:
    if number == 0:
        return "0"
    values = ((10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I"))
    result = ""
    for value, token in values:
        while number >= value:
            result += token
            number -= value
    return result


def fit_font(text: str, font_path: str, maximum: int, max_width: int) -> ImageFont.FreeTypeFont:
    size = maximum
    while size > 18:
        font = ImageFont.truetype(font_path, size)
        if font.getlength(text) <= max_width:
            return font
        size -= 1
    return ImageFont.truetype(font_path, size)


def centered(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, font, fill) -> None:
    box = draw.textbbox((0, 0), text, font=font)
    x = xy[0] - (box[2] - box[0]) / 2
    y = xy[1] - (box[3] - box[1]) / 2 - box[1]
    draw.text((x, y), text, font=font, fill=fill)


def render_face(source: Path, destination: Path, numeral: str, en: str, zh: str) -> None:
    with Image.open(source) as opened:
        image = ImageOps.fit(opened.convert("RGBA"), SIZE, method=Image.Resampling.LANCZOS)

    overlay = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Opaque standardized regions hide all AI-generated labels and numerals.
    draw.rounded_rectangle((365, 24, 659, 188), radius=76, fill=(226, 207, 177, 255), outline=GOLD, width=5)
    draw.rectangle((0, 1392, 1024, 1707), fill=(3, 5, 11, 255))
    draw.line((28, 1392, 996, 1392), fill=GOLD, width=4)
    draw.rounded_rectangle((74, 1412, 950, 1668), radius=48, fill=PANEL, outline=GOLD, width=5)
    draw.line((116, 1442, 908, 1442), fill=(210, 168, 92, 155), width=2)

    centered(draw, (512, 105), numeral, fit_font(numeral, EN_FONT, 62, 220), (62, 49, 41, 255))
    centered(draw, (512, 1504), en, fit_font(en, EN_FONT, 43, 760), CREAM)
    centered(draw, (512, 1582), zh, fit_font(zh, ZH_FONT, 38, 700), CREAM)

    destination.parent.mkdir(parents=True, exist_ok=True)
    Image.alpha_composite(image, overlay).convert("RGB").save(destination, "PNG", optimize=True)


def render_back(source: Path, destination: Path) -> None:
    with Image.open(source) as opened:
        image = ImageOps.fit(opened.convert("RGB"), SIZE, method=Image.Resampling.LANCZOS)
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, "PNG", optimize=True)


def main() -> None:
    files = []
    for number, (slug, en, zh) in enumerate(MAJOR):
        name = f"{number:02d}_{slug}.png"
        destination = OUT / "major" / name
        render_face(RAW_MAJOR / name, destination, roman(number), en, zh)
        files.append({"path": f"/cards_corrected/major/{name}", "qa_status": "corrected"})

    for suit, (suit_en, suit_zh) in SUITS.items():
        for number, (slug, rank_en, rank_zh) in RANKS.items():
            name = f"{number:02d}_{slug}_of_{suit}.png"
            replacement = RAW_MINOR / suit / name
            source = replacement if replacement.exists() else ORIGINAL / suit / name
            en = f"{rank_en} OF {suit_en}"
            zh = f"{suit_zh}{rank_zh}" if number <= 10 else f"{suit_zh}{rank_zh}"
            marker = "A" if number == 1 else str(number) if number <= 10 else {11: "P", 12: "N", 13: "Q", 14: "K"}[number]
            destination = OUT / suit / name
            render_face(source, destination, marker, en, zh)
            files.append({"path": f"/cards_corrected/{suit}/{name}", "qa_status": "corrected"})

    render_back(ORIGINAL / "back" / "card_back.png", OUT / "back" / "card_back.png")
    manifest = {
        "schema_version": "1.0.0-corrected",
        "dimensions": {"width": SIZE[0], "height": SIZE[1], "format": "PNG"},
        "card_faces": {"total": 78, "major": 22, "minor": 56, "status": "corrected"},
        "card_back": {"path": "/cards_corrected/back/card_back.png", "status": "corrected"},
        "original_library": "/cards",
        "qa_report": "/docs/CARD_ASSET_QA_CORRECTED.md",
        "files": files,
    }
    with (OUT / "asset_manifest.json").open("w", encoding="utf-8") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print("Built corrected library: 22 major + 56 minor + 1 back")


if __name__ == "__main__":
    main()
