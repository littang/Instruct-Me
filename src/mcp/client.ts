import * as cp from "node:child_process";
import * as path from "node:path";
import { ReviewResult } from "../prompts/reviewPrompts.js";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

export class McpClient {
  private _process: cp.ChildProcess | null = null;
  private _nextId = 1;
  private _pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private _buffer = "";
  private _ready = false;
  private _readyPromise: Promise<void>;
  private _resolveReady!: () => void;
  private _rejectReady!: (e: Error) => void;

  constructor(private _serverPath: string) {
    this._readyPromise = new Promise((resolve, reject) => {
      this._resolveReady = resolve;
      this._rejectReady = reject;
    });
  }

  async start(): Promise<void> {
    this._process = cp.spawn("node", [this._serverPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    this._process.stdout!.on("data", (chunk: Buffer) => {
      this._buffer += chunk.toString("utf-8");
      const lines = this._buffer.split("\n");
      this._buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line) as JsonRpcResponse;
          if (msg.id !== undefined && msg.id !== null) {
            const pending = this._pending.get(msg.id);
            if (pending) {
              this._pending.delete(msg.id);
              if (msg.error) {
                pending.reject(new Error(msg.error.message));
              } else {
                pending.resolve(msg.result);
              }
            }
          }
        } catch {
          // skip non-JSON stderr output
        }
      }
    });

    this._process.stderr!.on("data", () => {
      // discard server stderr
    });

    this._process.on("exit", (code) => {
      const wasReady = this._ready;
      this._ready = false;
      if (!wasReady) {
        this._rejectReady(new Error(`MCP server exited with code ${code}`));
      }
      for (const [, pending] of this._pending) {
        pending.reject(new Error(`MCP server exited with code ${code}`));
      }
      this._pending.clear();
    });

    const result = await this._sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "instruct-me-extension", version: "0.0.1" },
    });

    if (!result) {
      throw new Error("MCP server initialization failed");
    }

    await this._sendNotification("notifications/initialized", {});
    this._ready = true;
    this._resolveReady();
  }

  get ready(): Promise<void> {
    return this._readyPromise;
  }

  async analyzeProject(projectPath: string): Promise<string> {
    await this._readyPromise;
    const result = await this._sendRequest("tools/call", {
      name: "analyze_project",
      arguments: { projectPath },
    });
    const data = result as { content?: Array<{ type: string; text: string }> };
    return data?.content?.[0]?.text ?? JSON.stringify(result);
  }

  async generateReview(level: string, context: string): Promise<ReviewResult> {
    await this._readyPromise;
    const result = await this._sendRequest("tools/call", {
      name: "generate_review",
      arguments: { level, context },
    });
    const data = result as { content?: Array<{ type: string; text: string }> };
    const text = data?.content?.[0]?.text ?? "{}";
    try {
      return JSON.parse(text) as ReviewResult;
    } catch {
      return { questions: [] };
    }
  }

  dispose(): void {
    if (this._process) {
      this._process.kill();
      this._process = null;
    }
    this._ready = false;
    for (const [, pending] of this._pending) {
      pending.reject(new Error("MCP client disposed"));
    }
    this._pending.clear();
  }

  private _sendRequest(method: string, params: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = this._nextId++;
      this._pending.set(id, { resolve, reject });
      const request: JsonRpcRequest = { jsonrpc: "2.0", id, method, params };
      this._process?.stdin?.write(JSON.stringify(request) + "\n");
    });
  }

  private _sendNotification(method: string, params: Record<string, unknown>): void {
    const notification = { jsonrpc: "2.0", method, params };
    this._process?.stdin?.write(JSON.stringify(notification) + "\n");
  }
}
