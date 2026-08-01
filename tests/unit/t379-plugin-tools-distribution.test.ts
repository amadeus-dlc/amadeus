// covers: file:packages/framework/core/tools/amadeus-plugin-compose.ts
// size: small
//
// u4-tools-distribution (FR-A3) — the manifest `tools` field and the digest
// symmetry it forces. Pure over the in-memory backend (no node:fs), so the
// parse/plan/drop enumeration lives in the unit tier
// (fs-tests-integration-first); the real-filesystem proof is the t379
// integration file.
//
// The load-bearing case is BR-U4-3: a record whose ownedContentDigests were
// computed from stages ALONE — the shape the engine had before this Unit —
// cannot drop a plugin that owns tools, because every tool path is an
// expectedDigest-undefined drift. That variant is pinned here permanently
// rather than proved once by injection.

import { describe, expect, test } from "bun:test";
import {
  applyPluginPlan,
  createInMemoryBackend,
  emptyComposition,
  type HostSnapshot,
  inspectPlugin,
  ownedRecordDigests,
  parsePluginManifest,
  type PluginDescriptor,
  type PluginRecord,
  planPluginComposition,
  planPluginDrop,
  type ValidPlugin,
  type WorkspaceBackend,
  type WorkspaceTransaction,
} from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";

const STAGE_BYTES = Buffer.from(
  "---\nslug: pro-review\nphase: construction\nexecution: CONDITIONAL\ncondition: Test plugin stage.\nlead_agent: amadeus-developer-agent\nsupport_agents: []\nmode: inline\nproduces: []\nconsumes: []\nrequires_stage: []\ninputs: none\noutputs: none\nscopes: []\n---\n\n# Pro Review Stage\n",
);
const RUNNER_BYTES = Buffer.from('export const answer = 42;\nconsole.log(answer);\n', "utf-8");
const HELPER_BYTES = Buffer.from("export const helper = () => 1;\n", "utf-8");

const BUNDLE: Record<string, Buffer> = {
  "stages/pro-review.md": STAGE_BYTES,
  "tools/run.ts": RUNNER_BYTES,
  "tools/helper.ts": HELPER_BYTES,
};

function readBundle(rel: string): Buffer | null {
  return BUNDLE[rel] ?? null;
}

function manifestBytes(extra: Record<string, unknown>): Buffer {
  return Buffer.from(
    JSON.stringify({ name: "pro", stages: [{ slug: "pro-review", path: "stages/pro-review.md" }], seams: [], fragments: [], ...extra }),
    "utf-8",
  );
}

function parse(extra: Record<string, unknown>) {
  const bytes = manifestBytes(extra);
  return { bytes, result: parsePluginManifest("pro", bytes, readBundle) };
}

function descriptorWith(extra: Record<string, unknown>): PluginDescriptor {
  const { bytes, result } = parse(extra);
  return { name: "pro", manifestBytes: bytes, manifest: result.manifest, parseErrors: result.errors };
}

// A host with no plugin content. `seed` pre-places bytes so a clobber/drift case
// can be built without mutating a frozen read model.
function emptyHost(seed: Record<string, Buffer> = {}): HostSnapshot {
  const files = new Map(Object.entries(seed));
  return { stages: new Map(), paths: new Set(files.keys()), files, composition: emptyComposition() };
}

// The host as it stands after `plan` was applied: every owned path present with
// the composed bytes, plus the record the compose persisted.
function composedHost(
  plan: ReturnType<typeof planPluginComposition>,
  record: PluginRecord,
  tamper: Record<string, Buffer> = {},
): HostSnapshot {
  const paths = new Set<string>();
  const files = new Map<string, Buffer>();
  for (const s of plan.stageCopies) {
    paths.add(s.path);
    files.set(s.path, s.bytes);
  }
  for (const t of plan.toolCopies) {
    paths.add(t.path);
    files.set(t.path, t.bytes);
  }
  for (const [path, bytes] of Object.entries(tamper)) files.set(path, bytes);
  return {
    stages: new Map(),
    paths,
    files,
    composition: { ledger: new Map(), plugins: new Map([[record.plugin, record]]) },
  };
}

function tx(backend: WorkspaceBackend): WorkspaceTransaction {
  let n = 0;
  return {
    backend,
    verify: () => ({ ok: true }),
    lock: { acquire: () => {}, release: () => {} },
    newTxnId: () => `t379-${++n}`,
  };
}

describe("t379 manifest tools parsing", () => {
  test("declared tools resolve to plugin-namespaced owned paths", () => {
    const { result } = parse({ tools: ["tools/run.ts", "tools/helper.ts"] });
    expect(result.errors).toEqual([]);
    expect(result.manifest?.tools.map((t) => t.path)).toEqual([
      "plugins/pro/tools/run.ts",
      "plugins/pro/tools/helper.ts",
    ]);
    expect(result.manifest?.tools[0].bytes.equals(RUNNER_BYTES)).toBe(true);
  });

  test("a missing tools field yields [] (manifests without tools stay valid)", () => {
    const { result } = parse({});
    expect(result.errors).toEqual([]);
    expect(result.manifest?.tools).toEqual([]);
  });

  test("a path escaping the bundle is rejected before any plan", () => {
    const { result } = parse({ tools: ["../../etc/passwd"] });
    expect(result.manifest).toBeNull();
    expect(result.errors.join("\n")).toContain("safe relative path");
  });

  test("an absolute path is rejected", () => {
    const { result } = parse({ tools: ["/etc/passwd"] });
    expect(result.manifest).toBeNull();
    expect(result.errors.join("\n")).toContain("safe relative path");
  });

  test("a path outside tools/ is rejected even when it exists in the bundle", () => {
    const { result } = parse({ tools: ["stages/pro-review.md"] });
    expect(result.manifest).toBeNull();
    expect(result.errors.join("\n")).toContain("tools/");
  });

  test("a declared tool absent from the bundle is rejected", () => {
    const { result } = parse({ tools: ["tools/ghost.ts"] });
    expect(result.manifest).toBeNull();
    expect(result.errors.join("\n")).toContain("not found in bundle");
  });

  test("a duplicate tool declaration is rejected", () => {
    const { result } = parse({ tools: ["tools/run.ts", "tools/run.ts"] });
    expect(result.manifest).toBeNull();
    expect(result.errors.join("\n")).toContain("duplicate");
  });

  test("a non-string tools entry is rejected", () => {
    const { result } = parse({ tools: [{ path: "tools/run.ts" }] });
    expect(result.manifest).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("t379 compose owns and digests tools", () => {
  test("plan owns stages + tools and digests every one of them", () => {
    const descriptor = descriptorWith({ tools: ["tools/run.ts", "tools/helper.ts"] });
    const plan = planPluginComposition(descriptor as ValidPlugin, emptyHost());
    expect(plan.record.ownedPaths).toEqual([
      "plugins/pro/stages/pro-review.md",
      "plugins/pro/tools/helper.ts",
      "plugins/pro/tools/run.ts",
    ]);
    for (const p of plan.record.ownedPaths) {
      expect(plan.record.ownedContentDigests.get(p)).toMatch(/^sha256:[0-9a-f]{64}$/);
    }
    expect(plan.toolCopies.map((t) => t.path)).toEqual([
      "plugins/pro/tools/helper.ts",
      "plugins/pro/tools/run.ts",
    ]);
  });

  test("apply writes every tool into the host", () => {
    const descriptor = descriptorWith({ tools: ["tools/run.ts", "tools/helper.ts"] });
    const plan = planPluginComposition(descriptor as ValidPlugin, emptyHost());
    const backend = createInMemoryBackend();
    expect(applyPluginPlan(plan, tx(backend)).kind).toBe("committed");
    expect(backend.readHost("plugins/pro/tools/run.ts")?.equals(RUNNER_BYTES)).toBe(true);
    expect(backend.readHost("plugins/pro/tools/helper.ts")?.equals(HELPER_BYTES)).toBe(true);
  });

  test("a tool path already in the host is a clobber (inspect rejects)", () => {
    const descriptor = descriptorWith({ tools: ["tools/run.ts"] });
    const host = emptyHost({ "plugins/pro/tools/run.ts": Buffer.from("mine\n", "utf-8") });
    const inspected = inspectPlugin(descriptor, host);
    expect(inspected.kind).toBe("rejected");
  });

  test("tools participate in the content digest (trust grant covers them)", () => {
    const withTools = planPluginComposition(descriptorWith({ tools: ["tools/run.ts"] }) as ValidPlugin, emptyHost());
    const without = planPluginComposition(descriptorWith({}) as ValidPlugin, emptyHost());
    expect(withTools.contentDigest).not.toBe(without.contentDigest);
  });

  test("ownedRecordDigests covers stages and tools alike", () => {
    const descriptor = descriptorWith({ tools: ["tools/run.ts"] });
    const digests = ownedRecordDigests(descriptor as ValidPlugin);
    expect([...digests.keys()].sort()).toEqual([
      "plugins/pro/stages/pro-review.md",
      "plugins/pro/tools/run.ts",
    ]);
  });
});

describe("t379 drop is symmetric with compose", () => {
  test("drop removes every owned tool", () => {
    const descriptor = descriptorWith({ tools: ["tools/run.ts", "tools/helper.ts"] });
    const plan = planPluginComposition(descriptor as ValidPlugin, emptyHost());
    const dropPlan = planPluginDrop(plan.record, composedHost(plan, plan.record));
    expect(dropPlan.rejections).toEqual([]);
    expect(dropPlan.removals).toEqual([
      "plugins/pro/stages/pro-review.md",
      "plugins/pro/tools/helper.ts",
      "plugins/pro/tools/run.ts",
    ]);
  });

  test("an edited tool blocks the drop (drift is fail-closed)", () => {
    const descriptor = descriptorWith({ tools: ["tools/run.ts"] });
    const plan = planPluginComposition(descriptor as ValidPlugin, emptyHost());
    const host = composedHost(plan, plan.record, { "plugins/pro/tools/run.ts": Buffer.from("tampered\n", "utf-8") });
    const dropPlan = planPluginDrop(plan.record, host);
    expect(dropPlan.rejections.map((r) => r.locus)).toContain("plugins/pro/tools/run.ts");
    expect(dropPlan.removals).not.toContain("plugins/pro/tools/run.ts");
  });

  // BR-U4-3 falling proof, pinned permanently: recompute the record's digests
  // from stages ALONE (the pre-Unit shape) and the drop can no longer proceed.
  test("stage-only digests make the drop impossible", () => {
    const descriptor = descriptorWith({ tools: ["tools/run.ts", "tools/helper.ts"] });
    const plan = planPluginComposition(descriptor as ValidPlugin, emptyHost());
    const stageOnly: PluginRecord = {
      ...plan.record,
      ownedContentDigests: new Map(
        [...plan.record.ownedContentDigests].filter(([p]) => !p.includes("/tools/")),
      ),
    };
    const dropPlan = planPluginDrop(stageOnly, composedHost(plan, plan.record));
    expect(dropPlan.rejections.map((r) => r.locus).sort()).toEqual([
      "plugins/pro/tools/helper.ts",
      "plugins/pro/tools/run.ts",
    ]);
  });
});
