<p align="center">
  <img src="media/iicon.png" alt="Instruct-Me Logo" width="500" />
</p>

# Instruct-Me (v1.0)

**VS Code 扩展** —— 智能编程复盘导师 · AI 辅助编程后的知识内化工具

> 这是一款**依托 VS Code 的插件**。在 AI 辅助完成代码开发后，通过结构化提问、渐进式解释和深度追问，帮助开发者理解代码、掌握技术思想，实现从"AI 代码使用者"到"AI 协作开发者"的能力提升。

---

## 功能特性

- **项目代码分析**：一键扫描项目目录（自动过滤 node_modules/.git/out 等），提取文件清单与内容摘要
- **AI 生成复盘问题**：基于项目上下文，按 **L1/L2/L3** 三个难度级别生成复盘问题
  - `L1 初学者` — 关注"这段代码做什么"
  - `L2 开发者` — 关注"为什么选这个方案"
  - `L3 专家` — 关注"性能 / 扩展性"
- **问题数量自定义**：每次可指定生成 1~10 个问题
- **答案折叠 / 关键词高亮**：点击展开答案，关键词自动高亮并可点击追问
- **关键词深度追问**：点击关键词打开独立追问窗口，AI 围绕该关键词深入解释，不污染主复盘
- **复盘记录保存**：可手动将复盘结果保存到项目 `.instruct-me/sessions.json`
- **多模型支持**：兼容 OpenAI API 格式，支持 DeepSeek / OpenAI / Claude / Ollama / 自定义服务商

---

## 环境要求

| 依赖      | 版本要求    |
| ------- | ------- |
| Node.js | >= 18   |
| VS Code | >= 1.85 |

---

## 从 GitHub 拉取项目

```bash
git clone https://github.com/littang/Instruct-Me.git
cd Instruct-Me
```

---

## 安装与部署到 VS Code

### 方式一：从 Releases 下载安装包（推荐，无需编译）

1. 打开 [Releases 页面](https://github.com/littang/Instruct-Me/releases)
2. 下载最新的 `instruct-me-<版本号>.vsix` 文件
3. VS Code 中打开扩展面板（`Ctrl+Shift+X`）→ 右上角 `...` → **Install from VSIX...**
4. 选择下载的 `.vsix` 文件 → 安装完成
5. 左侧活动栏点击 **Instruct-Me** 图标打开侧边栏

### 方式二：源码运行（开发调试）

#### 1. 安装依赖

```bash
npm install
```

#### 2. 编译 TypeScript

```bash
npm run compile
```

> 编译产物输出到 `out/` 目录，扩展运行时加载的是编译后的文件。

#### 3. 用 VS Code 打开项目

```bash
code .
```

#### 4. 启动扩展（F5）

1. 在 VS Code 中打开本项目文件夹
2. 按 `F5`（或菜单 `运行` → `开始调试`）
3. 会弹出一个新的 **Extension Development Host** 窗口
4. 在新窗口左侧活动栏找到 **Instruct-Me** 图标，点击打开侧边栏

---

## 配置 API Key

侧边栏切换到 **设置** 标签页：

1. 选择模型平台（DeepSeek / OpenAI / Claude / Ollama / 自定义）
2. 填写 **API Key**（从服务商后台获取，仅保存在 VS Code SecretStorage，安全加密）
3. 点击 **保存**
4. 点击 **测试连接** 验证是否调通

### 各平台 API Key 获取

| 平台                  | API Key 获取地址                             |
| ------------------- | ---------------------------------------- |
| DeepSeek            | https://platform.deepseek.com → API Keys |
| OpenAI              | https://platform.openai.com → API Keys   |
| OpenRouter (Claude) | https://openrouter.ai → Keys             |
| Ollama（本地）          | 无需 Key，本地运行 Ollama 即可                    |

### 支持多配置保存

设置页顶部可保存多个模型配置（如"我的 DeepSeek""我的 Kimi"），下拉框选中即切换，已配置的 API Key 无需重复填写。

### 自定义服务商

选择"自定义"时：

1. Base URL 和 Model 从服务商 API 文档中查找（一般是文档里 "Chat Completions" 接口地址和模型列表）
2. 模型名必须与文档完全一致，不能自己编造
3. API Key 在服务商后台生成

常见参考：

- 通义千问：`https://dashscope.aliyuncs.com/compatible-mode/v1`
- 智谱：`https://open.bigmodel.cn/api/paas/v4`
- 豆包：`https://ark.cn-beijing.volces.com/api/v3`
- Kimi：`https://api.moonshot.cn/v1`

---

## 使用指南

### 流程一：生成复盘问题

1. **选择项目**：点击路径框旁的 `...` 按钮，选择要复盘的项目文件夹
2. **扫描分析**：点击「扫描分析」，扩展会分析项目结构并提取代码摘要
3. **选择级别与数量**：`L1/L2/L3` + 题数（1~10）
4. **生成复盘**：点击「生成复盘」，AI 生成对应级别的问题（首次会弹出隐私确认）
5. 点击问题标题展开答案，关键词已自动高亮

### 流程二：关键词深度追问

1. 展开某道问题的答案
2. 点击任意**关键词标签**
3. 侧边栏切换为追问模式，显示"追问：某关键词"
4. 在输入框输入问题按 Enter 发送，AI 围绕该关键词深入解释
5. 点击「← 返回」回到复盘列表（追问会话独立，不污染主复盘）

### 流程三：保存复盘记录

生成问题后，点击「保存记录」按钮，复盘将保存到所选项目目录下的：

```
<项目路径>/.instruct-me/sessions.json
```

---

## 作为 MCP Server 使用（可选）

本项目的 MCP Server 可被任何支持 MCP 协议的客户端（Claude Desktop、Cursor、Trae 等）调用。

### 方式一：命令行启动

```bash
npm run mcp:start
# 等价于 node out/mcp/server.js
```

### 方式二：配置到 MCP 客户端

在客户端配置文件中添加（参考 `mcp.example.json`）：

```json
{
  "mcpServers": {
    "instruct-me": {
      "command": "node",
      "args": ["out/mcp/server.js"],
      "cwd": "项目绝对路径",
      "env": {
        "INSTRUCT_ME_LLM_API_KEY": "你的API Key"
      }
    }
  }
}
```

### MCP 暴露的工具

| 工具                | 说明                 | 参数                            |
| ----------------- | ------------------ | ----------------------------- |
| `analyze_project` | 扫描项目目录，返回文件列表+内容摘要 | `projectPath`                 |
| `generate_review` | 生成复盘问题             | `context`, `level` (L1/L2/L3) |

---

## 项目结构

```
IntrstutMe1.0/
├── src/                        # 源码
│   ├── extension.ts            # 扩展入口（侧边栏、消息路由）
│   ├── config.ts               # 多模型配置管理（SecretStorage）
│   ├── session.ts              # 复盘记录持久化
│   ├── llm/
│   │   └── provider.ts         # LLM 网关（OpenAI 兼容，流式/重试）
│   ├── mcp/
│   │   ├── server.ts           # MCP Server（analyze_project / generate_review）
│   │   ├── client.ts           # MCP 客户端（扩展内启动子进程）
│   │   └── llm.ts              # MCP Server 内 LLM 调用
│   ├── prompts/
│   │   └── reviewPrompts.ts    # L1/L2/L3 三级 Prompt 引擎
│   └── webview/
│       └── sidebar.ts          # Webview 前端源码（TS）
├── media/                      # Webview 静态资源
│   ├── sidebar.js              # 前端逻辑（渲染、交互、追问）
│   ├── sidebar.css             # 样式（自适应 VS Code 主题）
│   └── icon.png                # 侧边栏图标
├── test/                       # 测试脚本
├── out/                        # 编译产物（npm run compile 生成）
├── package.json                # 扩展清单
├── tsconfig.json               # TypeScript 配置
└── mcp.example.json            # MCP 接入配置模板
```

---

## 常见问题

**Q: 按 F5 没反应？**
A: 确认 `.vscode/launch.json` 存在（项目已包含），并已打开本项目文件夹。

**Q: 生成问题报 JSON 解析错误？**
A: 一般会自动处理 LLM 返回的格式问题。若反复出现，可能是网络或模型问题，重试一次。

**Q: 测试连接一直 Failed？**
A: 检查 API Key 是否正确、是否选择了正确的平台、网络能否访问服务商。

**Q: 提示模型不存在（404）？**
A: 模型名写错了。去服务商文档的"模型列表"里复制准确名称。

---

## 开发调试

```bash
npm run compile    # 编译
npm run watch      # 监听编译
npm run mcp:start  # 启动 MCP Server（调试用）
```

## 测试

```bash
node test/test_levels.js   # 验证 L1/L2/L3 问题生成
node test/test_client.js    # 验证 MCP 客户端端到端
node test/test_llm.js       # 验证 LLM 调用（需设 TEST_API_KEY 环境变量）
node test/test_prompt.js    # 查看组装后的 Prompt
```
