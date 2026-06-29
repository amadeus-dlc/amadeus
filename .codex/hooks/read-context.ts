import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const eventName = process.argv[2];
const root = process.argv[3] ?? process.cwd();

if (eventName !== "SessionStart" && eventName !== "UserPromptSubmit") {
  console.error("unsupported hook event");
  process.exit(2);
}

const contextPath = resolve(root, "CONTEXT.md");
const contextBody = existsSync(contextPath)
  ? readFileSync(contextPath, "utf8")
  : "CONTEXT.md が未配置です。";

const additionalContext = [
  "この追加文脈は Codex hook が読み込んだ CONTEXT.md です。",
  "`CONTEXT.md` の語彙を優先し、`_Avoid_` に書かれた語はその概念を指す表現として使わないでください。",
  "",
  "--- CONTEXT.md ---",
  contextBody,
].join("\n");

console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: eventName,
      additionalContext,
    },
  }),
);
