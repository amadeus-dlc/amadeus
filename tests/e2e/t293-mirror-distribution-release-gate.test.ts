// t293 — source-to-public Intent Mirror release gate.
// covers: packages/framework/harness/projections.ts, scripts/mirror-*.ts
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MIRROR_USER_CONTRACT } from "../../packages/framework/core/tools/amadeus-mirror-presentation.ts";
import { checkMirrorDistribution } from "../../scripts/mirror-distribution-check.ts";
import { validateMirrorDocs } from "../../scripts/mirror-docs-contract.ts";
import { scanPublicProjections } from "../../scripts/scan-public-projections.ts";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function addIntent(
  root: string,
  space: string,
  dirName: string,
  uuid: string,
): void {
  const intents = join(root, "amadeus", "spaces", space, "intents");
  mkdirSync(join(intents, dirName), { recursive: true });
  writeFileSync(join(intents, dirName, "amadeus-state.md"), "# State\n");
  const registryPath = join(intents, "intents.json");
  let registry: unknown[] = [];
  if (existsSync(registryPath))
    registry = JSON.parse(readFileSync(registryPath, "utf-8"));
  registry.push({
    uuid,
    slug: dirName,
    dirName,
    scope: "amadeus-feature",
    status: "in-flight",
    repos: ["acme/app"],
  });
  writeFileSync(registryPath, `${JSON.stringify(registry)}\n`);
}

describe("t293 release gate", () => {
  test("blocks on any finding and passes the checked-in source/dist/self/docs chain", () => {
    const findings = [
      ...checkMirrorDistribution(process.cwd()).findings,
      ...validateMirrorDocs(process.cwd()),
      ...scanPublicProjections(process.cwd()),
    ];
    expect(findings).toEqual([]);
  });

  test("exposes the real repair commands and no release/deploy authority", () => {
    expect(
      MIRROR_USER_CONTRACT.repairCommands.map((command) => command.path.join(" ")),
    ).toEqual(["repair status", "repair relink", "repair abandon"]);
    expect(MIRROR_USER_CONTRACT.scopeExclusions).toContain("release");
    expect(MIRROR_USER_CONTRACT.scopeExclusions).toContain("deploy");
  });

  test("resolves one record identity across source and four self layouts without fixed-depth derivation", async () => {
    const root = mkdtempSync(join(tmpdir(), "mirror-root-matrix-"));
    roots.push(root);
    addIntent(root, "default", "default-active", "uuid-default-active");
    addIntent(root, "default", "default-explicit", "uuid-default-explicit");
    addIntent(root, "team-a", "team-active", "uuid-team-active");
    addIntent(root, "team-a", "team-explicit", "uuid-team-explicit");
    writeFileSync(join(root, "amadeus", "active-space"), "team-a\n");
    writeFileSync(
      join(root, "amadeus", "spaces", "default", "intents", "active-intent"),
      "default-active\n",
    );
    writeFileSync(
      join(root, "amadeus", "spaces", "team-a", "intents", "active-intent"),
      "team-active\n",
    );

    const modules = [
      "../../packages/framework/core/tools/amadeus-mirror-lifecycle.ts",
      "../../.claude/tools/amadeus-mirror-lifecycle.ts",
      "../../.codex/tools/amadeus-mirror-lifecycle.ts",
      "../../.cursor/tools/amadeus-mirror-lifecycle.ts",
      "../../.opencode/tools/amadeus-mirror-lifecycle.ts",
    ];
    for (const path of modules) {
      const { resolveMirrorRecordIdentity } = await import(path);
      expect(resolveMirrorRecordIdentity(root)).toMatchObject({
        space: "team-a",
        intentDir: "team-active",
        intentUuid: "uuid-team-active",
      });
      expect(
        resolveMirrorRecordIdentity(root, "default", "default-explicit"),
      ).toMatchObject({
        space: "default",
        intentDir: "default-explicit",
        intentUuid: "uuid-default-explicit",
      });
      expect(
        resolveMirrorRecordIdentity(root, "team-a", "team-explicit"),
      ).toMatchObject({
        space: "team-a",
        intentDir: "team-explicit",
        intentUuid: "uuid-team-explicit",
      });
    }
  });
});
