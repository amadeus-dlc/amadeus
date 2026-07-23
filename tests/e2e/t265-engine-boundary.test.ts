import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  seededStateFile,
  seedStateFile,
} from "../harness/fixtures.ts";

const ROOT = join(import.meta.dir, "..", "..");
const CORE_ENGINE = readFileSync(
  join(ROOT, "packages/framework/core/tools/amadeus-orchestrate.ts"),
  "utf-8",
);
const CORE_STATE = readFileSync(
  join(ROOT, "packages/framework/core/tools/amadeus-state.ts"),
  "utf-8",
);
const harnesses = [
  ["claude", ".claude"],
  ["codex", ".codex"],
  ["cursor", ".cursor"],
  ["kiro", ".kiro"],
  ["kiro-ide", ".kiro"],
  ["opencode", ".opencode"],
] as const;
const CLAUDE_ENGINE = join(
  ROOT,
  "dist/claude/.claude/tools/amadeus-orchestrate.ts",
);
const CLAUDE_STATE = join(
  ROOT,
  "dist/claude/.claude/tools/amadeus-state.ts",
);
let project = "";

function run(tool: string, args: string[]) {
  const result = spawnSync(
    process.execPath,
    [tool, ...args, "--project-dir", project],
    { encoding: "utf-8" },
  );
  expect(result.status).toBe(0);
  expect(result.stderr).toBe("");
  return JSON.parse(result.stdout.trim()) as {
    kind: string;
    message?: string;
  };
}

afterEach(() => {
  cleanupTestProject(project);
  project = "";
});

describe("t265 mirror boundary distribution", () => {
  test.each(harnesses)("%s ships the engine and receipt state machine", (name, dir) => {
    expect(
      readFileSync(
        join(ROOT, "dist", name, dir, "tools", "amadeus-orchestrate.ts"),
        "utf-8",
      ),
    ).toBe(CORE_ENGINE);
    expect(
      readFileSync(
        join(ROOT, "dist", name, dir, "tools", "amadeus-state.ts"),
        "utf-8",
      ),
    ).toBe(CORE_STATE);
  });

  test("auto execution names only the fixed sync command", () => {
    const functionBody =
      CORE_ENGINE.match(
        /function mirrorSyncPrint\([\s\S]*?\n}\n\nfunction emitMirrorBoundaryIfNeeded/,
      )?.[0] ?? "";
    expect(functionBody).toContain("amadeus-mirror.ts sync");
    expect(functionBody).not.toContain("amadeus-mirror.ts create");
    expect(functionBody).not.toContain("amadeus-mirror.ts close");
    expect(functionBody).not.toContain("eval(");
  });

  test("reuses ask and print without extending directive kinds", () => {
    expect(CORE_ENGINE).toContain("askDirective(");
    expect(CORE_ENGINE).toContain("printDirective(");
    expect(CORE_ENGINE).not.toContain('kind: "mirror-');
  });

  test("generated CLI resumes pending sync then returns to normal routing", () => {
    project = createTestProject();
    const knowledgeDir = join(
      project,
      ".claude",
      "knowledge",
      "amadeus-shared",
    );
    mkdirSync(knowledgeDir, { recursive: true });
    copyFileSync(
      join(ROOT, ".claude/knowledge/amadeus-shared/memory-template.md"),
      join(knowledgeDir, "memory-template.md"),
    );
    seedStateFile(project, join(FIXTURES_DIR, "state-mid-inception.md"));
    let state = readFileSync(seededStateFile(project), "utf-8")
      .replace(
        /- \*\*Lifecycle Phase\*\*: [^\n]+/,
        "- **Lifecycle Phase**: CONSTRUCTION",
      )
      .replace(
        /- \*\*Current Stage\*\*: [^\n]+/,
        "- **Current Stage**: code-generation",
      )
      .replace(
        /- \*\*Inception\*\*: [^\n]+/,
        "- **Inception**: Verified",
      )
      .replace(
        "## Current Status",
        "## Current Status\n- **Mirror Issue**: #123",
      );
    writeFileSync(seededStateFile(project), state);
    writeFileSync(
      join(project, "amadeus", "config.json"),
      '{"auto-mirror":true}',
    );

    const initial = run(CLAUDE_ENGINE, ["next"]);
    expect(initial.kind).toBe("print");
    expect(initial.message).toContain("amadeus-mirror.ts sync");

    run(CLAUDE_STATE, [
      "mirror-boundary",
      "inception",
      "pending",
      "--from",
      "absent",
    ]);
    const resumed = run(CLAUDE_ENGINE, ["next"]);
    expect(resumed.kind).toBe("print");
    expect(resumed.message).toContain("inception completed --from pending");

    run(CLAUDE_STATE, [
      "mirror-boundary",
      "inception",
      "completed",
      "--from",
      "pending",
    ]);
    const routed = run(CLAUDE_ENGINE, ["next"]);
    expect(routed.kind).toBe("run-stage");
    state = readFileSync(seededStateFile(project), "utf-8");
    expect(state).toContain('{"inception":"completed"}');
  });
});
