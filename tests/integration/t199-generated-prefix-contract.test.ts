// t199-generated-prefix-contract: authored files follow the framework prefix.
//
// This is the RED/GREEN guard for the upcoming public rename. Generated dist
// files are excluded because they are rebuilt by the packager. Every tracked
// authored file outside dist is checked by path and by bytes.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const prefix = "amadeus-";
const commandName = prefix.replace(/-$/, "");
const commonDirName = `${prefix}common`;
const knownPrefixes = [
  ["ai", "dlc", "-"].join(""),
  ["amadeus", "-"].join(""),
] as const;
const forbiddenPrefixes = knownPrefixes.filter((known) => known !== prefix);
// The migrator, its generated self-install copies, exact token fixture,
// compatibility documents, and upstream-sync skill deliberately quote upstream
// paths and filenames. Keep the exemption content-only: authored paths still
// follow this repository's naming contract, and tracked-file assertions prevent
// stale rows.
const foreignPrefixContentAllowlist = new Set([
  "packages/framework/core/tools/amadeus-migrate.ts",
  ".claude/tools/amadeus-migrate.ts",
  ".codex/tools/amadeus-migrate.ts",
  ".cursor/tools/amadeus-migrate.ts",
  ".opencode/tools/amadeus-migrate.ts",
  "docs/research/upstream-ai-dlc-v2.2.0-amadeus-main-workspace-differences.md",
  "docs/research/upstream-ai-dlc-v2.2.0-amadeus-main-workspace-differences.ja.md",
  "docs/guide/18-migrating-upstream-v2.md",
  "docs/guide/18-migrating-upstream-v2.ja.md",
  "contrib/skills/amadeus-upstream-sync/SKILL.md",
  "contrib/skills/amadeus-upstream-sync/evals/evals.json",
  "contrib/skills/amadeus-upstream-sync/references/artifact-contracts.md",
  ".claude/skills/amadeus-upstream-sync/SKILL.md",
  ".claude/skills/amadeus-upstream-sync/references/artifact-contracts.md",
  ".agents/skills/amadeus-upstream-sync/SKILL.md",
  ".agents/skills/amadeus-upstream-sync/references/artifact-contracts.md",
  "tests/fixtures/upstream-v2-migration/operational-tokens.txt",
]);

function allowsForeignPrefixContent(file: string): boolean {
  return (
    foreignPrefixContentAllowlist.has(file) ||
    /^amadeus\/spaces\/[^/]+\/(?:codekb|intents\/[^/]+)\//.test(file) ||
    file.startsWith("docs/research/upstream-sync/")
  );
}

function foreignPrefixViolations(file: string, body: Buffer): string[] {
  const offenders: string[] = [];
  for (const forbidden of forbiddenPrefixes) {
    if (file.includes(forbidden)) offenders.push(`${file}: path contains ${forbidden}`);
    if (body.includes(Buffer.from(forbidden)) && !allowsForeignPrefixContent(file)) {
      offenders.push(`${file}: content contains ${forbidden}`);
    }
  }
  return offenders;
}
const previousCommandName = ["ai", "dlc"].join("");
const previousEnvPrefix = ["AI", "DLC", "_"].join("");
const forbiddenToolSurfaces = [
  {
    label: "legacy skill discovery name",
    pattern: new RegExp(`/skills\`?\\s*(?:→|->)\\s*${previousCommandName}`),
  },
  {
    label: "legacy Kiro agent config name",
    pattern: new RegExp(`${previousCommandName}\\.json`),
  },
  {
    label: "legacy skill path",
    pattern: new RegExp(`skills/${previousCommandName}`),
  },
  {
    label: "legacy skill path segments",
    pattern: new RegExp(`["']skills["'],\\s*["']${previousCommandName}["']`),
  },
  {
    label: "legacy rules source filename",
    pattern: new RegExp(`rules-${previousCommandName}`),
  },
  {
    label: "legacy Claude rules stub filename",
    pattern: new RegExp(`${previousCommandName}\\.md`),
  },
  {
    label: "legacy Kiro default agent",
    pattern: new RegExp(`chat\\.defaultAgent[^\\n]*${previousCommandName}`),
  },
  {
    label: "legacy agent name",
    pattern: new RegExp(`"name"\\s*:\\s*"${previousCommandName}"`),
  },
  {
    label: "legacy direct invocation name",
    pattern: new RegExp(`@${previousCommandName}(?!/)`),
  },
  {
    label: "legacy CLI version output",
    pattern: new RegExp(`${previousCommandName} <`),
  },
  {
    label: "legacy log prefix",
    pattern: new RegExp(`\\[${previousCommandName}\\]`),
  },
  {
    label: "legacy environment variable prefix",
    pattern: new RegExp(`${previousEnvPrefix}[A-Z0-9_]+`),
  },
] as const;

function trackedAuthoredFiles(): string[] {
  const res = spawnSync("git", ["ls-files", "-z"], {
    cwd: REPO_ROOT,
    encoding: "buffer",
  });
  expect(res.status).toBe(0);
  return Buffer.from(res.stdout)
    .toString("utf-8")
    .split("\0")
    .filter((file) => file.length > 0)
    .filter((file) => !file.startsWith("dist/"))
    .filter((file) => existsSync(join(REPO_ROOT, file)))
    .filter((file) => lstatSync(join(REPO_ROOT, file)).isFile())
    .sort();
}

describe("authored source naming prefix contract", () => {
  test("versioned workflow records may quote foreign framework prefixes as evidence", () => {
    expect(
      allowsForeignPrefixContent(
        "amadeus/spaces/default/intents/260720-upstream-sync-230/inception/requirements-analysis/requirements.md",
      ),
    ).toBe(true);
  });

  test("versioned code knowledge records may quote foreign framework prefixes as evidence", () => {
    expect(
      allowsForeignPrefixContent(
        "amadeus/spaces/default/codekb/amadeus/business-overview.md",
      ),
    ).toBe(true);
  });

  test("upstream research records may quote foreign framework prefixes as evidence", () => {
    expect(
      allowsForeignPrefixContent(
        "docs/research/upstream-sync/reports/v2.2.0-to-v2.3.0-plan.md",
      ),
    ).toBe(true);
  });

  test("ordinary authored source content does not gain the evidence exemption", () => {
    const foreignPrefix = forbiddenPrefixes[0];
    expect(
      foreignPrefixViolations(
        "packages/framework/core/tools/example.ts",
        Buffer.from(`const legacyName = "${foreignPrefix}example";`),
      ),
    ).toEqual([
      `packages/framework/core/tools/example.ts: content contains ${foreignPrefix}`,
    ]);
  });

  test("foreign prefixes remain forbidden in evidence record paths", () => {
    const foreignPrefix = forbiddenPrefixes[0];
    const evidencePath = `docs/research/upstream-sync/${foreignPrefix}report.md`;
    expect(
      foreignPrefixViolations(
        evidencePath,
        Buffer.from(`Evidence quotes ${foreignPrefix}report.md`),
      ),
    ).toEqual([
      `${evidencePath}: path contains ${foreignPrefix}`,
    ]);
  });

  test("tracked authored files include the prefixed framework surfaces", () => {
    const tracked = trackedAuthoredFiles();
    expect(tracked).toContain(`packages/framework/core/${commonDirName}/conductor.md`);
    expect(tracked).toContain(`packages/framework/core/tools/${prefix}utility.ts`);
    expect(tracked).toContain(`packages/framework/core/hooks/${prefix}stop.ts`);
    expect(tracked).toContain(`packages/framework/core/agents/${prefix}developer-agent.md`);
    expect(tracked).toContain(`packages/framework/core/sensors/${prefix}type-check.md`);
    expect(tracked).toContain(`packages/framework/core/scopes/${prefix}feature.md`);
    expect(tracked).toContain(`packages/framework/core/skills/${prefix}replay/SKILL.md`);
    expect(tracked).toContain(`packages/framework/harness/claude/skills/${commandName}/SKILL.md`);
    for (const file of foreignPrefixContentAllowlist) expect(tracked).toContain(file);
  });

  test("tracked authored file paths and contents do not retain another known framework prefix", () => {
    const offenders: string[] = [];
    for (const file of trackedAuthoredFiles()) {
      const body = readFileSync(join(REPO_ROOT, file));
      offenders.push(...foreignPrefixViolations(file, body));
    }
    expect(offenders).toEqual([]);
  });

  test("tracked authored file paths and contents do not retain legacy tool surfaces", () => {
    const offenders: string[] = [];
    for (const file of trackedAuthoredFiles()) {
      const body = readFileSync(join(REPO_ROOT, file), "utf-8");
      for (const { label, pattern } of forbiddenToolSurfaces) {
        if (pattern.test(file)) offenders.push(`${file}: path contains ${label}`);
        if (
          !foreignPrefixContentAllowlist.has(file) &&
          pattern.test(body)
        ) {
          offenders.push(`${file}: content contains ${label}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
