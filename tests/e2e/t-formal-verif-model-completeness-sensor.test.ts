import { scaleTestTime } from "../lib/test-time-factor.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import { KNOWN_HARNESS_DIRS } from "../../packages/framework/core/tools/amadeus-harness.ts";
import { PACKAGE_HARNESS_IDS } from "../../packages/framework/core/tools/amadeus-harness-registry.ts";
import { matchesGlob } from "../../packages/framework/core/tools/amadeus-sensor.ts";
import { canonicalIdentity } from "../../plugins/formal-model-check/tools/canonical.ts";
import { type NormalizedAuditRecord, auditRowsFrom } from "../harness/audit-records.ts";
import {
  cleanupTestProject,
  createTestProject,
  seededAuditDir,
  seededRecordDir,
  seededStateFile,
} from "../harness/fixtures.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const SENSOR_DISPATCHER = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "tools",
  "amadeus-sensor.ts",
);
// #2890 moved both faces of this sensor out of core — the manifest from
// packages/framework/core/sensors/ and the per-sensor script from
// packages/framework/core/tools/ — into the formal-model-check plugin bundle.
// The dispatcher still finds them through the same two seams it always used
// (AMADEUS_SENSORS_DIR for manifests, AMADEUS_SENSOR_SCRIPT_DIR for scripts);
// only the directories they point at moved.
const PLUGIN_ROOT = join(REPO_ROOT, "plugins", "formal-model-check");
const SENSOR_SCRIPT_DIR = join(PLUGIN_ROOT, "tools");
const SENSORS_DIR = join(PLUGIN_ROOT, "sensors");
const SENSOR_MANIFEST_BASENAME = "amadeus-model-completeness.md";
const SENSOR_SCRIPT_BASENAME = "amadeus-sensor-model-completeness.ts";
const SENSOR_MANIFEST = join(SENSORS_DIR, SENSOR_MANIFEST_BASENAME);
const MODEL_MAP_RELATIVE = "amadeus/spaces/default/specs/tla/model-map.json";
const SENSOR_HOOK = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "hooks",
  "amadeus-sensor-fire.ts",
);
const roots: string[] = [];

/** The per-harness bundle the packager emits for the plugin that owns this
 *  sensor. Replaces the pre-#2890 `dist/<harness>/<harnessDir>/{sensors,tools}`
 *  mirror, which no longer carries either face. */
function projectedBundle(harness: string): string {
  return join(
    REPO_ROOT,
    "dist",
    "plugins",
    "formal-model-check",
    harness,
    "plugins",
    "formal-model-check",
  );
}

/** Read one scalar frontmatter key off a sensor manifest. Fails closed: an
 *  unreadable frontmatter or a missing key is an unknown state, not a pass. */
function manifestField(manifestPath: string, key: string): string {
  const raw = readFileSync(manifestPath, "utf-8");
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!frontmatter) throw new Error(`${manifestPath} has no YAML frontmatter block`);
  const field = new RegExp(`^${key}:[ \\t]*(.+)$`, "m").exec(frontmatter[1] ?? "");
  if (!field) throw new Error(`${manifestPath} declares no ${key}`);
  return (field[1] ?? "").trim().replace(/^(['"])([\s\S]*)\1$/, "$2");
}

function shardName(): string {
  const host =
    hostname()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "host";
  return `${host}-testcloneid.jsonl`;
}

function project(): {
  root: string;
  implPath: string;
  graphPath: string;
} {
  const root = createTestProject();
  roots.push(root);
  mkdirSync(join(root, "amadeus", "spaces", "default", "specs", "tla"), { recursive: true });
  mkdirSync(join(root, "packages", "framework", "core", "tools"), {
    recursive: true,
  });
  mkdirSync(join(root, ".claude", "tools"), { recursive: true });
  const model = "---- MODULE FormalElection ----\n====\n";
  const cfg = "SPECIFICATION Spec\n";
  const implRelative =
    "packages/framework/core/tools/amadeus-election.ts";
  const implPath = join(root, implRelative);
  const impl = "export const election = true;\n";
  writeFileSync(join(root, "amadeus", "spaces", "default", "specs", "tla", "FormalElection.tla"), model);
  writeFileSync(join(root, "amadeus", "spaces", "default", "specs", "tla", "FormalElection.cfg"), cfg);
  writeFileSync(implPath, impl);
  writeFileSync(
    join(root, "amadeus", "spaces", "default", "specs", "tla", "model-map.json"),
    `${JSON.stringify(
      {
        schemaVersion: 2,
        models: [
          {
            name: "FormalElection",
            model: {
              path: "amadeus/spaces/default/specs/tla/FormalElection.tla",
              identity: canonicalIdentity(
                model,
                "amadeus.formal-verif.tla.module.v1",
              ).sha256,
            },
            cfg: {
              path: "amadeus/spaces/default/specs/tla/FormalElection.cfg",
              identity: canonicalIdentity(
                cfg,
                "amadeus.formal-verif.tla.cfg.v1",
              ).sha256,
            },
            entries: [
              {
                implPath: implRelative,
                sha256: Bun.CryptoHasher.hash("sha256", impl, "hex"),
              },
            ],
          },
        ],
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    seededStateFile(root),
    "- **Workflow**: feature\n- **Current Stage**: code-generation\n",
  );
  mkdirSync(seededAuditDir(root), { recursive: true });
  // The JSONL ledger carries no header — an empty shard is the "trail exists"
  // precondition the sensor dispatcher gates on.
  writeFileSync(join(seededAuditDir(root), shardName()), "");
  const graphPath = join(root, "stage-graph.json");
  writeFileSync(
    graphPath,
    JSON.stringify([
      {
        slug: "code-generation",
        number: "3.5",
        name: "Code Generation",
        phase: "construction",
        execution: "ALWAYS",
        lead_agent: "amadeus-developer-agent",
        support_agents: [],
        mode: "inline",
        produces: [],
        consumes: [],
        requires_stage: [],
        inputs: "",
        outputs: "",
        rules_in_context: [],
        sensors_applicable: [
          {
            id: "model-completeness",
            // Post-#2890 the manifest is plugin-owned, and post-#3364 its
            // `matches` glob covers every registered model-map entry rather
            // than the single U1 branch. Both are read off the shipped
            // manifest so the fixture cannot drift from what compile emits.
            path: `plugins/formal-model-check/sensors/${SENSOR_MANIFEST_BASENAME}`,
            kind: "deterministic",
            matches: manifestField(SENSOR_MANIFEST, "matches"),
            default_severity: "advisory",
          },
        ],
      },
    ]),
  );
  const wrapper = [
    `import { main } from ${JSON.stringify(SENSOR_DISPATCHER)};`,
    "main();",
    "",
  ].join("\n");
  writeFileSync(join(root, ".claude", "tools", "amadeus-sensor.ts"), wrapper);
  return { root, implPath, graphPath };
}

function environment(root: string, graphPath: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    CLAUDE_PROJECT_DIR: root,
    AMADEUS_STAGE_GRAPH: graphPath,
    AMADEUS_SENSORS_DIR: SENSORS_DIR,
    AMADEUS_SENSOR_SCRIPT_DIR: SENSOR_SCRIPT_DIR,
  };
}

function fire(
  root: string,
  graphPath: string,
  outputPath: string,
): ReturnType<typeof spawnSync> {
  return spawnSync(
    process.execPath,
    [
      SENSOR_DISPATCHER,
      "fire",
      "model-completeness",
      "--stage",
      "code-generation",
      "--output-path",
      outputPath,
      "--project-dir",
      root,
    ],
    {
      cwd: root,
      env: environment(root, graphPath),
      encoding: "utf-8",
    },
  );
}

function audit(root: string): string {
  const dir = seededAuditDir(root);
  return readdirSync(dir)
    .filter((file) => file.endsWith(".jsonl"))
    .sort()
    .map((file) => readFileSync(join(dir, file), "utf-8"))
    .join("\n");
}

/** Parse the merged JSONL shards into records (blank lines skipped). */
function auditRecords(root: string): NormalizedAuditRecord[] {
  return auditRowsFrom(audit(root));
}

afterEach(() => {
  for (const root of roots.splice(0)) cleanupTestProject(root);
});

describe("model-completeness sensor E2E", () => {
  // Pre-#2890 this asserted that the CORE-owned manifest and script reached
  // every harness mirror under dist/<harness>/<harnessDir>/{sensors,tools}.
  // #2890 moved both faces into the formal-model-check bundle, so that mirror
  // is no longer their delivery path — the packager's per-harness plugin
  // projection is. The check follows the files: same "every shipped face
  // carries both, with a harness-resolved command" contract, new location, plus
  // the negative half proving the core mirror really did give up ownership.
  test("plugin bundleのmanifestとtoolが全package harness projectionへ同期される", () => {
    expect(PACKAGE_HARNESS_IDS.length).toBeGreaterThan(0);
    for (const harness of PACKAGE_HARNESS_IDS) {
      const bundle = projectedBundle(harness);
      const manifest = join(bundle, "sensors", SENSOR_MANIFEST_BASENAME);
      expect(existsSync(join(bundle, "tools", SENSOR_SCRIPT_BASENAME))).toBe(true);
      expect(existsSync(manifest)).toBe(true);

      // The authoring manifest carries a `{{HARNESS_DIR}}` placeholder; every
      // projected face must have it resolved to that face's harness dir.
      const command = manifestField(manifest, "command");
      expect(command).not.toContain("{{HARNESS_DIR}}");
      const [runner, script] = command.split(/\s+/);
      expect(runner).toBe("bun");
      const [harnessDir, ...rest] = (script ?? "").split("/");
      expect(KNOWN_HARNESS_DIRS as readonly string[]).toContain(harnessDir);
      expect(rest.join("/")).toBe(
        `plugins/formal-model-check/tools/${SENSOR_SCRIPT_BASENAME}`,
      );

      // Ownership moved: the core face ships neither face of this sensor.
      const coreFace = join(REPO_ROOT, "dist", harness, harnessDir ?? "");
      expect(existsSync(coreFace)).toBe(true);
      expect(existsSync(join(coreFace, "sensors", SENSOR_MANIFEST_BASENAME))).toBe(false);
      expect(existsSync(join(coreFace, "tools", SENSOR_SCRIPT_BASENAME))).toBe(false);
    }
  });

  // Pre-#3364 the canonical glob was one literal (`packages/framework/core/
  // tools/amadeus-election*.ts`) that the manifest, the U1 model map, and the
  // 260722-tla-plugin design record all spelled out, so string equality across
  // those four files was the agreement check. #3364 widened the glob to cover
  // every registered model-map entry, which turns literal equality into the
  // wrong predicate: COVERAGE is now the contract.
  //
  // The intent record is deliberately no longer a party to it. Those artifacts
  // are frozen — they record what was decided at U1 and must not be rewritten
  // when the live spec moves — so gating the current spec on them can only be
  // discharged by editing history. The live participants that replace them are
  // the per-harness projections of the manifest, which must all ship the
  // identical glob.
  test("manifest・model map・harness projection・PostToolUse境界がcanonical globへ一致する", () => {
    const canonicalGlob = manifestField(SENSOR_MANIFEST, "matches");

    // Every governed entry is selected, via the PRODUCTION matcher — the
    // dispatcher and the PostToolUse hook both apply it to an absolute path.
    const map = JSON.parse(
      readFileSync(join(REPO_ROOT, MODEL_MAP_RELATIVE), "utf-8"),
    ) as { models: { entries: { implPath: string }[] }[] };
    const registered = [
      ...new Set(map.models.flatMap((model) => model.entries.map((e) => e.implPath))),
    ].sort();
    expect(registered.length).toBeGreaterThan(0);
    expect(
      registered.filter((implPath) => !matchesGlob(canonicalGlob, join(REPO_ROOT, implPath))),
    ).toEqual([]);

    // The spec-asset branch still fires the sensor on map/model edits.
    expect(matchesGlob(canonicalGlob, join(REPO_ROOT, MODEL_MAP_RELATIVE))).toBe(true);

    // Projection fidelity: one glob, byte-identical on every shipped face.
    for (const harness of PACKAGE_HARNESS_IDS) {
      expect(
        manifestField(join(projectedBundle(harness), "sensors", SENSOR_MANIFEST_BASENAME), "matches"),
      ).toBe(canonicalGlob);
    }

    // PostToolUse boundary: the glob the hook reads off the stage-graph node
    // selects the canonical implementation path and rejects an unrelated one.
    const p = project();
    expect(readFileSync(p.graphPath, "utf-8")).toContain(canonicalGlob);
    expect(matchesGlob(canonicalGlob, p.implPath)).toBe(true);
    expect(matchesGlob(canonicalGlob, join(p.root, "README.md"))).toBe(false);
  });

  test("dispatcher fireが同期状態をpaired SENSOR_PASSEDへ到達させる", () => {
    const p = project();
    const result = fire(p.root, p.graphPath, p.implPath);
    expect(result.status).toBe(0);
    const records = auditRecords(p.root);
    expect(records.some((r) => r.event === "SENSOR_FIRED")).toBe(true);
    expect(records.some((r) => r.event === "SENSOR_PASSED")).toBe(true);
    const fireIds = records
      .map((r) => r.fields?.["Fire id"])
      .filter((id): id is string => id !== undefined);
    expect(fireIds).toHaveLength(2);
    expect(fireIds[0]).toBe(fireIds[1]);
  });

  test("実drift注入がSENSOR_FAILEDとredacted detailへ到達する", () => {
    const p = project();
    writeFileSync(p.implPath, "secret-drift-content\n");
    const result = fire(p.root, p.graphPath, p.implPath);
    expect(result.status).toBe(0);
    // Record-scoped: the findings count rides on the SENSOR_FAILED record.
    const failed = auditRecords(p.root).filter((r) => r.event === "SENSOR_FAILED");
    expect(failed).toHaveLength(1);
    expect(failed[0]!.fields?.["Findings count"]).toBe("1");
    const detail = join(
      seededRecordDir(p.root),
      ".amadeus-sensors",
      "code-generation",
    );
    const detailBody = readdirSync(detail)
      .map((file) => readFileSync(join(detail, file), "utf-8"))
      .join("\n");
    expect(detailBody).toContain(
      "packages/framework/core/tools/amadeus-election.ts",
    );
    expect(detailBody).not.toContain("secret-drift-content");
    const findingsJson = detailBody.split("## Findings")[1] ?? "";
    expect(findingsJson).not.toContain(p.root);
  });

  test("map不在をscript-error passにせずSENSOR_FAILEDにする", () => {
    const p = project();
    rmSync(join(p.root, "amadeus", "spaces", "default", "specs", "tla", "model-map.json"));
    const result = fire(p.root, p.graphPath, p.implPath);
    expect(result.status).toBe(0);
    expect(auditRecords(p.root).some((r) => r.event === "SENSOR_FAILED")).toBe(true);
  });

  test("manifest matchesは無関係pathをaudit前に拒否する", () => {
    const p = project();
    const unrelated = join(p.root, "README.md");
    writeFileSync(unrelated, "unrelated\n");
    const before = audit(p.root);
    const result = fire(p.root, p.graphPath, unrelated);
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain("does not match");
    expect(audit(p.root)).toBe(before);
  });

  test("PostToolUse hookがcanonical実装pathで実dispatcherをfireする", () => {
    const p = project();
    const input = JSON.stringify({
      tool_name: "Write",
      tool_input: { file_path: p.implPath },
    });
    const result = spawnSync(process.execPath, [SENSOR_HOOK], {
      cwd: p.root,
      input,
      env: environment(p.root, p.graphPath),
      encoding: "utf-8",
      timeout: scaleTestTime(30_000),
    });
    expect(result.status).toBe(0);
    expect(auditRecords(p.root).some((r) => r.event === "SENSOR_PASSED")).toBe(true);
    expect(
      existsSync(
        join(
          seededRecordDir(p.root),
          ".amadeus-hooks-health",
          "sensor-fire.last",
        ),
      ),
    ).toBe(true);
  });
});
