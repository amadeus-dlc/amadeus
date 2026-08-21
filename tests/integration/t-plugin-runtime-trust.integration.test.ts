// covers: function:_trustedPluginStageFileForTests, function:handleSingleReport
// size: medium
//
// Two engine seams a composed plugin reaches, and the refusals that fence them.
//
// 1. RUNTIME TRUST. Before the engine will name a plugin's stage file in a
//    directive, it re-derives the composition record's own index digest, checks
//    the trust grant names the plugin, refuses a path that escapes the plugin's
//    stages dir, refuses a symlinked file OR ancestor, re-stats the file through
//    the descriptor it actually opened, and compares the bytes it read against
//    the recorded digest. Each of those is a way a host tree could be swapped
//    under the engine between compose and run, so each gets a case.
//
// 2. THE `--single` WRITE HALF. `report --single --stage <slug>` commits a lone
//    STAGE_STARTED / STAGE_COMPLETED pair under a synthetic workflow id and
//    NEVER touches the main workflow's Current Stage. Driven IN-PROCESS through
//    the exported handleReport, because that pointer invariant is the thing to
//    pin and bun does not instrument spawned children.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  truncateSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  _trustedPluginStageFileForTests,
  handleReport,
} from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import { __resetGraphCache } from "../../packages/framework/core/tools/amadeus-graph.ts";
import { _resetStageGraphForTests, auditFilePath } from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  mutateCompositionRecord,
  recordPathOf,
  stageMd,
  writePluginStage,
} from "../harness/plugin-composition-fixture.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  resetAidlcEnv,
  seedStateFile,
  seededStateFile,
} from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";

const PLUGIN = "trusted-plugin";
const SLUG = "zz-trusted-plugin-stage";
const STAGE_FILE = `${SLUG}.md`;
const STAGE_LANDING = join("plugins", PLUGIN, "stages", STAGE_FILE);

// The canonical core tree ships no compiled stage-graph.json; the shipped
// surface does, so the single-report cases read the graph from there.
const STOCK_GRAPH = join(import.meta.dir, "..", "..", "dist", "claude", ".claude", "tools", "data", "stage-graph.json");

const scratch: string[] = [];
const projects: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

function setEnv(key: string, value: string | undefined): void {
  if (!(key in savedEnv)) savedEnv[key] = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function freshDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  scratch.push(dir);
  return dir;
}

/** A host with one genuinely trusted plugin stage composed into it. */
function trustedHost(prefix: string): string {
  const host = freshDir(prefix);
  writePluginStage(host, PLUGIN, STAGE_FILE, stageMd(SLUG));
  setEnv("AMADEUS_PLUGINS_HOST_ROOT", host);
  return host;
}

beforeEach(() => {
  resetAidlcEnv();
  __resetGraphCache();
  _resetStageGraphForTests();
});

afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  for (const key of Object.keys(savedEnv)) delete savedEnv[key];
  __resetGraphCache();
  _resetStageGraphForTests();
  resetAidlcEnv();
  resetOtelPerProject();
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true });
  for (const project of projects.splice(0)) cleanupTestProject(project);
});

describe("runtime trust resolves a composed plugin stage", () => {
  test("a trusted stage resolves to its file; an unknown slug resolves to null", () => {
    const host = trustedHost("trust-ok-");
    expect(_trustedPluginStageFileForTests(SLUG)).toBe(join(realpathSync(host), STAGE_LANDING));
    expect(_trustedPluginStageFileForTests("no-such-plugin-stage")).toBeNull();
  });

  test("a host with no composition record resolves to null, not an error", () => {
    setEnv("AMADEUS_PLUGINS_HOST_ROOT", freshDir("trust-uncomposed-"));
    expect(_trustedPluginStageFileForTests(SLUG)).toBeNull();
  });
});

describe("runtime trust refuses a host it cannot vouch for", () => {
  test("a trust grant naming another plugin is refused", () => {
    const host = trustedHost("trust-grant-");
    mutateCompositionRecord(host, (record) => {
      (record.trustGrant as { plugin: string }).plugin = "wrong-plugin";
    });
    expect(() => _trustedPluginStageFileForTests(SLUG)).toThrow("trust index is invalid");
  });

  test("an index path that climbs out of the plugin's stages dir is refused", () => {
    const host = trustedHost("trust-traversal-");
    mutateCompositionRecord(host, (record) => {
      (record.stageIndex as Array<{ path: string }>)[0].path =
        `plugins/${PLUGIN}/stages/../${STAGE_FILE}`;
    }, { refreshIndexDigest: true });
    expect(() => _trustedPluginStageFileForTests(SLUG)).toThrow("trust index is invalid");
  });

  // The index digest is re-derived, so editing an entry without recomputing it
  // is refused even when every field would otherwise pass.
  test("an index digest that no longer matches its entries is refused", () => {
    const host = trustedHost("trust-digest-");
    mutateCompositionRecord(host, (record) => {
      (record.stageIndex as Array<{ contentDigest: string }>)[0].contentDigest = `sha256:${"1".repeat(64)}`;
    });
    expect(() => _trustedPluginStageFileForTests(SLUG)).toThrow("trust index is invalid");
  });

  test("a symlinked stage file is refused rather than followed", () => {
    const host = trustedHost("trust-symlink-file-");
    const stagePath = join(host, STAGE_LANDING);
    const external = join(freshDir("trust-external-"), STAGE_FILE);
    writeFileSync(external, readFileSync(stagePath));
    rmSync(stagePath);
    symlinkSync(external, stagePath);
    expect(() => _trustedPluginStageFileForTests(SLUG)).toThrow("is a symlink");
  });

  test("a symlinked ancestor directory is refused", () => {
    const host = trustedHost("trust-symlink-ancestor-");
    const pluginDir = join(host, "plugins", PLUGIN);
    const realDir = join(host, `${PLUGIN}-real`);
    renameSync(pluginDir, realDir);
    symlinkSync(realDir, pluginDir);
    expect(() => _trustedPluginStageFileForTests(SLUG)).toThrow("symlinked ancestor");
  });

  test("a stage past the 64 MiB trust boundary is refused", () => {
    const host = trustedHost("trust-oversized-");
    truncateSync(join(host, STAGE_LANDING), 64 * 1024 * 1024 + 1);
    expect(() => _trustedPluginStageFileForTests(SLUG)).toThrow("exceeds the 64 MiB trust boundary");
  });

  // The bytes on disk are hashed and compared, so a stage edited after compose
  // is refused even though the record still describes the right path.
  test("stage content edited after compose is refused as drift", () => {
    const host = trustedHost("trust-drift-");
    const stagePath = join(host, STAGE_LANDING);
    writeFileSync(stagePath, `${readFileSync(stagePath, "utf-8")}\nedited after compose\n`);
    expect(() => _trustedPluginStageFileForTests(SLUG)).toThrow("content digest drifted");
  });

  test("an unreadable composition record surfaces rather than resolving", () => {
    const host = trustedHost("trust-unreadable-");
    writeFileSync(recordPathOf(host), "{not json");
    expect(() => _trustedPluginStageFileForTests(SLUG)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// `report --single`: the write half of the stage-runner contract.
// ---------------------------------------------------------------------------
describe("report --single commits a synthetic pair and never the main pointer", () => {
  let logs: string[] = [];
  const realLog = console.log;

  function capture<T>(fn: () => T): { result: T; directives: Array<Record<string, unknown>> } {
    logs = [];
    console.log = (...parts: unknown[]) => { logs.push(parts.join(" ")); };
    try {
      const result = fn();
      return {
        result,
        directives: logs
          .join("\n")
          .split("\n")
          .filter((line) => line.trim().startsWith("{"))
          .map((line) => JSON.parse(line) as Record<string, unknown>),
      };
    } finally {
      console.log = realLog;
    }
  }

  function project(): string {
    const dir = createTestProject();
    projects.push(dir);
    seedStateFile(dir, join(FIXTURES_DIR, "state-mid-inception.md"));
    setEnv("AMADEUS_STAGE_GRAPH", STOCK_GRAPH);
    __resetGraphCache();
    _resetStageGraphForTests();
    return dir;
  }

  function report(args: string[], projectDir: string): Array<Record<string, unknown>> {
    return capture(() => handleReport(args, projectDir)).directives;
  }

  test("with no --result it names the accepted outcomes", () => {
    const directives = report(["--single", "--stage", "feasibility"], project());
    expect(directives.at(-1)?.kind).toBe("error");
    expect(String(directives.at(-1)?.message)).toContain("requires --result");
  });

  test("an outcome outside the forward set is refused", () => {
    const directives = report(
      ["--single", "--stage", "feasibility", "--result", "rejected"],
      project(),
    );
    expect(directives.at(-1)?.kind).toBe("error");
    expect(String(directives.at(-1)?.message)).toContain("commits forward outcomes only");
  });

  // The explicit half of the pointer rule: a --single report with no --stage is
  // an attempt to advance the MAIN workflow, so it is refused rather than
  // falling through to the stage the pointer happens to name.
  test("with no --stage it refuses to advance the main workflow", () => {
    const directives = report(["--single", "--result", "completed"], project());
    expect(directives.at(-1)?.kind).toBe("error");
    expect(String(directives.at(-1)?.message)).toContain("must not advance the main workflow");
  });

  test("an unknown stage is refused", () => {
    const directives = report(
      ["--single", "--stage", "no-such-stage", "--result", "completed"],
      project(),
    );
    expect(directives.at(-1)?.kind).toBe("error");
    expect(String(directives.at(-1)?.message)).toContain("Unknown stage");
  });

  test("an initialization stage is refused", () => {
    const directives = report(
      ["--single", "--stage", "state-init", "--result", "completed"],
      project(),
    );
    expect(directives.at(-1)?.kind).toBe("error");
  });

  test("a forward outcome commits the synthetic pair and leaves the pointer alone", () => {
    const projectDir = project();
    const statePath = seededStateFile(projectDir);
    const stateBefore = readFileSync(statePath, "utf-8");

    const directives = report(
      ["--single", "--stage", "feasibility", "--result", "completed"],
      projectDir,
    );
    expect(directives.at(-1)?.kind).toBe("done");
    expect(String(directives.at(-1)?.reason)).toContain("single-stage:feasibility");

    // Exactly one STAGE_STARTED / STAGE_COMPLETED pair, both tagged with the
    // synthetic workflow id — audit only.
    const audit = readFileSync(auditFilePath(projectDir), "utf-8");
    expect(audit.split("STAGE_STARTED").length - 1).toBe(1);
    expect(audit.split("STAGE_COMPLETED").length - 1).toBe(1);
    expect(audit).toContain("single-stage:feasibility");

    // The pointer invariant: the main state file is byte-identical.
    expect(readFileSync(statePath, "utf-8")).toBe(stateBefore);
  });

  test("a refused report commits nothing to the audit trail", () => {
    const projectDir = project();
    report(["--single", "--stage", "no-such-stage", "--result", "completed"], projectDir);
    let audit = "";
    try {
      audit = readFileSync(auditFilePath(projectDir), "utf-8");
    } catch {
      audit = "";
    }
    expect(audit).not.toContain("single-stage:");
  });
});
