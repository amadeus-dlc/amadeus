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
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getField } from "../../packages/framework/core/tools/amadeus-lib.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const CORE_LIB = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "tools",
  "amadeus-lib.ts",
);
const CORE_UTILITY = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "tools",
  "amadeus-utility.ts",
);
const MIGRATE_SOURCE = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "tools",
  "amadeus-migrate.ts",
);
const MEMORY_TEMPLATE = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "knowledge",
  "amadeus-shared",
  "memory-template.md",
);

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

function recordConductorObservation(result: BirthResult): string {
  const template = readFileSync(MEMORY_TEMPLATE, "utf-8");
  const harness = getField(result.state, "Harness");
  if (harness === null) throw new Error("Harness is required after intent birth");
  const memory = template.replace(
    /^(## Interpretations\n(?:<!--.*-->\n)?)/m,
    `$1- Observed normalized intent-birth provenance; Harness=${harness}\n`,
  );
  if (memory === template) {
    throw new Error("Interpretations section was not found in the memory template");
  }
  const memoryPath = join(
    recordDir(result.projectDir),
    "construction",
    "code-generation",
    "memory.md",
  );
  mkdirSync(join(memoryPath, ".."), { recursive: true });
  writeFileSync(memoryPath, memory);
  return readFileSync(memoryPath, "utf-8");
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

  test("invalid raw override never leaks and records only unknown", () => {
    const raw = "invalid-raw-harness-value";
    const result = birth(DISTRIBUTIONS[0], {
      AMADEUS_HARNESS_TYPE: raw,
      CLAUDECODE: "1",
      AMADEUS_HARNESS_DIR: ".codex",
    });
    try {
      const memory = recordConductorObservation(result);
      expect(getField(result.state, "Harness")).toBe("unknown");
      for (const output of [
        result.state,
        memory,
        result.audit,
        result.stdout,
        result.stderr,
      ]) {
        expect(output).not.toContain(raw);
      }
      expect(memory).toContain("Harness=unknown");
      expect(memory.match(/^## /gm)).toHaveLength(4);
      expect(memory).not.toContain("## Harness");
    } finally {
      rmSync(result.projectDir, { recursive: true, force: true });
    }
  });

  test("Harness remains an optional V7 field for existing readers and validators", () => {
    const result = birth(DISTRIBUTIONS[1]);
    try {
      const withoutHarness = result.state.replace(
        /^- \*\*Harness\*\*: .+\n/m,
        "",
      );
      expect(getField(result.state, "Harness")).toBe("codex");
      expect(getField(withoutHarness, "Harness")).toBeNull();

      const migrationSource = readFileSync(MIGRATE_SOURCE, "utf-8");
      const fields = migrationSource.slice(
        migrationSource.indexOf("const STATE_V7_FIELDS"),
        migrationSource.indexOf("] as const;", migrationSource.indexOf("const STATE_V7_FIELDS")),
      );
      expect(fields).not.toContain('"Harness"');
    } finally {
      rmSync(result.projectDir, { recursive: true, force: true });
    }
  });

  test("detector implementation performs only fixed synchronous local checks", () => {
    expect(existsSync(CORE_LIB)).toBe(true);
    const source = readFileSync(CORE_LIB, "utf-8");
    const resolver = source.slice(
      source.indexOf("function deriveNonEnvHarnessDir"),
      source.indexOf("// The AIDLC markdown rule layers"),
    );
    expect(resolver).toContain("KNOWN_HARNESS_DIRS");
    expect(resolver).toContain("existsSync");
    expect(resolver).not.toMatch(/spawn|exec|fetch|https?:|readFile/);
  });

  test("intent birth calls the detector exactly once", () => {
    const source = readFileSync(CORE_UTILITY, "utf-8");
    const birthStateBuild = source.slice(
      source.indexOf("function handleIntentBirthStateBuild"),
      source.indexOf("// ---------------------------------------------------------------------------", source.indexOf("function handleIntentBirthStateBuild")),
    );
    expect(birthStateBuild.match(/detectHarnessType\(\)/g)).toHaveLength(1);
  });
});
