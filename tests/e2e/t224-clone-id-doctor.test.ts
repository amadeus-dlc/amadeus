// size: large

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readlinkSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import {
  _resetCloneIdForTests,
  auditCloneId,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  createUpstreamV2Fixture,
  type UpstreamV2Fixture,
  UPSTREAM_FILE_PREFIX,
} from "../helpers/upstream-v2-fixture.ts";

const fixtures: UpstreamV2Fixture[] = [];
const externalDirs: string[] = [];

afterEach(() => {
  _resetCloneIdForTests();
  for (const fixture of fixtures.splice(0)) fixture.cleanup();
  for (const dir of externalDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function runInstalled(
  project: UpstreamV2Fixture,
  toolName: "amadeus-migrate.ts" | "amadeus-utility.ts",
  args: readonly string[],
): ReturnType<typeof spawnSync> {
  const lockBase = join(project.projectDir, ".git", "e2e-audit-locks");
  mkdirSync(lockBase, { recursive: true });
  return spawnSync(
    process.execPath,
    [join(project.projectDir, ".claude", "tools", toolName), ...args],
    {
      cwd: project.projectDir,
      encoding: "utf-8",
      env: {
        ...process.env,
        AMADEUS_HARNESS_DIR: ".claude",
        AMADEUS_LOCK_BASE_DIR: lockBase,
      },
    },
  );
}

describe("symlink clone-id installed doctor journey", () => {
  test("migration and repeated doctor runs preserve one clone id and target metadata", () => {
    const project = createUpstreamV2Fixture();
    fixtures.push(project);
    const external = mkdtempSync(join(tmpdir(), "clone-id-doctor-e2e-"));
    externalDirs.push(external);
    const target = join(external, "sentinel.txt");
    const sentinel = "CLONE_ID_E2E_SENTINEL\n";
    writeFileSync(target, sentinel, "utf-8");
    const targetBefore = statSync(target);
    const sourceCloneId = join(project.sourceRoot, `.${UPSTREAM_FILE_PREFIX}clone-id`);
    rmSync(sourceCloneId, { force: true });
    symlinkSync(target, sourceCloneId);

    const migrated = runInstalled(project, "amadeus-migrate.ts", [
      "--project-dir",
      project.projectDir,
      "--from",
      project.sourceRoot,
      "--json",
      "--apply",
    ]);
    expect(migrated.status).toBe(0);

    rmSync(join(project.destinationRoot, relative(project.sourceRoot, project.auditPath)), {
      force: true,
    });
    project.commitAll("test: remove the legacy markdown audit fixture");
    const firstDoctor = runInstalled(project, "amadeus-utility.ts", [
      "doctor",
      "--project-dir",
      project.projectDir,
    ]);
    const secondDoctor = runInstalled(project, "amadeus-utility.ts", [
      "doctor",
      "--project-dir",
      project.projectDir,
    ]);
    expect(firstDoctor.status).toBe(0);
    expect(secondDoctor.status).toBe(0);

    _resetCloneIdForTests();
    const firstCloneId = auditCloneId(project.projectDir);
    _resetCloneIdForTests();
    const secondCloneId = auditCloneId(project.projectDir);
    expect(firstCloneId).toMatch(/^[a-f0-9]{12}$/);
    expect(secondCloneId).toBe(firstCloneId);

    const migratedCloneId = join(project.destinationRoot, ".amadeus-clone-id");
    expect(lstatSync(migratedCloneId).isSymbolicLink()).toBe(true);
    expect(readlinkSync(migratedCloneId)).toBe(target);
    const targetAfter = statSync(target);
    expect({
      mode: targetAfter.mode,
      uid: targetAfter.uid,
      gid: targetAfter.gid,
      size: targetAfter.size,
      mtimeMs: targetAfter.mtimeMs,
      ino: targetAfter.ino,
    }).toEqual({
      mode: targetBefore.mode,
      uid: targetBefore.uid,
      gid: targetBefore.gid,
      size: targetBefore.size,
      mtimeMs: targetBefore.mtimeMs,
      ino: targetBefore.ino,
    });
  }, 120_000);
});
