// covers: file:scripts/plugin-composition.ts
// size: small
//
// U10 plugin-composition (FR-6 item 20) — pure in-process unit tests for the C4
// composition engine: manifest discovery/parse (fake fs), inspection (all four
// error kinds collected simultaneously, write-0 on any), seam merge + fragment
// splice determinism, composition/drop planning, the three-surface atomic
// committer (PREPARED→COMMITTED, handled-failure restore, crash + next-op
// recovery, drift/corruption loud stop, audit-once), record-owned drop, and the
// read-only doctor projection. Drives every branch through an in-memory backend;
// touches no filesystem, process, or socket — hence `// size: small`.
//
// Falling/passing evidence: a same-name/malformed/unknown-seam/clobber plugin is
// rejected with all four kinds and leaves the three surfaces byte-invariant
// (red-relevant); a clean plugin composes and the audit is appended exactly once
// (green). A simulated crash leaves the host partially written until the next
// operation's recovery restores pre-state.

import { describe, expect, test } from "bun:test";
import type { ReadOnlyFs } from "../../scripts/plugin-projection.ts";
import {
  applyPluginDrop,
  applyPluginPlan,
  type CompositionRecord,
  CrashSignal,
  createInMemoryBackend,
  diagnosePlugins,
  discoverPlugins,
  emptyComposition,
  type FailureInjector,
  type HostSnapshot,
  type HostStage,
  inspectPlugin,
  mergeSeamEntries,
  noopLock,
  parsePluginManifest,
  type Preimages,
  planPluginComposition,
  planPluginDrop,
  type PluginDescriptor,
  runRecovery,
  SEAM_NAMES,
  serializeStageSeams,
  type StageSeams,
  type ValidPlugin,
  type WorkspaceBackend,
  type WorkspaceTransaction,
  type WriteSet,
} from "../../scripts/plugin-composition.ts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EMPTY_SEAMS: StageSeams = { produces: [], consumes: [], sensors: [], required_sections: [] };

function stage(slug: string, path: string, seams: Partial<StageSeams> = {}): HostStage {
  return { slug, path, seams: { ...EMPTY_SEAMS, ...seams } };
}

// A host with one seam-bearing stage (code-generation) and one fragment file.
function makeHost(overrides: Partial<HostSnapshot> = {}): HostSnapshot {
  const cg = stage("code-generation", "cg.md", { sensors: ["linter"], produces: ["code-summary"] });
  const skill = Buffer.from("# SKILL\n<!-- ANCHOR -->\ntail\n", "utf-8");
  return {
    stages: overrides.stages ?? new Map([[cg.slug, cg]]),
    paths: overrides.paths ?? new Set(["cg.md", "SKILL.md"]),
    files: overrides.files ?? new Map([["cg.md", serializeStageSeams(cg.slug, cg.seams)], ["SKILL.md", skill]]),
    composition: overrides.composition ?? emptyComposition(),
  };
}

function descriptor(name: string, manifest: PluginDescriptor["manifest"], parseErrors: string[] = []): PluginDescriptor {
  return { name, manifestBytes: Buffer.from(JSON.stringify(manifest ?? {})), manifest, parseErrors };
}

// A well-formed plugin: adds a new stage, merges one sensor into code-generation,
// splices one fragment into SKILL.md.
function cleanPlugin(name = "pro"): PluginDescriptor {
  return descriptor(name, {
    name,
    stages: [{ slug: "pro-review", path: "pro-review.md", bytes: Buffer.from("pro") }],
    seams: [{ stage: "code-generation", seam: "sensors", entries: ["pro-lint"] }],
    fragments: [{ file: "SKILL.md", anchor: "<!-- ANCHOR -->", id: "pro-block", text: "PRO" }],
  });
}

function okVerify(): { ok: true } {
  return { ok: true };
}

function makeTx(backend: WorkspaceBackend, verify: WorkspaceTransaction["verify"] = okVerify, inject?: FailureInjector): WorkspaceTransaction {
  let n = 0;
  return { backend, verify, lock: noopLock, newTxnId: () => `txn-${++n}`, inject };
}

function asValid(plugin: PluginDescriptor): ValidPlugin {
  return plugin as ValidPlugin;
}

// ---------------------------------------------------------------------------
// Discovery + manifest parse
// ---------------------------------------------------------------------------

function fakeFs(files: Record<string, string>): ReadOnlyFs {
  const isFile = (p: string) => Object.hasOwn(files, p);
  const hasChild = (p: string) => Object.keys(files).some((f) => f.startsWith(`${p}/`));
  return {
    exists: (p) => isFile(p) || hasChild(p),
    isDir: (p) => !isFile(p) && hasChild(p),
    read: (p) => Buffer.from(files[p] ?? "", "utf-8"),
    list: (p) => {
      const prefix = `${p}/`;
      const names = new Set<string>();
      for (const f of Object.keys(files)) {
        if (f.startsWith(prefix)) names.add(f.slice(prefix.length).split("/")[0]);
      }
      return [...names];
    },
  };
}

describe("discoverPlugins", () => {
  test("absent root yields no descriptors", () => {
    expect(discoverPlugins("/nope", fakeFs({}))).toEqual([]);
  });

  test("parses manifest and resolves declared stage bytes, canonically sorted", () => {
    const io = fakeFs({
      "/b/beta/plugin.json": JSON.stringify({ name: "beta", stages: [{ slug: "s", path: "s.md" }], seams: [], fragments: [] }),
      "/b/beta/s.md": "stage bytes",
      "/b/alpha/plugin.json": JSON.stringify({ name: "alpha", stages: [], seams: [], fragments: [] }),
    });
    const found = discoverPlugins("/b", io);
    expect(found.map((d) => d.name)).toEqual(["alpha", "beta"]);
    expect(found[1].manifest?.stages[0].bytes.toString()).toBe("stage bytes");
  });

  test("missing plugin.json becomes a malformed descriptor", () => {
    const io = fakeFs({ "/b/x/readme.md": "hi" });
    const [d] = discoverPlugins("/b", io);
    expect(d.manifest).toBeNull();
    expect(d.parseErrors[0]).toContain("missing plugin.json");
  });

  test("invalid JSON and shape errors are reported, not thrown", () => {
    const bad = parsePluginManifest("x", Buffer.from("{not json"), () => null);
    expect(bad.manifest).toBeNull();
    expect(bad.errors[0]).toContain("invalid JSON");

    const wrongName = parsePluginManifest("x", Buffer.from(JSON.stringify({ name: "y", stages: [], seams: [], fragments: [] })), () => null);
    expect(wrongName.manifest).toBeNull();
    expect(wrongName.errors.some((e) => e.includes("must equal directory"))).toBe(true);
  });

  test("stage path escaping its subtree is rejected", () => {
    const r = parsePluginManifest("x", Buffer.from(JSON.stringify({ name: "x", stages: [{ slug: "s", path: "../evil" }], seams: [], fragments: [] })), () => Buffer.alloc(0));
    expect(r.manifest).toBeNull();
    expect(r.errors.some((e) => e.includes("safe relative path"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Inspection — all errors collected, write-0
// ---------------------------------------------------------------------------

describe("inspectPlugin", () => {
  test("a clean plugin is ready with a plan", () => {
    const result = inspectPlugin(cleanPlugin(), makeHost());
    expect(result.kind).toBe("ready");
    if (result.kind === "ready") expect(result.plan.stageCopies).toHaveLength(1);
  });

  test("collects same-name-stage, unknown-seam and clobber SIMULTANEOUSLY", () => {
    // Host already has stage "dup" at path "dup.md"; the plugin re-adds it
    // (same-name + clobber), targets an unknown seam, and an unknown stage.
    const dup = stage("dup", "dup.md");
    const host = makeHost({
      stages: new Map([["dup", dup]]),
      paths: new Set(["dup.md"]),
      files: new Map([["dup.md", Buffer.from("x")]]),
    });
    const plugin = descriptor("p", {
      name: "p",
      stages: [{ slug: "dup", path: "dup.md", bytes: Buffer.from("y") }],
      seams: [
        { stage: "dup", seam: "not-a-seam" as never, entries: ["a"] },
        { stage: "ghost", seam: "sensors", entries: ["b"] },
      ],
      fragments: [],
    });
    const result = inspectPlugin(plugin, host);
    expect(result.kind).toBe("rejected");
    if (result.kind === "rejected") {
      const kinds = new Set(result.errors.map((e) => e.kind));
      expect(kinds.has("same-name-stage")).toBe(true);
      expect(kinds.has("clobber")).toBe(true);
      expect(kinds.has("unknown-seam")).toBe(true);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    }
  });

  test("malformed manifest is rejected with malformed-manifest errors", () => {
    const result = inspectPlugin(descriptor("p", null, ["bad field"]), makeHost());
    expect(result.kind).toBe("rejected");
    if (result.kind === "rejected") expect(result.errors[0].kind).toBe("malformed-manifest");
  });

  test("fragment anchor absent from host is an unknown-seam error", () => {
    const plugin = descriptor("p", {
      name: "p",
      stages: [],
      seams: [],
      fragments: [{ file: "SKILL.md", anchor: "<!-- MISSING -->", id: "b", text: "T" }],
    });
    const result = inspectPlugin(plugin, makeHost());
    expect(result.kind).toBe("rejected");
    if (result.kind === "rejected") expect(result.errors.some((e) => e.message.includes("anchor"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Merge + serialization determinism
// ---------------------------------------------------------------------------

describe("seam merge + serialize", () => {
  test("mergeSeamEntries is order-preserving union with dedup", () => {
    expect(mergeSeamEntries(["a", "b"], ["b", "c", "a", "d"])).toEqual(["a", "b", "c", "d"]);
  });

  test("serializeStageSeams is deterministic and lists every seam", () => {
    const bytes = serializeStageSeams("s", { produces: ["p"], consumes: [], sensors: ["x", "y"], required_sections: [] });
    const text = bytes.toString("utf-8");
    for (const name of SEAM_NAMES) expect(text).toContain(`${name}:`);
    expect(serializeStageSeams("s", { produces: ["p"], consumes: [], sensors: ["x", "y"], required_sections: [] }).equals(bytes)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Composition planning
// ---------------------------------------------------------------------------

describe("planPluginComposition", () => {
  test("plans stage copy, seam merge into shared file, fragment splice, and record", () => {
    const host = makeHost();
    const plan = planPluginComposition(asValid(cleanPlugin()), host);
    expect(plan.record.ownedPaths).toEqual(["pro-review.md"]);
    // cg.md (seam) and SKILL.md (fragment) are the two shared writes.
    expect(plan.sharedWrites.map((w) => w.path)).toEqual(["SKILL.md", "cg.md"]);
    const cg = plan.sharedWrites.find((w) => w.path === "cg.md")!;
    expect(cg.bytes.toString()).toContain("pro-lint");
    const skill = plan.sharedWrites.find((w) => w.path === "SKILL.md")!;
    expect(skill.bytes.toString()).toContain("PRO");
    expect(plan.record.sharedFiles.map((s) => s.path).sort()).toEqual(["SKILL.md", "cg.md"]);
  });
});

// ---------------------------------------------------------------------------
// Apply — verify gate + three-surface atomicity
// ---------------------------------------------------------------------------

describe("applyPluginPlan", () => {
  test("verify failure leaves all three surfaces invariant", () => {
    const backend = createInMemoryBackend();
    const host = makeHost();
    const preHost = backend.readHost("cg.md");
    const plan = planPluginComposition(asValid(cleanPlugin()), host);
    const tx = makeTx(backend, () => ({ ok: false, reason: "compile failed" }));
    const result = applyPluginPlan(plan, tx);
    expect(result.kind).toBe("failed");
    expect(backend.readHost("cg.md")).toEqual(preHost); // absent, untouched
    expect(backend.readHost("pro-review.md")).toBeUndefined();
    expect(backend.readComposition().plugins.size).toBe(0);
    expect(backend.auditCount()).toBe(0);
    expect(backend.readJournal()).toBeUndefined();
  });

  test("success commits three surfaces with audit exactly once", () => {
    const backend = createInMemoryBackend();
    const plan = planPluginComposition(asValid(cleanPlugin()), makeHost());
    const result = applyPluginPlan(plan, makeTx(backend));
    expect(result.kind).toBe("committed");
    expect(backend.readHost("pro-review.md")?.toString()).toBe("pro");
    expect(backend.readHost("cg.md")?.toString()).toContain("pro-lint");
    expect(backend.readComposition().plugins.has("pro")).toBe(true);
    expect(backend.auditCount()).toBe(1);
    expect(backend.readJournal()).toBeUndefined(); // cleared after COMMITTED
  });

  test("handled failure after host write restores every preimage before return", () => {
    const backend = createInMemoryBackend();
    const plan = planPluginComposition(asValid(cleanPlugin()), makeHost());
    const inject: FailureInjector = (p) => {
      if (p === "after-record") throw new Error("disk full");
    };
    const result = applyPluginPlan(plan, makeTx(backend, okVerify, inject));
    expect(result.kind).toBe("failed");
    // host write was applied then rolled back; record + audit never landed.
    expect(backend.readHost("pro-review.md")).toBeUndefined();
    expect(backend.readHost("cg.md")).toBeUndefined();
    expect(backend.readComposition().plugins.size).toBe(0);
    expect(backend.auditCount()).toBe(0);
    expect(backend.readJournal()).toBeUndefined();
  });

  test("crash leaves the journal PREPARED; the next operation recovers pre-state", () => {
    const backend = createInMemoryBackend();
    const plan = planPluginComposition(asValid(cleanPlugin()), makeHost());
    const crash: FailureInjector = (p) => {
      if (p === "after-host") throw new CrashSignal(p);
    };
    expect(() => applyPluginPlan(plan, makeTx(backend, okVerify, crash))).toThrow(CrashSignal);
    // Partially written host, PREPARED journal still present.
    expect(backend.readHost("pro-review.md")?.toString()).toBe("pro");
    expect(backend.readJournal()?.phase).toBe("PREPARED");
    // Next-op recovery restores pre-state and clears the journal.
    const recovery = runRecovery(backend);
    expect(recovery.kind).toBe("recovered");
    expect(backend.readHost("pro-review.md")).toBeUndefined();
    expect(backend.readHost("cg.md")).toBeUndefined();
    expect(backend.readJournal()).toBeUndefined();
  });

  test("COMMITTED-phase crash is a settled transaction: post-state kept", () => {
    const backend = createInMemoryBackend();
    const plan = planPluginComposition(asValid(cleanPlugin()), makeHost());
    const crash: FailureInjector = (p) => {
      if (p === "after-committed") throw new CrashSignal(p);
    };
    expect(() => applyPluginPlan(plan, makeTx(backend, okVerify, crash))).toThrow(CrashSignal);
    expect(backend.readJournal()?.phase).toBe("COMMITTED");
    const recovery = runRecovery(backend);
    expect(recovery.kind).toBe("settled");
    expect(backend.readHost("pro-review.md")?.toString()).toBe("pro"); // kept
    expect(backend.readJournal()).toBeUndefined();
  });

  test("recovery drift stops loudly and blocks the next operation", () => {
    const backend = createInMemoryBackend();
    const plan = planPluginComposition(asValid(cleanPlugin()), makeHost());
    const crash: FailureInjector = (p) => {
      if (p === "after-host") throw new CrashSignal(p);
    };
    expect(() => applyPluginPlan(plan, makeTx(backend, okVerify, crash))).toThrow(CrashSignal);
    // External edit: cg.md is now neither preimage (absent) nor the post-image.
    backend.writeHost("cg.md", Buffer.from("edited by a human"));
    expect(runRecovery(backend).kind).toBe("stopped");
    // A new compose is refused while the drift stop stands.
    const next = applyPluginPlan(planPluginComposition(asValid(cleanPlugin("other")), makeHost()), makeTx(backend));
    expect(next.kind).toBe("stopped");
  });

  test("journal corruption stops loudly", () => {
    const backend = createInMemoryBackend();
    const ws: WriteSet = { hostWrites: new Map(), hostRemovals: [], composition: emptyComposition(), audit: { event: "x", plugin: "p", detail: "" } };
    const pre: Preimages = { host: new Map(), composition: emptyComposition(), auditCount: 0 };
    backend.writeJournal({ txnId: "t", phase: "BROKEN" as never, kind: "compose", writeSet: ws, preimages: pre });
    const recovery = runRecovery(backend);
    expect(recovery.kind).toBe("stopped");
    if (recovery.kind === "stopped") expect(recovery.reason).toContain("corruption");
  });
});

// ---------------------------------------------------------------------------
// Drop — record-owned only, rebuild from remaining
// ---------------------------------------------------------------------------

function composeInto(backend: WorkspaceBackend, name: string): CompositionRecord {
  // Compose against a fresh host, then rebuild a host snapshot reflecting the
  // committed surfaces so a subsequent drop sees the post-compose state.
  const plan = planPluginComposition(asValid(cleanPlugin(name)), makeHost());
  applyPluginPlan(plan, makeTx(backend));
  return backend.readComposition();
}

function postComposeHost(backend: WorkspaceBackend): HostSnapshot {
  const files = new Map<string, Buffer>();
  const paths = new Set<string>();
  const cg = stage("code-generation", "cg.md", { sensors: ["linter"], produces: ["code-summary"] });
  for (const p of ["cg.md", "SKILL.md", "pro-review.md"]) {
    const b = backend.readHost(p);
    if (b !== undefined) {
      files.set(p, b);
      paths.add(p);
    }
  }
  return { stages: new Map([[cg.slug, cg]]), paths, files, composition: backend.readComposition() };
}

describe("drop", () => {
  test("planPluginDrop removes owned paths and rebuilds shared files from the base", () => {
    const backend = createInMemoryBackend();
    composeInto(backend, "pro");
    const host = postComposeHost(backend);
    const record = host.composition.plugins.get("pro")!;
    const plan = planPluginDrop(record, host);
    expect(plan.rejections).toEqual([]);
    expect(plan.removals).toEqual(["pro-review.md"]);
    const cg = plan.sharedWrites.find((w) => w.path === "cg.md")!;
    expect(cg.bytes.toString()).not.toContain("pro-lint"); // reverted to base
  });

  test("applyPluginDrop commits removals + shared rebuild, keeping user paths", () => {
    const backend = createInMemoryBackend();
    composeInto(backend, "pro");
    backend.writeHost("user.md", Buffer.from("hand authored")); // adjacent, unowned
    const host = postComposeHost(backend);
    const record = host.composition.plugins.get("pro")!;
    const result = applyPluginDrop(planPluginDrop(record, host), makeTx(backend));
    expect(result.kind).toBe("committed");
    expect(backend.readHost("pro-review.md")).toBeUndefined(); // owned, removed
    expect(backend.readHost("user.md")?.toString()).toBe("hand authored"); // preserved
    expect(backend.readHost("cg.md")?.toString()).not.toContain("pro-lint");
    expect(backend.readComposition().plugins.has("pro")).toBe(false);
  });

  test("shared-file drift blocks the drop with the three surfaces invariant", () => {
    const backend = createInMemoryBackend();
    composeInto(backend, "pro");
    backend.writeHost("cg.md", Buffer.from("user edited the shared file"));
    const host = postComposeHost(backend);
    const record = host.composition.plugins.get("pro")!;
    const plan = planPluginDrop(record, host);
    expect(plan.rejections.length).toBeGreaterThan(0);
    const result = applyPluginDrop(plan, makeTx(backend));
    expect(result.kind).toBe("failed");
    // reject short-circuits: composition record still holds the plugin.
    expect(backend.readComposition().plugins.has("pro")).toBe(true);
    expect(backend.auditCount()).toBe(1); // only the compose audit, no drop audit
  });

  test("two plugins: dropping one rebuilds the shared file from the survivor", () => {
    // Two distinct plugins, each merging its own sensor into cg.md (no
    // fragments, disjoint stage paths). Dropping pro must rebuild cg.md from
    // the base + max's surviving contribution.
    const seamOnly = (name: string, sensor: string): PluginDescriptor =>
      descriptor(name, {
        name,
        stages: [{ slug: `${name}-stage`, path: `${name}.md`, bytes: Buffer.from(name) }],
        seams: [{ stage: "code-generation", seam: "sensors", entries: [sensor] }],
        fragments: [],
      });
    const backend = createInMemoryBackend();
    const cg = stage("code-generation", "cg.md", { sensors: ["linter"], produces: ["code-summary"] });
    const baseHost = (): HostSnapshot => ({
      stages: new Map([[cg.slug, cg]]),
      paths: new Set([...["cg.md", "pro.md", "max.md"].filter((p) => backend.readHost(p) !== undefined)]),
      files: new Map([["cg.md", backend.readHost("cg.md") ?? serializeStageSeams(cg.slug, cg.seams)]]),
      composition: backend.readComposition(),
    });
    applyPluginPlan(planPluginComposition(asValid(seamOnly("pro", "pro-lint")), baseHost()), makeTx(backend));
    applyPluginPlan(planPluginComposition(asValid(seamOnly("max", "max-lint")), baseHost()), makeTx(backend));
    const host = baseHost();
    const drop = planPluginDrop(host.composition.plugins.get("pro")!, host);
    expect(drop.rejections).toEqual([]);
    const rebuilt = drop.sharedWrites.find((w) => w.path === "cg.md")!.bytes.toString();
    expect(rebuilt).toContain("linter"); // base survives
    expect(rebuilt).toContain("max-lint"); // survivor's contribution
    expect(rebuilt).not.toContain("pro-lint"); // dropped
  });
});

// ---------------------------------------------------------------------------
// Doctor projection (read-only)
// ---------------------------------------------------------------------------

describe("diagnosePlugins", () => {
  test("projects composed status without mutating any surface", () => {
    const backend = createInMemoryBackend();
    composeInto(backend, "pro");
    const host = postComposeHost(backend);
    const before = backend.readComposition();
    const diags = diagnosePlugins(host);
    expect(diags).toHaveLength(1);
    expect(diags[0].status).toBe("composed");
    expect(diags[0].ownedPaths).toEqual(["pro-review.md"]);
    expect(backend.readComposition().plugins.size).toBe(before.plugins.size);
  });

  test("reports drift when a shared file diverged, recovery-pending under a journal", () => {
    const backend = createInMemoryBackend();
    composeInto(backend, "pro");
    const host = postComposeHost(backend);
    const drifted: HostSnapshot = { ...host, files: new Map([...host.files, ["cg.md", Buffer.from("tampered")]]) };
    expect(diagnosePlugins(drifted)[0].status).toBe("drift");
    expect(diagnosePlugins(host, true)[0].status).toBe("recovery-pending");
  });
});
