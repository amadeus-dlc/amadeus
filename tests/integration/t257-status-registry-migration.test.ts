// covers: function:migrateClosedSwarmDriverRegistryLocked, function:writeFileAtomic

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  migrateClosedSwarmDriverRegistryLocked,
  readIntentRegistry,
  writeFileAtomic,
  withLockedIntentRegistry,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

const TARGET = "260713-swarm-driver-migration";
let projectDir: string;
let registryPath: string;

beforeEach(() => {
  projectDir = join(import.meta.dir, `.tmp-status-migration-${crypto.randomUUID()}`);
  registryPath = join(
    projectDir,
    "amadeus",
    "spaces",
    "default",
    "intents",
    "intents.json",
  );
  mkdirSync(join(registryPath, ".."), { recursive: true });
});

afterEach(() => rmSync(projectDir, { recursive: true, force: true }));

function migrate() {
  return withLockedIntentRegistry(projectDir, (context) =>
    migrateClosedSwarmDriverRegistryLocked(context),
  );
}

describe("t257 byte-preserving status registry migration", () => {
  test("changes only the target status token and converges on repeated runs", () => {
    const original = [
      "[",
      '  { "uuid": "1", "slug": "other", "dirName": "other", "status": "in-flight", "note": "日本語" },',
      `  { "uuid": "2", "slug": "swarm", "dirName": "${TARGET}", "status" : "closed", "nested": { "status": "kept" } }`,
      "]",
      "",
    ].join("\n");
    writeFileSync(registryPath, original);
    migrate();
    const migrated = readFileSync(registryPath, "utf-8");
    expect(migrated).toBe(original.replace('"closed"', '"archived"'));
    expect(readIntentRegistry(projectDir).map((entry) => entry.status))
      .toEqual(["in-flight", "archived"]);

    for (let index = 0; index < 100; index++) migrate();
    expect(readFileSync(registryPath, "utf-8")).toBe(migrated);
  });

  test.each([
    [`[{"dirName":"other","status":"in-flight"}]\n`, "found 0"],
    [
      `[{"dirName":"${TARGET}","status":"closed"},{"dirName":"${TARGET}","status":"closed"}]\n`,
      "found 2",
    ],
    [
      `[{"dirName":"${TARGET}","status":"closed"},{"dirName":"other","status":"closed"}]\n`,
      "registry row 1",
    ],
  ])("validation failure preserves original bytes", (original, message) => {
    writeFileSync(registryPath, original);
    expect(migrate).toThrow(message);
    expect(readFileSync(registryPath, "utf-8")).toBe(original);
  });

  test("validates 10,000 rows with linear-growth headroom", () => {
    const rows = Array.from({ length: 10_000 }, (_, index) => ({
      uuid: String(index),
      slug: `intent-${index}`,
      dirName: index === 5_000 ? TARGET : `intent-${index}`,
      status: index === 5_000 ? "closed" : "in-flight",
    }));
    writeFileSync(registryPath, `${JSON.stringify(rows)}\n`);
    const started = performance.now();
    migrate();
    const elapsedMs = performance.now() - started;
    expect(readIntentRegistry(projectDir)).toHaveLength(10_000);
    expect(elapsedMs).toBeLessThan(2_000);
  });

  test("rejects a symlinked registry before reading migration bytes", () => {
    const external = join(projectDir, "external.json");
    writeFileSync(external, `[{"dirName":"${TARGET}","status":"closed"}]\n`);
    symlinkSync(external, registryPath);
    expect(migrate).toThrow("canonical intents directory");
    expect(readFileSync(external, "utf-8")).toContain('"closed"');
  });
});

describe("t257 durable atomic registry writer", () => {
  test.each(["beforeTempFsync", "beforeRename"] as const)(
    "%s failure preserves target bytes and cleans the unique temp",
    (failurePoint) => {
      const target = join(projectDir, "atomic.json");
      writeFileSync(target, "before\n");
      expect(() =>
        writeFileAtomic(target, "after\n", {
          [failurePoint]: () => {
            throw new Error(failurePoint);
          },
        }),
      ).toThrow(failurePoint);
      expect(readFileSync(target, "utf-8")).toBe("before\n");
      expect(readdirSync(projectDir).filter((name) => name.startsWith("atomic.json.tmp-")))
        .toEqual([]);
    },
  );

  test("directory fsync failure is loud after rename and leaves no temp", () => {
    const target = join(projectDir, "atomic.json");
    writeFileSync(target, "before\n");
    expect(() =>
      writeFileAtomic(target, "after\n", {
        beforeDirectoryFsync: () => {
          throw new Error("directory-fsync");
        },
      }),
    ).toThrow("directory-fsync");
    expect(readFileSync(target, "utf-8")).toBe("after\n");
    expect(readdirSync(projectDir).filter((name) => name.startsWith("atomic.json.tmp-")))
      .toEqual([]);
  });

  test("a real rename failure preserves the target and cleans its temp", () => {
    const target = join(projectDir, "atomic.json");
    writeFileSync(target, "before\n");
    expect(() =>
      writeFileAtomic(target, "after\n", {
        beforeRename: () => {
          unlinkSync(target);
          mkdirSync(target);
        },
      }),
    ).toThrow();
    rmSync(target, { recursive: true, force: true });
    writeFileSync(target, "before\n");
    expect(readdirSync(projectDir).filter((name) => name.startsWith("atomic.json.tmp-")))
      .toEqual([]);
  });
});
