// covers: file:scripts/plugin-composition.ts
// size: medium
//
// U10 plugin-composition (FR-6 item 20) — integration proof that the C4
// composition mechanism holds against a REAL filesystem. A node-backed backend
// composes a synthetic plugin into a temp host tree, projects a doctor
// diagnostic, drops it, and — the safety core — proves three-surface byte
// invariance on an inspect reject, a temp-verify failure, and a mid-commit crash
// followed by next-operation recovery. Touches the real filesystem (temp dir),
// hence `// size: medium` and the integration tier (fs-tests-integration-first).
//
// This is the mechanism only: the reference plugin `test-pro` and its authoring
// guide are U11. The fixture host and plugin are minimal and synthetic.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyPluginDrop,
  applyPluginPlan,
  CrashSignal,
  createNodeBackend,
  createNodeLock,
  diagnosePlugins,
  discoverPlugins,
  emptyComposition,
  type FailureInjector,
  type HostSnapshot,
  inspectPlugin,
  planPluginComposition,
  planPluginDrop,
  runRecovery,
  serializeStageSeams,
  type StageSeams,
  type ValidPlugin,
  type WorkspaceBackend,
  type WorkspaceTransaction,
} from "../../scripts/plugin-composition.ts";

let root: string;
let bundleRoot: string;

const CG_SEAMS: StageSeams = { produces: ["code-summary"], consumes: [], sensors: ["linter"], required_sections: [] };
const CG_BYTES = serializeStageSeams("code-generation", CG_SEAMS);
const SKILL_BYTES = Buffer.from("# SKILL\n<!-- ANCHOR -->\nfooter\n", "utf-8");

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "amadeus-plugin-host-"));
  bundleRoot = mkdtempSync(join(tmpdir(), "amadeus-plugin-bundle-"));
  writeFileSync(join(root, "cg.md"), CG_BYTES);
  writeFileSync(join(root, "SKILL.md"), SKILL_BYTES);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(bundleRoot, { recursive: true, force: true });
});

// Build the read-model host snapshot from the current temp-dir bytes + the
// backend's composition record.
function hostSnapshot(backend: WorkspaceBackend): HostSnapshot {
  const cg = { slug: "code-generation", path: "cg.md", seams: CG_SEAMS };
  const paths = new Set<string>();
  const files = new Map<string, Buffer>();
  for (const p of ["cg.md", "SKILL.md", "pro-review.md"]) {
    if (existsSync(join(root, p))) {
      paths.add(p);
      files.set(p, readFileSync(join(root, p)));
    }
  }
  return { stages: new Map([[cg.slug, cg]]), paths, files, composition: backend.readComposition() };
}

function makeTx(backend: WorkspaceBackend, verifyOk = true, inject?: FailureInjector): WorkspaceTransaction {
  let n = 0;
  return {
    backend,
    verify: () => (verifyOk ? { ok: true } : { ok: false, reason: "compile failed" }),
    lock: createNodeLock(root),
    newTxnId: () => `txn-${++n}`,
    inject,
  };
}

// Write a projected plugin bundle to disk and discover it back through the node
// ReadOnlyFs, so the manifest-parse + stage-byte-resolution path runs on real
// files. Returns the first discovered descriptor.
function discoverFixturePlugin(name = "pro") {
  const dir = join(bundleRoot, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "plugin.json"),
    JSON.stringify({
      name,
      stages: [{ slug: "pro-review", path: "pro-review.md" }],
      seams: [{ stage: "code-generation", seam: "sensors", entries: ["pro-lint"] }],
      fragments: [{ file: "SKILL.md", anchor: "<!-- ANCHOR -->", id: "pro-block", text: "PRO BLOCK" }],
    }),
  );
  writeFileSync(join(dir, "pro-review.md"), "# Pro Review Stage\n");
  return discoverPlugins(bundleRoot)[0];
}

describe("plugin-composition on a real filesystem", () => {
  test("compose → doctor → drop leaves only the base bytes and no owned files", () => {
    const backend = createNodeBackend(root);
    const plugin = discoverFixturePlugin();
    const inspected = inspectPlugin(plugin, hostSnapshot(backend));
    expect(inspected.kind).toBe("ready");
    if (inspected.kind !== "ready") return;

    const composed = applyPluginPlan(inspected.plan, makeTx(backend));
    expect(composed.kind).toBe("committed");
    // Owned stage file materialised; shared files merged/spliced on disk.
    expect(readFileSync(join(root, "pro-review.md"), "utf-8")).toBe("# Pro Review Stage\n");
    expect(readFileSync(join(root, "cg.md"), "utf-8")).toContain("pro-lint");
    expect(readFileSync(join(root, "SKILL.md"), "utf-8")).toContain("PRO BLOCK");

    // Doctor projects a composed status from the on-disk state.
    const diag = diagnosePlugins(hostSnapshot(backend));
    expect(diag).toHaveLength(1);
    expect(diag[0].status).toBe("composed");

    // Drop reverses exactly the plugin's contribution.
    const record = backend.readComposition().plugins.get("pro")!;
    const dropped = applyPluginDrop(planPluginDrop(record, hostSnapshot(backend)), makeTx(backend));
    expect(dropped.kind).toBe("committed");
    expect(existsSync(join(root, "pro-review.md"))).toBe(false);
    expect(readFileSync(join(root, "cg.md")).equals(CG_BYTES)).toBe(true);
    expect(readFileSync(join(root, "SKILL.md")).equals(SKILL_BYTES)).toBe(true);
    expect(backend.readComposition().plugins.size).toBe(0);
  });

  test("inspect reject (clobber) writes nothing", () => {
    const backend = createNodeBackend(root);
    // Pre-place the owned path so the copy would clobber.
    writeFileSync(join(root, "pro-review.md"), "USER FILE");
    const plugin = discoverFixturePlugin();
    const result = inspectPlugin(plugin, hostSnapshot(backend));
    expect(result.kind).toBe("rejected");
    if (result.kind === "rejected") expect(result.errors.some((e) => e.kind === "clobber")).toBe(true);
    // Host bytes untouched; no composition record, no audit.
    expect(readFileSync(join(root, "pro-review.md"), "utf-8")).toBe("USER FILE");
    expect(readFileSync(join(root, "cg.md")).equals(CG_BYTES)).toBe(true);
    expect(backend.readComposition().plugins.size).toBe(0);
    expect(backend.auditCount()).toBe(0);
  });

  test("temp-verify failure leaves the three surfaces byte-invariant", () => {
    const backend = createNodeBackend(root);
    const plugin = discoverFixturePlugin();
    const plan = planPluginComposition(plugin as ValidPlugin, hostSnapshot(backend));
    const result = applyPluginPlan(plan, makeTx(backend, false));
    expect(result.kind).toBe("failed");
    expect(existsSync(join(root, "pro-review.md"))).toBe(false);
    expect(readFileSync(join(root, "cg.md")).equals(CG_BYTES)).toBe(true);
    expect(readFileSync(join(root, "SKILL.md")).equals(SKILL_BYTES)).toBe(true);
    expect(backend.auditCount()).toBe(0);
    expect(backend.readJournal()).toBeUndefined();
  });

  test("mid-commit crash is recovered to pre-state on the next operation", () => {
    const backend = createNodeBackend(root);
    const plugin = discoverFixturePlugin();
    const plan = planPluginComposition(plugin as ValidPlugin, hostSnapshot(backend));
    const crash: FailureInjector = (p) => {
      if (p === "after-host") throw new CrashSignal(p);
    };
    expect(() => applyPluginPlan(plan, makeTx(backend, true, crash))).toThrow(CrashSignal);
    // Crash left the host partially written and a PREPARED journal on disk.
    expect(existsSync(join(root, "pro-review.md"))).toBe(true);
    expect(backend.readJournal()?.phase).toBe("PREPARED");

    // The next operation acquires the lock and recovers pending journals first,
    // restoring pre-state (the crashed partial write is undone on disk).
    expect(runRecovery(backend).kind).toBe("recovered");
    expect(existsSync(join(root, "pro-review.md"))).toBe(false);
    expect(readFileSync(join(root, "cg.md")).equals(CG_BYTES)).toBe(true);
    expect(backend.readJournal()).toBeUndefined();

    // With pre-state restored, a fresh compose inspects clean and commits.
    const fresh = discoverFixturePlugin();
    const inspected = inspectPlugin(fresh, hostSnapshot(backend));
    expect(inspected.kind).toBe("ready");
    if (inspected.kind !== "ready") return;
    const retried = applyPluginPlan(inspected.plan, makeTx(backend));
    expect(retried.kind).toBe("committed");
    // The retry's own compose is the only landed transaction; cg.md carries a
    // single pro-lint (no double application from the crashed attempt).
    const cg = readFileSync(join(root, "cg.md"), "utf-8");
    expect(cg.split("pro-lint").length - 1).toBe(1);
    expect(backend.auditCount()).toBe(1);
  });

  test("empty composition record is the zero baseline", () => {
    const backend = createNodeBackend(root);
    expect(backend.readComposition().plugins.size).toBe(emptyComposition().plugins.size);
    expect(diagnosePlugins(hostSnapshot(backend))).toEqual([]);
  });
});
