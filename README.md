<p align="center">
  <img src="media/iicon.png" alt="Instruct-Me Logo" width="500" />
</p>

# Instruct-Me (v1.0)

> **智能编程复盘导师 · AI 辅助编程后的知识内化工具**
> **AI-Powered Code Review Mentor · Knowledge Internalization for AI-Assisted Programming**

**选择语言 / Choose Language:**

[**中文版**](#中文版) | [**English**](#english)

---

# 中文版

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

---

# English

**VS Code Extension** — AI-Powered Code Review Mentor · Knowledge Internalization for AI-Assisted Programming

> Instruct-Me is a **VS Code extension**. After AI assists in completing code development, it helps developers understand the code, master the underlying technical concepts, and grow from "AI Code User" to "AI Collaborative Developer" through structured questioning, progressive explanations, and deep follow-up inquiry.

---

## Features

- **Project Code Analysis**: Scan a project directory with one click (automatically filtering out `node_modules/.git/out` etc.), extracting file listings and content summaries
- **AI-Generated Review Questions**: Based on project context, generates review questions at **L1/L2/L3** difficulty levels
  - `L1 Explorer` — focuses on "what does this code do"
  - `L2 Developer` — focuses on "why this approach"
  - `L3 Expert` — focuses on "performance / extensibility"
- **Custom Question Count**: Specify 1~10 questions per run
- **Collapsible Answers / Keyword Highlighting**: Click to expand answers; keywords are auto-highlighted and clickable for follow-up
- **Keyword Deep Follow-up**: Click a keyword to open an independent follow-up window; AI explains that keyword in depth without polluting the main review
- **Save Review Records**: Manually save reviews to `<project>/.instruct-me/sessions.json`
- **Multi-Model Support**: OpenAI-compatible API format; supports DeepSeek / OpenAI / Claude / Ollama / custom providers

---

## Requirements

| Dependency | Version |
| ---------- | ------- |
| Node.js    | >= 18   |
| VS Code    | >= 1.85 |

---

## Clone from GitHub

```bash
git clone https://github.com/littang/Instruct-Me.git
cd Instruct-Me
```

---

## Installation & Deployment

### Method 1: Install from Releases (recommended, no compilation needed)

1. Open the [Releases page](https://github.com/littang/Instruct-Me/releases)
2. Download the latest `instruct-me-<version>.vsix` file
3. In VS Code, open the Extensions panel (`Ctrl+Shift+X`) → `...` in the top-right → **Install from VSIX...**
4. Select the downloaded `.vsix` file → installation completes
5. Click the **Instruct-Me** icon in the left Activity Bar to open the sidebar

### Method 2: Run from Source (development/debugging)

#### 1. Install dependencies

```bash
npm install
```

#### 2. Compile TypeScript

```bash
npm run compile
```

> Compiled output goes to the `out/` directory; the extension loads the compiled files at runtime.

#### 3. Open the project in VS Code

```bash
code .
```

#### 4. Launch the extension (F5)

1. Open this project folder in VS Code
2. Press `F5` (or menu `Run` → `Start Debugging`)
3. A new **Extension Development Host** window will appear
4. Find the **Instruct-Me** icon in the left Activity Bar of the new window and click to open the sidebar

---

## Configure API Key

Switch to the **Settings** tab in the sidebar:

1. Select a model platform (DeepSeek / OpenAI / Claude / Ollama / Custom)
2. Enter your **API Key** (from the provider's console; stored securely in VS Code SecretStorage)
3. Click **Save**
4. Click **Test Connection** to verify connectivity

### Where to Get API Keys

| Platform             | API Key URL                                |
| -------------------- | ------------------------------------------ |
| DeepSeek             | https://platform.deepseek.com → API Keys   |
| OpenAI               | https://platform.openai.com → API Keys     |
| OpenRouter (Claude)  | https://openrouter.ai → Keys               |
| Ollama (local)       | No key required, just run Ollama locally   |

### Multiple Saved Configurations

You can save multiple model configurations (e.g., "My DeepSeek", "My Kimi") at the top of the Settings page. Select one from the dropdown to switch; already-configured API keys don't need to be re-entered.

### Custom Providers

When selecting "Custom":

1. Find the Base URL and Model from the provider's API docs (usually the "Chat Completions" endpoint and model list)
2. Model names must match the docs exactly — don't invent them
3. Generate the API Key in the provider's console

Common references:

- Qwen (Tongyi Qianwen): `https://dashscope.aliyuncs.com/compatible-mode/v1`
- Zhipu AI: `https://open.bigmodel.cn/api/paas/v4`
- Doubao: `https://ark.cn-beijing.volces.com/api/v3`
- Kimi (Moonshot): `https://api.moonshot.cn/v1`

---

## Usage Guide

### Flow 1: Generate Review Questions

1. **Select Project**: Click the `...` button next to the path box and choose the project folder to review
2. **Scan & Analyze**: Click "Scan & Analyze"; the extension analyzes the project structure and extracts code summaries
3. **Choose Level & Count**: `L1/L2/L3` + question count (1~10)
4. **Generate Review**: Click "Generate Review"; the AI generates questions at the selected level (a privacy confirmation appears on first use)
5. Click a question title to expand its answer; keywords are auto-highlighted

### Flow 2: Keyword Deep Follow-up

1. Expand the answer of a question
2. Click any **keyword tag**
3. The sidebar switches to follow-up mode, showing "Follow-up: <keyword>"
4. Type a question in the input box and press Enter; the AI explains that keyword in depth
5. Click "← Back" to return to the review list (the follow-up session is independent and doesn't pollute the main review)

### Flow 3: Save Review Records

After generating questions, click the "Save Record" button. The review is saved to:

```
<project-path>/.instruct-me/sessions.json
```

---

## Using as an MCP Server (optional)

The MCP Server in this project can be invoked by any MCP-compatible client (Claude Desktop, Cursor, Trae, etc.).

### Method 1: Launch from the command line

```bash
npm run mcp:start
# equivalent to node out/mcp/server.js
```

### Method 2: Configure in an MCP client

Add to the client's config file (see `mcp.example.json`):

```json
{
  "mcpServers": {
    "instruct-me": {
      "command": "node",
      "args": ["out/mcp/server.js"],
      "cwd": "/absolute/path/to/project",
      "env": {
        "INSTRUCT_ME_LLM_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

### Exposed MCP Tools

| Tool                | Description                                  | Params                           |
| ------------------- | -------------------------------------------- | -------------------------------- |
| `analyze_project`   | Scan a project directory; return file list + content summaries | `projectPath`        |
| `generate_review`   | Generate review questions                    | `context`, `level` (L1/L2/L3)    |

---

## Project Structure

```
Instruct-Me/
├── src/                        # Source code
│   ├── extension.ts            # Extension entry (sidebar, message routing)
│   ├── config.ts               # Multi-model config management (SecretStorage)
│   ├── session.ts              # Review record persistence
│   ├── llm/
│   │   └── provider.ts         # LLM gateway (OpenAI-compatible, streaming/retry)
│   ├── mcp/
│   │   ├── server.ts           # MCP Server (analyze_project / generate_review)
│   │   ├── client.ts           # MCP client (spawns subprocess inside the extension)
│   │   └── llm.ts              # LLM invocation inside the MCP Server
│   ├── prompts/
│   │   └── reviewPrompts.ts    # L1/L2/L3 Prompt Engine
│   └── webview/
│       └── sidebar.ts          # Webview frontend source (TS)
├── media/                      # Webview static assets
│   ├── sidebar.js              # Frontend logic (render, interaction, follow-up)
│   ├── sidebar.css             # Styles (adapts to the VS Code theme)
│   └── icon.png                # Sidebar icon
├── test/                       # Test scripts
├── out/                        # Compiled output (generated by npm run compile)
├── package.json                # Extension manifest
├── tsconfig.json               # TypeScript config
└── mcp.example.json            # MCP config template
```

---

## FAQ

**Q: Nothing happens when I press F5?**
A: Make sure `.vscode/launch.json` exists (included in this project) and that you've opened this project folder.

**Q: JSON parse error when generating questions?**
A: Format issues in the LLM response are usually handled automatically. If it keeps happening, it may be a network or model issue — try once more.

**Q: Test Connection keeps failing?**
A: Check that the API Key is correct, the right platform is selected, and your network can reach the provider.

**Q: Model not found (404)?**
A: The model name is wrong. Copy the exact name from the provider's "model list" in their docs.

---

## Development

```bash
npm run compile    # compile
npm run watch      # watch-mode compile
npm run mcp:start  # start MCP Server (for debugging)
```

## Tests

```bash
node test/test_levels.js   # verify L1/L2/L3 question generation
node test/test_client.js   # verify MCP client end-to-end
node test/test_llm.js      # verify LLM calls (requires TEST_API_KEY env var)
node test/test_prompt.js   # inspect the assembled Prompt
```
