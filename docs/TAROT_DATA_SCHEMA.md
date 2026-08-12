# Tarot Card Database v0.4

`data/tarot_cards.json` 是产品当前唯一的卡牌基础索引。

## 当前完成范围

- 78 张牌的稳定 ID 与 slug
- 中英文牌名
- 大／小阿卡纳分类
- 数字、花色、宫廷等级与元素
- 已通过 QA 的修正版图片路径
- 牌组视觉方向、AI 人格、产品用途和 MVP Reading 流程

78 张牌均已具备第一版牌义。6 张代表牌为 `pilot_complete`，其余 72 张为 `draft_complete`，后续可继续做逐牌编辑校准。

## 卡牌字段

| 字段 | 用途 |
| --- | --- |
| `id` | 程序内部稳定标识，不随显示语言变化 |
| `slug` | 可读英文标识，可用于 URL 与日志 |
| `name_en` / `name_zh` | 用户界面显示名称 |
| `arcana` | `major` 或 `minor` |
| `number` | 大阿卡纳编号 0–21；小阿卡纳顺序 1–14 |
| `suit` | 小阿卡纳花色；大阿卡纳为 `null` |
| `rank` | `ace` 至 `king`；大阿卡纳为 `null` |
| `element` | `water`、`fire`、`air`、`earth`；大阿卡纳暂为 `null` |
| `image` | 修正版卡面公开路径 |
| `asset_status` | 当前统一为 `qa_passed` |
| `editorial_status` | `pilot_complete` 或 `draft_complete` |
| `interpretation` | 当前 78 张均为完整牌义对象 |

## 牌义对象

- `keywords`：5 个中文核心关键词。
- `upright` / `reversed`：正位与逆位。
- 每个方向包含 `core`、`love`、`career`、`self`、`trend`、`advice`。
- `trend` 只描述当前条件下的发展倾向，不宣称确定命运。

## 后续扩展原则

下一阶段进行逐牌编辑 QA、牌与牌之间的差异化校准，并制定多牌组合解读规则；现有 `id`、`slug` 与图片路径保持不变。
