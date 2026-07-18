import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as nodeFs from "node:fs";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { handleDoctor } from "../../packages/framework/core/tools/amadeus-utility.ts";
import { inspectCodexHooks } from "../../packages/framework/harness/codex/tools/amadeus-codex-hooks-contract.ts";
import {
  activateCodexHooks,
  codexHooksDoctorCheck,
  main as codexHooksMain,
} from "../../packages/framework/harness/codex/tools/amadeus-codex-hooks.ts";

const ROOT = resolve(import.meta.dir, "../..");
const RUN_CODEX = join(ROOT, "scripts", "run-codex.sh");
const AMADEUS_UTILITY = join(
  ROOT,
  "packages/framework/core/tools/amadeus-utility.ts",
);
const SOURCE_HOOKS_TOOLS = join(
  ROOT,
  "packages/framework/harness/codex/tools",
);
const HOOKS_HELPER_FILES = [
  "amadeus-codex-hooks.ts",
  "amadeus-codex-hooks-contract.ts",
  "amadeus-codex-hooks-migration.ts",
];
const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function run(cwd: string, cmd: string[]) {
  return Bun.spawnSync({ cmd, cwd, stderr: "pipe", stdout: "pipe" });
}

function git(cwd: string, ...args: string[]): string {
  const result = run(cwd, ["git", ...args]);
  expect(result.exitCode, result.stderr.toString()).toBe(0);
  return result.stdout.toString().trim();
}

function sourceTracksActive(): boolean {
  return run(ROOT, ["git", "ls-files", "--error-unmatch", ".codex/hooks.json"]).exitCode === 0;
}

function copyHooksHelper(projectDir: string): void {
  const toolsDir = join(projectDir, ".codex", "tools");
  mkdirSync(toolsDir, { recursive: true });
  for (const file of HOOKS_HELPER_FILES) {
    copyFileSync(join(SOURCE_HOOKS_TOOLS, file), join(toolsDir, file));
  }
}

function amadeusCommandCount(value: unknown): number {
  if (Array.isArray(value)) return value.reduce((count, item) => count + amadeusCommandCount(item), 0);
  if (value === null || typeof value !== "object") return 0;
  const record = value as Record<string, unknown>;
  const own =
    typeof record.command === "string" &&
    record.command.includes(".codex/hooks/amadeus-codex-adapter.ts")
      ? 1
      : 0;
  return (
    own +
    Object.values(record).reduce<number>(
      (count, item) => count + amadeusCommandCount(item),
      0,
    )
  );
}

function applyAgmsgWriter(projectDir: string): void {
  const active = join(projectDir, ".codex", "hooks.json");
  const parsed = JSON.parse(readFileSync(active, "utf8")) as {
    hooks: Record<string, Array<{ hooks?: Array<{ command?: string; type?: string }> }>>;
  };
  for (const event of ["SessionStart", "SessionEnd", "Stop"]) {
    parsed.hooks[event] = (parsed.hooks[event] ?? []).filter(
      (group) => !group.hooks?.some((hook) => hook.command?.includes("/.agents/skills/agmsg/")),
    );
  }
  parsed.hooks.SessionStart.push({
    hooks: [
      {
        type: "command",
        command: `bash ${join(projectDir, ".agents", "skills", "agmsg", "scripts", "drivers", "types", "codex", "codex-monitor.sh")}`,
      },
    ],
  });
  parsed.hooks.SessionEnd.push({
    hooks: [
      {
        type: "command",
        command: `bash ${join(projectDir, ".agents", "skills", "agmsg", "scripts", "drivers", "types", "codex", "codex-session-end.sh")}`,
      },
    ],
  });
  writeFileSync(active, JSON.stringify(parsed));
}

function agmsgGroupCount(
  hooks: Record<string, Array<{ hooks?: Array<{ command?: string }> }>>,
  event: string,
): number {
  return (hooks[event] ?? []).filter((group) =>
    group.hooks?.some((hook) => hook.command?.includes("/.agents/skills/agmsg/")),
  ).length;
}

function freshSelfCheckout(): string {
  const projectDir = mkdtempSync(join(tmpdir(), "amadeus-codex-hooks-"));
  tempDirs.push(projectDir);
  copyHooksHelper(projectDir);
  copyFileSync(join(ROOT, ".codex", "hooks.json.example"), join(projectDir, ".codex", "hooks.json.example"));
  copyFileSync(join(ROOT, ".gitignore"), join(projectDir, ".gitignore"));
  if (sourceTracksActive()) {
    copyFileSync(join(ROOT, ".codex", "hooks.json"), join(projectDir, ".codex", "hooks.json"));
  }
  git(projectDir, "init", "-q", "-b", "main");
  git(projectDir, "config", "user.email", "codex-hooks@example.com");
  git(projectDir, "config", "user.name", "Codex Hooks Test");
  git(projectDir, "add", ".");
  git(projectDir, "commit", "-qm", "fixture");
  return projectDir;
}

function activateFixture(projectDir: string): void {
  activateCodexHooks(projectDir);
}

function runHooksMain(argv: string[]) {
  const originalStdout = process.stdout.write;
  const originalStderr = process.stderr.write;
  let stdout = "";
  let stderr = "";
  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    stdout += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string | Uint8Array): boolean => {
    stderr += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
    return true;
  }) as typeof process.stderr.write;
  try {
    return { exitCode: codexHooksMain(argv), stdout, stderr };
  } finally {
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
  }
}

class ExitSignal extends Error {}

function runUtilityDoctorInProcess(projectDir: string): string {
  const originalStdout = process.stdout.write;
  const originalExit = process.exit;
  const originalHarnessDir = process.env.AMADEUS_HARNESS_DIR;
  const originalStageGraph = process.env.AMADEUS_STAGE_GRAPH;
  let stdout = "";
  process.env.AMADEUS_HARNESS_DIR = ".codex";
  process.env.AMADEUS_STAGE_GRAPH = join(
    ROOT,
    "dist",
    "codex",
    ".codex",
    "tools",
    "data",
    "stage-graph.json",
  );
  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    stdout += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
    return true;
  }) as typeof process.stdout.write;
  process.exit = (() => {
    throw new ExitSignal();
  }) as typeof process.exit;
  try {
    try {
      handleDoctor(projectDir);
    } catch (error) {
      if (!(error instanceof ExitSignal)) throw error;
    }
    return stdout;
  } finally {
    process.stdout.write = originalStdout;
    process.exit = originalExit;
    if (originalHarnessDir === undefined) delete process.env.AMADEUS_HARNESS_DIR;
    else process.env.AMADEUS_HARNESS_DIR = originalHarnessDir;
    if (originalStageGraph === undefined) delete process.env.AMADEUS_STAGE_GRAPH;
    else process.env.AMADEUS_STAGE_GRAPH = originalStageGraph;
  }
}

describe("Codex hooks ownership", () => {
  test("a fresh self checkout stays clean after activation and repeated agmsg writer application", () => {
    const projectDir = freshSelfCheckout();
    const canonicalPath = join(projectDir, ".codex", "hooks.json.example");
    const activePath = join(projectDir, ".codex", "hooks.json");
    const canonicalBefore = readFileSync(canonicalPath);

    if (!existsSync(activePath)) activateFixture(projectDir);

    const withStaleStop = JSON.parse(readFileSync(activePath, "utf8")) as {
      hooks: Record<string, Array<{ hooks: Array<{ command: string; type: string }> }>>;
    };
    withStaleStop.hooks.Stop.push({
      hooks: [
        {
          type: "command",
          command: `bash ${join(projectDir, ".agents", "skills", "agmsg", "scripts", "drivers", "types", "codex", "obsolete-stop.sh")}`,
        },
      ],
    });
    writeFileSync(activePath, JSON.stringify(withStaleStop));

    applyAgmsgWriter(projectDir);
    applyAgmsgWriter(projectDir);

    expect(git(projectDir, "status", "--short")).toBe("");
    expect(sourceTracksActive()).toBe(false);
    expect(git(ROOT, "ls-files", "--error-unmatch", ".codex/hooks.json.example")).toBe(
      ".codex/hooks.json.example",
    );
    expect(git(projectDir, "check-ignore", ".codex/hooks.json")).toBe(".codex/hooks.json");
    expect(readFileSync(canonicalPath)).toEqual(canonicalBefore);
    const active = JSON.parse(readFileSync(activePath, "utf8")) as {
      hooks: Record<string, Array<{ hooks?: Array<{ command?: string }> }>>;
    };
    expect(amadeusCommandCount(active)).toBe(9);
    expect(agmsgGroupCount(active.hooks, "SessionStart")).toBe(1);
    expect(agmsgGroupCount(active.hooks, "SessionEnd")).toBe(1);
    expect(agmsgGroupCount(active.hooks, "Stop")).toBe(0);

    for (const tracked of git(projectDir, "ls-files").split("\n").filter(Boolean)) {
      expect(readFileSync(join(projectDir, tracked), "utf8")).not.toContain(projectDir);
    }
  });

  test("run-codex activates hooks before the Codex shim starts", () => {
    const projectDir = mkdtempSync(join(tmpdir(), "amadeus-run-codex-"));
    const home = mkdtempSync(join(tmpdir(), "amadeus-run-codex-home-"));
    tempDirs.push(projectDir, home);
    copyHooksHelper(projectDir);
    copyFileSync(
      join(ROOT, ".codex", "hooks.json.example"),
      join(projectDir, ".codex", "hooks.json.example"),
    );
    const binDir = join(home, ".agents", "bin");
    const shimDir = join(home, ".agents", "skills", "agmsg", "scripts", "drivers", "types", "codex");
    mkdirSync(binDir, { recursive: true });
    mkdirSync(shimDir, { recursive: true });
    const mise = join(binDir, "mise");
    writeFileSync(
      mise,
      '#!/usr/bin/env bash\nset -eu\n[ "$1" = "exec" ]\nshift\n[ "$1" = "--" ]\nshift\nexec "$@"\n',
    );
    chmodSync(mise, 0o755);
    const shim = join(shimDir, "codex-shim.sh");
    writeFileSync(
      shim,
      '#!/usr/bin/env bash\nset -eu\ntest -f "$PWD/.codex/hooks.json" || { echo "active hooks missing before shim" >&2; exit 42; }\nprintf "shim-started\\n"\n',
    );
    chmodSync(shim, 0o755);

    const launched = Bun.spawnSync({
      cmd: ["bash", RUN_CODEX],
      cwd: projectDir,
      env: { ...process.env, HOME: home },
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(launched.exitCode, launched.stderr.toString()).toBe(0);
    expect(launched.stdout.toString()).toContain("shim-started");
    expect(readFileSync(join(projectDir, ".codex", "hooks.json"))).toEqual(
      readFileSync(join(projectDir, ".codex", "hooks.json.example")),
    );
  });

  test("activation preserves a valid active file and rejects a stale one without overwriting", () => {
    const projectDir = freshSelfCheckout();
    const activePath = join(projectDir, ".codex", "hooks.json");
    activateFixture(projectDir);
    applyAgmsgWriter(projectDir);
    const validBytes = readFileSync(activePath);

    activateFixture(projectDir);
    expect(readFileSync(activePath)).toEqual(validBytes);

    const stale = JSON.parse(readFileSync(activePath, "utf8")) as {
      hooks: Record<string, unknown>;
    };
    delete stale.hooks.UserPromptSubmit;
    writeFileSync(activePath, JSON.stringify(stale));
    const staleBytes = readFileSync(activePath);
    let errorMessage = "";
    try {
      activateCodexHooks(projectDir);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }

    expect(errorMessage).toContain("adapter tuples differ");
    expect(errorMessage).not.toContain(projectDir);
    expect(readFileSync(activePath)).toEqual(staleBytes);
  });

  test("the in-process helper CLI routes activation, doctor, and usage failures", () => {
    const projectDir = freshSelfCheckout();

    const activated = runHooksMain(["activate", "--project-dir", projectDir]);
    expect(activated.exitCode, activated.stderr).toBe(0);
    expect(activated.stdout).toContain("Codex hooks active: created");

    const doctor = runHooksMain(["doctor", "--json", "--project-dir", projectDir]);
    expect(doctor.exitCode, doctor.stderr).toBe(0);
    expect(JSON.parse(doctor.stdout)).toMatchObject({ pass: true, reason: "OK" });

    const unknown = runHooksMain([]);
    expect(unknown.exitCode).toBe(1);
    expect(unknown.stderr).toContain("Usage:");

    const unknownOption = runHooksMain(["doctor", "--unknown"]);
    expect(unknownOption.exitCode).toBe(1);
    expect(unknownOption.stderr).toContain("Usage:");

    const invalidActivation = runHooksMain([
      "activate",
      "--json",
      "--project-dir",
      projectDir,
    ]);
    expect(invalidActivation.exitCode).toBe(1);
    expect(invalidActivation.stderr).toContain("ERROR: Usage:");

    const invalidDoctor = runHooksMain([
      "doctor",
      "--target-ref",
      "main",
      "--project-dir",
      projectDir,
    ]);
    expect(invalidDoctor.exitCode).toBe(1);
    expect(invalidDoctor.stderr).toContain("ERROR: Usage:");
  });

  test("activation reports a local active-file creation failure", () => {
    const projectDir = freshSelfCheckout();
    const activePath = join(projectDir, ".codex", "hooks.json");
    const originalCopyFileSync = nodeFs.copyFileSync;
    const copySpy = spyOn(nodeFs, "copyFileSync").mockImplementation(
      (source, destination, mode) => {
        if (String(destination) === activePath) {
          const error = new Error("injected active creation failure") as NodeJS.ErrnoException;
          error.code = "EACCES";
          throw error;
        }
        originalCopyFileSync(source, destination, mode);
      },
    );
    try {
      expect(() => activateCodexHooks(projectDir)).toThrow(
        "unable to create the local active file",
      );
    } finally {
      copySpy.mockRestore();
    }
  });

  test("doctor accepts minified active hooks with non-Amadeus additions", () => {
    const projectDir = freshSelfCheckout();
    activateFixture(projectDir);
    applyAgmsgWriter(projectDir);

    const check = codexHooksDoctorCheck(projectDir);

    expect(check.pass).toBe(true);
    expect(check.label).toContain("matches canonical");
    expect(check.label).not.toContain(projectDir);
    expect(check.label).not.toContain("agmsg-monitor-stub.ts");
  });

  test("doctor reports a missing canonical adapter tuple", () => {
    const projectDir = freshSelfCheckout();
    activateFixture(projectDir);
    const activePath = join(projectDir, ".codex", "hooks.json");
    const active = JSON.parse(readFileSync(activePath, "utf8")) as {
      hooks: Record<string, unknown>;
    };
    delete active.hooks.UserPromptSubmit;
    writeFileSync(activePath, JSON.stringify(active));

    const check = codexHooksDoctorCheck(projectDir);

    expect(check.pass).toBe(false);
    expect(check.label).toContain("missing=[");
    expect(check.label).toContain("event=UserPromptSubmit");
    expect(check.label).toContain("extra=[]");
    expect(check.fix).toContain("manually merge");
  });

  test("doctor reports a misplaced matcher as missing and extra tuples", () => {
    const projectDir = freshSelfCheckout();
    activateFixture(projectDir);
    const activePath = join(projectDir, ".codex", "hooks.json");
    const active = JSON.parse(readFileSync(activePath, "utf8")) as {
      hooks: { PostToolUse: Array<{ matcher?: string }> };
    };
    const group = active.hooks.PostToolUse.find((candidate) => candidate.matcher === "apply_patch");
    expect(group).toBeDefined();
    group!.matcher = "wrong-matcher";
    writeFileSync(activePath, JSON.stringify(active));

    const check = codexHooksDoctorCheck(projectDir);

    expect(check.pass).toBe(false);
    expect(check.label).toContain("missing=[");
    expect(check.label).toContain("matcher=apply_patch");
    expect(check.label).toContain("extra=[");
    expect(check.label).toContain("matcher=<redacted>");
    expect(check.label).not.toContain("wrong-matcher");
  });

  test("doctor reports a duplicate adapter tuple as extra", () => {
    const projectDir = freshSelfCheckout();
    activateFixture(projectDir);
    const activePath = join(projectDir, ".codex", "hooks.json");
    const active = JSON.parse(readFileSync(activePath, "utf8")) as {
      hooks: { SessionStart: unknown[] };
    };
    active.hooks.SessionStart.push(structuredClone(active.hooks.SessionStart[0]));
    writeFileSync(activePath, JSON.stringify(active));

    const check = codexHooksDoctorCheck(projectDir);

    expect(check.pass).toBe(false);
    expect(check.label).toContain("missing=[]");
    expect(check.label).toContain("extra=[");
    expect(check.label).toContain("event=SessionStart");
  });

  test("doctor redacts absolute prefixes and every command suffix token from missing and extra tuples", () => {
    const projectDir = freshSelfCheckout();
    activateFixture(projectDir);
    const activePath = join(projectDir, ".codex", "hooks.json");
    const active = JSON.parse(readFileSync(activePath, "utf8")) as {
      hooks: { Stop: Array<{ hooks: Array<{ command: string }> }> };
    };
    active.hooks.Stop[0].hooks[0].command =
      "bun /Users/private-clone/.codex/hooks/amadeus-codex-adapter.ts ULTRA_SECRET --token SECOND_SECRET";
    writeFileSync(activePath, JSON.stringify(active));

    const check = codexHooksDoctorCheck(projectDir);

    expect(check.pass).toBe(false);
    expect(check.label).toContain("missing=[");
    expect(check.label).toContain("extra=[");
    expect(
      check.label.match(/command=\.codex\/hooks\/amadeus-codex-adapter\.ts}/g),
    ).toHaveLength(2);
    expect(check.label).not.toContain("/Users/private-clone");
    expect(check.label).not.toContain("ULTRA_SECRET");
    expect(check.label).not.toContain("SECOND_SECRET");
    expect(check.label).not.toContain("--token");
  });

  test("doctor redacts unknown event and matcher tokens from extra tuples", () => {
    const projectDir = freshSelfCheckout();
    activateFixture(projectDir);
    const activePath = join(projectDir, ".codex", "hooks.json");
    const active = JSON.parse(readFileSync(activePath, "utf8")) as {
      hooks: Record<
        string,
        Array<{ matcher?: string; hooks: Array<{ type: string }> }>
      >;
    };
    const stopGroup = active.hooks.Stop[0];
    delete active.hooks.Stop;
    stopGroup.matcher = "SECOND_SECRET";
    stopGroup.hooks[0].type = "THIRD_SECRET";
    active.hooks.ULTRA_SECRET = [stopGroup];
    writeFileSync(activePath, JSON.stringify(active));

    const check = codexHooksDoctorCheck(projectDir);

    expect(check.reason).toBe("TUPLE_MISMATCH");
    expect(check.label).toContain("event=<redacted>");
    expect(check.label).toContain("matcher=<redacted>");
    expect(check.label).toContain("type=<redacted>");
    expect(check.label).not.toContain("ULTRA_SECRET");
    expect(check.label).not.toContain("SECOND_SECRET");
    expect(check.label).not.toContain("THIRD_SECRET");
  });

  test("doctor distinguishes missing and invalid canonical and active files", () => {
    const canonicalMissing = freshSelfCheckout();
    rmSync(join(canonicalMissing, ".codex", "hooks.json.example"));
    expect(codexHooksDoctorCheck(canonicalMissing).reason).toBe("CANONICAL_MISSING");
    expect(() => activateCodexHooks(canonicalMissing)).toThrow("canonical example is missing");

    const canonicalInvalid = freshSelfCheckout();
    writeFileSync(join(canonicalInvalid, ".codex", "hooks.json.example"), "{not-json");
    expect(codexHooksDoctorCheck(canonicalInvalid).reason).toBe("CANONICAL_JSON_INVALID");
    expect(() => activateCodexHooks(canonicalInvalid)).toThrow(
      "canonical example contains invalid JSON",
    );

    const activeMissing = freshSelfCheckout();
    expect(codexHooksDoctorCheck(activeMissing).reason).toBe("ACTIVE_MISSING");

    const activeInvalid = freshSelfCheckout();
    activateFixture(activeInvalid);
    writeFileSync(join(activeInvalid, ".codex", "hooks.json"), "{SUPER_SECRET");
    const invalidCheck = codexHooksDoctorCheck(activeInvalid);
    expect(invalidCheck.reason).toBe("ACTIVE_JSON_INVALID");
    expect(invalidCheck.label).not.toContain("SUPER_SECRET");

    const canonicalStructure = freshSelfCheckout();
    writeFileSync(join(canonicalStructure, ".codex", "hooks.json.example"), '{"hooks":[]}');
    expect(codexHooksDoctorCheck(canonicalStructure).reason).toBe(
      "CANONICAL_STRUCTURE_INVALID",
    );
    expect(() => activateCodexHooks(canonicalStructure)).toThrow(
      "canonical example has an invalid hook contract",
    );

    const canonicalWithoutTuples = freshSelfCheckout();
    writeFileSync(
      join(canonicalWithoutTuples, ".codex", "hooks.json.example"),
      '{"hooks":{"Stop":[{"hooks":[{"type":"command","command":"echo unrelated"}]}]}}',
    );
    expect(codexHooksDoctorCheck(canonicalWithoutTuples).reason).toBe(
      "CANONICAL_TUPLES_MISSING",
    );

    const activeStructure = freshSelfCheckout();
    activateFixture(activeStructure);
    writeFileSync(
      join(activeStructure, ".codex", "hooks.json"),
      '{"hooks":{"Stop":[{"matcher":42,"hooks":[{"type":"command","command":"bun .codex/hooks/amadeus-codex-adapter.ts stop"}]}]}}',
    );
    expect(codexHooksDoctorCheck(activeStructure).reason).toBe("ACTIVE_STRUCTURE_INVALID");
  });

  test("hook inspection rejects malformed group, event, and adapter hook shapes", () => {
    expect(inspectCodexHooks('{"hooks":{"Stop":[{}]}}').kind).toBe(
      "structure-invalid",
    );
    expect(inspectCodexHooks('{"hooks":{"Stop":{}}}').kind).toBe(
      "structure-invalid",
    );
    expect(
      inspectCodexHooks(
        '{"hooks":{"Stop":[{"hooks":[{"command":"bun .codex/hooks/amadeus-codex-adapter.ts stop"}]}]}}',
      ).kind,
    ).toBe("structure-invalid");
  });

  test("amadeus utility doctor reports a missing Codex CLI without throwing", () => {
    const projectDir = freshSelfCheckout();
    activateFixture(projectDir);
    const originalWhich = Bun.which.bind(Bun);
    const whichSpy = spyOn(Bun, "which").mockImplementation((command) =>
      command === "codex" ? null : originalWhich(command),
    );
    try {
      expect(runUtilityDoctorInProcess(projectDir)).toContain("codex CLI on PATH");
    } finally {
      whichSpy.mockRestore();
    }
  });

  test("amadeus utility doctor reports the semantic Codex hooks contract", () => {
    const projectDir = freshSelfCheckout();
    activateFixture(projectDir);

    const output = runUtilityDoctorInProcess(projectDir);
    const cli = Bun.spawnSync({
      cmd: ["bun", AMADEUS_UTILITY, "doctor", "--project-dir", projectDir],
      cwd: projectDir,
      env: {
        ...process.env,
        AMADEUS_HARNESS_DIR: ".codex",
        AMADEUS_STAGE_GRAPH: join(
          ROOT,
          "dist",
          "codex",
          ".codex",
          "tools",
          "data",
          "stage-graph.json",
        ),
      },
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(output).toContain(
      "Codex hooks contract: local active matches canonical",
    );
    expect(output).not.toContain("hooks.json present (hook wiring)");
    expect(cli.stdout.toString(), cli.stderr.toString()).toContain(
      "Codex hooks contract: local active matches canonical",
    );
  });

  test("amadeus utility doctor fails closed for missing and malformed local helpers", () => {
    const missing = freshSelfCheckout();
    rmSync(join(missing, ".codex", "tools", "amadeus-codex-hooks.ts"));
    expect(runUtilityDoctorInProcess(missing)).toContain(
      "Codex hooks contract: project-local helper is missing",
    );

    const invalidJson = freshSelfCheckout();
    writeFileSync(
      join(invalidJson, ".codex", "tools", "amadeus-codex-hooks.ts"),
      'process.stdout.write("not-json\\n");\n',
    );
    expect(runUtilityDoctorInProcess(invalidJson)).toContain(
      "Codex hooks contract: project-local doctor returned invalid JSON",
    );

    const invalidShape = freshSelfCheckout();
    writeFileSync(
      join(invalidShape, ".codex", "tools", "amadeus-codex-hooks.ts"),
      'process.stdout.write("[]\\n");\n',
    );
    expect(runUtilityDoctorInProcess(invalidShape)).toContain(
      "Codex hooks contract: project-local doctor returned an invalid schema",
    );
  });

  test("project-local doctor uses a fixed JSON schema and utility rejects extra fields", () => {
    const projectDir = freshSelfCheckout();
    activateFixture(projectDir);
    const helper = join(projectDir, ".codex", "tools", "amadeus-codex-hooks.ts");
    const direct = run(projectDir, [
      "bun",
      helper,
      "doctor",
      "--json",
      "--project-dir",
      projectDir,
    ]);
    expect(direct.exitCode, direct.stderr.toString()).toBe(0);
    expect(Object.keys(JSON.parse(direct.stdout.toString())).sort()).toEqual([
      "command",
      "label",
      "pass",
      "reason",
      "schemaVersion",
    ]);

    const missingActive = freshSelfCheckout();
    const failedDirect = run(missingActive, [
      "bun",
      join(missingActive, ".codex", "tools", "amadeus-codex-hooks.ts"),
      "doctor",
      "--json",
      "--project-dir",
      missingActive,
    ]);
    expect(failedDirect.exitCode).toBe(1);
    const failedPayload = JSON.parse(failedDirect.stdout.toString()) as {
      pass: boolean;
      reason: string;
    };
    expect(failedPayload).toMatchObject({ pass: false, reason: "ACTIVE_MISSING" });
    expect(Object.keys(failedPayload).sort()).toEqual([
      "command",
      "fix",
      "label",
      "pass",
      "reason",
      "schemaVersion",
    ]);

    writeFileSync(
      helper,
      'process.stdout.write(JSON.stringify({schemaVersion:1,command:"doctor",pass:true,reason:"OK",label:"forged",extra:"SUPER_SECRET"}));\n',
    );
    const utilityOutput = runUtilityDoctorInProcess(projectDir);
    expect(utilityOutput).toContain(
      "Codex hooks contract: project-local doctor returned an invalid schema",
    );
    expect(utilityOutput).not.toContain("SUPER_SECRET");
  });
});
