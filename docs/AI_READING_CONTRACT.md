# AI Reading Contract v0.1

## 组成

- `src/reading-prompt.mjs`：开发者 Prompt、敏感问题分类、Structured Outputs Schema、输出校验。
- `scripts/build_reading_request.mjs`：把一次固定抽牌转换成可检查的 Responses API 请求文件。
- `tests/reading-prompt.test.mjs`：请求结构、安全路由、牌面一致性和禁用绝对化措辞测试。

## 输出字段

AI 必须返回：直接回答、三张单牌解读、组合故事、行动建议、一个深入问题、结尾和安全状态。

## 当前边界

- 当前仅生成 API 请求，不安装 SDK、不读取密钥、不发起网络模型调用。
- 默认模型暂定为 `gpt-5.6`，推理强度为 `low`，详细度为 `medium`。
- 正式接入时需要服务端保存 API Key，禁止把密钥放入浏览器代码。

## 模型供应商

- `local_template`：免费、无网络、无密钥的确定性后备，仅用于开发与降级。
- `openai`：Responses API + 严格 JSON Schema。
- `deepseek`：Chat Completions + JSON Output + 本地 Schema 校验。
- `openai_compatible`：用于其他兼容 OpenAI Chat Completions 的国产或自部署模型，需要配置 Base URL、模型名和独立密钥。
- `src/model-client.mjs` 负责供应商切换、请求转换、响应解析与统一校验。
- `config/model-providers.example.env` 只包含变量名和空值，不保存真实密钥。

DeepSeek 默认暂定为 `deepseek-v4-flash`。供应商模型名会随服务更新，正式部署前应再次查阅官方模型列表。
