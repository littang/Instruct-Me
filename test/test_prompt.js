const { buildPrompt } = require("../out/prompts/reviewPrompts.js");

console.log("===== L1 PROMPT (first 1500 chars) =====");
console.log(buildPrompt("L1", "File: test.ts\n---\nconsole.log('hi')").substring(0, 1500));
