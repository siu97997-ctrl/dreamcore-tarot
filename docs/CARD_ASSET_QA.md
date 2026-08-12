# Card Asset Library QA

## 结论

- 已建立：22 张大阿卡纳、4 花色 × 14 张小阿卡纳、1 张牌背。
- 小阿卡纳全部来自 File Library 原图切割，没有补画、修字或生成替代图。
- 当前文件可用于继续审片与开发接入，但不建议直接作为最终上线资产；以下异常需要人工确认或返工。

## 逐牌异常

| 牌 | 异常 | 严重度 |
|---|---|---|
| 倒吊人 / The Hanged Man | 中文和 XII 正确，但英文牌名印成 `THE FOOL` | 高 |
| 审判 / Judgement | 卡面使用美式拼写 `JUDGMENT`，与当前文件名 `judgement` 不一致；拼写本身并非错误 | 低 |
| 星币四 / Four of Pentacles | 英文牌名印成 `FIUR OF PENTACLES` | 高 |
| 圣杯五 / Five of Cups | 顶部编号印成 2，底部牌名为 Five | 高 |
| 权杖五 / Five of Wands | 顶部编号印成 2，底部牌名为 Five | 高 |
| 宝剑五 / Five of Swords | 顶部编号印成 2，底部牌名为 Five | 高 |
| 星币五 / Five of Pentacles | 顶部编号印成 2，底部牌名为 Five | 高 |
| 圣杯骑士 / Knight of Cups | 英文与数字 12 正确，中文印成 `权杖骑士` | 高 |
| 权杖骑士 / Knight of Wands | 来源卡印成 `JACK OF WANDS / 权杖侍从`，且人物不是骑士构图 | 高 |
| 宝剑骑士 / Knight of Swords | 来源卡印成 `JACK OF SWORDS / 宝剑侍从`，且人物不是骑士构图 | 高 |
| 星币骑士 / Knight of Pentacles | 来源卡印成 `JACK OF PENTACLES / 星币侍从`，且人物不是骑士构图 | 高 |
| 圣杯六 / Six of Cups | 画面清晰可见 4 只杯，与牌面数字 6 不一致 | 中 |
| 圣杯八 / Eight of Cups | 画面清晰可见约 9 只杯，与牌面数字 8 不一致 | 中 |
| 权杖八 / Eight of Wands | 画面权杖数量明显多于 8 | 中 |
| 宝剑八 / Eight of Swords | 画面宝剑数量明显多于 8 | 中 |

## 系统性视觉异常

1. 大阿卡纳是高饱和粉彩、平面梦核插画；小阿卡纳是暗夜金框、写实绘本质感。两组目前不像同一副牌。
2. 大阿卡纳统一为 897×1497；小阿卡纳裁切后宽约 221–427、高约 356–771，尺寸和纵横比不统一。
3. 牌背为 1024×1536，纵横比同样不同于大、小阿卡纳牌面。
4. 小阿卡纳来自多张拼图批次，不同批次的边框宽度、字号、人物风格和画面密度存在明显波动。
5. 当前小阿卡纳是从 1024×1536 拼图中切割的低分辨率单牌，不适合作为高清最终输出。

## 来源取舍

- Ace：`image-gen-1(4).png`
- 2–4：`华丽塔罗牌四乘四矩阵.png`
- 5：`梦幻星辉塔罗二至五牌阵.png`；采用完整卡面，但保留顶部数字错误
- 6–8：`梦幻塔罗牌十二宫阵列.png`
- 9、10、Page：`image-gen-1(7).png`
- 圣杯骑士：`image-gen-1(5).png`
- 其余骑士、Queen、King：`星月秘境：塔罗宫廷牌图鉴.png`
- 牌背：`繁星金饰月相曼陀罗卡背.png`

重复批次和早期试作均保存在 `assets/source_batches/`，未混入正式目录。逐文件裁切坐标见 `card_asset_provenance.csv`。
