// covers: function:parseIntentStatus, function:readIntentRegistry, function:transitionIntentStatusLocked, function:migrateClosedSwarmDriverIntent

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  IntentRegistryStatusError,
  IntentStatusParseError,
  migrateClosedSwarmDriverIntent,
  parseIntentStatus,
  readIntentRegistry,
  transitionIntentStatusLocked,
  withLockedIntentRegistry,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

const TARGET = "260713-swarm-driver-migration";
let projectDir: string;
let registryPath: string;

beforeEach(() => {
  projectDir = join(import.meta.dir, `.tmp-status-registry-${crypto.randomUUID()}`);
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

function row(status: unknown, dirName = "260723-example") {
  return { uuid: crypto.randomUUID(), slug: "example", dirName, status };
}

describe("t257 strict intent status contract", () => {
  test.each(["in-flight", "parked", "complete", "archived"] as const)(
    "accepts %s",
    (status) => expect(parseIntentStatus(status)).toBe(status),
  );

  test.each(["closed", "unknown", "", 1, null, undefined, {}])(
    "rejects invalid value %p with bounded diagnostics",
    (value) => {
      try {
        parseIntentStatus(value);
        throw new Error("invalid status was accepted");
      } catch (error) {
        expect(error).toBeInstanceOf(IntentStatusParseError);
        expect((error as IntentStatusParseError).kind).toBe("invalid-intent-status");
        expect((error as IntentStatusParseError).receivedPreview.length).toBeLessThan(100);
      }
    },
  );

  test("rejects an array status", () => {
    expect(() => parseIntentStatus([])).toThrow(IntentStatusParseError);
  });

  test("strict registry read adds row and intent identity context", () => {
    writeFileSync(registryPath, `${JSON.stringify([row("in-flight"), row("closed", "bad-row")])}\n`);
    try {
      readIntentRegistry(projectDir);
      throw new Error("closed status was accepted");
    } catch (error) {
      expect(error).toBeInstanceOf(IntentRegistryStatusError);
      expect((error as IntentRegistryStatusError).rowIndex).toBe(1);
      expect((error as IntentRegistryStatusError).intentDir).toBe("bad-row");
    }
  });

  test.each([
    ["in-flight", "complete", "complete", true],
    ["parked", "complete", "complete", true],
    ["complete", "complete", "complete", false],
    ["in-flight", "archive", "archived", true],
    ["parked", "archive", "archived", true],
    ["complete", "archive", "archived", true],
    ["archived", "unarchive", "in-flight", true],
  ] as const)("%s --%s -> %s", (from, transition, to, changed) => {
    writeFileSync(registryPath, `${JSON.stringify([row(from)])}\n`);
    const result = withLockedIntentRegistry(projectDir, (context) =>
      transitionIntentStatusLocked(
        context,
        "260723-example",
        transition,
      ),
    );
    expect(result).toBe(changed);
    expect(readIntentRegistry(projectDir)[0]?.status).toBe(to);
  });

  test.each([
    ["archived", "complete"],
    ["archived", "archive"],
    ["in-flight", "unarchive"],
    ["parked", "unarchive"],
    ["complete", "unarchive"],
  ] as const)("rejects %s --%s without mutation", (from, transition) => {
    writeFileSync(registryPath, `${JSON.stringify([row(from)], null, 2)}\n`);
    const before = readFileSync(registryPath);
    expect(() =>
      withLockedIntentRegistry(projectDir, (context) =>
        transitionIntentStatusLocked(
          context,
          "260723-example",
          transition,
        ),
      ),
    ).toThrow();
    expect(readFileSync(registryPath)).toEqual(before);
  });

  test("transition capability expires when its callback returns", () => {
    let staleContext: Parameters<typeof transitionIntentStatusLocked>[0] | undefined;
    withLockedIntentRegistry(projectDir, (context) => {
      staleContext = context;
    });
    writeFileSync(registryPath, `${JSON.stringify([row("in-flight")])}\n`);
    expect(() =>
      withLockedIntentRegistry(projectDir, () =>
        transitionIntentStatusLocked(staleContext!, "260723-example", "complete"),
      ),
    ).toThrow("callback-scoped");
  });
});

describe("t257 one-shot migration decision table", () => {
  test("converts only the exact target closed status", () => {
    const result = migrateClosedSwarmDriverIntent([
      row("in-flight", "other"),
      row("closed", TARGET),
    ]);
    expect(result.map((entry) => entry.status)).toEqual(["in-flight", "archived"]);
  });

  test("already archived is an idempotent success", () => {
    const input = [row("in-flight", "other"), row("archived", TARGET)];
    expect(migrateClosedSwarmDriverIntent(input).map((entry) => entry.status))
      .toEqual(["in-flight", "archived"]);
  });

  test.each([
    [[row("in-flight", "other")], "found 0"],
    [[row("closed", TARGET), row("closed", TARGET)], "found 2"],
    [[row("complete", TARGET)], "Unexpected migration target status"],
    [[row("closed", TARGET), row("closed", "other")], "registry row 1"],
  ] as const)("rejects invalid migration fixture", (input, message) => {
    expect(() => migrateClosedSwarmDriverIntent(input)).toThrow(message);
  });
});
