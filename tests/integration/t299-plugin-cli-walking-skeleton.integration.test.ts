// covers: file:packages/framework/core/tools/amadeus-plugin.ts
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

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { discoverPluginStageFiles } from "../../packages/framework/core/tools/amadeus-graph.ts";
import {
  applyPluginDrop,
  applyPluginPlan,
  createNodeBackend,
  createNodeLock,
  diagnosePlugins,
  discoverPlugins,
  inspectPlugin,
  planPluginDrop,
  type WorkspaceBackend,
  type WorkspaceTransaction,
} from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";
import { buildHostSnapshot, handlePluginCli, type PluginCliDeps } from "../../packages/framework/core/tools/amadeus-plugin.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIXTURE = join(REPO_ROOT, "plugins", "formal-model-check");
const PLUGIN = "formal-model-check";
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
    expect(out.some((l) => l.includes(`${PLUGIN} [ok]`))).toBe(true);
  });

  // BR-U2-6: the auto-compose path is verified by REALLY starting the CLI as the
  // SessionStart hook would (a spawned subprocess), not by checking a settings
  // wiring exists (verification theatre). We assert the real subprocess reached
  // and ran the engine — it wrote the composition record. (The post-apply
  // recompile spawns amadeus-runtime.ts compile against a synthetic host, which
  // has no runtime graph, so the process exits non-zero after committing — the
  // record write is the proof the compose entry actually ran.)
  test("SessionStart command really starts and reaches compose (BR-U2-6, not verification theatre)", () => {
    const cli = join(REPO_ROOT, "packages", "framework", "core", "tools", "amadeus-plugin.ts");
    const res = spawnSync("bun", [cli, "compose", "--if-stale", "--project-root", host], {
      encoding: "utf-8",
      timeout: 60_000,
      env: process.env,
    });
    // The real subprocess ran the engine: the composition record now records the plugin.
    const record = createNodeBackend(host).readComposition();
    expect(record.plugins.has(PLUGIN)).toBe(true);
    expect(existsSync(join(host, OWNED_STAGE))).toBe(true);
    // It was a real process (spawn produced a real exit status), not a stubbed call.
    expect(res.status === null ? -1 : res.status).toBeGreaterThanOrEqual(0);
  });
});
