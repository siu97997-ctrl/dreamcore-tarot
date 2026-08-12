# 🎴 Dreamcore Tarot — 塔罗牌占卜网站

> 为此刻照一束微光 · Vintage Illustration Style

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)](https://dreamcore-tarot-v2.siu97997.workers.dev)
[![DeepSeek](https://img.shields.io/badge/AI-DeepSeek-4B6CFF?logo=deepseek)](https://platform.deepseek.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## ✨ 在线体验

| 环境 | 地址 |
|------|------|
| **Cloudflare（主站）** | [dreamcore-tarot-v2.siu97997.workers.dev](https://dreamcore-tarot-v2.siu97997.workers.dev) |
| 腾讯云 CloudBase（备用） | [sh.run.tcloudbase.com](https://dreamcore-tarot-295511-11-1466810715.sh.run.tcloudbase.com) |

## 🎯 功能

- 🃏 **三张牌 Celtic Cross 简化阵**：随机抽取过去/现在/未来三张塔罗牌
- 🔮 **AI 智能解读**：基于 DeepSeek API 生成个性化牌意解读与行动建议
- 📖 **78 张完整大阿卡纳 + 小阿卡纳**：含圣杯/宝剑/权杖/星币四组
- 🌍 **双线部署**：Cloudflare Workers（海外）+ 腾讯云 CloudBase（国内）
- ⚡ **秒级响应**：Cloudflare Edge 全球边缘节点加速

## 🛠 技术栈

| 技术 | 用途 |
|------|------|
| [vinext](https://github.com/cloudflare/vinext) (Vite + Next.js) | 前端框架 |
| [Cloudflare Workers](https://workers.cloudflare.com/) | 边缘计算 & 托管 |
| DeepSeek API | AI 牌意解读 |
| Docker | 腾讯云容器化部署 |

## 📁 项目结构

```
dreamcore-tarot/
├── app/
│   ├── page.tsx              # 主页面（提问 → 选牌 → 结果）
│   ├── layout.tsx            # 全局布局
│   ├── globals.css           # 全局样式
│   └── api/readings/route.ts # 解读接口（POST /api/readings）
├── lib/
│   ├── tarot-deck.ts         # 78 张塔罗牌数据定义
│   ├── tarot-reading.ts      # 抽牌逻辑 + DeepSeek 解读生成
│   └── rate-limiter.ts       # 接口限流
├── public/cards_corrected/   # 78 张塔罗牌图片（major + cups/wands/swords/pentacles）
├── worker/index.ts           # Cloudflare Worker 入口
├── wrangler.toml             # Cloudflare 部署配置
├── vite.config.ts            # Vite 构建配置（含 @cloudflare/vite-plugin）
├── next.config.ts            # Next.js 配置（output: standalone）
└── Dockerfile                # 腾讯云容器化部署
```

## 🚀 本地开发

### 前置要求

- Node.js >= 22.x
- npm 或 pnpm

### 快速启动

```bash
# 1. 克隆仓库
git clone https://github.com/siu97997-ctrl/dreamcore-tarot.git
cd dreamcore-tarot

# 2. 安装依赖
npm install

# 3. 设置环境变量
cp config/model-providers.example.env config/model-providers.env
# 编辑 config/model-providers.env，填入你的 DEEPSEEK_API_KEY

# 4. 本地运行
npm run dev
# 打开 http://localhost:3000

# 5. 构建（验证产物）
npm run build
```

### 可用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动本地开发服务器 |
| `npm run build` | 构建生产版本（输出到 dist/standalone） |
| `npm test` | 运行测试 |

## ☁️ 部署

### Cloudflare Workers（推荐）

项目已配置 GitHub → Cloudflare 自动部署：

1. 代码 push 到 `main` 分支
2. Cloudflare 自动触发构建（`npm run build` → `npx wrangler deploy`）
3. 约 1-2 分钟后新版本上线

**手动部署：**
```bash
npx wrangler deploy
```

**环境变量设置：**
- 进入 Cloudflare Dashboard → Workers & Pages → dreamcore-tarot-v2 → Settings → Variables and Secrets
- 添加 Secret：`DEEPSEEK_API_KEY` = 你的 DeepSeek API 密钥
- 保存后点 Retry deploy

### 腾讯云 CloudBase（备用）

1. 打包：`zip -r dreamcore-tarot-cloudbase.zip . -x "node_modules/*" ".git/*"`
2. 登录腾讯云控制台 → 云开发 → 云托管 → 上传压缩包
3. 设置环境变量 `DEEPSEEK_API_KEY`
4. 点击部署

## 🔑 API 接口

### POST `/api/readings`

发起一次塔罗牌解读请求。

**请求体：**
```json
{
  "question": "我的事业运势如何？",
  "draw_token": ""  // 可选，留空则随机抽牌
}
```

**响应示例：**
```json
{
  "status": "completed",
  "provider": "deepseek",
  "cards": [
    { "name": "The Chariot", "position": "past", "meaning": "..." },
    { "name": "Two of Wands", "position": "present", "meaning": "..." },
    { "name": "Nine of Swords", "position": "future", "meaning": "..." }
  ],
  "narrative": "综合解读...",
  "advice": "行动建议..."
}
```

## 📝 待办

- [ ] 复古插画风格 UI 美化（预览已完成 v3，待落地改源码）
- [ ] 国内手机实测 Cloudflare workers.dev 访问情况
- [ ] 自定义域名绑定（需 ICP 备案）
- [ ] 解读历史记录功能
- [ ] 多语言支持（中/英/日）

## 📄 License

[MIT](LICENSE)

---

<p align="center">
  <sub>Made with ✨ by <a href="https://github.com/siu97997-ctrl">siu97997-ctrl</a> · Powered by <a href="https://deepseek.com">DeepSeek</a> & <a href="https://cloudflare.com">Cloudflare</a></sub>
</p>
