const path = require("path");
const { McpClient } = require("../out/mcp/client.js");

(async () => {
  const serverPath = path.resolve(__dirname, "../out/mcp/server.js");
  const client = new McpClient(serverPath);

  console.log("Starting MCP client...");
  await client.start();
  console.log("MCP client started\n");

  console.log("=== analyze_project ===");
  const context = await client.analyzeProject(__dirname);
  console.log(context.substring(0, 400));
  console.log("...\n");

  console.log("=== generate_review (L2) ===");
  const result = await client.generateReview("L2", context);
  console.log(JSON.stringify(result, null, 2));

  client.dispose();
  console.log("\nDone.");
})().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
