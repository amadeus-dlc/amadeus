// covers: file:packages/framework/core/tools/amadeus-reviewer.ts
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AMADEUS_SRC } from "../harness/fixtures.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORE = join(REPO_ROOT, "packages", "framework", "core");
const REVIEWER_TOOL = join(
  REPO_ROOT,
  "packages/framework/core/tools/amadeus-reviewer-runtime.ts",
);
const PACKAGED_REVIEWER_TOOLS = [
  "dist/claude/.claude/tools/amadeus-reviewer-runtime.ts",
  "dist/codex/.codex/tools/amadeus-reviewer-runtime.ts",
  "dist/cursor/.cursor/tools/amadeus-reviewer-runtime.ts",
  "dist/kiro/.kiro/tools/amadeus-reviewer-runtime.ts",
  "dist/kiro-ide/.kiro/tools/amadeus-reviewer-runtime.ts",
  "dist/opencode/.opencode/tools/amadeus-reviewer-runtime.ts",
].map((path) => join(REPO_ROOT, path));
const PACKAGED_ORCHESTRATOR = join(AMADEUS_SRC, "tools", "amadeus-orchestrate.ts");
const TEST_INVOCATION_ID = "00000000-0000-4000-8000-000000000245";
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

interface Fixture {
  root: string;
  directive: Record<string, unknown>;
  expected: string[];
  primary: string;
  contract: string;
  requested: string;
}

function fixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t245-reviewer-"));
  temporaryDirectories.push(root);

  const stageFile = ".codex/amadeus-common/stages/construction/code-generation.md";
  const required =
    "amadeus/spaces/default/intents/example/construction/reviewer-protocol/code-generation/code-summary.md";
  const presentOptional =
    "amadeus/spaces/default/intents/example/construction/reviewer-protocol/code-generation/test-summary.md";
  const missingOptional =
    "amadeus/spaces/default/intents/example/construction/reviewer-protocol/code-generation/missing.md";
  const questions =
    "amadeus/spaces/default/intents/example/construction/reviewer-protocol/functional-design/functional-design-questions.md";
  const contract =
    "amadeus/spaces/default/intents/example/inception/application-design/component-methods.md";
  const requested = "packages/framework/core/tools/integration-owned.ts";
  const absentConsume =
    "amadeus/spaces/default/intents/example/inception/application-design/absent.md";
  const excluded = [
    "amadeus/spaces/default/intents/example/construction/reviewer-protocol/code-generation/memory.md",
    "amadeus/spaces/default/intents/example/construction/reviewer-protocol/code-generation/plan.md",
    "amadeus/spaces/default/intents/example/construction/sibling-unit/code-generation/code-summary.md",
    "amadeus/spaces/default/intents/example/construction/reviewer-protocol/functional-design/undeclared-questions.md",
  ];
  for (const path of [stageFile, required, presentOptional, questions, contract]) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    const content = path === contract
      ? `# Integration contract\n\nINT-245 owns ${requested}.\n`
      : path === required
        ? `# Code summary\n\nIntegration ID: INT-245\n`
        : `${path}\n`;
    writeFileSync(join(root, path), content);
  }
  for (const path of excluded) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), `excluded: ${path}\n`);
  }
  mkdirSync(dirname(join(root, requested)), { recursive: true });
  writeFileSync(join(root, requested), "export const owned = true;\n");

  return {
    root,
    directive: {
      kind: "run-stage",
      stage: "code-generation",
      phase: "construction",
      lead_agent: "amadeus-developer-agent",
      support_agents: [],
      mode: "subagent",
      gate: false,
      memory_path:
        "amadeus/spaces/default/intents/example/construction/reviewer-protocol/code-generation/memory.md",
      consumes: [questions, contract, absentConsume],
      produces: [required, presentOptional, missingOptional],
      optional_produces: [presentOptional, missingOptional],
      rules_in_context: [],
      sensors_applicable: [],
      stage_file: stageFile,
      reviewer: "amadeus-architecture-reviewer-agent",
      reviewer_max_iterations: 2,
      unit: "reviewer-protocol",
    },
    expected: [stageFile, required, presentOptional, questions, contract],
    primary: required,
    contract,
    requested,
  };
}

function run(
  fixture: Fixture,
  mode: "scope" | "check-read" | "complete-review",
  input: unknown,
  env?: Record<string, string>,
  tool = REVIEWER_TOOL,
) {
  return spawnSync(process.execPath, [tool, mode], {
    cwd: fixture.root,
    input: JSON.stringify(input),
    encoding: "utf8",
    env: env ? { ...process.env, ...env } : process.env,
  });
}

function readRequest(fixture: Fixture) {
  return {
    integrationId: "INT-245",
    path: fixture.requested,
    reason: "Confirm the existing integration ownership contract.",
    ownerEvidence: {
      path: fixture.contract,
      excerpt: `INT-245 owns ${fixture.requested}.`,
    },
    operation: "read-file",
  };
}

function reviewResult(
  transcript: unknown[] = [],
  requestedReads: string[] = [],
  iteration = 1,
  invocationId = TEST_INVOCATION_ID,
) {
  return {
    invocationId,
    reviewer: "amadeus-architecture-reviewer-agent",
    verdict: "READY",
    iteration,
    summary: "The current unit satisfies the approved contract.",
    findings: [],
    scopeTranscript: transcript,
    requestedReads,
  };
}

function reviewCarrier(
  directive: Record<string, unknown>,
  result: Record<string, unknown>,
  invocationId = TEST_INVOCATION_ID,
) {
  return { directive, invocationId, result };
}

function rejectRead(current: Fixture, request: unknown): void {
  const rejected = run(current, "check-read", {
    directive: current.directive,
    invocationId: TEST_INVOCATION_ID,
    iteration: 1,
    transcript: [],
    request,
  });
  expect(rejected.status).toBe(1);
}

function localRuntime(current: Fixture, input: unknown) {
  const files = new Map<string, string>();
  for (const path of [...current.expected, current.requested]) {
    files.set(join(current.root, path), readFileSync(join(current.root, path), "utf8"));
  }
  let stdin = JSON.stringify(input);
  let stdout = "";
  let stderr = "";
  const exitCode: { exitCode?: number } = {};
  const deps = {
    cwd: () => current.root,
    fs: {
      exists: (path: string) => files.has(path),
      stat: (path: string) => ({ isFile: () => files.has(path) }),
      readFile: (path: string | 0, _encoding: "utf8") => {
        if (path === 0) return stdin;
        const content = files.get(path);
        if (content === undefined) throw new Error(`missing virtual file: ${path}`);
        return content;
      },
      appendFile: (path: string, content: string, _encoding: "utf8") => {
        files.set(path, `${files.get(path) ?? ""}${content}`);
      },
    },
    utc: {
      command: "date",
      args: ["-u", "+%Y-%m-%dT%H:%M:%SZ"],
      run: () => ({ status: 0, stdout: "2026-07-21T10:15:00Z\n" }),
    },
    stdin: 0 as const,
    stdout: {
      write: (text: string) => {
        stdout += text;
      },
    },
    stderr: {
      write: (text: string) => {
        stderr += text;
      },
    },
    invocationId: () => TEST_INVOCATION_ID,
    exitCode,
  };
  return {
    deps,
    files,
    output: () => ({ stdout, stderr, exitCode: exitCode.exitCode }),
    replaceInput: (next: unknown) => {
      stdin = typeof next === "string" ? next : JSON.stringify(next);
      stdout = "";
      stderr = "";
      exitCode.exitCode = undefined;
    },
  };
}

describe("t245 reviewer protocol production caller", () => {
  test("pins checker identity and runtime Review fields in both reviewer contracts", () => {
    const contracts = [
      {
        persona: "amadeus-architecture-reviewer-agent",
        files: [
          "agents/amadeus-architecture-reviewer-agent.md",
          "knowledge/amadeus-architecture-reviewer-agent/reviewing.md",
        ],
      },
      {
        persona: "amadeus-product-lead-agent",
        files: [
          "agents/amadeus-product-lead-agent.md",
          "knowledge/amadeus-product-lead-agent/reviewing.md",
        ],
      },
    ];

    for (const contract of contracts) {
      const content = contract.files
        .map((path) => readFileSync(join(CORE, path), "utf8"))
        .join("\n");
      expect(content).toContain(`Reviewer: ${contract.persona}`);
      expect(content).toContain("date -u +%Y-%m-%dT%H:%M:%SZ");
      expect(content).toContain("complete-review");
      expect(content).toContain("check-read");
      expect(content).toContain("invocationId + iteration");
      expect(content).toContain("**Verdict:**");
      expect(content).toContain("**Reviewer:**");
      expect(content).toContain("**Date:**");
      expect(content).toContain("**Iteration:**");
      expect(content).toContain("**Scope decision:**");
    }

    const architecture = readFileSync(
      join(CORE, "knowledge/amadeus-architecture-reviewer-agent/reviewing.md"),
      "utf8",
    );
    const product = readFileSync(
      join(CORE, "knowledge/amadeus-product-lead-agent/reviewing.md"),
      "utf8",
    );
    expect(architecture).not.toContain("**Reviewer:** amadeus-architect-agent");
    expect(product).not.toContain("**Reviewer:** amadeus-product-agent");
  });

  test("connects the three internal reviewer modes on all six authored harnesses", () => {
    const surfaces = [
      ["harness/claude/skills/amadeus/SKILL.md", ".claude"],
      ["harness/codex/skills/amadeus/SKILL.md", ".codex"],
      ["harness/kiro/skills/amadeus/SKILL.md", ".kiro"],
      ["harness/kiro-ide/skills/amadeus/SKILL.md", ".kiro"],
      ["harness/cursor/commands/amadeus.md", ".cursor"],
      ["harness/opencode/commands/amadeus.md", ".opencode"],
    ];

    for (const [path, harness] of surfaces) {
      const content = readFileSync(join(CORE, "..", path), "utf8");
      const command = `bun ${harness}/tools/amadeus-reviewer-runtime.ts`;
      expect(content, path).toContain(`${command} scope`);
      expect(content, path).toContain(`${command} check-read`);
      expect(content, path).toContain(`${command} complete-review`);
      expect(content, path).toContain("current Unit existing `produces`");
      expect(content, path).toContain("present `consumes`");
      expect(content, path).toContain("invocationId + iteration");
    }
  });

  test("projects the canonical caller to six packages and the four self-install surfaces", () => {
    const canonical = readFileSync(
      join(CORE, "tools/amadeus-reviewer-runtime.ts"),
      "utf8",
    );
    const packaged = [
      "dist/claude/.claude/tools/amadeus-reviewer-runtime.ts",
      "dist/codex/.codex/tools/amadeus-reviewer-runtime.ts",
      "dist/cursor/.cursor/tools/amadeus-reviewer-runtime.ts",
      "dist/kiro/.kiro/tools/amadeus-reviewer-runtime.ts",
      "dist/kiro-ide/.kiro/tools/amadeus-reviewer-runtime.ts",
      "dist/opencode/.opencode/tools/amadeus-reviewer-runtime.ts",
    ];
    const selfInstalled = [
      ".claude/tools/amadeus-reviewer-runtime.ts",
      ".codex/tools/amadeus-reviewer-runtime.ts",
      ".cursor/tools/amadeus-reviewer-runtime.ts",
      ".opencode/tools/amadeus-reviewer-runtime.ts",
    ];

    for (const path of [...packaged, ...selfInstalled]) {
      expect(readFileSync(join(REPO_ROOT, path), "utf8"), path).toBe(canonical);
    }
  });

  test("runtime exposes exactly one internal handler and directly wires its real guard", async () => {
    const runtime = await import(
      "../../packages/framework/core/tools/amadeus-reviewer-runtime.ts"
    );
    expect(Object.keys(runtime)).toEqual(["runReviewerCommand"]);
    const source = readFileSync(
      join(CORE, "tools/amadeus-reviewer-runtime.ts"),
      "utf8",
    );
    expect(source).toContain(
      "if (import.meta.main) runReviewerCommand(process.argv.slice(2), realDeps);",
    );
    expect(source).not.toMatch(/function main\b|function adapter\b/);
  });

  test("keeps the canonical public module pure and free of runtime adapters", () => {
    const source = readFileSync(join(CORE, "tools/amadeus-reviewer.ts"), "utf8");
    expect(source).not.toContain("node:fs");
    expect(source).not.toContain("node:child_process");
    expect(source).not.toContain("import.meta.main");
    expect(source).not.toMatch(/function (runScope|checkRead|completeReview)\b/);
  });

  test("drives every internal command and handler error in-process with local dependencies", async () => {
    const runtime = await import(
      "../../packages/framework/core/tools/amadeus-reviewer-runtime.ts"
    );
    const current = fixture();
    const local = localRuntime(current, current.directive);

    runtime.runReviewerCommand(["scope"], local.deps);
    expect(local.output().exitCode).toBe(0);
    const scopeOutput = JSON.parse(local.output().stdout);
    expect(scopeOutput.invocationId).toBe(TEST_INVOCATION_ID);

    local.replaceInput({
      directive: current.directive,
      invocationId: scopeOutput.invocationId,
      iteration: 1,
      transcript: scopeOutput.transcript,
      request: readRequest(current),
    });
    runtime.runReviewerCommand(["check-read"], local.deps);
    expect(local.output().exitCode).toBe(0);
    const transcript = JSON.parse(local.output().stdout).transcript;
    const acceptedResult = {
      ...reviewResult(transcript, [current.requested]),
      findings: ["first finding"],
    };

    local.replaceInput(reviewCarrier(
      current.directive,
      acceptedResult,
    ));
    runtime.runReviewerCommand(["complete-review"], local.deps);
    expect(local.output().exitCode).toBe(0);
    expect(JSON.parse(local.output().stdout).ready).toBe(true);
    expect(local.files.get(join(current.root, current.primary))).toContain(
      "## Review — Iteration 1",
    );

    local.replaceInput(reviewCarrier(
      current.directive,
      acceptedResult,
    ));
    runtime.runReviewerCommand(["complete-review"], local.deps);
    expect(local.output().exitCode).toBe(0);
    expect(JSON.parse(local.output().stdout).appended).toBe(false);

    local.replaceInput(current.directive);
    runtime.runReviewerCommand(["unknown"], local.deps);
    expect(local.output().exitCode).toBe(1);
    expect(local.output().stderr).toContain("unknown internal reviewer mode");

    local.replaceInput("{");
    runtime.runReviewerCommand(["scope"], local.deps);
    expect(local.output().exitCode).toBe(1);
    expect(local.output().stderr).toContain("reviewer input must be JSON");

    local.replaceInput(current.directive);
    runtime.runReviewerCommand([], local.deps);
    expect(local.output().exitCode).toBe(1);
    expect(local.output().stderr).toContain("<missing>");
  });

  test("rejects malformed scope and spot-check inputs in-process", async () => {
    const runtime = await import(
      "../../packages/framework/core/tools/amadeus-reviewer-runtime.ts"
    );
    type Local = ReturnType<typeof localRuntime>;
    const reject = (
      mode: string,
      prepare: (current: Fixture, local: Local) => unknown,
      expected: string,
    ): void => {
      const current = fixture();
      const local = localRuntime(current, current.directive);
      local.replaceInput(prepare(current, local));
      runtime.runReviewerCommand([mode], local.deps);
      expect(local.output().exitCode, expected).toBe(1);
      expect(local.output().stderr, expected).toContain(expected);
      expect(
        local.files.get(join(current.root, current.primary)),
        expected,
      ).not.toContain("## Review — Iteration");
    };
    const carrier = (
      current: Fixture,
      request: unknown = readRequest(current),
      overrides: Record<string, unknown> = {},
    ) => ({
      directive: current.directive,
      invocationId: TEST_INVOCATION_ID,
      iteration: 1,
      transcript: [],
      request,
      ...overrides,
    });

    reject("scope", () => ({ kind: "error", message: "stop" }), "unexpected directive kind");
    reject("scope", () => ({}), "missing or non-string required field: kind");
    reject("scope", (current, local) => {
      local.files.delete(join(current.root, current.directive.stage_file as string));
      return current.directive;
    }, "stage definition is missing");
    reject("scope", (current, local) => {
      local.deps.invocationId = () => "not-a-uuid";
      return current.directive;
    }, "review invocation ID must be a UUID v4");

    reject("check-read", () => "{", "reviewer input must be JSON");
    reject("check-read", () => [], "reviewer carrier must be an object");
    reject("check-read", (current) => carrier(current, readRequest(current), {
      transcript: [{}],
    }), "only one spot-check request is allowed");
    reject("check-read", (current) => carrier(current, readRequest(current), {
      iteration: 0,
    }), "review invocation iteration must be a positive integer");
    reject("check-read", (current) => carrier(current, readRequest(current), {
      invocationId: "not-a-uuid",
    }), "review invocation ID must be a UUID v4");
    reject("check-read", (current) => carrier(current, []), "read request must be an object");
    reject("check-read", (current) => carrier(current, {
      ...readRequest(current),
      integrationId: "invalid",
    }), "concrete integration ID");
    reject("check-read", (current) => carrier(current, {
      ...readRequest(current),
      reason: "",
    }), "read reason must be a non-empty single line");
    reject("check-read", (current) => carrier(current, {
      ...readRequest(current),
      operation: "search",
    }), "single-file read-file operation");
    reject("check-read", (current) => carrier(current, {
      ...readRequest(current),
      path: "packages/framework/core/tools/*.ts",
    }), "one literal workspace file");
    reject("check-read", (current) => carrier(current, {
      ...readRequest(current),
      path: "../outside.ts",
    }), "outside the workspace");
    reject("check-read", (current, local) => {
      local.files.delete(join(current.root, current.requested));
      return carrier(current);
    }, "not an existing file");
    reject("check-read", (current) => carrier(current, {
      ...readRequest(current),
      path: current.expected[0],
    }), "declared scope files do not require");
    reject("check-read", (current, local) => {
      local.files.set(join(current.root, current.primary), "# no integration ID\n");
      return carrier(current);
    }, "integration ID is absent");
    reject("check-read", (current) => carrier(current, {
      ...readRequest(current),
      ownerEvidence: {
        path: current.requested,
        excerpt: `INT-245 owns ${current.requested}.`,
      },
    }), "owner evidence is not a passed consume");
    reject("check-read", (current, local) => {
      local.files.set(join(current.root, current.contract), "# no owner mapping\n");
      return carrier(current);
    }, "exactly one passed owner path");
    reject("check-read", (current) => carrier(current, {
      ...readRequest(current),
      ownerEvidence: {
        path: current.contract,
        excerpt: `INT-245 owns ${current.requested}. extra`,
      },
    }), "owner evidence does not uniquely match");
  });

  test("rejects invalid review results and replayed decisions in-process", async () => {
    const runtime = await import(
      "../../packages/framework/core/tools/amadeus-reviewer-runtime.ts"
    );
    type Local = ReturnType<typeof localRuntime>;
    const reject = (
      prepare: (current: Fixture, local: Local) => unknown,
      expected: string,
    ): void => {
      const current = fixture();
      const local = localRuntime(current, current.directive);
      local.replaceInput(prepare(current, local));
      runtime.runReviewerCommand(["complete-review"], local.deps);
      expect(local.output().exitCode, expected).toBe(1);
      expect(local.output().stderr, expected).toContain(expected);
      expect(
        local.files.get(join(current.root, current.primary)),
        expected,
      ).not.toContain("## Review — Iteration");
    };
    const approved = (current: Fixture, local: Local) => {
      local.replaceInput({
        directive: current.directive,
        invocationId: TEST_INVOCATION_ID,
        iteration: 1,
        transcript: [],
        request: readRequest(current),
      });
      runtime.runReviewerCommand(["check-read"], local.deps);
      expect(local.output().exitCode).toBe(0);
      return JSON.parse(local.output().stdout).transcript as Record<string, unknown>[];
    };

    reject((current) => {
      current.directive.optional_produces = [...current.directive.produces as string[]];
      return reviewCarrier(current.directive, reviewResult());
    }, "primary review artifact is missing");
    reject((current) => reviewCarrier(current.directive, {
      ...reviewResult(),
      findings: "not-an-array",
    }), "review findings must be an array of strings");
    reject((current) => reviewCarrier(current.directive, {
      ...reviewResult(),
      verdict: "UNKNOWN",
    }), "review verdict must be READY or NOT-READY");
    reject((current) => reviewCarrier(current.directive, {
      ...reviewResult(),
      scopeTranscript: "not-an-array",
    }), "scope transcript must be an array");
    reject((current) => reviewCarrier(
      current.directive,
      reviewResult(),
      "10000000-0000-4000-8000-000000000245",
    ), "review result belongs to a different invocation");
    reject((current) => {
      current.directive.reviewer = "amadeus-product-lead-agent";
      return reviewCarrier(current.directive, reviewResult());
    }, "review result persona does not match");
    reject((current) => {
      current.directive.reviewer_max_iterations = 1;
      return reviewCarrier(current.directive, reviewResult([], [], 2));
    }, "review iteration exceeds");
    reject((current) => reviewCarrier(current.directive, reviewResult(
      [{}, {}],
      ["first", "second"],
    )), "only one spot-check request is allowed");
    reject((current) => reviewCarrier(current.directive, reviewResult(
      [],
      [current.requested],
    )), "spot-check request bypassed check-read");
    reject((current) => reviewCarrier(current.directive, reviewResult(
      [{ decision: "rejected" }],
      [current.requested],
    )), "rejected scope decisions cannot produce Review evidence");
    reject((current, local) => {
      const transcript = approved(current, local);
      transcript[0].invocationId = "10000000-0000-4000-8000-000000000245";
      return reviewCarrier(current.directive, reviewResult(
        transcript,
        [current.requested],
      ));
    }, "scope decision belongs to a different review invocation");
    reject((current, local) => {
      const transcript = approved(current, local);
      transcript[0].iteration = 2;
      return reviewCarrier(current.directive, reviewResult(
        transcript,
        [current.requested],
      ));
    }, "scope decision belongs to a different review iteration");
    reject((current, local) => {
      const transcript = approved(current, local);
      transcript[0].reason = "tampered reason";
      return reviewCarrier(current.directive, reviewResult(
        transcript,
        [current.requested],
      ));
    }, "scope decision transcript was tampered with");
    reject((current, local) => {
      const transcript = approved(current, local);
      return reviewCarrier(current.directive, reviewResult(
        transcript,
        ["packages/framework/core/tools/other.ts"],
      ));
    }, "review result names an unapproved read path");
    reject((current, local) => {
      local.deps.utc.run = () => ({ status: 0, stdout: "invalid-utc\n" });
      return reviewCarrier(current.directive, reviewResult());
    }, "UTC command returned invalid output");
    reject((current, local) => {
      local.deps.utc.run = () => ({ status: 1, stdout: "" });
      return reviewCarrier(current.directive, reviewResult());
    }, "UTC command failed");
  });

  test("rejects conflicting existing Review projections in-process", async () => {
    const runtime = await import(
      "../../packages/framework/core/tools/amadeus-reviewer-runtime.ts"
    );
    const rejectExisting = (
      mutate: (content: string) => string,
      result: Record<string, unknown>,
      expected: string,
    ): void => {
      const current = fixture();
      const local = localRuntime(current, reviewCarrier(
        current.directive,
        reviewResult(),
      ));
      runtime.runReviewerCommand(["complete-review"], local.deps);
      expect(local.output().exitCode).toBe(0);
      const path = join(current.root, current.primary);
      local.files.set(path, mutate(local.files.get(path) ?? ""));
      local.replaceInput(reviewCarrier(current.directive, result));
      runtime.runReviewerCommand(["complete-review"], local.deps);
      expect(local.output().exitCode, expected).toBe(1);
      expect(local.output().stderr, expected).toContain(expected);
    };

    rejectExisting((content) => {
      const review = content.slice(content.indexOf("## Review — Iteration 1"));
      return `${content}\n${review}`;
    }, reviewResult(), "duplicate Review projection");
    rejectExisting(
      (content) => content.replace(/^- \*\*Date:\*\* .+$/m, ""),
      reviewResult(),
      "exactly one Date field",
    );
    rejectExisting(
      (content) => content,
      { ...reviewResult(), summary: "A conflicting summary." },
      "existing Review projection conflicts",
    );
  });

  test("rejects summary, findings, order, and whitespace replay tampering", async () => {
    const runtime = await import(
      "../../packages/framework/core/tools/amadeus-reviewer-runtime.ts"
    );
    const result = (summary: string, findings: string[]) => ({
      ...reviewResult(),
      summary,
      findings,
    });
    const cases = [
      {
        name: "summary substring and findings replacement",
        initial: result("alpha beta", ["first finding"]),
        replay: result("alpha", ["different finding"]),
        mutate: (content: string) => content,
      },
      {
        name: "findings replacement",
        initial: result("alpha beta", ["first finding"]),
        replay: result("alpha beta", ["different finding"]),
        mutate: (content: string) => content,
      },
      {
        name: "findings order",
        initial: result("alpha beta", ["first finding", "second finding"]),
        replay: result("alpha beta", ["second finding", "first finding"]),
        mutate: (content: string) => content,
      },
      {
        name: "stored summary whitespace",
        initial: result("alpha beta", ["first finding"]),
        replay: result("alpha beta", ["first finding"]),
        mutate: (content: string) => content.replace(
          "\nalpha beta\n",
          "\nalpha beta  \n",
        ),
      },
    ];

    for (const replayCase of cases) {
      const current = fixture();
      const local = localRuntime(current, reviewCarrier(
        current.directive,
        replayCase.initial,
      ));
      runtime.runReviewerCommand(["complete-review"], local.deps);
      expect(local.output().exitCode, replayCase.name).toBe(0);
      expect(JSON.parse(local.output().stdout).appended, replayCase.name).toBe(true);

      const artifact = join(current.root, current.primary);
      local.files.set(
        artifact,
        replayCase.mutate(local.files.get(artifact) ?? ""),
      );
      local.replaceInput(reviewCarrier(current.directive, replayCase.replay));
      runtime.runReviewerCommand(["complete-review"], local.deps);
      expect(local.output().exitCode, replayCase.name).toBe(1);
      expect(local.output().stderr, replayCase.name).toContain(
        "existing Review projection conflicts",
      );
      expect(local.output().stdout, replayCase.name).not.toContain('"ready":true');
    }
  });

  test("rejects heading and field injection from findings before first append", async () => {
    const runtime = await import(
      "../../packages/framework/core/tools/amadeus-reviewer-runtime.ts"
    );
    const injectedFindings = [
      "first finding\n## Review — Iteration 1",
      "first finding\n- **Verdict:** NOT-READY",
    ];

    for (const finding of injectedFindings) {
      const current = fixture();
      const local = localRuntime(current, reviewCarrier(current.directive, {
        ...reviewResult(),
        findings: [finding],
      }));
      runtime.runReviewerCommand(["complete-review"], local.deps);
      expect(local.output().exitCode, finding).toBe(1);
      expect(local.output().stderr, finding).toContain(
        "review findings[0] must be a non-empty single line",
      );
      expect(local.output().stdout, finding).not.toContain('"ready":true');
      expect(
        local.files.get(join(current.root, current.primary)),
        finding,
      ).not.toContain("## Review — Iteration");
    }
  });

  test("keeps heading and field injection behind the summary single-line guard", async () => {
    const runtime = await import(
      "../../packages/framework/core/tools/amadeus-reviewer-runtime.ts"
    );
    const injectedSummaries = [
      "valid summary\n## Review — Iteration 1",
      "valid summary\n- **Verdict:** NOT-READY",
    ];

    for (const summary of injectedSummaries) {
      const current = fixture();
      const local = localRuntime(current, reviewCarrier(current.directive, {
        ...reviewResult(),
        summary,
      }));
      runtime.runReviewerCommand(["complete-review"], local.deps);
      expect(local.output().exitCode, summary).toBe(1);
      expect(local.output().stderr, summary).toContain(
        "review summary must be a non-empty single line",
      );
      expect(local.output().stdout, summary).not.toContain('"ready":true');
      expect(
        local.files.get(join(current.root, current.primary)),
        summary,
      ).not.toContain("## Review — Iteration");
    }
  });

  test("rejects ASCII control characters from findings before first append", async () => {
    const runtime = await import(
      "../../packages/framework/core/tools/amadeus-reviewer-runtime.ts"
    );
    const injectedFindings = [
      "visible\0hidden",
      "visible\thidden",
      "visible\u007fhidden",
    ];

    for (const finding of injectedFindings) {
      const current = fixture();
      const local = localRuntime(current, reviewCarrier(current.directive, {
        ...reviewResult(),
        findings: [finding],
      }));
      runtime.runReviewerCommand(["complete-review"], local.deps);
      expect(local.output().exitCode, JSON.stringify(finding)).toBe(1);
      expect(local.output().stderr, JSON.stringify(finding)).toContain(
        "review findings[0] must not contain ASCII control characters",
      );
      expect(local.output().stdout, JSON.stringify(finding)).not.toContain(
        '"ready":true',
      );
      expect(
        local.files.get(join(current.root, current.primary)),
        JSON.stringify(finding),
      ).not.toContain("## Review — Iteration");
    }
  });

  test("rejects duplicate canonical findings before first append", async () => {
    const runtime = await import(
      "../../packages/framework/core/tools/amadeus-reviewer-runtime.ts"
    );
    const current = fixture();
    const local = localRuntime(current, reviewCarrier(current.directive, {
      ...reviewResult(),
      findings: ["same finding", "same finding"],
    }));
    runtime.runReviewerCommand(["complete-review"], local.deps);

    expect(local.output().exitCode).toBe(1);
    expect(local.output().stderr).toContain(
      "review findings must not contain duplicate canonical entries",
    );
    expect(local.output().stdout).not.toContain('"ready":true');
    expect(local.files.get(join(current.root, current.primary))).not.toContain(
      "## Review — Iteration",
    );
  });

  test("scope consumes an unchanged run-stage directive through the executable caller", () => {
    const current = fixture();
    const result = run(current, "scope", current.directive);

    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.scope).toEqual({ unit: "reviewer-protocol", paths: current.expected });
    expect(output.transcript).toEqual([]);
    expect(output.invocationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  test("accepts a real engine run-stage directive through all six packaged callers", () => {
    const engineRoot = mkdtempSync(join(tmpdir(), "amadeus-t245-real-directive-"));
    temporaryDirectories.push(engineRoot);
    const emitted = spawnSync(
      process.execPath,
      [
        PACKAGED_ORCHESTRATOR,
        "next",
        "--stage",
        "code-generation",
        "--single",
        "--project-dir",
        engineRoot,
      ],
      {
        cwd: engineRoot,
        encoding: "utf8",
        env: { ...process.env, AMADEUS_DEFAULT_SCOPE: "feature" },
      },
    );
    expect(emitted.status).toBe(0);
    const directive = JSON.parse(emitted.stdout) as Record<string, unknown>;
    expect(directive.kind).toBe("run-stage");
    expect(directive.reviewer).toBe("amadeus-architecture-reviewer-agent");

    const stageFile = directive.stage_file as string;
    const produces = directive.produces as string[];
    for (const tool of PACKAGED_REVIEWER_TOOLS) {
      const root = mkdtempSync(join(tmpdir(), "amadeus-t245-packaged-caller-"));
      temporaryDirectories.push(root);
      for (const path of [stageFile, ...produces]) {
        mkdirSync(dirname(join(root, path)), { recursive: true });
        writeFileSync(join(root, path), `# ${path}\n\nIntegration ID: INT-245\n`);
      }
      const current: Fixture = {
        root,
        directive,
        expected: [stageFile, ...produces],
        primary: produces[0],
        contract: "",
        requested: "",
      };

      const scoped = run(current, "scope", directive, undefined, tool);
      expect(scoped.status, tool).toBe(0);
      const scopeOutput = JSON.parse(scoped.stdout);
      expect(scopeOutput.scope.paths, tool).toEqual(current.expected);
      const completed = run(
        current,
        "complete-review",
        reviewCarrier(
          directive,
          reviewResult([], [], 1, scopeOutput.invocationId),
          scopeOutput.invocationId,
        ),
        undefined,
        tool,
      );
      expect(completed.status, tool).toBe(0);
      expect(JSON.parse(completed.stdout).ready, tool).toBe(true);
      expect(readFileSync(join(root, current.primary), "utf8"), tool).toContain(
        "## Review — Iteration 1",
      );
    }
  });

  test("runs caller to scope to admitted read to result to durable Review and READY", () => {
    const current = fixture();
    const scoped = run(current, "scope", current.directive);
    expect(scoped.status).toBe(0);
    const scopeOutput = JSON.parse(scoped.stdout);

    const admitted = run(current, "check-read", {
      directive: current.directive,
      invocationId: scopeOutput.invocationId,
      iteration: 1,
      transcript: scopeOutput.transcript,
      request: readRequest(current),
    });
    expect(admitted.status).toBe(0);
    const transcript = JSON.parse(admitted.stdout).transcript;
    expect(transcript).toHaveLength(1);
    expect(transcript[0]).toMatchObject({
      decision: "approved",
      integrationId: "INT-245",
      path: current.requested,
    });

    const completed = run(
      current,
      "complete-review",
      reviewCarrier(
        current.directive,
        reviewResult(transcript, [current.requested], 1, scopeOutput.invocationId),
        scopeOutput.invocationId,
      ),
    );
    expect(completed.status).toBe(0);
    expect(JSON.parse(completed.stdout)).toMatchObject({
      ready: true,
      artifact: current.primary,
      appended: true,
    });

    const artifact = readFileSync(join(current.root, current.primary), "utf8");
    expect(artifact).toContain("## Review — Iteration 1");
    expect(artifact).toContain("**Verdict:** READY");
    expect(artifact).toContain(
      "**Reviewer:** amadeus-architecture-reviewer-agent",
    );
    expect(artifact).toMatch(
      /\*\*Date:\*\* \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/,
    );
    expect(artifact).toContain("**Iteration:** 1");
    expect(artifact).toContain(
      `**Scope decision:** approved — INT-245 — ${current.requested}`,
    );
  });

  test("projects a no-request decision once without growing a repeated projection", () => {
    const current = fixture();
    const input = reviewCarrier(current.directive, reviewResult());
    const first = run(current, "complete-review", input);
    const second = run(current, "complete-review", input);

    expect(first.status).toBe(0);
    expect(second.status).toBe(0);
    expect(JSON.parse(second.stdout)).toMatchObject({ ready: true, appended: false });
    const artifact = readFileSync(join(current.root, current.primary), "utf8");
    expect(artifact.match(/## Review — Iteration 1/g)).toHaveLength(1);
    expect(artifact).toContain("**Scope decision:** none");
  });

  test("rejects an existing Review block when a required field is missing", () => {
    const requiredFields = ["Verdict", "Reviewer", "Date", "Iteration", "Scope decision"];
    for (const field of requiredFields) {
      const current = fixture();
      const input = reviewCarrier(current.directive, reviewResult());
      expect(run(current, "complete-review", input).status).toBe(0);
      const path = join(current.root, current.primary);
      const malformed = readFileSync(path, "utf8")
        .split("\n")
        .filter((line) => !line.startsWith(`- **${field}:**`))
        .join("\n");
      writeFileSync(path, malformed);

      const repeated = run(current, "complete-review", input);
      expect(repeated.status, field).toBe(1);
      expect(repeated.stdout, field).not.toContain('"ready":true');
    }
  });

  test("rejects a duplicate or invalid Date in an existing Review block", () => {
    const duplicate = fixture();
    const duplicateInput = reviewCarrier(duplicate.directive, reviewResult());
    expect(run(duplicate, "complete-review", duplicateInput).status).toBe(0);
    const duplicatePath = join(duplicate.root, duplicate.primary);
    writeFileSync(
      duplicatePath,
      readFileSync(duplicatePath, "utf8").replace(
        /(- \*\*Date:\*\* [^\n]+)/,
        "$1\n$1",
      ),
    );
    expect(run(duplicate, "complete-review", duplicateInput).status).toBe(1);

    const invalid = fixture();
    const invalidInput = reviewCarrier(invalid.directive, reviewResult());
    expect(run(invalid, "complete-review", invalidInput).status).toBe(0);
    const invalidPath = join(invalid.root, invalid.primary);
    writeFileSync(
      invalidPath,
      readFileSync(invalidPath, "utf8").replace(
        /- \*\*Date:\*\* [^\n]+/,
        "- **Date:** not-a-runtime-utc",
      ),
    );
    expect(run(invalid, "complete-review", invalidInput).status).toBe(1);
  });

  test("does not borrow required fields from a later Review iteration", () => {
    const current = fixture();
    const input = reviewCarrier(current.directive, reviewResult());
    expect(run(current, "complete-review", input).status).toBe(0);
    const path = join(current.root, current.primary);
    const iterationOne = readFileSync(path, "utf8")
      .split("\n")
      .filter((line) => ![
        "- **Verdict:**",
        "- **Reviewer:**",
        "- **Date:**",
        "- **Scope decision:**",
      ].some((prefix) => line.startsWith(prefix)))
      .join("\n");
    writeFileSync(path, `${iterationOne}\n## Review — Iteration 2\n\n${[
      "- **Verdict:** READY",
      "- **Reviewer:** amadeus-architecture-reviewer-agent",
      "- **Date:** 2026-07-21T10:00:00Z",
      "- **Iteration:** 2",
      "- **Scope decision:** none",
      "",
      "The current unit satisfies the approved contract.",
      "",
    ].join("\n")}`);

    const repeated = run(current, "complete-review", input);
    expect(repeated.status).toBe(1);
    expect(repeated.stdout).not.toContain('"ready":true');
  });

  test("rejects replaying an iteration-one read decision in iteration two", () => {
    const current = fixture();
    const admitted = run(current, "check-read", {
      directive: current.directive,
      invocationId: TEST_INVOCATION_ID,
      iteration: 1,
      transcript: [],
      request: readRequest(current),
    });
    expect(admitted.status).toBe(0);
    const transcript = JSON.parse(admitted.stdout).transcript;

    const replayed = run(
      current,
      "complete-review",
      reviewCarrier(
        current.directive,
        reviewResult(transcript, [current.requested], 2),
      ),
    );
    expect(replayed.status).toBe(1);
    expect(replayed.stdout).not.toContain('"ready":true');
    expect(readFileSync(join(current.root, current.primary), "utf8")).not.toContain(
      "## Review — Iteration 2",
    );
  });

  test("rejects replaying a read decision into another invocation of the same iteration", () => {
    const current = fixture();
    const firstScope = JSON.parse(run(current, "scope", current.directive).stdout);
    const secondScope = JSON.parse(run(current, "scope", current.directive).stdout);
    expect(firstScope.invocationId).not.toBe(secondScope.invocationId);
    const admitted = run(current, "check-read", {
      directive: current.directive,
      invocationId: firstScope.invocationId,
      iteration: 1,
      transcript: firstScope.transcript,
      request: readRequest(current),
    });
    expect(admitted.status).toBe(0);
    const transcript = JSON.parse(admitted.stdout).transcript;

    const replayed = run(
      current,
      "complete-review",
      reviewCarrier(
        current.directive,
        reviewResult(transcript, [current.requested], 1, secondScope.invocationId),
        secondScope.invocationId,
      ),
    );
    expect(replayed.status).toBe(1);
    expect(replayed.stdout).not.toContain('"ready":true');
    expect(readFileSync(join(current.root, current.primary), "utf8")).not.toContain(
      "## Review — Iteration 1",
    );
  });

  test("rejects outside, repeated, or malformed read requests at the sole admission seam", () => {
    const current = fixture();
    const approved = run(current, "check-read", {
      directive: current.directive,
      invocationId: TEST_INVOCATION_ID,
      iteration: 1,
      transcript: [],
      request: readRequest(current),
    });
    expect(approved.status).toBe(0);
    const transcript = JSON.parse(approved.stdout).transcript;

    const invalidRequests = [
      {
        ...readRequest(current),
        path: "../outside-workspace.ts",
      },
      {
        ...readRequest(current),
        operation: "search",
      },
    ];
    for (const request of invalidRequests) {
      const rejected = run(current, "check-read", {
        directive: current.directive,
        invocationId: TEST_INVOCATION_ID,
        iteration: 1,
        transcript: [],
        request,
      });
      expect(rejected.status).toBe(1);
    }
    const second = run(current, "check-read", {
      directive: current.directive,
      invocationId: TEST_INVOCATION_ID,
      iteration: 1,
      transcript,
      request: readRequest(current),
    });
    expect(second.status).toBe(1);
  });

  test("requires all four spot-check conditions before the request", () => {
    const missingId = fixture();
    writeFileSync(join(missingId.root, missingId.primary), "# Code summary\n");
    rejectRead(missingId, readRequest(missingId));

    const noOwner = fixture();
    writeFileSync(join(noOwner.root, noOwner.contract), "# No owner mapping\n");
    rejectRead(noOwner, readRequest(noOwner));

    const multipleOwners = fixture();
    const secondContract =
      "amadeus/spaces/default/intents/example/inception/application-design/second-owner.md";
    mkdirSync(dirname(join(multipleOwners.root, secondContract)), { recursive: true });
    writeFileSync(
      join(multipleOwners.root, secondContract),
      `INT-245 also owns ${multipleOwners.requested}.\n`,
    );
    multipleOwners.directive.consumes = [
      ...(multipleOwners.directive.consumes as string[]),
      secondContract,
    ];
    rejectRead(multipleOwners, readRequest(multipleOwners));

    const emptyReason = fixture();
    rejectRead(emptyReason, { ...readRequest(emptyReason), reason: "" });

    const pathMismatch = fixture();
    const other = "packages/framework/core/tools/other-owned.ts";
    writeFileSync(join(pathMismatch.root, other), "export const other = true;\n");
    rejectRead(pathMismatch, { ...readRequest(pathMismatch), path: other });

    const directory = fixture();
    const directoryPath = "packages/framework/core/tools";
    writeFileSync(
      join(directory.root, directory.contract),
      `INT-245 owns ${directoryPath}.\n`,
    );
    rejectRead(directory, {
      ...readRequest(directory),
      path: directoryPath,
      ownerEvidence: {
        path: directory.contract,
        excerpt: `INT-245 owns ${directoryPath}.`,
      },
    });
  });

  test("rejects open, grep, glob, wildcard shell, browse, and search request shapes", () => {
    const operations = ["open", "grep", "glob", "shell", "browse", "search"];
    for (const operation of operations) {
      const current = fixture();
      rejectRead(current, { ...readRequest(current), operation });
    }

    const wildcard = fixture();
    rejectRead(wildcard, {
      ...readRequest(wildcard),
      path: "packages/framework/core/tools/*.ts",
    });
  });

  test("emits no READY evidence for bypass, transcript tamper, rejection, or two requests", () => {
    const cases = [
      {
        name: "bypass",
        result: reviewResult([], ["packages/framework/core/tools/bypass.ts"]),
      },
      {
        name: "tamper",
        result: reviewResult([
          {
            decision: "approved",
            invocationId: TEST_INVOCATION_ID,
            iteration: 1,
            integrationId: "INT-245",
            path: "packages/framework/core/tools/tampered.ts",
            reason: "tampered",
            ownerEvidence: { path: "tampered", excerpt: "tampered" },
            operation: "read-file",
            digest: "0".repeat(64),
          },
        ], ["packages/framework/core/tools/tampered.ts"]),
      },
      {
        name: "rejected",
        result: reviewResult([
          {
            decision: "rejected",
            invocationId: TEST_INVOCATION_ID,
            iteration: 1,
            integrationId: "INT-245",
            path: "packages/framework/core/tools/rejected.ts",
            reason: "rejected",
            ownerEvidence: { path: "rejected", excerpt: "rejected" },
            operation: "read-file",
            digest: "0".repeat(64),
          },
        ], ["packages/framework/core/tools/rejected.ts"]),
      },
      {
        name: "two requests",
        result: reviewResult([
          { decision: "approved", invocationId: TEST_INVOCATION_ID, iteration: 1 },
          { decision: "approved", invocationId: TEST_INVOCATION_ID, iteration: 1 },
        ], ["one", "two"]),
      },
    ];

    for (const item of cases) {
      const current = fixture();
      const completed = run(
        current,
        "complete-review",
        reviewCarrier(current.directive, item.result),
      );
      expect(completed.status, item.name).toBe(1);
      expect(readFileSync(join(current.root, current.primary), "utf8")).not.toContain(
        "## Review — Iteration",
      );
    }
  });

  test("emits no READY evidence when scope, persona, or runtime UTC is invalid", () => {
    const missingScope = fixture();
    rmSync(join(missingScope.root, missingScope.primary));
    expect(run(
      missingScope,
      "complete-review",
      reviewCarrier(missingScope.directive, reviewResult()),
    ).status).toBe(1);

    const wrongPersona = fixture();
    const wrongPersonaDirective = {
      ...wrongPersona.directive,
      reviewer: "amadeus-developer-agent",
    };
    expect(run(wrongPersona, "complete-review", reviewCarrier(
      wrongPersonaDirective,
      {
        ...reviewResult(),
        reviewer: "amadeus-developer-agent",
      },
    )).status).toBe(1);

    const wrongDate = fixture();
    const bin = join(wrongDate.root, "fake-bin");
    mkdirSync(bin);
    writeFileSync(join(bin, "date"), "#!/bin/sh\nprintf 'not-utc\\n'\n");
    chmodSync(join(bin, "date"), 0o755);
    const completed = run(
      wrongDate,
      "complete-review",
      reviewCarrier(wrongDate.directive, reviewResult()),
      { PATH: `${bin}:${process.env.PATH ?? ""}` },
    );
    expect(completed.status).toBe(1);
    expect(readFileSync(join(wrongDate.root, wrongDate.primary), "utf8")).not.toContain(
      "## Review — Iteration",
    );
  });

  test("requires every reviewer result field before Review or READY", () => {
    for (const field of [
      "invocationId",
      "reviewer",
      "verdict",
      "iteration",
      "summary",
      "findings",
    ] as const) {
      const current = fixture();
      const result = reviewResult() as Record<string, unknown>;
      delete result[field];
      const completed = run(
        current,
        "complete-review",
        reviewCarrier(current.directive, result),
      );
      expect(completed.status, field).toBe(1);
      expect(readFileSync(join(current.root, current.primary), "utf8")).not.toContain(
        "## Review — Iteration",
      );
    }
  });
});
