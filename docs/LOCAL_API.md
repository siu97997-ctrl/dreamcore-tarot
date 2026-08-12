# Local Tarot API

## 启动

```bash
node scripts/start_server.mjs
```

默认只监听 `127.0.0.1:8787`，不会公开到局域网或互联网。

## 接口

- `GET /health`：服务健康状态。
- `GET /api/config`：公开牌阵、逆位设置与可选供应商，不返回密钥。
- `GET /api/cards`：返回 78 张牌的公开名称、编号与图片路径，不返回完整牌义。
- `POST /api/readings`：执行完整 Reading 流程。
- `GET /cards_corrected/...`：读取通过 QA 的卡面和牌背；返回的 Reading 可直接使用这些图片路径。

无密钥预览请求：

```json
{
  "question": "如果现状不变，这段关系接下来会怎样？",
  "provider": "deepseek",
  "seed": 42,
  "dry_run": true
}
```

`dry_run: true` 会完成抽牌、正逆位、牌位绑定和组合分析，但不会调用模型。

正式请求把 `dry_run` 改为 `false`，并在服务端环境配置所选供应商的 API Key。密钥不得从浏览器传入，也不会由接口返回。

正式 DeepSeek 请求：

```json
{
  "question": "如果现状不变，这段关系接下来会怎样？",
  "provider": "deepseek"
}
```

响应已经按 MVP 顺序包含抽牌结果与 `reading`：直接回答、三张牌解读、综合故事、现实建议、一个拓展问题和结尾。前端不需要自行拼接模型提示词。

如果未配置供应商，默认使用 `local_template`。它不联网、不产生费用，可返回完整但较朴素的结构化 Reading，适合验证全流程；它不等同于真实 AI 解读质量。

命令行端到端演示：

```bash
node scripts/run_reading.mjs "我现在该看见什么？" local_template 42
```

## DeepSeek 本机配置

项目当前已选择 DeepSeek。打开 `config/model-providers.env`，只在 `DEEPSEEK_API_KEY=` 后粘贴密钥。不要在聊天、截图、前端代码或 GitHub 中发送密钥。

本地检查不会连接网络，也不会显示密钥：

```bash
node scripts/check_deepseek_setup.mjs
```

确认配置后，可显式执行一次连接检查：

```bash
node scripts/test_deepseek_connection.mjs --live
```
