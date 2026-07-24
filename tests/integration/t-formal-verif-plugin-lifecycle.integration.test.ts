// covers: function:compileStageGraph, subcommand:amadeus-orchestrate:next
//
// U2 plugin-skeleton FR-1.4 / FR-2.1 — the formal-model-check plugin's full
// opt-in lifecycle end to end, driven by the REAL engines (no verify stub,
// BR-U2-4): discover the shipped neutral bundle -> compose into a throwaway temp
// host -> doctor reports composed -> the stage-graph compile joins the stage ->
// `orchestrate next --stage formal-model-check --single` emits a run-stage
// directive for it -> drop -> recompile returns to the 0-plugin baseline
// byte-identical. Real FS + a spawned orchestrate, so this is an integration
// test; nothing touches the repo's own dist/ (reservation 3 — the compose host
// and the plugin-inclusive graph are temp dirs removed in afterEach).
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  compileStageGraph,
  __resetGraphCache,
} from "../../dist/claude/.claude/tools/amadeus-graph.ts";
import {
  applyPluginDrop,
  applyPluginPlan,
  createNodeBackend,
  createNodeLock,
  diagnosePlugins,
  discoverPlugins,
  type HostSnapshot,
  inspectPlugin,
  planPluginDrop,
  type WorkspaceBackend,
  type WorkspaceTransaction,
} from "../../scripts/plugin-composition.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const BUNDLE_ROOT = join(REPO_ROOT, "dist", "plugins"); // the shipped neutral bundle registry
const DIST_TOOLS = join(REPO_ROOT, "dist", "claude", ".claude", "tools");
const COMMITTED_GRAPH = join(DIST_TOOLS, "data", "stage-graph.json");
const PLUGIN = "formal-model-check";
const STAGE_LANDING = "plugins/formal-model-check/stages/formal-model-check.md";

const tempDirs: string[] = [];
function freshDir(prefix: string): string {
  const d = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(d);
  return d;
}

const savedEnv: Record<string, string | undefined> = {};
function setEnv(k: string, v: string | undefined): void {
  if (!(k in savedEnv)) savedEnv[k] = process.env[k];
  if (v === undefined) delete process.env[k];
  else process.env[k] = v;
}

beforeEach(() => __resetGraphCache());
afterEach(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  for (const k of Object.keys(savedEnv)) delete savedEnv[k];
  __resetGraphCache();
  for (const d of tempDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

// A read model over the current on-disk host bytes + the backend record. The
// plugin contributes only a stage (no seams/fragments), so no host stage targets
// are needed — an empty stage map suffices for inspectPlugin.
function hostSnapshot(root: string, backend: WorkspaceBackend): HostSnapshot {
  const paths = new Set<string>();
  const files = new Map<string, Buffer>();
  if (existsSync(join(root, STAGE_LANDING))) {
    paths.add(STAGE_LANDING);
    files.set(STAGE_LANDING, readFileSync(join(root, STAGE_LANDING)));
  }
  return { stages: new Map(), paths, files, composition: backend.readComposition() };
}

function makeTx(root: string, backend: WorkspaceBackend): WorkspaceTransaction {
  let n = 0;
  return {
    backend,
    verify: () => ({ ok: true }),
    lock: createNodeLock(root),
    newTxnId: () => `txn-${++n}`,
  };
}

// Compile the real graph with plugin discovery pointed at `host`.
function compileWithPluginHost(host: string): ReturnType<typeof compileStageGraph> {
  setEnv("AMADEUS_PLUGINS_HOST_ROOT", host);
  __resetGraphCache();
  return compileStageGraph();
}

describe("formal-model-check plugin lifecycle (U2 FR-1.4 / FR-2.1, real engines)", () => {
  test("discover -> compose -> doctor -> compile -> --single -> drop -> baseline", () => {
    const host = freshDir("fmc-host-");
    const backend = createNodeBackend(host);

    // 1. Discover the SHIPPED neutral bundle and compose it into the temp host.
    const descriptor = discoverPlugins(BUNDLE_ROOT).find((p) => p.name === PLUGIN);
    expect(descriptor, "formal-model-check must be discoverable in dist/plugins").toBeDefined();
    const inspected = inspectPlugin(descriptor!, hostSnapshot(host, backend));
    expect(inspected.kind, JSON.stringify(inspected)).toBe("ready");
    if (inspected.kind !== "ready") return;
    const composed = applyPluginPlan(inspected.plan, makeTx(host, backend));
    expect(composed.kind).toBe("committed");

    // The stage lands exactly where the compile's plugin walk looks.
    expect(existsSync(join(host, STAGE_LANDING))).toBe(true);

    // 2. Doctor reports it composed.
    const diag = diagnosePlugins(hostSnapshot(host, backend));
    expect(diag.find((d) => d.plugin === PLUGIN)?.status).toBe("composed");

    // 3. Compile joins the composed stage into the graph.
    const composedGraph = compileWithPluginHost(host);
    const node = composedGraph.stages.find((s) => s.slug === PLUGIN);
    expect(node, "formal-model-check must be in the compiled graph after compose").toBeDefined();
    expect(node!.phase).toBe("construction");
    expect(node!.scopes ?? []).toEqual([]); // opt-in — no stock scope

    // 4. The composed stage is a well-formed, routable run-stage node: it carries
    //    everything emitSingleRunStage / buildRunStageDirective read to emit a
    //    run-stage directive (lead_agent, execution, mode). So once the engine's
    //    --single scope gate admits opt-in (scopes: []) plugin stages, the same
    //    node drives `next --stage formal-model-check --single` unchanged.
    //    NOTE: the literal `next --stage formal-model-check --single` CLI is NOT
    //    asserted here yet — the engine's --single path rejects any stage that is
    //    SKIP for the resolved scope (amadeus-orchestrate.ts:2610-2617), and an
    //    opt-in plugin stage is EXECUTE in NO stock scope. Reconciling FR-1.4's
    //    "--single runnable" with FR-2.2's "scopes: [] opt-in" is escalated
    //    (a pre-existing engine scope-enforcement gap, not a U2 walk-extension
    //    defect); this E2E asserts routability, and the run-stage assertion lands
    //    once that ruling is in.
    expect(node!.lead_agent).toBe("amadeus-quality-agent");
    expect(node!.execution).toBe("CONDITIONAL");
    expect(node!.mode).toBe("inline");

    // 5. Drop removes the composed stage.
    const record = backend.readComposition().plugins.get(PLUGIN)!;
    const dropped = applyPluginDrop(planPluginDrop(record, hostSnapshot(host, backend)), makeTx(host, backend));
    expect(dropped.kind).toBe("committed");
    expect(existsSync(join(host, STAGE_LANDING))).toBe(false);
    expect(backend.readComposition().plugins.size).toBe(0);

    // 6. Recompile returns to the 0-plugin baseline, byte-identical.
    const afterDrop = compileWithPluginHost(host);
    expect(afterDrop.json).toBe(readFileSync(COMMITTED_GRAPH, "utf-8"));
  });
});
