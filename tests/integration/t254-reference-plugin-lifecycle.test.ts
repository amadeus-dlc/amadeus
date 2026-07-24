// covers: file:scripts/plugin-projection.ts
// covers: file:scripts/plugin-composition.ts
// covers: file:scripts/package.ts
// size: medium
//
// U11 reference-plugin-and-guides (FR-6 items 21–22) — the single end-to-end
// fixture that connects the two halves of the plugin system through ONE canonical
// reference plugin, `test-pro`:
//
//   authoring source  →  six-harness projection (U09)  →  neutral bundle
//                      →  host compose → doctor → drop (U10).
//
// The canonical source lives at tests/fixtures/plugins/test-pro/ — the
// `plugins/<name>/` authoring layout, but OUTSIDE the repo-root plugins/ dir the
// real packager discovers. That keeps the shipped 0-plugin dist baseline
// byte-identical (repo-root plugins/ stays absent) while still exercising the
// full lifecycle: the fixture copies the source into a throwaway temp workspace
// and redirects AMADEUS_PLUGINS_ROOT / AMADEUS_DIST_ROOT (read at call time by
// package.ts), so nothing touches the real plugins/ or dist/. Every mutation is
// a temp dir removed in afterAll; Part D asserts the tracked tree keeps zero
// residue. Touches the real filesystem, hence `// size: medium` (integration
// tier, fs-tests-integration-first).
//
// This is the REFERENCE proof (test-pro is the real minimal example), not the
// mechanism unit tests (U09 t-plugin-projection*, U10 t252/t253) — no new runtime
// API is added here.

import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { checkNeutralBundle, writeNeutralBundle } from "../../scripts/package.ts";
import {
  applyPluginDrop,
  applyPluginPlan,
  createNodeBackend,
  createNodeLock,
  diagnosePlugins,
  discoverPlugins,
  type HostSnapshot,
  inspectPlugin,
  planPluginComposition,
  planPluginDrop,
  serializeStageSeams,
  type StageSeams,
  type ValidPlugin,
  type WorkspaceBackend,
  type WorkspaceTransaction,
} from "../../scripts/plugin-composition.ts";
import {
  buildPluginProjection,
  discoverPluginSources,
  type PackageHarness,
  PACKAGE_HARNESSES,
  type ProjectedArtifact,
  SELF_INSTALL_HARNESSES,
  validatePluginSources,
} from "../../scripts/plugin-projection.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CANONICAL_SOURCE = join(REPO_ROOT, "tests", "fixtures", "plugins", "test-pro");
const PLUGIN = "test-pro";
const TIMEOUT_MS = 120_000;

// The declared source artifact set — the closed set every projection must emit
// (namespaced under plugins/<name>/), nothing more.
const DECLARED_PATHS = [
  `plugins/${PLUGIN}/plugin.json`,
  `plugins/${PLUGIN}/skills/test-pro.md`,
  `plugins/${PLUGIN}/stages/test-pro-review.md`,
];

// A minimal host: one `code-generation` stage (the plugin's seam target) plus a
// SKILL.md carrying the plugin's fragment anchor. Mirrors the t253 shape but is
// driven by the canonical test-pro manifest rather than a synthetic plugin.
const HOST_STAGE_PATH = "stages/code-generation.md";
const BASE_SEAMS: StageSeams = {
  produces: ["code-summary"],
  consumes: [],
  sensors: ["linter"],
  required_sections: [],
};
const CG_BASE = serializeStageSeams("code-generation", BASE_SEAMS);
const ANCHOR = "<!-- amadeus:plugin-anchor -->";
const SKILL_BASE = Buffer.from(`# Host Skill\n${ANCHOR}\nfooter\n`, "utf-8");

let ws = "";
let pluginsRoot = "";
let emptyRoot = "";
let distRoot = "";
const savedEnv: Record<string, string | undefined> = {};

function setEnv(pRoot: string, dRoot: string): void {
  process.env.AMADEUS_PLUGINS_ROOT = pRoot;
  process.env.AMADEUS_DIST_ROOT = dRoot;
}

beforeAll(() => {
  savedEnv.AMADEUS_PLUGINS_ROOT = process.env.AMADEUS_PLUGINS_ROOT;
  savedEnv.AMADEUS_DIST_ROOT = process.env.AMADEUS_DIST_ROOT;
  ws = mkdtempSync(join(tmpdir(), "amadeus-u11-"));
  pluginsRoot = join(ws, "plugins");
  emptyRoot = join(ws, "empty-plugins");
  distRoot = join(ws, "dist");
  mkdirSync(pluginsRoot, { recursive: true });
  mkdirSync(emptyRoot, { recursive: true });
  // Copy the canonical reference source into the temp authoring root verbatim.
  cpSync(CANONICAL_SOURCE, join(pluginsRoot, PLUGIN), { recursive: true });
  setEnv(pluginsRoot, distRoot);
});

afterEach(() => {
  setEnv(pluginsRoot, distRoot);
  rmSync(join(distRoot, "plugins"), { recursive: true, force: true });
});

afterAll(() => {
  for (const k of ["AMADEUS_PLUGINS_ROOT", "AMADEUS_DIST_ROOT"] as const) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  rmSync(ws, { recursive: true, force: true });
});

function discoverCanonical() {
  return validatePluginSources(discoverPluginSources(pluginsRoot))[0];
}

// Write one harness's projection into a bundle dir laid out as
// <root>/<name>/... so U10 discoverPlugins reads it back through the node fs.
function writeProjectedBundle(root: string, artifacts: readonly ProjectedArtifact[]): void {
  for (const a of artifacts) {
    // relativePath is plugins/<name>/<rest>; discoverPlugins wants <name>/<rest>.
    const rel = a.relativePath.replace(/^plugins\//, "");
    const dest = join(root, rel);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, a.bytes);
  }
}

function seedHost(root: string): void {
  mkdirSync(join(root, "stages"), { recursive: true });
  writeFileSync(join(root, HOST_STAGE_PATH), CG_BASE);
  writeFileSync(join(root, "SKILL.md"), SKILL_BASE);
}

// Read model over the current on-disk host bytes + the backend's record.
function hostSnapshot(root: string, backend: WorkspaceBackend): HostSnapshot {
  const cg = { slug: "code-generation", path: HOST_STAGE_PATH, seams: BASE_SEAMS };
  const paths = new Set<string>();
  const files = new Map<string, Buffer>();
  for (const p of [HOST_STAGE_PATH, "SKILL.md", "stages/test-pro-review.md"]) {
    if (existsSync(join(root, p))) {
      paths.add(p);
      files.set(p, readFileSync(join(root, p)));
    }
  }
  return { stages: new Map([[cg.slug, cg]]), paths, files, composition: backend.readComposition() };
}

function makeTx(root: string, backend: WorkspaceBackend, verifyOk = true): WorkspaceTransaction {
  let n = 0;
  return {
    backend,
    verify: () => (verifyOk ? { ok: true } : { ok: false, reason: "compile failed" }),
    lock: createNodeLock(root),
    newTxnId: () => `txn-${++n}`,
  };
}

describe("t254 reference-plugin-and-guides — U11 FR-6 items 21–22", () => {
  // -----------------------------------------------------------------------
  // Part A — six-harness projection + neutral bundle (U09), driven by test-pro
  // -----------------------------------------------------------------------

  test("0-plugin baseline: empty source root projects nothing (byte-neutral)", () => {
    setEnv(emptyRoot, join(ws, "dist-empty"));
    expect(discoverPluginSources(emptyRoot)).toEqual([]);
    expect(checkNeutralBundle()).toEqual([]);
    writeNeutralBundle();
    expect(existsSync(join(ws, "dist-empty", "plugins"))).toBe(false);
  });

  test("every one of the six package faces projects exactly the declared set, deterministically", () => {
    const plugin = discoverCanonical();
    expect([...PACKAGE_HARNESSES]).toHaveLength(6);
    for (const harness of PACKAGE_HARNESSES) {
      const first = buildPluginProjection(plugin, harness);
      const second = buildPluginProjection(plugin, harness);
      const paths = first.artifacts.map((a) => a.relativePath).sort();
      expect(paths).toEqual(DECLARED_PATHS);
      // Determinism: same source + same face → byte-identical projection.
      expect(second.artifacts.map((a) => a.bytes.toString("base64"))).toEqual(
        first.artifacts.map((a) => a.bytes.toString("base64")),
      );
    }
  });

  test("prose is transformed per face; JSON stays verbatim", () => {
    const plugin = discoverCanonical();
    const skillOf = (h: PackageHarness) =>
      buildPluginProjection(plugin, h)
        .artifacts.find((a) => a.relativePath.endsWith("skills/test-pro.md"))!
        .bytes.toString("utf-8");
    // claude: bare {{HARNESS_DIR}} → .claude, rules dir unchanged.
    expect(skillOf("claude")).toContain(".claude and .claude/rules/test-pro");
    expect(skillOf("claude")).not.toContain("{{HARNESS_DIR}}");
    // kiro: {{HARNESS_DIR}} → .kiro, rules → steering rename.
    expect(skillOf("kiro")).toContain(".kiro and .kiro/steering/test-pro");
    // JSON manifest is copied verbatim (no token substitution).
    const claudeJson = buildPluginProjection(plugin, "claude")
      .artifacts.find((a) => a.relativePath.endsWith("plugin.json"))!
      .bytes.toString("utf-8");
    expect(claudeJson).toBe(readFileSync(join(CANONICAL_SOURCE, "plugin.json"), "utf-8"));
  });

  test(
    "neutral bundle materialises the declared set and is drift-clean",
    () => {
      writeNeutralBundle();
      for (const rel of DECLARED_PATHS) {
        expect(existsSync(join(distRoot, rel))).toBe(true);
      }
      // Neutral bundle is verbatim source (no token substitution).
      const bundledSkill = readFileSync(join(distRoot, `plugins/${PLUGIN}/skills/test-pro.md`), "utf-8");
      expect(bundledSkill).toContain("{{HARNESS_DIR}}");
      expect(checkNeutralBundle()).toEqual([]);
    },
    TIMEOUT_MS,
  );

  test("self-install stays the closed four faces (kiro/kiro-ide packaged, never promoted)", () => {
    const packageFaces = [...PACKAGE_HARNESSES] as string[];
    const selfInstallFaces = [...SELF_INSTALL_HARNESSES] as string[];
    expect([...selfInstallFaces].sort()).toEqual(["claude", "codex", "cursor", "opencode"]);
    for (const f of selfInstallFaces) expect(packageFaces).toContain(f);
    expect(packageFaces).toContain("kiro");
    expect(selfInstallFaces).not.toContain("kiro");
  });

  // -----------------------------------------------------------------------
  // Part B — compose → doctor → drop the projected claude bundle (U10)
  // -----------------------------------------------------------------------

  test("compose → doctor → drop through the projected claude bundle: declared-only create/detect/remove", () => {
    const bundleRoot = join(ws, "claude-bundle");
    const hostRoot = mkdtempSync(join(tmpdir(), "amadeus-u11-host-"));
    try {
      const plugin = discoverCanonical();
      writeProjectedBundle(bundleRoot, buildPluginProjection(plugin, "claude").artifacts);
      seedHost(hostRoot);
      const backend = createNodeBackend(hostRoot);

      // Discover the claude-transformed bundle back through the node fs.
      const descriptor = discoverPlugins(bundleRoot).find((d) => d.name === PLUGIN)!;
      expect(descriptor.manifest).not.toBeNull();

      const inspected = inspectPlugin(descriptor, hostSnapshot(hostRoot, backend));
      expect(inspected.kind).toBe("ready");
      if (inspected.kind !== "ready") return;

      const composed = applyPluginPlan(inspected.plan, makeTx(hostRoot, backend));
      expect(composed.kind).toBe("committed");

      // Declared stage file materialised — carrying the CLAUDE-transformed bytes.
      const ownedPath = join(hostRoot, "stages/test-pro-review.md");
      expect(existsSync(ownedPath)).toBe(true);
      const owned = readFileSync(ownedPath, "utf-8");
      expect(owned).toContain(".claude");
      expect(owned).not.toContain("{{HARNESS_DIR}}");
      // Seam merged and fragment spliced into the shared host files.
      expect(readFileSync(join(hostRoot, HOST_STAGE_PATH), "utf-8")).toContain("test-pro-lint");
      expect(readFileSync(join(hostRoot, "SKILL.md"), "utf-8")).toContain("test-pro-guide");

      // Doctor detects exactly the composed plugin.
      const diag = diagnosePlugins(hostSnapshot(hostRoot, backend));
      expect(diag).toHaveLength(1);
      expect(diag[0].plugin).toBe(PLUGIN);
      expect(diag[0].status).toBe("composed");

      // Drop reverses exactly the plugin's contribution — declared-only removal.
      const record = backend.readComposition().plugins.get(PLUGIN)!;
      const dropped = applyPluginDrop(planPluginDrop(record, hostSnapshot(hostRoot, backend)), makeTx(hostRoot, backend));
      expect(dropped.kind).toBe("committed");
      expect(existsSync(ownedPath)).toBe(false);
      expect(readFileSync(join(hostRoot, HOST_STAGE_PATH)).equals(CG_BASE)).toBe(true);
      expect(readFileSync(join(hostRoot, "SKILL.md")).equals(SKILL_BASE)).toBe(true);
      expect(backend.readComposition().plugins.size).toBe(0);
    } finally {
      rmSync(hostRoot, { recursive: true, force: true });
      rmSync(bundleRoot, { recursive: true, force: true });
    }
  });

  // -----------------------------------------------------------------------
  // Part C — failure invariants: three surfaces unchanged on rejection
  // -----------------------------------------------------------------------

  test("inspect reject (clobber on a pre-existing owned path) writes nothing", () => {
    const bundleRoot = join(ws, "claude-bundle-clobber");
    const hostRoot = mkdtempSync(join(tmpdir(), "amadeus-u11-clobber-"));
    try {
      const plugin = discoverCanonical();
      writeProjectedBundle(bundleRoot, buildPluginProjection(plugin, "claude").artifacts);
      seedHost(hostRoot);
      // Pre-place the plugin's owned path so the copy would clobber a user file.
      mkdirSync(join(hostRoot, "stages"), { recursive: true });
      writeFileSync(join(hostRoot, "stages/test-pro-review.md"), "USER FILE");
      const backend = createNodeBackend(hostRoot);

      const descriptor = discoverPlugins(bundleRoot).find((d) => d.name === PLUGIN)!;
      const result = inspectPlugin(descriptor, hostSnapshot(hostRoot, backend));
      expect(result.kind).toBe("rejected");
      if (result.kind === "rejected") {
        expect(result.errors.some((e) => e.kind === "clobber")).toBe(true);
      }
      // Three surfaces invariant: host bytes, record, audit all untouched.
      expect(readFileSync(join(hostRoot, "stages/test-pro-review.md"), "utf-8")).toBe("USER FILE");
      expect(readFileSync(join(hostRoot, HOST_STAGE_PATH)).equals(CG_BASE)).toBe(true);
      expect(readFileSync(join(hostRoot, "SKILL.md")).equals(SKILL_BASE)).toBe(true);
      expect(backend.readComposition().plugins.size).toBe(0);
      expect(backend.auditCount()).toBe(0);
    } finally {
      rmSync(hostRoot, { recursive: true, force: true });
      rmSync(bundleRoot, { recursive: true, force: true });
    }
  });

  test("temp-verify failure leaves the three surfaces byte-invariant", () => {
    const bundleRoot = join(ws, "claude-bundle-verify");
    const hostRoot = mkdtempSync(join(tmpdir(), "amadeus-u11-verify-"));
    try {
      const plugin = discoverCanonical();
      writeProjectedBundle(bundleRoot, buildPluginProjection(plugin, "claude").artifacts);
      seedHost(hostRoot);
      const backend = createNodeBackend(hostRoot);
      const descriptor = discoverPlugins(bundleRoot).find((d) => d.name === PLUGIN)!;
      const plan = planPluginComposition(descriptor as ValidPlugin, hostSnapshot(hostRoot, backend));

      const result = applyPluginPlan(plan, makeTx(hostRoot, backend, false));
      expect(result.kind).toBe("failed");
      expect(existsSync(join(hostRoot, "stages/test-pro-review.md"))).toBe(false);
      expect(readFileSync(join(hostRoot, HOST_STAGE_PATH)).equals(CG_BASE)).toBe(true);
      expect(readFileSync(join(hostRoot, "SKILL.md")).equals(SKILL_BASE)).toBe(true);
      expect(backend.auditCount()).toBe(0);
      expect(backend.readJournal()).toBeUndefined();
    } finally {
      rmSync(hostRoot, { recursive: true, force: true });
      rmSync(bundleRoot, { recursive: true, force: true });
    }
  });

  // -----------------------------------------------------------------------
  // Part D — no residue in the tracked tree (0-plugin baseline preserved)
  // -----------------------------------------------------------------------

  test("the test-pro reference fixture leaves no residue in the tracked tree", () => {
    // The canonical reference source lives under tests/fixtures/, never repo-root
    // plugins/, and every mutation of Parts A–C targets temp dirs (AMADEUS_*_ROOT
    // redirected). So test-pro never appears in the real repo-root plugins/ or the
    // shipped neutral bundle. (repo-root plugins/ and dist/plugins/ are no longer
    // globally absent: intent 260722-tla-plugin ships the formal-model-check
    // plugin as a neutral bundle there — but that is a DIFFERENT plugin; this
    // guard is scoped to test-pro's non-pollution.)
    expect(existsSync(join(REPO_ROOT, "plugins", PLUGIN))).toBe(false);
    expect(existsSync(join(REPO_ROOT, "dist", "plugins", PLUGIN))).toBe(false);
  });
});
