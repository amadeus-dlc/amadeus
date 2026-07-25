// covers: cli:amadeus-migrate(dry-run)

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createUpstreamV2Fixture,
  type UpstreamV2Fixture,
  UPSTREAM_WORKSPACE_NAME,
} from "../helpers/upstream-v2-fixture.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const MIGRATE_TOOL = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "tools",
  "amadeus-migrate.ts",
);
const fixtures: UpstreamV2Fixture[] = [];

function fixture(): UpstreamV2Fixture {
  const created = createUpstreamV2Fixture();
  fixtures.push(created);
  return created;
}

function setHarness(project: UpstreamV2Fixture, fields: string): void {
  const state = readFileSync(project.statePath, "utf-8").replace(
    /(^- \*\*Active Agent\*\*:.*$)/m,
    `$1\n${fields}`,
  );
  writeFileSync(project.statePath, state, "utf-8");
  project.commitAll("test: set migration harness provenance");
}

function declareUpstreamVersion(
  project: UpstreamV2Fixture,
  version: string,
): void {
  const toolsRoot = join(project.projectDir, ".codex", "tools");
  mkdirSync(toolsRoot, { recursive: true });
  writeFileSync(
    join(toolsRoot, `${UPSTREAM_WORKSPACE_NAME}-version.ts`),
    `export const ${["AI", "DLC_VERSION"].join("")} = "${version}";\n`,
    "utf-8",
  );
  project.commitAll("test: declare upstream version");
}

function migrate(project: UpstreamV2Fixture): {
  status: number;
  report: Record<string, unknown>;
} {
  const result = spawnSync(
    process.execPath,
    [
      MIGRATE_TOOL,
      "--project-dir",
      project.projectDir,
      "--from",
      project.sourceRoot,
      "--json",
    ],
    {
      cwd: project.projectDir,
      encoding: "utf-8",
      timeout: 20_000,
    },
  );
  return {
    status: result.status ?? -1,
    report: JSON.parse(result.stdout) as Record<string, unknown>,
  };
}

afterEach(() => {
  for (const project of fixtures.splice(0)) project.cleanup();
});

describe("migration Harness validation through the public CLI", () => {
  test.each([
    ["invalid value", "- **Harness**: invalid-raw"],
    ["duplicate fields", "- **Harness**: codex\n- **Harness**: manual"],
  ])("refuses %s", (_label, fields) => {
    const project = fixture();
    setHarness(project, fields);

    const result = migrate(project);

    expect(result.status).not.toBe(0);
    expect(result.report.status).toBe("refused");
    expect(JSON.stringify(result.report).toLowerCase()).toMatch(
      /harness|state validation/,
    );
  });

  test("accepts one canonical Harness value", () => {
    const project = fixture();
    setHarness(project, "- **Harness**: codex");
    declareUpstreamVersion(project, "2.2.10");

    const result = migrate(project);

    expect(result.status).toBe(0);
    expect(result.report.status).toBe("ready");
    expect(result.report.sourceVersion).toBe("2.2.10");
  });
});
