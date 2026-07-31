import { buildPrompt, ReviewLevel, ReviewResult } from "../prompts/reviewPrompts.js";

const LLM_BASE_URL = process.env.INSTRUCT_ME_LLM_BASE_URL || "https://api.deepseek.com/v1";
const LLM_API_KEY = process.env.INSTRUCT_ME_LLM_API_KEY || "";
const LLM_MODEL = process.env.INSTRUCT_ME_LLM_MODEL || "deepseek-chat";
const LLM_TIMEOUT_MS = Number(process.env.INSTRUCT_ME_LLM_TIMEOUT_MS || 30000);

function parseReviewResult(text: string): ReviewResult {
  const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("LLM response is not valid JSON");
  }
  const jsonText = cleaned.substring(start, end + 1).replace(/,\s*([\]}])/g, "$1");
  const parsed = JSON.parse(jsonText) as ReviewResult;
  if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new Error("LLM response has no questions");
  }
  return parsed;
}

async function callLLM(prompt: string, system: string): Promise<string> {
  if (!LLM_API_KEY) {
    throw new Error("INSTRUCT_ME_LLM_API_KEY is not set");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
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
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("LLM response has no content");
    }
    return content;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateReviewWithLLM(
  level: ReviewLevel,
  context: string
): Promise<ReviewResult> {
  const prompt = buildPrompt(level, context);
  const raw = await callLLM(prompt, `You are a code review question generator. Level: ${level}. Always respond in Chinese with strict JSON.`);
  return parseReviewResult(raw);
}
