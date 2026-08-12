# Card Asset Library

第一版统一使用 PNG，运行时公开路径以 `/cards` 为根目录。

```text
public/cards/
├── major/       22 张大阿卡纳
├── cups/        14 张圣杯
├── wands/       14 张权杖
├── swords/      14 张宝剑
├── pentacles/   14 张星币
├── back/        card_back.png
└── asset_manifest.json
```

## 命名规则

- 大阿卡纳：`00_the_fool.png` 至 `21_the_world.png`
- 小阿卡纳：两位序号 + 英文 slug，例如 `01_ace_of_cups.png`、`14_king_of_cups.png`
- 牌背固定为：`back/card_back.png`
- 数据库中的 `image` 是公开 URL，不是磁盘路径。

## 当前状态

1. 78 张牌面和 1 张牌背均已落盘；小阿卡纳由 File Library 批次原图确定性切割得到。
2. 原始批次保存在 `assets/source_batches/`，不覆盖、不修字、不重画。
3. 每张卡的来源与裁切框见 `docs/card_asset_provenance.csv`。
4. 已发现的视觉、编号和牌名异常见 `docs/CARD_ASSET_QA.md`；异常牌仍保留原貌。
5. 当前大阿卡纳源文件虽然扩展名为 `.jpg`，实际内容为 PNG；资产库统一按 `.png` 命名。
