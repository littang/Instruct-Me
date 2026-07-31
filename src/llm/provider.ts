export type LLMProvider = "openai" | "deepseek" | "claude" | "ollama" | "custom";

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

export const PROVIDER_PRESETS: Record<LLMProvider, Omit<LLMConfig, "apiKey">> = {
  openai: {
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  deepseek: {
    provider: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
  },
  claude: {
    provider: "claude",
    baseUrl: "https://api.openrouter.ai/api/v1",
    model: "anthropic/claude-3.5-sonnet",
  },
  ollama: {
    provider: "ollama",
    baseUrl: "http://localhost:11434/v1",
    model: "llama3.1",
  },
  custom: {
    provider: "custom",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
};

const TIMEOUT_MS = 120000;
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 1000;

async function retry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }
  throw lastError ?? new Error(`${label} failed`);
}

export class LLMClient {
  constructor(private config: LLMConfig) {}

  async chat(messages: ChatMessage[]): Promise<string> {
    return retry(() => this._chatOnce(messages, true), "chat");
  }

  async chatPlain(messages: ChatMessage[]): Promise<string> {
    return retry(() => this._chatOnce(messages, false), "chat");
  }

  private async _chatOnce(messages: ChatMessage[], jsonMode: boolean): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`LLM request failed (${response.status}): ${body.substring(0, 300)}`);
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return data.choices?.[0]?.message?.content ?? "";
    } finally {
      clearTimeout(timer);
    }
  }

  async *chatStream(messages: ChatMessage[]): AsyncGenerator<StreamChunk> {
    try {
      const generator = this._chatStreamOnce(messages);
      for await (const chunk of generator) {
        yield chunk;
      }
    } catch {
      // retry once on stream failure
      const generator = this._chatStreamOnce(messages);
      for await (const chunk of generator) {
        yield chunk;
      }
    }
  }

  private async *_chatStreamOnce(messages: ChatMessage[]): AsyncGenerator<StreamChunk> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`LLM stream failed (${response.status}): ${body.substring(0, 300)}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") {
            yield { content: "", done: true };
            return;
          }
          try {
            const parsed = JSON.parse(data) as {
              choices?: { delta?: { content?: string } }[];
            };
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield { content, done: false };
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }

      yield { content: "", done: true };
    } finally {
      clearTimeout(timer);
    }
  }
}
