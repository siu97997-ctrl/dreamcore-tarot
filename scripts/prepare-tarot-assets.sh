#!/bin/zsh
set -euo pipefail

project_root="$(cd "$(dirname "$0")/../.." && pwd)"
web_root="$(cd "$(dirname "$0")/.." && pwd)"

mkdir -p "$web_root/data" "$web_root/public/cards_corrected"
cp "$project_root/data/tarot_cards.json" "$web_root/data/tarot_cards.json"
cp "$project_root/data/reading_rules.json" "$web_root/data/reading_rules.json"

find "$project_root/public/cards_corrected" -type f -name '*.png' | while IFS= read -r source; do
  relative="${source#$project_root/public/cards_corrected/}"
  destination="$web_root/public/cards_corrected/${relative%.png}.jpg"
  mkdir -p "$(dirname "$destination")"
  sips --resampleWidth 512 --setProperty format jpeg --setProperty formatOptions 82 "$source" --out "$destination" >/dev/null
done
