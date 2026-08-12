# Model Evaluation v0.1

评测集位于 `data/reading_eval_cases.json`，覆盖感情、事业、自我探索、趋势、第三方读心、医疗、投资、危机旁路和 Prompt 注入。

每个案例检查：

- 问题领域与牌阵路由
- 安全模式
- 三张牌无重复
- 输出结构完整
- 输出牌面与真实抽牌一致
- 不使用绝对命运措辞
- 只提出一个深入问题

免费本地评测：

```bash
node scripts/run_reading_evals.mjs local_template
```

远程模型评测会产生 API 用量，因此必须显式添加 `--live`：

```bash
node scripts/run_reading_evals.mjs deepseek --live
```

当前评分主要验证硬性产品规则，不等同于人工评价文案感染力。正式选型时还需对神秘感、朋友感、洞察深度、重复度、延迟和费用做人工对比。

