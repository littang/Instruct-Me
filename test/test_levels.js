const { spawn } = require("child_process");
const path = require("path");

const serverPath = path.resolve(__dirname, "../out/mcp/server.js");

function testLevel(level, context) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [serverPath], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (d) => { output += d.toString("utf-8"); });
    child.stderr.on("data", () => {});
    child.on("close", () => resolve(output));

    const init = { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "1.0" } } };
    const notify = { jsonrpc: "2.0", method: "notifications/initialized" };
    const call = { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "generate_review", arguments: { level, context } } };

    child.stdin.write(JSON.stringify(init) + "\n");
    child.stdin.write(JSON.stringify(notify) + "\n");
    child.stdin.write(JSON.stringify(call) + "\n");
    child.stdin.end();
  });
}

const realContext = `File: src/extension.ts (6000 bytes)
---
import * as vscode from "vscode";
class SidebarProvider implements vscode.WebviewViewProvider {
  resolveWebviewView(webviewView, _context, _token) {
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = "<html><body>InstructMe</body></html>";
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case "ready":
          this._postMessage({ command: "loadQuestions", questions: MOCK_QUESTIONS });
          break;
      }
    });
  }
}

File: media/sidebar.js
---
(function () {
  var vscode = acquireVsCodeApi();
  var questionList = document.getElementById("question-list");
  var state = vscode.getState() || { questions: [], expandedIds: {} };
  function renderQuestions() { ... }
})();`;

(async () => {
  for (const level of ["L1", "L2", "L3"]) {
    const output = await testLevel(level, realContext);
    const lines = output.split("\n").filter(Boolean);
    const resultLine = lines.find((l) => l.includes('"id": 2')) || lines[lines.length - 1];
    try {
      const parsed = JSON.parse(resultLine);
      const text = parsed.result.content[0].text;
      console.log(`===== ${level} =====`);
      console.log(text);
      console.log("");
    } catch (e) {
      console.log(`===== ${level} ===== (parse failed: ${e.message})`);
      console.log(resultLine);
    }
  }
})();
