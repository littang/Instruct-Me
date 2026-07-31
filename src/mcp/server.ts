import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v3";
import * as fs from "node:fs";
import * as path from "node:path";
import { ReviewLevel, ReviewQuestion, ReviewResult } from "../prompts/reviewPrompts.js";
import { generateReviewWithLLM } from "./llm.js";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".svn",
  "out",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "__pycache__",
  ".venv",
  "venv",
  ".cache",
  "coverage",
  ".nyc_output",
]);

const SKIP_EXTENSIONS = new Set([
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".ico",
  ".svg",
  ".mp4",
  ".avi",
  ".mov",
  ".pdf",
  ".zip",
  ".tar",
  ".gz",
  ".rar",
  ".7z",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".lock",
  ".map",
]);

const MAX_FILE_SIZE = 100 * 1024;
const MAX_FILES = 200;
const MAX_TEXT_LENGTH = 5000;

interface FileSummary {
  path: string;
  size: number;
  lines: number;
  summary: string;
}

interface AnalyzeResult {
  projectPath: string;
  totalFiles: number;
  files: FileSummary[];
}

function isBinary(buffer: Buffer, size: number): boolean {
  const sample = size > 1024 ? buffer.subarray(0, 1024) : buffer;
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) return true;
  }
  return false;
}

function walkDirectory(dirPath: string, files: FileSummary[], count: number): void {
  if (count >= MAX_FILES) return;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (count >= MAX_FILES) break;

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith(".")) continue;
      walkDirectory(path.join(dirPath, entry.name), files, count);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SKIP_EXTENSIONS.has(ext)) continue;

      const fullPath = path.join(dirPath, entry.name);
      let stat: fs.Stats;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.size > MAX_FILE_SIZE) continue;

      let content = "";
      let lines = 0;
      try {
        const buffer = fs.readFileSync(fullPath);
        if (isBinary(buffer, stat.size)) continue;
        content = buffer.toString("utf-8");
        lines = content.split("\n").length;
      } catch {
        continue;
      }

      const relativePath = fullPath.replace(dirPath + path.sep, "").replace(/\\/g, "/");
      let summary = content.substring(0, MAX_TEXT_LENGTH);
      if (content.length > MAX_TEXT_LENGTH) {
        summary += "...";
      }

      files.push({ path: relativePath, size: stat.size, lines, summary });
      count++;
    }
  }
}

function analyzeProject(projectPath: string): AnalyzeResult {
  const absolutePath = path.resolve(projectPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Project path not found: ${absolutePath}`);
  }

  const files: FileSummary[] = [];
  walkDirectory(absolutePath, files, 0);

  return {
    projectPath: absolutePath,
    totalFiles: files.length,
    files,
  };
}

function generateTemplateQuestions(level: ReviewLevel, context: string): ReviewQuestion[] {
  const hasJs = /\.(js|ts|jsx|tsx)/i.test(context);
  const hasReact = /react|jsx|tsx/i.test(context);
  const hasNode = /express|koa|fastify|node/i.test(context);
  const hasPython = /\.py/i.test(context);
  const hasDb = /sql|mongo|prisma|orm|database/i.test(context);
  const hasTest = /test|spec\.|jest|mocha|pytest/i.test(context);
  const hasApi = /api|route|endpoint|rest|graphql/i.test(context);
  const hasAsync = /async|await|promise|callback/i.test(context);

  const questions: ReviewQuestion[] = [];
  let id = 1;

  function add(title: string, answer: string, keywords: string[]): void {
    questions.push({ id: id++, level, title, answer, keywords });
  }

  if (level === "L1") {
    if (hasJs) {
      add(
        "这个项目的入口文件和模块结构是怎样的？",
        "通常在 package.json 的 main 字段或入口脚本中指定启动文件。通过观察 import/require 语句可以梳理出模块间的依赖关系，理解每个文件在整个项目中扮演的角色。",
        ["入口文件", "模块依赖", "import", "目录结构"]
      );
    }
    if (hasAsync) {
      add(
        "代码中的 async/await 和 Promise 是干什么用的？",
        "它们用于处理需要等待的操作，比如读取文件、请求网络。async 函数表示内部有异步操作，await 会暂停执行直到结果返回，避免了传统回调地狱。",
        ["async/await", "Promise", "异步操作", "回调地狱"]
      );
    }
    if (hasReact) {
      add(
        "React 组件是怎么组织页面结构的？",
        "组件是页面的积木块，每个组件负责一块 UI。通过 props 向子组件传数据，通过 state 管理组件自己的状态，理解这些就能看懂页面如何拼装。",
        ["组件", "props", "state", "页面结构"]
      );
    }
    if (hasApi) {
      add(
        "这个项目的 API 接口是怎么调用的？",
        "通过 fetch 或 axios 发起 HTTP 请求，携带 URL、请求方法和参数。返回的数据通常是 JSON，前端拿到后渲染到页面上。",
        ["HTTP请求", "fetch", "axios", "JSON"]
      );
    }
  } else if (level === "L2") {
    if (hasReact) {
      add(
        "为什么选择 React（而不是 Vue/Angular）来做这个项目？",
        "React 采用单向数据流和虚拟 DOM，生态丰富、组件复用性强。选择它通常考虑团队熟悉度、社区生态、以及是否适合当前的 UI 复杂度。",
        ["单向数据流", "虚拟DOM", "生态对比", "技术选型"]
      );
    }
    if (hasNode) {
      add(
        "为什么用这个 Node.js 框架？它和替代方案比有什么权衡？",
        "Express 轻量灵活适合快速开发，NestJS 结构严谨适合大型项目，Fastify 性能更高。选择取决于项目规模、类型安全需求和团队规范。",
        ["Express", "NestJS", "Fastify", "框架选型"]
      );
    }
    if (hasDb) {
      add(
        "为什么选择这种数据库方案？直接使用和 ORM 的取舍是什么？",
        "直接写 SQL 灵活但易出错，ORM 提升开发效率但有性能损耗和学习成本。还涉及 SQL vs NoSQL 的选择，取决于数据关系和扩展需求。",
        ["ORM", "SQL", "NoSQL", "数据库选型"]
      );
    }
    if (hasApi) {
      add(
        "为什么采用这种 API 设计？REST 和 GraphQL 的取舍是什么？",
        "REST 简单成熟、缓存友好，适合资源型接口；GraphQL 灵活精确取数，但增加查询复杂度和缓存难度。选择取决于客户端需求是否多变。",
        ["REST", "GraphQL", "API设计", "缓存"]
      );
    }
  } else {
    if (hasDb) {
      add(
        "数据库访问是否存在 N+1 查询或索引缺失等性能隐患？",
        "逐条查询关联数据会造成大量往返，应使用批量加载（IN 查询/JOIN）。同时检查 WHERE 和 ORDER BY 字段是否有索引，避免全表扫描。",
        ["N+1查询", "索引", "全表扫描", "批量加载"]
      );
    }
    if (hasAsync) {
      add(
        "高并发场景下这个异步流程如何保障吞吐和一致性？",
        "检查是否有串行等待可并行化（Promise.all）、是否有并发控制（限流/队列）、事务边界是否正确。必要时引入消息队列削峰和事件溯源。",
        ["并发控制", "事务", "消息队列", "吞吐量"]
      );
    }
    if (hasReact) {
      add(
        "大型应用下组件渲染性能如何优化？",
        "关注不必要的重渲染（React.memo、useMemo、useCallback）、长列表虚拟化（react-window）、代码分割（React.lazy）和状态位置是否合理。",
        ["React.memo", "虚拟列表", "代码分割", "重渲染"]
      );
    }
    if (hasApi) {
      add(
        "API 层的扩展性和可观测性设计如何？",
        "评估是否支持水平扩展（无状态设计）、限流熔断、分布式追踪、接口版本管理。规模增长后哪些瓶颈会先出现。",
        ["水平扩展", "限流", "熔断", "可观测性", "版本管理"]
      );
    }
  }

  if (questions.length === 0) {
    add(
      "这个项目的代码组织是否清晰、易于维护？",
      "检查目录结构、命名规范、模块边界和重复代码。良好的组织能显著降低维护成本，尤其是团队协作时。",
      ["代码组织", "可维护性", "命名规范"]
    );
  }

  return questions;
}

const server = new McpServer(
  {
    name: "instruct-me-mcp",
    version: "0.0.1",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.registerTool(
  "analyze_project",
  {
    description: "Scan a project directory, filter out node_modules/.git and other skip dirs, return file list with content summaries.",
    inputSchema: {
      projectPath: z.string().describe("Absolute path to the project directory to analyze"),
    },
  },
  async ({ projectPath }) => {
    try {
      const result = analyzeProject(projectPath);

      const fileList = result.files
        .map(
          (f) =>
            `${f.path} (${f.size} bytes, ${f.lines} lines)\n---\n${f.summary.substring(0, 200)}...`
        )
        .join("\n\n");

      const context = fileList;

      return {
        content: [
          {
            type: "text",
            text: `Project: ${result.projectPath}\nTotal files analyzed: ${result.totalFiles}\n\n${context}`,
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error analyzing project: ${message}` }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "generate_review",
  {
    description: "Generate review questions at a specific level (L1/L2/L3). L1=beginner (what does the code do), L2=developer (why this approach), L3=expert (performance/scalability).",
    inputSchema: {
      context: z.string().describe("Project analysis context from analyze_project output"),
      level: z
        .enum(["L1", "L2", "L3"])
        .describe("Review depth level: L1 (beginner), L2 (intermediate), L3 (advanced)"),
    },
  },
  async ({ context, level }) => {
    try {
      const useLLM = process.env.INSTRUCT_ME_LLM_API_KEY !== undefined;

      let result: ReviewResult;
      if (useLLM) {
        result = await generateReviewWithLLM(level, context);
      } else {
        const questions = generateTemplateQuestions(level, context);
        result = { questions };
      }

      const response = JSON.stringify(result, null, 2);

      return {
        content: [
          {
            type: "text",
            text: response,
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error generating review: ${message}` }],
        isError: true,
      };
    }
  }
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("InstructMe MCP server running on stdio");
}

main().catch((error) => {
  console.error("MCP server fatal error:", error);
  process.exit(1);
});
