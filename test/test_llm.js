const { LLMClient } = require("../out/llm/provider.js");

const apiKey = process.env.TEST_API_KEY || "";
if (!apiKey) {
  console.log("Set TEST_API_KEY env var to run this test.");
  console.log("Provider supports: OpenAI / DeepSeek / Ollama (OpenAI-compatible)");
  process.exit(0);
}

(async () => {
  const client = new LLMClient({
    provider: "deepseek",
    apiKey,
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
  });

  console.log("=== Chat Test ===");
  const response = await client.chat([
    { role: "user", content: "Reply with exactly the word: OK" },
  ]);
  console.log("Response:", response);
  console.log("Test:", response.trim().toUpperCase().includes("OK") ? "PASS" : "FAIL");

  console.log("\n=== Stream Test ===");
  let full = "";
  for await (const chunk of client.chatStream([
    { role: "user", content: "Count from 1 to 5, one per line." },
  ])) {
    if (chunk.content) {
      process.stdout.write(chunk.content);
      full += chunk.content;
    }
  }
  console.log("\n\nStream done, total chars:", full.length);
})().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
