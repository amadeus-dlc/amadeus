import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import { canonicalIdentity } from "../../scripts/formal-verif/canonical.ts";
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
const SENSOR_SCRIPT_DIR = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "tools",
);
const SENSORS_DIR = join(REPO_ROOT, "packages", "framework", "core", "sensors");
const SENSOR_HOOK = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "hooks",
  "amadeus-sensor-fire.ts",
);
const roots: string[] = [];

function shardName(): string {
  const host =
    hostname()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "host";
  return `${host}-testcloneid.md`;
}

function project(): {
  root: string;
  implPath: string;
  graphPath: string;
} {
  const root = createTestProject();
  roots.push(root);
  mkdirSync(join(root, "scripts", "formal-verif"), { recursive: true });
  mkdirSync(join(root, "specs", "tla"), { recursive: true });
  mkdirSync(join(root, "packages", "framework", "core", "tools"), {
    recursive: true,
  });
  mkdirSync(join(root, ".claude", "tools"), { recursive: true });
  for (const file of ["tla-model-map.ts", "canonical.ts", "contract.ts"]) {
    copyFileSync(
      join(REPO_ROOT, "scripts", "formal-verif", file),
      join(root, "scripts", "formal-verif", file),
    );
  }
  const model = "---- MODULE FormalElection ----\n====\n";
  const cfg = "SPECIFICATION Spec\n";
  const implRelative =
    "packages/framework/core/tools/amadeus-election.ts";
  const implPath = join(root, implRelative);
  const impl = "export const election = true;\n";
  writeFileSync(join(root, "specs", "tla", "FormalElection.tla"), model);
  writeFileSync(join(root, "specs", "tla", "FormalElection.cfg"), cfg);
  writeFileSync(implPath, impl);
  writeFileSync(
    join(root, "specs", "tla", "model-map.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        model: {
          path: "specs/tla/FormalElection.tla",
          identity: canonicalIdentity(
            model,
            "amadeus.formal-verif.tla.module.v1",
          ).sha256,
        },
        cfg: {
          path: "specs/tla/FormalElection.cfg",
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
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    seededStateFile(root),
    "- **Workflow**: feature\n- **Current Stage**: code-generation\n",
  );
  mkdirSync(seededAuditDir(root), { recursive: true });
  writeFileSync(join(seededAuditDir(root), shardName()), "# Audit\n");
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
            path: ".claude/sensors/amadeus-model-completeness.md",
            kind: "deterministic",
            matches:
              "**/{specs/tla/**,packages/framework/core/tools/amadeus-election*.ts}",
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
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => readFileSync(join(dir, file), "utf-8"))
    .join("\n");
}

afterEach(() => {
  for (const root of roots.splice(0)) cleanupTestProject(root);
});

describe("model-completeness sensor E2E", () => {
  test("core toolとmanifestが全6 harness mirrorへ同期される", () => {
    for (const [name, harnessDir] of [
      ["claude", ".claude"],
      ["codex", ".codex"],
      ["cursor", ".cursor"],
      ["kiro", ".kiro"],
      ["kiro-ide", ".kiro"],
      ["opencode", ".opencode"],
    ]) {
      const root = join(REPO_ROOT, "dist", name, harnessDir);
      const tool = join(root, "tools", "amadeus-sensor-model-completeness.ts");
      const manifest = join(root, "sensors", "amadeus-model-completeness.md");
      expect(existsSync(tool)).toBe(true);
      expect(existsSync(manifest)).toBe(true);
      expect(readFileSync(manifest, "utf-8")).toContain(
        `command: bun ${harnessDir}/tools/amadeus-sensor-model-completeness.ts`,
      );
    }
  });

  test("Domain Entities・manifest・U1 map・plan/summary・PostToolUse境界がcanonical globへ一致する", () => {
    const canonicalGlob =
      "packages/framework/core/tools/amadeus-election*.ts";
    const files = [
      join(
        REPO_ROOT,
        "amadeus/spaces/default/intents/260722-tla-plugin/construction/completeness-sensor/functional-design/domain-entities.md",
      ),
      join(
        REPO_ROOT,
        "packages/framework/core/sensors/amadeus-model-completeness.md",
      ),
      join(
        REPO_ROOT,
        "amadeus/spaces/default/intents/260722-tla-plugin/construction/completeness-sensor/code-generation/code-generation-plan.md",
      ),
      join(
        REPO_ROOT,
        "amadeus/spaces/default/intents/260722-tla-plugin/construction/completeness-sensor/code-generation/code-summary.md",
      ),
    ];
    for (const file of files) {
      expect(readFileSync(file, "utf-8")).toContain(canonicalGlob);
    }
    const map = JSON.parse(
      readFileSync(join(REPO_ROOT, "specs/tla/model-map.json"), "utf-8"),
    );
    expect(
      map.entries.every(
        (entry: { implPath: string }) =>
          entry.implPath.startsWith(
            "packages/framework/core/tools/amadeus-election",
          ) && entry.implPath.endsWith(".ts"),
      ),
    ).toBe(true);
    const p = project();
    expect(readFileSync(p.graphPath, "utf-8")).toContain(canonicalGlob);
  });

  test("dispatcher fireが同期状態をpaired SENSOR_PASSEDへ到達させる", () => {
    const p = project();
    const result = fire(p.root, p.graphPath, p.implPath);
    expect(result.status).toBe(0);
    const trail = audit(p.root);
    expect(trail).toContain("**Event**: SENSOR_FIRED");
    expect(trail).toContain("**Event**: SENSOR_PASSED");
    const fireIds = [...trail.matchAll(/\*\*Fire id\*\*: ([0-9a-f]{8})/g)].map(
      (match) => match[1],
    );
    expect(fireIds).toHaveLength(2);
    expect(fireIds[0]).toBe(fireIds[1]);
  });

  test("実drift注入がSENSOR_FAILEDとredacted detailへ到達する", () => {
    const p = project();
    writeFileSync(p.implPath, "secret-drift-content\n");
    const result = fire(p.root, p.graphPath, p.implPath);
    expect(result.status).toBe(0);
    const trail = audit(p.root);
    expect(trail).toContain("**Event**: SENSOR_FAILED");
    expect(trail).toContain("**Findings count**: 1");
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
    rmSync(join(p.root, "specs", "tla", "model-map.json"));
    const result = fire(p.root, p.graphPath, p.implPath);
    expect(result.status).toBe(0);
    expect(audit(p.root)).toContain("**Event**: SENSOR_FAILED");
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
      timeout: 30_000,
    });
    expect(result.status).toBe(0);
    expect(audit(p.root)).toContain("**Event**: SENSOR_PASSED");
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
