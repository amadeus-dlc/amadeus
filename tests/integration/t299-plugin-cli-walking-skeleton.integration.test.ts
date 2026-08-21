// covers: file:packages/framework/core/tools/amadeus-plugin.ts, hook:amadeus-plugin-compose
// size: medium
//
// U2 walking-skeleton-claude — the CLI's end-to-end vertical slice driven
// IN-PROCESS through handlePluginCli(argv, deps) with an injected dependency bag
// (recompile stubbed, engine real). Touches a real temp filesystem, hence
// integration tier (fs-tests-integration-first). Proves: fail-closed parse
// rejects before any mutation (BR-U2-4), compose lands + is reflected in the
// compiled graph's plugin-stage discovery (FR-4), the no-op fast path never
// reaches applyPluginPlan (BR-U2-3 / performance-design), compose is idempotent
// (BR-U2-2), drop restores the baseline (BR-U2-8), and a verify failure leaves
// host + record byte-invariant (BR-U2-5). The real subprocess start (BR-U2-6) is
// in t299b below.

import { scaleTestTime } from "../lib/test-time-factor.ts";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { discoverPluginStageFiles } from "../../packages/framework/core/tools/amadeus-graph.ts";
import {
  applyPluginDrop,
  applyPluginPlan,
  clearPluginDrops,
  createNodeBackend,
  createNodeLock,
  diagnosePlugins,
  discoverPlugins,
  dropsRecordPath,
  inspectPlugin,
  planPluginDrop,
  readDropsRecord,
  recordPluginDrops,
  type WorkspaceBackend,
  type WorkspaceTransaction,
} from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";
import {
  buildHostSnapshot,
  copyPluginSource,
  handlePluginCli,
  type PluginCliDeps,
  stagingEntryState,
  listHarnessTrees,
  listPluginSourceDirs,
} from "../../packages/framework/core/tools/amadeus-plugin.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORE_ROOT = join(REPO_ROOT, "packages", "framework", "core");
const FIXTURE = join(REPO_ROOT, "tests", "fixtures", "conformance-fixture-plugin", "conformance-fixture");
const PLUGIN = "conformance-fixture";
const OWNED_STAGE = `plugins/${PLUGIN}/stages/${PLUGIN}.md`;

let host = "";
let applyCount = 0;
let recompileCount = 0;
const out: string[] = [];
const err: string[] = [];

// Real engine + real buildHostSnapshot; applyPluginPlan wrapped to count calls
// (the no-op fast-path assertion) and recompile stubbed (no runtime graph in a
// synthetic host). verifyOk toggles the atomic-rollback test.
function deps(verifyOk = true): PluginCliDeps {
  return {
    discoverPlugins: (root) => discoverPlugins(root),
    inspectPlugin,
    applyPluginPlan: (plan, tx) => {
      applyCount += 1;
      return applyPluginPlan(plan, tx);
    },
    planPluginDrop,
    applyPluginDrop,
    diagnosePlugins,
    buildHostSnapshot,
    makeBackend: (root) => createNodeBackend(root),
    makeTx: (root, backend): WorkspaceTransaction => ({
      backend,
      verify: () => (verifyOk ? { ok: true } : { ok: false, reason: "synthetic verify failure" }),
      lock: createNodeLock(root),
      newTxnId: () => `t299-${Date.now()}-${Math.random()}`,
    }),
    recompile: () => {
      recompileCount += 1;
      return true;
    },
    // #1598: the CLI regenerates stage-runners after the recompile. Stubbed
    // here (no skills tree in a synthetic host); t352 drives the real wiring.
    generateRunners: () => true,
    recordDrops: recordPluginDrops,
    clearDrops: clearPluginDrops,
    stagingEntryState,
    listHarnessTrees,
    listPluginSourceDirs,
    copyPluginSource: (src, dst) => copyPluginSource(src, dst),
    out: (l) => out.push(l),
    err: (l) => err.push(l),
  };
}

// Hash the file bytes under `root`, excluding the engine dot-state and the
// install staging dir — i.e. the composed host surface FR-6 restores.
function hashSurface(root: string): string {
  const h = createHash("sha256");
  const walk = (dir: string): void => {
    for (const name of [...readdirSync(dir)].sort()) {
      if (dir === root && name.startsWith(".amadeus-plugin")) continue;
      const abs = join(dir, name);
      if (statSync(abs).isDirectory()) walk(abs);
      else {
        h.update(abs.slice(root.length));
        h.update(readFileSync(abs));
      }
    }
  };
  walk(root);
  return h.digest("hex");
}

function installFixtureHarness(root: string): void {
  for (const name of readdirSync(CORE_ROOT)) {
    cpSync(join(CORE_ROOT, name), join(root, name), { recursive: true });
  }
}

beforeEach(() => {
  host = mkdtempSync(join(tmpdir(), "amadeus-t299-"));
  // "Install" the plugin into the staging area (the CLI discovers from there and
  // composes owned stages into <host>/plugins/).
  cpSync(FIXTURE, join(host, ".amadeus-plugin-src", PLUGIN), { recursive: true });
  applyCount = 0;
  recompileCount = 0;
  out.length = 0;
  err.length = 0;
});

afterEach(() => {
  rmSync(host, { recursive: true, force: true });
});

describe("t299 plugin CLI walking skeleton (U2)", () => {
  test("fail-closed parse rejects before any mutation (BR-U2-4)", () => {
    for (const argv of [["compose", "--help"], ["drop", "a", "b"], ["frobnicate"], []]) {
      const code = handlePluginCli(argv, deps());
      expect(code).toBe(2);
    }
    expect(applyCount).toBe(0);
    expect(existsSync(join(host, ".amadeus-plugin-composition.json"))).toBe(false);
    expect(err.some((l) => l.includes("usage:"))).toBe(true);
  });

  test("compose lands and is reflected in the compiled graph (FR-4)", () => {
    const code = handlePluginCli(["compose", "--project-root", host], deps());
    expect(code).toBe(0);
    expect(recompileCount).toBe(1);
    expect(applyCount).toBe(1);
    // Owned stage materialised + composition record written.
    expect(existsSync(join(host, OWNED_STAGE))).toBe(true);
    const backend: WorkspaceBackend = createNodeBackend(host);
    expect(backend.readComposition().plugins.has(PLUGIN)).toBe(true);
    // The compiled-graph discovery wiring finds the composed plugin stage.
    const discovered = discoverPluginStageFiles(host).map((s) => s.slug);
    expect(discovered).toContain(PLUGIN);
    expect(out.some((l) => l.includes("composed 1"))).toBe(true);
  });

  test("no-op fast path never reaches applyPluginPlan (BR-U2-3)", () => {
    handlePluginCli(["compose", "--project-root", host], deps()); // applyCount=1
    const before = applyCount;
    const beforeHash = hashSurface(host);
    handlePluginCli(["compose", "--if-stale", "--project-root", host], deps());
    // The fast path must not apply or recompile.
    expect(applyCount).toBe(before);
    expect(recompileCount).toBe(1);
    expect(hashSurface(host)).toBe(beforeHash);
    expect(out.some((l) => l.includes("no-op"))).toBe(true);
  });

  test("compose is idempotent — second run is byte-identical (BR-U2-2)", () => {
    handlePluginCli(["compose", "--project-root", host], deps());
    const afterFirst = hashSurface(host);
    const code = handlePluginCli(["compose", "--project-root", host], deps());
    expect(code).toBe(0);
    expect(hashSurface(host)).toBe(afterFirst);
  });

  test("drop restores the 0-plugin baseline (BR-U2-8)", () => {
    const baseline = hashSurface(host); // no composed surface yet
    handlePluginCli(["compose", "--project-root", host], deps());
    expect(existsSync(join(host, OWNED_STAGE))).toBe(true);
    const code = handlePluginCli(["drop", PLUGIN, "--project-root", host], deps());
    expect(code).toBe(0);
    expect(existsSync(join(host, OWNED_STAGE))).toBe(false);
    expect(createNodeBackend(host).readComposition().plugins.size).toBe(0);
    expect(hashSurface(host)).toBe(baseline);
    expect(out.some((l) => l.includes("baseline restored"))).toBe(true);
  });

  test("verify failure leaves host + record byte-invariant (BR-U2-5)", () => {
    const before = hashSurface(host);
    const code = handlePluginCli(["compose", "--project-root", host], deps(false));
    expect(code).toBe(1);
    expect(existsSync(join(host, OWNED_STAGE))).toBe(false);
    expect(createNodeBackend(host).readComposition().plugins.size).toBe(0);
    expect(hashSurface(host)).toBe(before);
    expect(err.some((l) => l.includes("apply failed"))).toBe(true);
  });

  test("status + doctor project the composed set", () => {
    handlePluginCli(["compose", "--project-root", host], deps());
    out.length = 0;
    expect(handlePluginCli(["status", "--project-root", host], deps())).toBe(0);
    expect(out.some((l) => l.includes("1 installed, 1 composed"))).toBe(true);
    out.length = 0;
    expect(handlePluginCli(["doctor", "--project-root", host], deps())).toBe(0);
    // Canonical renderer wording (shared with the integrated doctor, #1585).
    expect(out.some((l) => l.includes(`Plugin ${PLUGIN}: composed@`) && l.includes("[ok]"))).toBe(true);
  });

  // BR-U2-6: the auto-compose path is verified by REALLY starting the CLI as the
  // SessionStart hook would (a spawned subprocess), not by checking a settings
  // wiring exists (verification theatre). We assert the real subprocess reached
  // and ran the engine — it wrote the composition record. (The post-apply
  // fixture-local core copy keeps recompile and runner generation inside the
  // disposable host while preserving the real process boundary.
  test("SessionStart command really starts and reaches compose (BR-U2-6, not verification theatre)", () => {
    installFixtureHarness(host);
    const cli = join(REPO_ROOT, "packages", "framework", "core", "tools", "amadeus-plugin.ts");
    const res = spawnSync("bun", [cli, "compose", "--if-stale", "--project-root", host], {
      encoding: "utf-8",
      timeout: scaleTestTime(60_000),
      env: process.env,
    });
    // The real subprocess ran the engine: the composition record now records the plugin.
    const record = createNodeBackend(host).readComposition();
    expect(record.plugins.has(PLUGIN)).toBe(true);
    expect(existsSync(join(host, OWNED_STAGE))).toBe(true);
    expect(existsSync(join(host, "tools", "data", "stage-graph.json"))).toBe(true);
    expect(existsSync(join(host, "skills", `amadeus-${PLUGIN}`, "SKILL.md"))).toBe(true);
    expect(res.status).toBe(0);
  });

  // BR-U2-11: the compose apply path writes a DropsRecord skeleton (empty for the
  // claude face — the engine has no drop-with-log path yet), plugin-separated.
  test("compose writes an empty DropsRecord entry per plugin, plugin-separated (BR-U2-11)", () => {
    // Pre-seed another plugin's drops to prove separation (compose must not erase it).
    recordPluginDrops(host, "other-plugin", [{ surface: "SKILL.md", severity: "advisory", reason: "seed" }]);
    handlePluginCli(["compose", "--project-root", host], deps());
    const drops = readDropsRecord(host);
    // This plugin's entry exists and is empty (skeleton).
    expect(drops.plugins.has(PLUGIN)).toBe(true);
    expect(drops.plugins.get(PLUGIN)).toEqual([]);
    // The other plugin's seeded drops are untouched (plugin-separated).
    expect(drops.plugins.get("other-plugin")).toEqual([{ surface: "SKILL.md", severity: "advisory", reason: "seed" }]);
  });

  test("DropsRecord is byte-identical across an idempotent re-compose (BR-U2-11)", () => {
    handlePluginCli(["compose", "--project-root", host], deps());
    const first = readFileSync(dropsRecordPath(host));
    handlePluginCli(["compose", "--project-root", host], deps());
    expect(readFileSync(dropsRecordPath(host)).equals(first)).toBe(true);
  });

  test("drop removes the plugin's DropsRecord entry (symmetric with compose)", () => {
    handlePluginCli(["compose", "--project-root", host], deps());
    expect(readDropsRecord(host).plugins.has(PLUGIN)).toBe(true);
    handlePluginCli(["drop", PLUGIN, "--project-root", host], deps());
    expect(readDropsRecord(host).plugins.has(PLUGIN)).toBe(false);
  });

  // BR-U2-6: the SessionStart HOOK FILE itself (not just the CLI) really starts.
  // Spawns packages/framework/core/hooks/amadeus-plugin-compose.ts as a subprocess
  // and drives its project dir via CLAUDE_PROJECT_DIR (resolveProjectDirFromHook
  // rung 2). Two branches: clean success (no-op) and failure/continue.
  const HOOK = join(REPO_ROOT, "packages", "framework", "core", "hooks", "amadeus-plugin-compose.ts");

  test("hook success path: runs compose --if-stale and exits 0 with no warning (BR-U2-6a)", () => {
    const clean = mkdtempSync(join(tmpdir(), "amadeus-t299-hook-ok-"));
    try {
      const res = spawnSync("bun", [HOOK], {
        encoding: "utf-8",
        input: "{}",
        timeout: scaleTestTime(60_000),
        env: { ...process.env, CLAUDE_PROJECT_DIR: clean },
      });
      // No plugins staged → compose --if-stale is a no-op → the hook exits 0.
      expect(res.status).toBe(0);
      expect(res.stderr ?? "").not.toContain("auto-compose");
    } finally {
      rmSync(clean, { recursive: true, force: true });
    }
  });

  test("hook failure path: compose fails → one stderr warning + exit 0 (BR-U2-6b, fail-loud/continue)", () => {
    // A plugin whose seam targets a stage absent from the host: inspect rejects
    // it (unknown-seam), so compose fails deterministically (before any recompile).
    const bad = mkdtempSync(join(tmpdir(), "amadeus-t299-hook-fail-"));
    try {
      const dir = join(bad, ".amadeus-plugin-src", "bad-seam");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, "plugin.json"),
        JSON.stringify({ name: "bad-seam", stages: [], seams: [{ stage: "no-such-stage", seam: "produces", entries: ["x"] }], fragments: [] }),
      );
      const res = spawnSync("bun", [HOOK], {
        encoding: "utf-8",
        input: "{}",
        timeout: scaleTestTime(60_000),
        env: { ...process.env, CLAUDE_PROJECT_DIR: bad },
      });
      // The session is NOT blocked (exit 0) and the failure is loud on stderr.
      expect(res.status).toBe(0);
      const warnings = (res.stderr ?? "").split("\n").filter((line) => line.includes("auto-compose"));
      expect(warnings).toEqual([
        `amadeus-plugin: auto-compose failed for ${bad} (non-blocking); run \`amadeus-plugin.ts compose --project-root ${bad}\` to retry`,
      ]);
    } finally {
      rmSync(bad, { recursive: true, force: true });
    }
  });
});
