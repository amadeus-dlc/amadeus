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
const ENGINE = join(
  ROOT,
  "dist/claude/.claude/tools/amadeus-orchestrate.ts",
);
const STATE_TOOL = join(
  ROOT,
  "dist/claude/.claude/tools/amadeus-state.ts",
);
let project = "";

function run(tool: string, args: string[]) {
  const result = spawnSync(process.execPath, [
    tool,
    ...args,
    "--project-dir",
    project,
  ], { encoding: "utf-8" });
  return {
    code: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function parseDirective(result: ReturnType<typeof run>, expectedCode = 0): {
  kind: string;
  question?: string;
  message?: string;
} {
  expect(result.code).toBe(expectedCode);
  expect(result.stderr).toBe("");
  const trimmed = result.stdout.trim();
  expect(trimmed).not.toBe("");
  return JSON.parse(trimmed) as {
    kind: string;
    question?: string;
    message?: string;
  };
}

function seedBoundary(
  phase: "ideation" | "inception" | "construction",
  options: { auto?: boolean; mirror?: boolean; receipts?: string } = {},
): void {
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
  let state = readFileSync(seededStateFile(project), "utf-8");
  const lifecycle =
    phase === "ideation"
      ? "INCEPTION"
      : phase === "inception"
        ? "CONSTRUCTION"
        : "CONSTRUCTION";
  state = state.replace(
    /- \*\*Lifecycle Phase\*\*: [^\n]+/,
    `- **Lifecycle Phase**: ${lifecycle}`,
  );
  const firstStage =
    phase === "ideation"
      ? "reverse-engineering"
      : phase === "inception"
        ? "code-generation"
        : "none";
  state = state.replace(
    /- \*\*Current Stage\*\*: [^\n]+/,
    `- **Current Stage**: ${firstStage}`,
  );
  const label = phase[0].toUpperCase() + phase.slice(1);
  state = state.replace(
    new RegExp(`- \\*\\*${label}\\*\\*: [^\\n]+`),
    `- **${label}**: Verified`,
  );
  if (phase === "construction") {
    state = state.replace(
      /- \*\*Status\*\*: [^\n]+/,
      "- **Status**: Completed",
    );
  }
  if (options.mirror) {
    state = state.replace(
      "## Current Status",
      "## Current Status\n- **Mirror Issue**: #123",
    );
  }
  if (options.receipts) {
    state = state.replace(
      "## Runtime State",
      `## Runtime State\n- **Mirror Boundary Receipts**: ${options.receipts}`,
    );
  }
  writeFileSync(seededStateFile(project), state);
  if (options.auto !== undefined) {
    writeFileSync(
      join(project, "amadeus", "config.json"),
      JSON.stringify({ "auto-mirror": options.auto }),
    );
  }
}

afterEach(() => {
  cleanupTestProject(project);
  project = "";
});

describe("t265 engine boundary four quadrants", () => {
  const cells = (["ideation", "inception", "construction"] as const).flatMap(
    (phase) =>
      ([false, true] as const).flatMap((auto) =>
        ([false, true] as const).map((mirror) => ({
          phase,
          auto,
          mirror,
        })),
      ),
  );

  test.each(cells)(
    "$phase auto=$auto mirror=$mirror",
    ({ phase, auto, mirror }) => {
    seedBoundary(phase, { auto, mirror });
    const before = readFileSync(seededStateFile(project), "utf-8");
    const result = run(ENGINE, ["next"]);
    const directive = parseDirective(result);
    const shouldSync = auto && mirror;
    expect(directive.kind).toBe(shouldSync ? "print" : "ask");
    const prose = directive.message ?? directive.question ?? "";
    expect(prose.includes("amadeus-mirror.ts sync")).toBe(shouldSync);
    expect(prose.includes("Choose create")).toBe(!mirror);
    expect(readFileSync(seededStateFile(project), "utf-8")).toBe(before);
    },
  );
});

describe("t265 receipt recovery and reports", () => {
  test("processes the oldest pending receipt only", () => {
    seedBoundary("construction", {
      auto: true,
      mirror: true,
      receipts:
        '{"ideation":"pending","inception":"pending","construction":"pending"}',
    });
    const result = run(ENGINE, ["next"]);
    expect(result.stdout).toContain("ideation completed --from pending");
    expect(result.stdout).not.toContain("inception completed --from pending");
  });

  test("sync failure leaves pending and the next session reissues it", () => {
    seedBoundary("inception", { auto: true, mirror: true });
    expect(
      run(STATE_TOOL, [
        "mirror-boundary",
        "inception",
        "pending",
        "--from",
        "absent",
      ]).code,
    ).toBe(0);
    const pending = readFileSync(seededStateFile(project), "utf-8");
    const first = parseDirective(run(ENGINE, ["next"]));
    expect(first.message).toContain("amadeus-mirror.ts sync");
    expect(readFileSync(seededStateFile(project), "utf-8")).toBe(pending);
    const resumed = parseDirective(run(ENGINE, ["next"]));
    expect(resumed).toEqual(first);
    expect(readFileSync(seededStateFile(project), "utf-8")).toBe(pending);
  });

  test("receipt update failure preserves pending for an idempotent sync retry", () => {
    seedBoundary("inception", {
      auto: true,
      mirror: true,
      receipts: '{"inception":"pending"}',
    });
    const before = readFileSync(seededStateFile(project), "utf-8");
    const failed = run(STATE_TOOL, [
      "mirror-boundary",
      "inception",
      "completed",
      "--from",
      "absent",
    ]);
    expect(failed.code).not.toBe(0);
    expect(readFileSync(seededStateFile(project), "utf-8")).toBe(before);
    expect(parseDirective(run(ENGINE, ["next"])).message).toContain(
      "amadeus-mirror.ts sync",
    );
  });

  test("completes only the first pending receipt and handles the next one later", () => {
    seedBoundary("construction", {
      auto: true,
      mirror: true,
      receipts: '{"ideation":"pending","inception":"pending"}',
    });
    expect(
      run(STATE_TOOL, [
        "mirror-boundary",
        "ideation",
        "completed",
        "--from",
        "pending",
      ]).code,
    ).toBe(0);
    const state = readFileSync(seededStateFile(project), "utf-8");
    expect(state).toContain(
      '{"ideation":"completed","inception":"pending"}',
    );
    const next = parseDirective(run(ENGINE, ["next"]));
    expect(next.message).toContain("inception completed --from pending");
    expect(next.message).not.toContain("ideation completed --from pending");
  });

  test("a completed current boundary falls through to normal routing", () => {
    seedBoundary("inception", {
      auto: true,
      mirror: true,
      receipts: '{"inception":"completed"}',
    });
    const before = readFileSync(seededStateFile(project), "utf-8");
    const directive = parseDirective(run(ENGINE, ["next"]));
    expect(directive.kind).toBe("run-stage");
    expect(directive.message ?? "").not.toContain("amadeus-mirror.ts sync");
    expect(readFileSync(seededStateFile(project), "utf-8")).toBe(before);
  });

  test("invalid config fails closed without changing state", () => {
    seedBoundary("inception", { mirror: true });
    writeFileSync(join(project, "amadeus", "config.json"), '{"auto-mirror":"yes"}');
    const before = readFileSync(seededStateFile(project), "utf-8");
    const result = run(ENGINE, ["next"]);
    expect(result.stdout).toContain('"kind":"error"');
    expect(result.stdout).toContain("Invalid mirror configuration");
    expect(readFileSync(seededStateFile(project), "utf-8")).toBe(before);
  });

  test("malformed receipts fail safe", () => {
    seedBoundary("inception", { receipts: "{" });
    const result = run(ENGINE, ["next"]);
    expect(result.stdout).toContain('"kind":"error"');
    expect(result.stdout).toContain("invalid JSON");
  });

  test("state transition failure leaves bytes unchanged", () => {
    seedBoundary("inception", {
      receipts: '{"inception":"pending"}',
    });
    const before = readFileSync(seededStateFile(project), "utf-8");
    const result = run(STATE_TOOL, [
      "mirror-boundary",
      "inception",
      "completed",
      "--from",
      "absent",
    ]);
    expect(result.code).not.toBe(0);
    expect(readFileSync(seededStateFile(project), "utf-8")).toBe(before);
  });

  test("ask report records completed directly without pending", () => {
    seedBoundary("inception", { auto: false, mirror: true });
    const result = run(ENGINE, [
      "report",
      "--mirror-boundary",
      "inception",
      "--result",
      "completed",
      "--user-input",
      "sync",
    ]);
    expect(result.stdout).toContain('"kind":"print"');
    expect(readFileSync(seededStateFile(project), "utf-8")).toContain(
      '{"inception":"completed"}',
    );
  });

  test("ask report rejects close and preserves state", () => {
    seedBoundary("inception", { auto: false, mirror: true });
    const before = readFileSync(seededStateFile(project), "utf-8");
    const result = run(ENGINE, [
      "report",
      "--mirror-boundary",
      "inception",
      "--result",
      "completed",
      "--user-input",
      "close",
    ]);
    expect(result.stdout).toContain('"kind":"error"');
    expect(readFileSync(seededStateFile(project), "utf-8")).toBe(before);
  });

  test.each([
    ["phase mismatch", "ideation", "sync"],
    ["unoffered create", "inception", "create"],
    ["free-form answer", "inception", "please sync"],
  ] as const)("ask report rejects %s", (_, phase, answer) => {
    seedBoundary("inception", { auto: false, mirror: true });
    const before = readFileSync(seededStateFile(project), "utf-8");
    const directive = parseDirective(
      run(ENGINE, [
        "report",
        "--mirror-boundary",
        phase,
        "--result",
        "completed",
        "--user-input",
        answer,
      ]),
    );
    expect(directive.kind).toBe("error");
    expect(readFileSync(seededStateFile(project), "utf-8")).toBe(before);
  });

  test("ask skip transitions absent directly to completed", () => {
    seedBoundary("ideation", { auto: false, mirror: false });
    const directive = parseDirective(
      run(ENGINE, [
        "report",
        "--mirror-boundary",
        "ideation",
        "--result",
        "completed",
        "--user-input",
        "skip",
      ]),
    );
    expect(directive.kind).toBe("print");
    expect(readFileSync(seededStateFile(project), "utf-8")).toContain(
      '{"ideation":"completed"}',
    );
  });

  test("a second answer for the same ask is rejected", () => {
    seedBoundary("inception", { auto: false, mirror: true });
    const args = [
      "report",
      "--mirror-boundary",
      "inception",
      "--result",
      "completed",
      "--user-input",
      "sync",
    ];
    expect(parseDirective(run(ENGINE, args)).kind).toBe("print");
    const completed = readFileSync(seededStateFile(project), "utf-8");
    expect(parseDirective(run(ENGINE, args)).kind).toBe("error");
    expect(readFileSync(seededStateFile(project), "utf-8")).toBe(completed);
  });
});
