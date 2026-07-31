import * as vscode from "vscode";
import * as path from "node:path";
import { McpClient } from "./mcp/client.js";
import {
  getActiveConfig,
  getActiveProfileId,
  listProfiles,
  saveProfile,
  deleteProfile,
  setActiveProfile,
  getPresetForProvider,
  maskApiKey,
} from "./config.js";
import { LLMClient, LLMProvider } from "./llm/provider.js";
import { buildPrompt, ReviewLevel, ReviewResult } from "./prompts/reviewPrompts.js";
import { SessionManager } from "./session.js";

interface Question {
  id: number;
  level?: string;
  title: string;
  answer: string;
  keywords: string[];
}

class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "instruct-me.sidebar";

  private _view?: vscode.WebviewView;
  private _privacyAccepted = false;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _secrets: vscode.SecretStorage,
    private readonly _mcpClient: McpClient,
    private readonly _sessionManager: SessionManager
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, "out"),
        vscode.Uri.joinPath(this._extensionUri, "media"),
      ],
    };

    webviewView.webview.html = this._getHtmlContent(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "ready": {
          const profiles = await listProfiles(this._secrets);
          const activeId = await getActiveProfileId(this._secrets);
          const config = await getActiveConfig(this._secrets);
          this._postMessage({ command: "setProjectPath", path: "" });
          this._postMessage({
            command: "loadConfig",
            profiles,
            activeId,
            config: {
              provider: config.provider,
              baseUrl: config.baseUrl,
              model: config.model,
              apiKeyMasked: maskApiKey(config.apiKey),
              hasKey: !!config.apiKey,
            },
          });
          break;
        }
        case "saveConfig": {
          try {
            const provider = message.provider as LLMProvider;
            const preset = getPresetForProvider(provider);
            const saved = await saveProfile(this._secrets, {
              id: message.profileId,
              name: message.name || provider,
              provider,
              apiKey: message.apiKey,
              baseUrl: message.baseUrl || preset.baseUrl,
              model: message.model || preset.model,
            });
            const profiles = await listProfiles(this._secrets);
            this._postMessage({ command: "configSaved", profile: saved, profiles });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this._postMessage({ command: "status", text: `Save failed: ${msg}` });
          }
          break;
        }
        case "switchProfile": {
          await setActiveProfile(this._secrets, message.profileId);
          const config = await getActiveConfig(this._secrets);
          this._postMessage({
            command: "profileSwitched",
            config: {
              provider: config.provider,
              baseUrl: config.baseUrl,
              model: config.model,
              apiKeyMasked: maskApiKey(config.apiKey),
              hasKey: !!config.apiKey,
            },
          });
          break;
        }
        case "deleteProfile": {
          await deleteProfile(this._secrets, message.profileId);
          const profiles = await listProfiles(this._secrets);
          const activeId = await getActiveProfileId(this._secrets);
          const config = await getActiveConfig(this._secrets);
          this._postMessage({
            command: "configDeleted",
            profiles,
            activeId,
            config: {
              provider: config.provider,
              baseUrl: config.baseUrl,
              model: config.model,
              apiKeyMasked: maskApiKey(config.apiKey),
              hasKey: !!config.apiKey,
            },
          });
          break;
        }
        case "testConnection": {
          try {
            const config = await getActiveConfig(this._secrets);
            if (!config.apiKey) {
              this._postMessage({ command: "testResult", success: false, text: "API Key not set" });
              break;
            }
            const client = new LLMClient(config);
            this._postMessage({ command: "status", text: "Testing connection..." });
            const response = await client.chatPlain([
              { role: "user", content: "Reply with exactly the word: OK" },
            ]);
            const ok = response.trim().toUpperCase().includes("OK");
            this._postMessage({
              command: "testResult",
              success: ok,
              text: ok ? "Connection OK" : `Unexpected response: ${response.substring(0, 100)}`,
            });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this._postMessage({ command: "testResult", success: false, text: msg });
          }
          break;
        }
        case "analyze": {
          try {
            this._postMessage({ command: "status", text: "扫描项目中..." });
            const result = await this._mcpClient.analyzeProject(message.path);
            this._postMessage({ command: "analyzeResult", result });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this._postMessage({ command: "status", text: `Error: ${msg}` });
          }
          break;
        }
        case "browse": {
          const selected = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            title: "选择项目文件夹",
          });
          if (selected && selected[0]) {
            this._postMessage({ command: "projectPathSet", path: selected[0].fsPath });
          }
          break;
        }
        case "followUp": {
          try {
            const config = await getActiveConfig(this._secrets);
            if (!config.apiKey) {
              this._postMessage({ command: "fuReply", text: "请先在设置中配置 API Key。" });
              break;
            }
            this._postMessage({ command: "status", text: `正在思考 "${message.keyword}"...` });
            const client = new LLMClient(config);
            const reply = await client.chatPlain([
              {
                role: "system",
                content: `你是一个编程知识解惑助手。用户正在学习关键词"${message.keyword}"。请用中文，围绕这个关键词深入解释，包含：概念定义、工作原理、常见应用场景。代码示例用 Markdown 代码块格式（\`\`\`语言\n代码\n\`\`\`）。回答简洁专业，不超过 500 字。`,
              },
              { role: "user", content: message.question || `请解释：${message.keyword}` },
            ]);
            this._postMessage({ command: "fuReply", text: reply });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this._postMessage({ command: "fuReply", text: `Error: ${msg}` });
          }
          break;
        }
        case "generate": {
          try {
            if (!this._privacyAccepted) {
              const choice = await vscode.window.showWarningMessage(
                "项目代码将发送到配置的 LLM 服务（DeepSeek/OpenAI/Ollama 等）。是否继续？",
                { modal: true },
                "确认"
              );
              if (choice !== "确认") {
                this._postMessage({ command: "status", text: "已取消。" });
                break;
              }
              this._privacyAccepted = true;
            }

            const count = message.count || 3;
            this._postMessage({
              command: "status",
              text: `正在生成 ${message.level} 复盘（${count} 题）...`,
            });
            const config = await getActiveConfig(this._secrets);

            let questions: Question[];
            if (config.apiKey) {
              const prompt = buildPrompt(message.level as ReviewLevel, message.context, count);
              const client = new LLMClient(config);
              let raw = "";
              for await (const chunk of client.chatStream([
                {
                  role: "system",
                  content: `你是一个代码复盘问题生成器。级别：${message.level}。严格生成 ${count} 个问题，用中文回答，输出严格 JSON。`,
                },
                { role: "user", content: prompt },
              ])) {
                if (chunk.content) {
                  raw += chunk.content;
                }
              }
              const parsed = parseReviewJson(raw);
              questions = parsed.questions;
            } else {
              const result = await this._mcpClient.generateReview(message.level, message.context);
              questions = result.questions;
            }

            this._postMessage({ command: "loadQuestions", questions });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this._postMessage({ command: "status", text: `Error: ${msg}` });
          }
          break;
        }
        case "saveSession": {
          try {
            this._sessionManager.add(message.path ?? "", message.level ?? "L2", message.questions);
            this._postMessage({ command: "sessionSaved", text: "复盘记录已保存" });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this._postMessage({ command: "status", text: `保存失败: ${msg}` });
          }
          break;
        }
      }
    });
  }

  private _postMessage(message: Record<string, unknown>): void {
    this._view?.webview.postMessage(message);
  }

  private _getHtmlContent(webview: vscode.Webview): string {
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "sidebar.css")
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "sidebar.js")
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${styleUri}" rel="stylesheet">
  <title>InstructMe</title>
</head>
<body>
  <div class="container">
    <h1>复盘回顾</h1>
    <div class="tab-bar">
      <button class="tab-btn active" data-tab="review">复盘</button>
      <button class="tab-btn" data-tab="settings">设置</button>
    </div>
    <div class="tab-content" id="tab-review">
      <div class="toolbar">
        <div class="path-row">
          <input type="text" id="project-path" class="path-input" placeholder="点击...选择项目文件夹" readonly />
          <button id="browse-btn" class="btn-icon" title="选择项目文件夹">...</button>
          <button id="analyze-btn" class="btn-primary">扫描分析</button>
        </div>
        <div class="level-row">
          <select id="level-select" class="level-select">
            <option value="L1">L1 初学者 - 这代码做什么</option>
            <option value="L2" selected>L2 开发者 - 为什么选这个方案</option>
            <option value="L3">L3 专家 - 性能/扩展性</option>
          </select>
          <select id="count-select" class="count-select">
            <option value="3" selected>3题</option>
            <option value="1">1题</option>
            <option value="2">2题</option>
            <option value="4">4题</option>
            <option value="5">5题</option>
            <option value="6">6题</option>
            <option value="7">7题</option>
            <option value="8">8题</option>
            <option value="9">9题</option>
            <option value="10">10题</option>
          </select>
          <button id="generate-btn" class="btn-primary" disabled>生成复盘</button>
          <button id="save-btn" class="btn-secondary" disabled title="保存本次复盘到 .instruct-me/sessions.json">保存记录</button>
        </div>
        <div id="status-bar" class="status-bar"></div>
      </div>
      <div id="question-list" class="question-list"></div>
      <div id="follow-up" class="follow-up hidden">
        <div class="fu-header">
          <button id="fu-back-btn" class="btn-icon">← 返回</button>
          <span id="fu-title" class="fu-title"></span>
        </div>
        <div id="fu-chat" class="fu-chat"></div>
        <div class="fu-input-row">
          <input type="text" id="fu-input" class="fu-input" placeholder="追问...按 Enter 发送" />
          <button id="fu-send-btn" class="btn-primary">发送</button>
        </div>
      </div>
    </div>
    <div class="tab-content hidden" id="tab-settings">
      <div class="settings-form">
        <label>已保存的配置</label>
        <div class="cfg-row">
          <select id="cfg-profile" class="cfg-select">
            <option value="">+ 新建配置</option>
          </select>
          <button id="cfg-delete-btn" class="btn-secondary">删除</button>
        </div>
        <label>配置名称</label>
        <input type="text" id="cfg-name" class="cfg-input" placeholder="例如：我的 DeepSeek" />
        <label>模型平台</label>
        <select id="cfg-provider" class="cfg-select">
          <option value="deepseek">DeepSeek</option>
          <option value="openai">OpenAI</option>
          <option value="claude">Claude (OpenRouter)</option>
          <option value="ollama">Ollama (本地)</option>
          <option value="custom">自定义</option>
        </select>
        <label>API Key</label>
        <input type="password" id="cfg-apikey" class="cfg-input" placeholder="sk-..." autocomplete="off" />
        <div id="cfg-key-status" class="cfg-key-status"></div>
        <label>Base URL</label>
        <input type="text" id="cfg-baseurl" class="cfg-input" placeholder="https://api.deepseek.com/v1" />
        <label>Model</label>
        <input type="text" id="cfg-model" class="cfg-input" placeholder="deepseek-chat" />
        <div class="cfg-buttons">
          <button id="cfg-save-btn" class="btn-primary">保存</button>
          <button id="cfg-test-btn" class="btn-secondary">测试连接</button>
        </div>
        <div id="cfg-status-bar" class="status-bar"></div>
        <div class="cfg-help">
          <p>使用"自定义"接入其他 OpenAI 兼容服务：</p>
          <p>1. 先去服务商开放平台 → API 文档，找 "Chat Completions" 接口地址，复制为 Base URL</p>
          <p>2. 在文档的「模型列表」里找到可用模型名（注意：模型名必须和文档里一字不差，不能自己编）</p>
          <p>3. API Key 在后台 "API Keys" 或 "密钥管理" 页面生成</p>
          <p>常见参考：通义千问 dashscope.aliyuncs.com/compatible-mode/v1 | 智谱 open.bigmodel.cn/api/paas/v4 | 豆包 ark.cn-beijing.volces.com/api/v3 | Kimi moonshot.cn/v1</p>
        </div>
      </div>
    </div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function parseReviewJson(text: string): ReviewResult {
  let cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("LLM 返回的内容不是合法 JSON");
  }
  cleaned = cleaned.substring(start, end + 1);
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
  return JSON.parse(cleaned) as ReviewResult;
}

function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 64; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const serverPath = path.join(context.extensionUri.fsPath, "out", "mcp", "server.js");
  const mcpClient = new McpClient(serverPath);

  try {
    await mcpClient.start();
  } catch (err) {
    vscode.window.showErrorMessage(
      `InstructMe MCP server failed: ${err instanceof Error ? err.message : err}`
    );
  }

  context.subscriptions.push(mcpClient);

  const sessionManager = new SessionManager();

  const provider = new SidebarProvider(
    context.extensionUri,
    context.secrets,
    mcpClient,
    sessionManager
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, provider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("instruct-me.refresh", () => {
      vscode.commands.executeCommand("workbench.action.webview.reloadWebviewAction");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("instruct-me.sendMessage", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const selection = editor.document.getText(editor.selection);
        vscode.window.showInformationMessage(
          `InstructMe received: ${selection || "No text selected."}`
        );
      } else {
        vscode.window.showWarningMessage("No active editor open.");
      }
    })
  );
}

export function deactivate(): void {}
