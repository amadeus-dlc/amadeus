// t270-harness-provenance-birth: real intent birth across all packaged harnesses.
// covers: workflow:intent-birth, field:Harness, function:detectHarnessType

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getField } from "../../packages/framework/core/tools/amadeus-lib.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");

const DISTRIBUTIONS = [
  ["claude", ".claude", "claude-code", ".codex"],
  ["codex", ".codex", "codex", ".claude"],
  ["cursor", ".cursor", "cursor", ".claude"],
  ["opencode", ".opencode", "opencode", ".claude"],
  ["kiro", ".kiro", "kiro", ".claude"],
  ["kiro-ide", ".kiro", "kiro", ".claude"],
] as const;

interface BirthResult {
  readonly projectDir: string;
  readonly state: string;
  readonly audit: string;
  readonly stdout: string;
  readonly stderr: string;
}

function recordDir(projectDir: string): string {
  const intents = join(
    projectDir,
    "amadeus",
    "spaces",
    "default",
    "intents",
  );
  const active = readFileSync(join(intents, "active-intent"), "utf-8").trim();
  return join(intents, active);
}

function birth(
  distribution: (typeof DISTRIBUTIONS)[number],
  env: Record<string, string | undefined> = {},
): BirthResult {
  const [name, harnessDir, , conflictingDir] = distribution;
  const projectDir = realpathSync(mkdtempSync(join(tmpdir(), `t270-${name}-`)));
  mkdirSync(join(projectDir, conflictingDir));
  const utility = join(
    REPO_ROOT,
    "dist",
    name,
    harnessDir,
    "tools",
    "amadeus-utility.ts",
  );
  const result = spawnSync(
    process.execPath,
    [
      utility,
      "intent-birth",
      "--scope",
      "poc",
      "--arguments",
      `t270 ${name}`,
      "--project-dir",
      projectDir,
    ],
    {
      cwd: projectDir,
      encoding: "utf-8",
      env: {
        ...process.env,
        AMADEUS_HARNESS_TYPE: undefined,
        CLAUDECODE: undefined,
        AMADEUS_HARNESS_DIR: undefined,
        AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1",
        ...env,
      } as NodeJS.ProcessEnv,
    },
  );
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
  const record = recordDir(projectDir);
  const auditDir = join(record, "audit");
  const audit = readdirSync(auditDir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => readFileSync(join(auditDir, file), "utf-8"))
    .join("\n");
  return {
    projectDir,
    state: readFileSync(join(record, "amadeus-state.md"), "utf-8"),
    audit,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

describe("t270 harness provenance intent birth", () => {
  test("all six distributions prefer script path over a conflicting CWD", () => {
    for (const distribution of DISTRIBUTIONS) {
      const result = birth(distribution);
      try {
        expect(getField(result.state, "Harness")).toBe(distribution[2]);
        expect(result.state.match(/^- \*\*Harness\*\*:/gm)).toHaveLength(1);
      } finally {
        rmSync(result.projectDir, { recursive: true, force: true });
      }
    }
  });

  test("a real birth records Harness directly after Active Agent", () => {
    const result = birth(DISTRIBUTIONS[1]);
    try {
      expect(result.state).toMatch(
        /^- \*\*Active Agent\*\*: .+\n- \*\*Harness\*\*: codex$/m,
      );
      expect(getField(result.state, "Harness")).toBe("codex");
    } finally {
      rmSync(result.projectDir, { recursive: true, force: true });
    }
  });

  test("invalid raw override never leaks and birth adds no synthetic diary", () => {
    const raw = "invalid-raw-harness-value";
    const result = birth(DISTRIBUTIONS[0], {
      AMADEUS_HARNESS_TYPE: raw,
      CLAUDECODE: "1",
      AMADEUS_HARNESS_DIR: ".codex",
    });
    try {
      expect(getField(result.state, "Harness")).toBe("unknown");
      for (const output of [
        result.state,
        result.audit,
        result.stdout,
        result.stderr,
      ]) {
        expect(output).not.toContain(raw);
      }
      expect(
        existsSync(
          join(
            recordDir(result.projectDir),
            "construction",
            "code-generation",
            "memory.md",
          ),
        ),
      ).toBe(false);
    } finally {
      rmSync(result.projectDir, { recursive: true, force: true });
    }
  });
});
