// size: medium
// covers: file:packages/framework/core/tools/amadeus-utility.ts
//
// t-kimi-doctor-arm — the doctor arm for the Kimi Code harness
// (core-harness-enums, FR-4a). Drives the exported seams
// kimiManagedBlockDoctorCheck / kimiGitResidueDoctorCheck against mkdtemp
// KimiHome fixtures (never the user's real ~/.kimi-code), pins the marker
// constants against the setup domain's detection contract (the framework-side
// copy is deliberate ADR-6 duplication — this parity test is the drift guard),
// and wires handleDoctor in-process against a tmp project carrying the real
// shipped .kimi-code tree so the roster row, the managed-block row, the
// residue advisory, the version floor, and the advisory probe all surface.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import {
  MANAGED_BLOCK_BEGIN,
  MANAGED_BLOCK_END,
} from "../../packages/setup/src/domain/kimi-hooks.ts";
import {
  classifyKimiCliVersionCheck,
  deepFreezeDoctorSnapshot,
  type DoctorContext,
  handleDoctor,
  KIMI_MANAGED_BLOCK_BEGIN,
  KIMI_MANAGED_BLOCK_END,
  kimiGitResidueDoctorCheck,
  kimiManagedBlockDoctorCheck,
  resolveDoctorContext,
} from "../../packages/framework/core/tools/amadeus-utility.ts";
import { cleanupTestProject, setupIntegrationProject } from "../harness/fixtures.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const STAGE_GRAPH = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "data", "stage-graph.json");
const RULES_DIR = join(REPO_ROOT, "packages", "framework", "core", "memory");
const KIMI_TREE = join(REPO_ROOT, "dist", "kimi", ".kimi-code");

const roots: string[] = [];
const projects: string[] = [];
const savedEnv = {
  harness: process.env.AMADEUS_HARNESS_DIR,
  kimiHome: process.env.KIMI_CODE_HOME,
  rules: process.env.AMADEUS_RULES_DIR,
  stageGraph: process.env.AMADEUS_STAGE_GRAPH,
};

function root(tag: string): string {
  const created = mkdtempSync(join(tmpdir(), `amadeus-t-kimi-doctor-${tag}-`));
  roots.push(created);
  return created;
}

// A tmp KimiHome whose config.toml carries the given text (absent when null).
function kimiHomeWith(configText: string | null): string {
  const home = root("home");
  if (configText !== null) writeFileSync(join(home, "config.toml"), configText, "utf-8");
  return home;
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

// Fixture configs hand-write the marker/signature strings literally (never via
// the implementation's own constants) so a drifted copy fails these tests.
const MARKER_BLOCK = [
  "# >>> amadeus-kimi-hooks >>>",
  '[[hooks]]',
  'event = "Stop"',
  'command = "bun .kimi-code/hooks/amadeus-kimi-adapter.ts stop"',
  "# <<< amadeus-kimi-hooks <<<",
  "",
].join("\n");

const CONTENT_ONLY_BLOCK = [
  '[[hooks]]',
  'event = "Stop"',
  'command = "bun .kimi-code/hooks/amadeus-kimi-adapter.ts stop"',
  "",
].join("\n");

const GIT_RULES_ONLY = [
  '[[permission.rules]]',
  'decision = "allow"',
  'pattern = "Bash(git worktree*)"',
  "",
].join("\n");

beforeEach(() => {
  process.env.AMADEUS_HARNESS_DIR = ".kimi-code";
  process.env.AMADEUS_STAGE_GRAPH = STAGE_GRAPH;
  process.env.AMADEUS_RULES_DIR = RULES_DIR;
  delete process.env.KIMI_CODE_HOME;
});

afterEach(() => {
  while (projects.length > 0) cleanupTestProject(projects.pop());
  while (roots.length > 0) rmSync(roots.pop() as string, { recursive: true, force: true });
  restoreEnv("AMADEUS_HARNESS_DIR", savedEnv.harness);
  restoreEnv("KIMI_CODE_HOME", savedEnv.kimiHome);
  restoreEnv("AMADEUS_RULES_DIR", savedEnv.rules);
  restoreEnv("AMADEUS_STAGE_GRAPH", savedEnv.stageGraph);
});

describe("detection-contract parity with the setup domain (ADR-6 duplication)", () => {
  test("the framework-side marker constants equal the setup domain's", () => {
    expect(KIMI_MANAGED_BLOCK_BEGIN).toBe(MANAGED_BLOCK_BEGIN);
    expect(KIMI_MANAGED_BLOCK_END).toBe(MANAGED_BLOCK_END);
  });
});

describe("kimiManagedBlockDoctorCheck", () => {
  test("config.toml absent → fail with the wiring procedure hint", () => {
    const home = kimiHomeWith(null);
    const result = kimiManagedBlockDoctorCheck(home);
    expect(result.pass).toBe(false);
    expect(result.label).toContain(`${join(home, "config.toml")} missing — hooks not wired`);
    expect(result.fix).toContain("amadeus-hooks.snippet.toml");
  });

  test("marker-fenced block present → pass", () => {
    const home = kimiHomeWith(MARKER_BLOCK);
    const result = kimiManagedBlockDoctorCheck(home);
    expect(result).toEqual({
      pass: true,
      label: `kimi managed block: present in ${join(home, "config.toml")}`,
    });
  });

  test("markers stripped but adapter content detected → advisory pass with a repair hint", () => {
    const home = kimiHomeWith(CONTENT_ONLY_BLOCK);
    const result = kimiManagedBlockDoctorCheck(home);
    expect(result.pass).toBe(true);
    expect(result.label).toContain("present by content");
    expect(result.label).toContain("re-wraps");
  });

  test("two marker pairs → loud fail, never a silent pick", () => {
    const home = kimiHomeWith(`${MARKER_BLOCK}\n${MARKER_BLOCK}`);
    const result = kimiManagedBlockDoctorCheck(home);
    expect(result.pass).toBe(false);
    expect(result.label).toContain("more than one amadeus managed-block marker pair");
  });

  test("an unpaired begin marker → loud fail", () => {
    const home = kimiHomeWith("# >>> amadeus-kimi-hooks >>>\n[[hooks]]\n");
    const result = kimiManagedBlockDoctorCheck(home);
    expect(result.pass).toBe(false);
    expect(result.label).toContain("unpaired");
  });

  test("reversed markers → loud fail", () => {
    const home = kimiHomeWith("# <<< amadeus-kimi-hooks <<<\n# >>> amadeus-kimi-hooks >>>\n");
    const result = kimiManagedBlockDoctorCheck(home);
    expect(result.pass).toBe(false);
    expect(result.label).toContain("reversed");
  });

  test("the adapter hook in two [[hooks]] tables (markers gone) → loud fail", () => {
    const home = kimiHomeWith(`${CONTENT_ONLY_BLOCK}\n${CONTENT_ONLY_BLOCK}`);
    const result = kimiManagedBlockDoctorCheck(home);
    expect(result.pass).toBe(false);
    expect(result.label).toContain("more than one [[hooks]] table");
  });

  test("a fenced marker block PLUS an outside adapter table (mixed anomaly) → loud fail", () => {
    // Symmetry with the setup domain's detectManagedBlock: a markerless copy of
    // the managed adapter hook alongside the fenced block is a duplicate, never
    // a silent pass on begin/end order alone.
    const home = kimiHomeWith(`${MARKER_BLOCK}\n${CONTENT_ONLY_BLOCK}`);
    const result = kimiManagedBlockDoctorCheck(home);
    expect(result.pass).toBe(false);
    expect(result.label).toContain("both inside the marker block and in a separate [[hooks]] table");
  });

  test("a config with no managed block → fail with the wiring procedure hint", () => {
    const home = kimiHomeWith('[projects."/tmp/x"]\ntrust_level = "trusted"\n');
    const result = kimiManagedBlockDoctorCheck(home);
    expect(result.pass).toBe(false);
    expect(result.label).toContain("not found");
    expect(result.fix).toContain("amadeus-hooks.snippet.toml");
  });

  test("a user's own adapter-free [[hooks]] table never counts as the block", () => {
    const home = kimiHomeWith('[[hooks]]\nevent = "Stop"\ncommand = "bun ./my-own-hook.ts"\n');
    const result = kimiManagedBlockDoctorCheck(home);
    expect(result.pass).toBe(false);
    expect(result.label).toContain("not found");
  });
});

describe("kimiGitResidueDoctorCheck (advisory)", () => {
  test("config.toml absent → quiet pass", () => {
    expect(kimiGitResidueDoctorCheck(kimiHomeWith(null))).toEqual({
      pass: true,
      label: "kimi git pre-allows: no residue (advisory)",
    });
  });

  test("managed block present (git rules belong to it) → quiet pass", () => {
    const home = kimiHomeWith(`${MARKER_BLOCK}`);
    expect(kimiGitResidueDoctorCheck(home)).toEqual({
      pass: true,
      label: "kimi git pre-allows: no residue (advisory)",
    });
  });

  test("content-detected block with adjacent git rules → quiet pass", () => {
    const home = kimiHomeWith(`${CONTENT_ONLY_BLOCK}\n${GIT_RULES_ONLY}`);
    expect(kimiGitResidueDoctorCheck(home)).toEqual({
      pass: true,
      label: "kimi git pre-allows: no residue (advisory)",
    });
  });

  test("managed-style git rules with NO block detected → advisory residue warning", () => {
    const home = kimiHomeWith(GIT_RULES_ONLY);
    const result = kimiGitResidueDoctorCheck(home);
    expect(result.pass).toBe(true);
    expect(result.label).toContain("1 managed-style git rule(s)");
    expect(result.label).toContain("possible residue");
    expect(result.label).toContain("advisory");
  });

  test("unrelated permission rules only → quiet pass", () => {
    const home = kimiHomeWith(
      '[[permission.rules]]\ndecision = "allow"\npattern = "Bash(npm test)"\n',
    );
    expect(kimiGitResidueDoctorCheck(home)).toEqual({
      pass: true,
      label: "kimi git pre-allows: no residue (advisory)",
    });
  });
});

describe("classifyKimiCliVersionCheck (pure version-floor seam)", () => {
  test("binary not on PATH → fail labelled 'not installed', not a parse/version fault", () => {
    const result = classifyKimiCliVersionCheck(undefined, "");
    expect(result.pass).toBe(false);
    expect(result.label).toBe("kimi CLI not installed (not on PATH)");
    expect(result.label).not.toContain("on PATH (");
    expect(result.fix).toContain("install Kimi Code CLI");
  });

  test("on PATH but --version output not parseable → fail distinguishes the parse fault", () => {
    const result = classifyKimiCliVersionCheck("/usr/local/bin/kimi", "kimi — unknown build");
    expect(result.pass).toBe(false);
    expect(result.label).toContain("kimi CLI on PATH (/usr/local/bin/kimi)");
    expect(result.label).toContain("not parseable");
    expect(result.fix).not.toContain("install Kimi Code CLI");
  });

  test("version below the 0.28.1 floor → fail", () => {
    const result = classifyKimiCliVersionCheck("/usr/local/bin/kimi", "kimi 0.27.9");
    expect(result.pass).toBe(false);
    expect(result.label).toContain("0.28.1");
    expect(result.fix).toContain("upgrade");
  });

  test("version at or above the floor → pass", () => {
    expect(classifyKimiCliVersionCheck("/usr/local/bin/kimi", "kimi version 0.28.1").pass).toBe(true);
    expect(classifyKimiCliVersionCheck("/usr/local/bin/kimi", "0.29.0").pass).toBe(true);
    expect(classifyKimiCliVersionCheck("/usr/local/bin/kimi", "1.0.0").pass).toBe(true);
  });
});

describe("resolveDoctorContext — KimiHome resolution matches the installer", () => {
  test("KIMI_CODE_HOME unset, HOME unset → absolute homedir()/.kimi-code, never a relative path", () => {
    const projectDir = setupIntegrationProject({ withState: "state-mid-ideation.md" });
    projects.push(projectDir);
    delete process.env.KIMI_CODE_HOME;
    const savedHome = process.env.HOME;
    // With HOME unset the old `process.env.HOME ?? ""` rule produced the RELATIVE
    // ".kimi-code" (join("", ".kimi-code")); homedir() falls back to the OS
    // passwd home, so doctor now resolves the same absolute dir the installer's
    // resolveKimiHome uses.
    delete process.env.HOME;
    try {
      const context = resolveDoctorContext(projectDir);
      expect(context.kimiHomeDir).toBe(join(homedir(), ".kimi-code"));
      expect(context.kimiHomeDir).not.toBe(".kimi-code");
    } finally {
      restoreEnv("HOME", savedHome);
    }
  });

  test("KIMI_CODE_HOME set → wins over homedir()", () => {
    const projectDir = setupIntegrationProject({ withState: "state-mid-ideation.md" });
    projects.push(projectDir);
    const explicit = root("explicit-kimi-home");
    process.env.KIMI_CODE_HOME = explicit;
    const context = resolveDoctorContext(projectDir);
    expect(context.kimiHomeDir).toBe(explicit);
  });
});

describe("handleDoctor — kimi arm wiring (real shipped .kimi-code tree)", () => {
  test("the arm rows surface: roster adapter, managed block, residue, version floor, probe", () => {
    const projectDir = setupIntegrationProject({ withState: "state-mid-ideation.md" });
    projects.push(projectDir);
    cpSync(KIMI_TREE, join(projectDir, ".kimi-code"), { recursive: true });
    const kimiHome = kimiHomeWith(MARKER_BLOCK);
    process.env.KIMI_CODE_HOME = kimiHome;
    const context = deepFreezeDoctorSnapshot(resolveDoctorContext(projectDir)) as DoctorContext;
    const result = handleDoctor(context);

    expect(context.harnessDir).toBe(".kimi-code");
    expect(context.kimiHomeDir).toBe(kimiHome);
    expect(result.output).toContain("amadeus-kimi-adapter.ts present");
    expect(result.output).toContain(`kimi managed block: present in ${join(kimiHome, "config.toml")}`);
    expect(result.output).toContain("kimi git pre-allows: no residue (advisory)");
    expect(result.output).toMatch(
      /kimi CLI (version \d+\.\d+\.\d+ >= 0\.28\.1|not installed \(not on PATH\)|on PATH \()/,
    );
    expect(result.output).toContain("kimi hook probe: adapter fired (advisory)");
  });

  test("a missing managed block fails the arm loud while the probe stays advisory", () => {
    const projectDir = setupIntegrationProject({ withState: "state-mid-ideation.md" });
    projects.push(projectDir);
    cpSync(KIMI_TREE, join(projectDir, ".kimi-code"), { recursive: true });
    const kimiHome = kimiHomeWith(null);
    process.env.KIMI_CODE_HOME = kimiHome;
    const result = handleDoctor(
      deepFreezeDoctorSnapshot(resolveDoctorContext(projectDir)) as DoctorContext,
    );

    expect(result.output).toContain(`kimi managed block: ${join(kimiHome, "config.toml")} missing — hooks not wired`);
    expect(result.output).toContain("kimi hook probe: adapter fired (advisory)");
    expect(result.exitCode).toBe(1);
  });
});
