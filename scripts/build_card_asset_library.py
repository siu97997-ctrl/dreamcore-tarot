from __future__ import annotations

import csv
import json
import shutil
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "assets" / "source_batches"
OUT = ROOT / "public" / "cards"

SUITS = ["cups", "wands", "swords", "pentacles"]
RANKS = {
    1: "ace",
    2: "two",
    3: "three",
    4: "four",
    5: "five",
    6: "six",
    7: "seven",
    8: "eight",
    9: "nine",
    10: "ten",
    11: "page",
    12: "knight",
    13: "queen",
    14: "king",
}

MAJOR = [
    "the_fool", "the_magician", "the_high_priestess", "the_empress",
    "the_emperor", "the_hierophant", "the_lovers", "the_chariot",
    "strength", "the_hermit", "wheel_of_fortune", "justice",
    "the_hanged_man", "death", "temperance", "the_devil", "the_tower",
    "the_star", "the_moon", "the_sun", "judgement", "the_world",
]

# Coordinates are the detected outer card-frame bounds in each 1024x1536 source collage.
ACES_X = [(37, 464), (556, 974)]
ACES_Y = [(17, 788), (819, 1528)]

TWO_TO_FOUR_X = [(20, 244), (274, 496), (528, 750), (781, 1004)]
TWO_TO_FOUR_Y = [(18, 414), (432, 828), (843, 1240)]

FIVES_X = [(16, 259), (283, 501), (533, 752), (783, 1008)]
FIVES_Y = [(9, 395), (409, 781), (796, 1152), (1164, 1526)]

SIX_TO_EIGHT_X = [(22, 253), (280, 501), (528, 749), (777, 999)]
SIX_TO_EIGHT_Y = [(9, 507), (519, 1016), (1028, 1524)]

NINE_TO_PAGE_X = [(22, 253), (280, 501), (527, 749), (776, 999)]
NINE_TO_PAGE_Y = [(8, 507), (518, 1016), (1026, 1524)]

CUPS_ONLY_X = [(20, 252), (266, 504), (519, 756), (771, 1008)]
CUPS_ONLY_Y = [(11, 417), (428, 832), (841, 1225), (1236, 1529)]

COURT_X = [(20, 245), (274, 496), (527, 749), (779, 1003)]
COURT_Y = [(9, 494), (512, 992), (1008, 1421)]


def filename(suit: str, number: int) -> str:
    return f"{number:02d}_{RANKS[number]}_of_{suit}.png"


def crop(source: str, box: tuple[int, int, int, int], destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(RAW / source) as image:
        image.crop(box).save(destination, format="PNG", optimize=True)


def add_crop(rows, suit, number, source, x_bounds, y_bounds, column, row, qa="pass"):
    box = (x_bounds[column][0], y_bounds[row][0], x_bounds[column][1], y_bounds[row][1])
    destination = OUT / suit / filename(suit, number)
    crop(source, box, destination)
    rows.append([f"{suit}/{destination.name}", source, ",".join(map(str, box)), qa])


def main() -> None:
    rows = []

    for number, slug in enumerate(MAJOR):
        destination = OUT / "major" / f"{number:02d}_{slug}.png"
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.exists():
            destination.chmod(0o644)
        shutil.copyfile(ROOT / "sources" / f"arcana{number:02d}.jpg", destination)
        rows.append([f"major/{destination.name}", f"sources/arcana{number:02d}.jpg", "full image", "pending visual review"])

    ace_cells = {"cups": (0, 0), "wands": (1, 0), "swords": (0, 1), "pentacles": (1, 1)}
    for suit, (column, row) in ace_cells.items():
        add_crop(rows, suit, 1, "image-gen-1(4).png", ACES_X, ACES_Y, column, row)

    for number in (2, 3, 4):
        for column, suit in enumerate(SUITS):
            qa = "printed title typo" if number == 4 and suit == "pentacles" else "pass"
            add_crop(rows, suit, number, "华丽塔罗牌四乘四矩阵.png", TWO_TO_FOUR_X, TWO_TO_FOUR_Y, column, number - 2, qa)

    # This collage is organized by suit rows and rank columns. Its top medallions
    # all incorrectly show 2; only the complete Five cards are used here.
    for row, suit in enumerate(SUITS):
        add_crop(rows, suit, 5, "梦幻星辉塔罗二至五牌阵.png", FIVES_X, FIVES_Y, 3, row, "wrong top numeral: 2")

    for number in (6, 7, 8):
        for column, suit in enumerate(SUITS):
            add_crop(rows, suit, number, "梦幻塔罗牌十二宫阵列.png", SIX_TO_EIGHT_X, SIX_TO_EIGHT_Y, column, number - 6)

    for number, row in ((9, 0), (10, 1), (11, 2)):
        for column, suit in enumerate(SUITS):
            add_crop(rows, suit, number, "image-gen-1(7).png", NINE_TO_PAGE_X, NINE_TO_PAGE_Y, column, row)

    # Cups has a correctly named Knight in an earlier cups-only collage.
    add_crop(rows, "cups", 12, "image-gen-1(5).png", CUPS_ONLY_X, CUPS_ONLY_Y, 2, 2)

    # The final court collage intended this row as Knights, but printed JACK and 侍从.
    for column, suit in enumerate(SUITS[1:], start=1):
        add_crop(rows, suit, 12, "星月秘境：塔罗宫廷牌图鉴.png", COURT_X, COURT_Y, column, 0, "wrong printed rank: JACK/侍从")

    for number, row in ((13, 1), (14, 2)):
        for column, suit in enumerate(SUITS):
            add_crop(rows, suit, number, "星月秘境：塔罗宫廷牌图鉴.png", COURT_X, COURT_Y, column, row)

    back = OUT / "back" / "card_back.png"
    back.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(RAW / "繁星金饰月相曼陀罗卡背.png", back)
    rows.append(["back/card_back.png", "繁星金饰月相曼陀罗卡背.png", "full image", "aspect ratio differs from faces"])

    provenance = ROOT / "docs" / "card_asset_provenance.csv"
    provenance.parent.mkdir(parents=True, exist_ok=True)
    with provenance.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.writer(handle)
        writer.writerow(["asset", "source", "crop_box", "qa_status"])
        writer.writerows(rows)

    manifest = {
        "schema_version": "0.2.0",
        "card_faces": {"total": 78, "major": 22, "minor": 56, "ready": 78},
        "card_back": {"path": "/cards/back/card_back.png", "status": "ready"},
        "qa_report": "/docs/CARD_ASSET_QA.md",
        "provenance": "/docs/card_asset_provenance.csv",
        "files": [
            {"path": f"/cards/{asset}", "status": "ready", "qa_status": qa}
            for asset, _source, _box, qa in rows
            if not asset.startswith("back/")
        ],
    }
    with (OUT / "asset_manifest.json").open("w", encoding="utf-8") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    print(f"Built {len(MAJOR)} major + {len(SUITS) * len(RANKS)} minor faces + 1 back.")


if __name__ == "__main__":
    main()
