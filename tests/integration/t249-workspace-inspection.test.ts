// covers: subcommand:amadeus-utility:detect subcommand:amadeus-utility:intent-birth subcommand:amadeus-utility:doctor
// size: medium
//
// t249-workspace-inspection.test.ts (integration) — REAL-FS twin of the U06
// pure-function unit test. It drives the production handlers IN-PROCESS against
// temp workspaces so the node ReadOnlyFs adapter (nodeReadOnlyFs / toFsObservation
// Error / statToEntryKind) and the birth/detect/doctor projections are measured
// (the spawn boundary is a coverage blind spot — these handlers are driven as
// exported production entries instead). A shipped-CLI subprocess case pins the
// byte-identical default output (NFR-3).
//
// Uses node:fs (real temp dirs) — hence the integration tier.

import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  cleanupTestProject,
  createTestProject,
  REPO_ROOT,
} from "../harness/fixtures.ts";
import { activeIntent, auditShards } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import {
  detectWorkspace,
  handleDetect,
  handleDoctor,
  handleIntentBirth,
} from "../../dist/claude/.claude/tools/amadeus-utility.ts";

const UTIL = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "amadeus-utility.ts");

const temps: string[] = [];
function tmp(prefix: string): string {
  const d = mkdtempSync(join(tmpdir(), `t249-${prefix}-`));
  temps.push(d);
  return d;
}
function write(root: string, rel: string, body: string): void {
  const full = join(root, rel);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, body, "utf-8");
}

afterEach(() => {
  while (temps.length) {
    try {
      rmSync(temps.pop() as string, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  }
});

/** Capture everything written to process.stdout during fn. */
function captureStdout(fn: () => void): string {
  const orig = process.stdout.write.bind(process.stdout);
  let out = "";
  process.stdout.write = (chunk: string | Uint8Array): boolean => {
    out += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8");
    return true;
  };
  try {
    fn();
  } finally {
    process.stdout.write = orig;
  }
  return out;
}

/** Run fn with process.exit stubbed to throw, returning the captured code. */
function captureExit(fn: () => void): { code: number | undefined; threw: boolean } {
  const origExit = process.exit;
  let code: number | undefined;
  let threw = false;
  process.exit = (c?: number): never => {
    code = c;
    threw = true;
    throw new Error(`__exit_${c}`);
  };
  try {
    fn();
  } catch (e) {
    if (!String((e as Error).message).startsWith("__exit_")) throw e;
  } finally {
    process.exit = origExit;
  }
  return { code, threw };
}

/** Capture stdout AND stub process.exit together — needed for handlers (doctor)
 *  that write their report and then process.exit, so the buffer survives the
 *  thrown exit. */
function captureStdoutAndExit(fn: () => void): { out: string; code: number | undefined } {
  const orig = process.stdout.write.bind(process.stdout);
  let out = "";
  process.stdout.write = (chunk: string | Uint8Array): boolean => {
    out += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8");
    return true;
  };
  let code: number | undefined;
  try {
    ({ code } = captureExit(fn));
  } finally {
    process.stdout.write = orig;
  }
  return { out, code };
}

// A depth-1 nested project detectable by a NON-language signal (package.json
// with runtime deps). The root itself carries no first-class signal, so the
// depth-1 fallback attributes it. A nested project with real SOURCE FILES is
// attributed the SAME way (see seedNestedWithSource): the root's own signal is
// first-class only (root-level files/manifests, or source in non-candidate
// dirs), so recursing into a candidate dir does NOT flip the root to Brownfield.
// BR-U06-02's "root signal => no fallback" means a FIRST-CLASS root signal, not
// a nested subtree swallowed by the deep walk (FR-3 item 11).
function seedNested(root: string): void {
  write(root, "README.md", "# empty root\n");
  write(root, "webapp/package.json", JSON.stringify({ name: "webapp", dependencies: { left: "1" } }));
}

// The FR-3 item 11 case: a SINGLE nested project whose only signal is real
// source files nested inside it (webapp/src/index.ts) and NO first-class root
// signal. The root's deep language walk sees webapp's source, but that must NOT
// classify the root Brownfield — the depth-1 fallback must fire and attribute
// nestedRoot=webapp. (Before the fix the root walk swallowed webapp's source and
// no nestedRoot was produced.)
function seedNestedWithSource(root: string): void {
  write(root, "README.md", "# empty root\n");
  write(root, "webapp/package.json", JSON.stringify({ name: "webapp", devDependencies: { typescript: "5" } }));
  write(root, "webapp/src/index.ts", "export const x = 1;\n");
  write(root, "webapp/src/util.ts", "export const y = 2;\n");
}

// A root .gitmodules with one UNINITIALIZED submodule (no path/.git present).
function seedUninitSubmodule(root: string): void {
  write(root, "README.md", "# empty root\n");
  write(root, ".gitmodules", '[submodule "libs/dep"]\n\tpath = libs/dep\n\turl = https://x/dep.git\n');
}

describe("detectWorkspace (real fs, legacy string projection)", () => {
  test("nested project => Brownfield string projection", () => {
    const root = tmp("dw-nested");
    seedNested(root);
    const scan = detectWorkspace(root);
    expect(scan.projectType).toBe("Brownfield");
    expect(scan.buildSystem).toContain("npm");
  });

  // FR-3 item 11 regression: a single nested project whose ONLY signal is real
  // source files must still classify Brownfield via the depth-1 fallback (the
  // root's deep walk must not swallow webapp's source into a root signal).
  test("nested project with real source files => Brownfield string projection", () => {
    const root = tmp("dw-nested-src");
    seedNestedWithSource(root);
    const scan = detectWorkspace(root);
    expect(scan.projectType).toBe("Brownfield");
    expect(scan.languages).toContain("TypeScript");
  });

  test("plain README => Greenfield (byte-identical legacy path)", () => {
    const root = tmp("dw-green");
    write(root, "README.md", "# hi\n");
    const scan = detectWorkspace(root);
    expect(scan.projectType).toBe("Greenfield");
    expect(scan.languages).toBe("Unknown");
    expect(scan.buildSystem).toBe("Unknown");
  });

  test("unreadable .gitmodules (a directory) => back-compat Greenfield projection", () => {
    const root = tmp("dw-badgm");
    write(root, "README.md", "# hi\n");
    mkdirSync(join(root, ".gitmodules")); // readTextFile => EISDIR (unreadable, not ENOENT)
    const scan = detectWorkspace(root);
    expect(scan.projectType).toBe("Greenfield");
  });
});

describe("handleDetect (in-process projection)", () => {
  test("nested project: --json exposes nestedRoot + nestedCandidates", () => {
    const root = tmp("det-nested");
    seedNested(root);
    const json = JSON.parse(captureStdout(() => handleDetect(root, { json: "true" })));
    expect(json.projectType).toBe("Brownfield");
    expect(json.nestedRoot).toBe("webapp");
    expect(json.nestedCandidates).toEqual(["webapp"]);
  });

  // FR-3 item 11: the nested project's signal is real source (webapp/src/*.ts),
  // NOT a manifest — the depth-1 fallback must still attribute nestedRoot=webapp.
  test("nested project with real source: --json exposes nestedRoot + TypeScript", () => {
    const root = tmp("det-nested-src");
    seedNestedWithSource(root);
    const json = JSON.parse(captureStdout(() => handleDetect(root, { json: "true" })));
    expect(json.projectType).toBe("Brownfield");
    expect(json.nestedRoot).toBe("webapp");
    expect(json.nestedCandidates).toEqual(["webapp"]);
    expect(json.languages).toContain("TypeScript");
  });

  test("nested project: human output names the nested root", () => {
    const root = tmp("det-nested-h");
    seedNested(root);
    const out = captureStdout(() => handleDetect(root, {}));
    expect(out).toContain("Nested root: webapp");
  });

  test("uninitialized submodule: --json exposes submodules + advisories", () => {
    const root = tmp("det-sub");
    seedUninitSubmodule(root);
    const json = JSON.parse(captureStdout(() => handleDetect(root, { json: "true" })));
    expect(json.projectType).toBe("Brownfield");
    expect(json.submodules).toEqual([
      { name: "libs/dep", path: "libs/dep", url: "https://x/dep.git", initialized: false },
    ]);
    expect(json.advisories.map((a: { code: string }) => a.code)).toContain("UNINITIALIZED_SUBMODULES");
  });

  test("uninitialized submodule: human output lists it", () => {
    const root = tmp("det-sub-h");
    seedUninitSubmodule(root);
    const out = captureStdout(() => handleDetect(root, {}));
    expect(out).toContain("Uninitialized submodules: libs/dep");
  });

  test("inconclusive (.gitmodules is a directory): --json classification=inconclusive", () => {
    const root = tmp("det-inc");
    write(root, "README.md", "# hi\n");
    mkdirSync(join(root, ".gitmodules"));
    const json = JSON.parse(captureStdout(() => handleDetect(root, { json: "true" })));
    expect(json.classification).toBe("inconclusive");
    expect(json.advisories.map((a: { code: string }) => a.code)).toContain("UNPARSEABLE_GITMODULES");
  });

  test("inconclusive: human output says inconclusive", () => {
    const root = tmp("det-inc-h");
    write(root, "README.md", "# hi\n");
    mkdirSync(join(root, ".gitmodules"));
    const out = captureStdout(() => handleDetect(root, {}));
    expect(out).toContain("Project type: inconclusive");
  });

  test("multiple nested projects with frameworks: aggregated, deduped, not auto-selected", () => {
    const root = tmp("det-multi");
    write(root, "README.md", "# empty root\n");
    // Two depth-1 Angular projects (same framework). angular.json is not a
    // counted source extension, so the root's own language walk stays empty
    // (root Greenfield) and the depth-1 fallback classifies both — exercising
    // the hit aggregation that collects AND dedupes the framework list.
    write(root, "app-a/angular.json", "{}\n");
    write(root, "app-b/angular.json", "{}\n");
    const json = JSON.parse(captureStdout(() => handleDetect(root, { json: "true" })));
    expect(json.projectType).toBe("Brownfield");
    expect(json.nestedRoot).toBeUndefined();
    expect(json.nestedCandidates).toEqual(["app-a", "app-b"]);
    expect(json.frameworks).toBe("Angular"); // deduped to a single entry
    expect(json.advisories.map((a: { code: string }) => a.code)).toContain("MULTIPLE_NESTED_PROJECTS");
  });

  test("default greenfield: no additive keys (byte-identical shape)", () => {
    const root = tmp("det-green");
    write(root, "README.md", "# hi\n");
    const json = JSON.parse(captureStdout(() => handleDetect(root, { json: "true" })));
    expect(json.nestedRoot).toBeUndefined();
    expect(json.submodules).toBeUndefined();
    expect(json.advisories).toBeUndefined();
    expect(Object.keys(json)).toEqual([
      "projectType",
      "languages",
      "frameworks",
      "buildSystem",
      "scopesDir",
      "scopeGridPath",
      "scopes",
    ]);
  });
});

describe("handleDoctor (in-process, submodule row)", () => {
  test("uninitialized submodule => advisory row present, does not add a failure", () => {
    const proj = createTestProject();
    try {
      seedUninitSubmodule(proj);
      const { out } = captureStdoutAndExit(() => handleDoctor(proj));
      expect(out).toContain("Submodules: 1 present, 1 uninitialized");
      // The submodule row is advisory (✓), never a ✗.
      expect(out).not.toContain("✗  Submodules");
    } finally {
      cleanupTestProject(proj);
    }
  });

  test("initialized submodule => 'all initialized' row", () => {
    const proj = createTestProject();
    try {
      write(proj, ".gitmodules", '[submodule "libs/dep"]\n\tpath = libs/dep\n');
      mkdirSync(join(proj, "libs", "dep", ".git"), { recursive: true });
      const { out } = captureStdoutAndExit(() => handleDoctor(proj));
      expect(out).toContain("Submodules: 1 present, all initialized");
    } finally {
      cleanupTestProject(proj);
    }
  });

  test("unparseable .gitmodules => loud failure row", () => {
    const proj = createTestProject();
    try {
      mkdirSync(join(proj, ".gitmodules")); // unreadable
      const { out } = captureStdoutAndExit(() => handleDoctor(proj));
      expect(out).toContain("Submodules: .gitmodules present but unparseable");
      expect(out).toContain("✗  Submodules");
    } finally {
      cleanupTestProject(proj);
    }
  });

  test("no .gitmodules => no submodule row (byte-identical)", () => {
    const proj = createTestProject();
    try {
      const { out } = captureStdoutAndExit(() => handleDoctor(proj));
      expect(out).not.toContain("Submodules:");
    } finally {
      cleanupTestProject(proj);
    }
  });
});

describe("handleIntentBirth (in-process, fail-closed + additive)", () => {
  function bornAudit(proj: string): string {
    const shards = auditShards(proj, activeIntent(proj) ?? undefined);
    return shards.map((s) => readFileSync(s, "utf-8")).join("\n");
  }

  test("nested project birth: stdout advisory + audit 'Nested Root'", () => {
    const proj = createTestProject();
    try {
      seedNested(proj);
      const out = captureStdout(() =>
        handleIntentBirth(proj, { scope: "feature", arguments: "nested work" }),
      );
      expect(out).toContain("Nested project root detected: webapp");
      expect(bornAudit(proj)).toContain("Nested Root");
    } finally {
      cleanupTestProject(proj);
    }
  });

  test("uninitialized submodule birth: stdout advisory + audit Submodules", () => {
    const proj = createTestProject();
    try {
      seedUninitSubmodule(proj);
      const out = captureStdout(() =>
        handleIntentBirth(proj, { scope: "feature", arguments: "submodule work" }),
      );
      expect(out).toContain("Uninitialized submodule(s): libs/dep");
      expect(bornAudit(proj)).toContain("Submodules");
    } finally {
      cleanupTestProject(proj);
    }
  });

  test("inconclusive birth is REFUSED before any mutation (mints no intent)", () => {
    const proj = createTestProject();
    try {
      mkdirSync(join(proj, ".gitmodules")); // unreadable => inconclusive
      const intentsRoot = join(proj, "amadeus", "spaces", "default", "intents");
      const before = readdirSync(intentsRoot).filter((d) =>
        existsSync(join(intentsRoot, d, "amadeus-state.md")),
      ).length;
      let out = "";
      const { threw, code } = captureExit(() => {
        out = captureStdout(() =>
          handleIntentBirth(proj, { scope: "feature", arguments: "should refuse" }),
        );
      });
      expect(threw).toBe(true);
      expect(code).toBe(1);
      const after = readdirSync(intentsRoot).filter((d) =>
        existsSync(join(intentsRoot, d, "amadeus-state.md")),
      ).length;
      expect(after).toBe(before); // no new intent minted
      void out;
    } finally {
      cleanupTestProject(proj);
    }
  });
});

describe("shipped CLI (subprocess) — default output parity", () => {
  test("greenfield detect --json carries no nested/submodule/advisory keys", () => {
    const root = tmp("cli-green");
    write(root, "README.md", "# hi\n");
    const r = Bun.spawnSync({
      cmd: ["bun", UTIL, "detect", "--json"],
      cwd: root,
      env: { ...process.env, CLAUDE_PROJECT_DIR: root },
    });
    expect(r.exitCode).toBe(0);
    const json = JSON.parse(r.stdout.toString("utf-8").trim());
    expect(json.nestedRoot).toBeUndefined();
    expect(json.submodules).toBeUndefined();
    expect(json.advisories).toBeUndefined();
  });
});
