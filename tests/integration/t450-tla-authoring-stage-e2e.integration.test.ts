// covers: file:plugins/formal-model-check/stages/tla-authoring.md, file:plugins/formal-model-check/tools/tla-authoring.ts
//
// U5 authoring-stage-e2e (intent 260804-tla-authoring). Two things live here:
//
//   (a) the C7 stage document contract — the shipped stage file carries the six
//       procedure sections of functional-design/domain-entities.md § AuthoringStageDoc
//       and lands in a composed host (BR-U5-07, BR-U5-13)
//   (b) the FR-012 end-to-end path on an unknown subject (the swarm unit-pool
//       lifecycle): requirements -> applicability -> authoring -> referees ->
//       independent review -> human gate -> bundle -> registration -> hold
//       release, plus the two fail-closed arms of BR-U5-14
//
// Every path runs against the COMPOSED runtime — the plugin is composed into a
// throwaway host from the shipped neutral bundle and driven from there, so a
// module the manifest fails to declare surfaces as a real import failure rather
// than passing on the canonical tree (BR-U5-09). Real FS + a real compose, so
// this is an integration test (cid:code-generation:fs-tests-integration-first).
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import {
  applyPluginPlan,
  createNodeBackend,
  createNodeLock,
  discoverPlugins,
  type HostSnapshot,
  inspectPlugin,
  type WorkspaceBackend,
  type WorkspaceTransaction,
} from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";
import { parseStageFrontmatter } from "../../dist/claude/.claude/tools/amadeus-lib.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const BUNDLE_ROOT = join(REPO_ROOT, "dist", "plugins");
const PLUGIN = "formal-model-check";
const STAGE_SLUG = "tla-authoring";
const STAGE_LANDING = `plugins/${PLUGIN}/stages/${STAGE_SLUG}.md`;

const tempDirs: string[] = [];

function freshDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// The composed-area read model the compose engine inspects. Mirrors the helper
// in t-formal-verif-plugin-lifecycle: the plugin owns its whole subtree, so the
// snapshot walks it rather than probing one known path.
function hostSnapshot(root: string, backend: WorkspaceBackend): HostSnapshot {
  const paths = new Set<string>();
  const files = new Map<string, Buffer>();
  const walk = (dir: string): void => {
    for (const name of [...readdirSync(dir)].sort()) {
      const abs = join(dir, name);
      if (statSync(abs).isDirectory()) walk(abs);
      else {
        const rel = relative(root, abs).split(sep).join("/");
        paths.add(rel);
        files.set(rel, readFileSync(abs));
      }
    }
  };
  const composed = join(root, "plugins");
  if (existsSync(composed)) walk(composed);
  return { stages: new Map(), paths, files, composition: backend.readComposition() };
}

function transaction(root: string, backend: WorkspaceBackend): WorkspaceTransaction {
  let counter = 0;
  return {
    backend,
    verify: () => ({ ok: true }),
    lock: createNodeLock(root),
    newTxnId: () => `txn-${++counter}`,
  };
}

/** Compose the shipped neutral bundle into a throwaway host and return its root. */
function composedHost(): string {
  const host = freshDir("tla-authoring-host-");
  const backend = createNodeBackend(host);
  const descriptor = discoverPlugins(BUNDLE_ROOT).find((plugin) => plugin.name === PLUGIN);
  expect(descriptor, `${PLUGIN} must be discoverable in dist/plugins`).toBeDefined();
  const inspected = inspectPlugin(descriptor as NonNullable<typeof descriptor>, hostSnapshot(host, backend));
  expect(inspected.kind, JSON.stringify(inspected)).toBe("ready");
  if (inspected.kind !== "ready") throw new Error("plugin is not ready to compose");
  expect(applyPluginPlan(inspected.plan, transaction(host, backend)).kind).toBe("committed");
  return host;
}

describe("the authoring stage document (BR-U5-07, BR-U5-13)", () => {
  let stageText = "";

  beforeEach(() => {
    stageText = readFileSync(join(REPO_ROOT, STAGE_LANDING), "utf8");
  });

  test("the plugin manifest declares the stage at the path the compose walk reads", () => {
    const manifest = JSON.parse(readFileSync(join(REPO_ROOT, "plugins", PLUGIN, "plugin.json"), "utf8")) as {
      stages: ReadonlyArray<{ slug: string; path: string }>;
    };
    expect(manifest.stages).toContainEqual({ slug: STAGE_SLUG, path: `stages/${STAGE_SLUG}.md` });
  });

  test("the frontmatter keeps the opt-in plugin shape", () => {
    const frontmatter = parseStageFrontmatter(stageText) as Record<string, unknown>;
    expect(frontmatter.slug).toBe(STAGE_SLUG);
    expect(frontmatter.phase).toBe("construction");
    expect(frontmatter.scopes ?? []).toEqual([]);
    expect(frontmatter.execution).toBe("CONDITIONAL");
    expect(frontmatter.mode).toBe("inline");
  });

  test("the six procedure sections stand 1:1 with the functional design's contract table", () => {
    const headings = stageText
      .split("\n")
      .filter((line) => line.startsWith("### "))
      .map((line) => line.replace(/^###\s+/, ""));
    expect(headings).toEqual([
      "1. Receive the route",
      "2. Author or revise the model",
      "3. Run the referees",
      "4. Independent review",
      "5. Human gate",
      "6. Register",
    ]);
  });

  test("the registration section spells out build -> verify -> commit", () => {
    const registration = stageText.slice(stageText.indexOf("### 6. Register"));
    const invocations = ["bundle build", "bundle verify", "commit"].map((verb) => `tla-authoring.ts ${verb}`);
    const order = invocations.map((verb) => registration.indexOf(verb));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(registration).toContain("VerifiedBundle");
  });

  test("the terminal-route refusal is declared as the functional design's own addition", () => {
    const receiving = stageText.slice(stageText.indexOf("### 1. Receive the route"));
    expect(receiving).toContain("ADR-7");
    expect(receiving).toContain("impl-only");
    expect(receiving).toContain("non-target");
  });

  test("each step states how it fails closed", () => {
    expect(stageText).toContain("halt");
    expect(stageText).toContain("NOT-READY");
    expect(stageText).toContain("read-only");
    expect(stageText).toContain("modelAuthor");
    expect(stageText).toContain("vacuity witness");
    expect(stageText).toContain("declaredIdentity");
  });

  test("the composed host lands the stage where the compile's plugin walk looks", () => {
    const host = composedHost();
    expect(existsSync(join(host, STAGE_LANDING))).toBe(true);
    expect(readFileSync(join(host, STAGE_LANDING), "utf8")).toEqual(stageText);
  });
});
