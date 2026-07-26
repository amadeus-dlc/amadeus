import { describe, expect, test } from "bun:test";

import { renderClaudeHookCommand } from "../../packages/framework/harness/claude/manifest.ts";
import { parseKiroIdeHookContext } from "../../packages/framework/harness/kiro-ide/hooks/amadeus-kiro-vocab.ts";

describe("FR-4.14 parseKiroIdeHookContext", () => {
  test("parses the USER_PROMPT JSON string into the four measured IDE fields", () => {
    expect(
      parseKiroIdeHookContext(
        JSON.stringify({
          toolName: "fs_write",
          toolArgs: {},
          toolResult: "Created the src/example.ts file.",
          toolSuccess: true,
          ignoredHostField: "not canonical",
        }),
      ),
    ).toEqual({
      kind: "ok",
      value: {
        toolName: "fs_write",
        toolArgs: {},
        toolResult: "Created the src/example.ts file.",
        toolSuccess: true,
      },
    });
  });

  test("classifies missing, malformed, and non-object payloads without guessing", () => {
    expect(parseKiroIdeHookContext(undefined)).toEqual({ kind: "empty", reason: "missing" });
    expect(parseKiroIdeHookContext("")).toEqual({ kind: "empty", reason: "missing" });
    expect(parseKiroIdeHookContext("not-json")).toEqual({ kind: "empty", reason: "malformed" });
    expect(parseKiroIdeHookContext("42")).toEqual({ kind: "empty", reason: "not-object" });
    expect(parseKiroIdeHookContext([])).toEqual({ kind: "empty", reason: "not-object" });
  });

  test("accepts an object directly and filters fields with the wrong measured types", () => {
    expect(
      parseKiroIdeHookContext({
        toolName: 42,
        toolArgs: [],
        toolResult: false,
        toolSuccess: "yes",
        prompt: "<task-notification>must not be classified here",
      }),
    ).toEqual({ kind: "ok", value: {} });
    expect(
      parseKiroIdeHookContext({
        toolName: "fs_append",
        toolArgs: { path: "src/example.ts" },
        toolResult: "Appended the text to the src/example.ts file.",
        toolSuccess: true,
      }),
    ).toEqual({
      kind: "ok",
      value: {
        toolName: "fs_append",
        toolArgs: { path: "src/example.ts" },
        toolResult: "Appended the text to the src/example.ts file.",
        toolSuccess: true,
      },
    });
  });
});

describe("FR-4.15 renderClaudeHookCommand", () => {
  // #1492: the launch line must survive an UNSET CLAUDE_PROJECT_DIR, so the
  // canonical form carries the `:-.` shell default. Without it the hook never
  // launches and the whole audit/gate surface goes silently dead.
  test("renders the canonical quoted project-variable command with a cwd default", () => {
    expect(
      renderClaudeHookCommand("CLAUDE_PROJECT_DIR", {
        path: ".claude/hooks/amadeus-stop.ts",
      }),
    ).toBe('bun "${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/amadeus-stop.ts"');
  });
});
