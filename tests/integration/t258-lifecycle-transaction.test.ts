// covers: subcommand:amadeus-state:archive subcommand:amadeus-state:unarchive
// @test-size medium
import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { cpus, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { appendLifecycleAuditEntryUnlocked } from "../../packages/framework/core/tools/amadeus-audit.ts";
import {
  auditLockDir,
  type IntentLifecycleAuditEvent,
  type LifecycleTransactionHooks,
  runIntentLifecycleTransactionLocked,
  withIntentLifecyclePreflight,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

const STATE = join(import.meta.dir, "../../packages/framework/core/tools/amadeus-state.ts");
const BENCHMARK_CHILD = join(import.meta.dir, "../helpers/lifecycle-transaction-benchmark-child.ts");
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function scaffold(status: string, active = true): { root: string; intent: string; audit: string } {
  const root = mkdtempSync(join(tmpdir(), "lifecycle-tx-"));
  roots.push(root);
  const intent = "260723-example";
  const intents = join(root, "amadeus", "spaces", "default", "intents");
  const record = join(intents, intent);
  const auditDir = join(record, "audit");
  mkdirSync(auditDir, { recursive: true });
  writeFileSync(join(record, "amadeus-state.md"), "# AI-DLC State Tracking\n");
  writeFileSync(
    join(intents, "intents.json"),
    `${JSON.stringify([{
      uuid: "123e4567-e89b-42d3-a456-426614174000",
      slug: "example",
      dirName: intent,
      status,
    }], null, 2)}\n`,
  );
  if (active) writeFileSync(join(intents, "active-intent"), `${intent}\n`);
  const audit = join(auditDir, "fixture.md");
  writeFileSync(
    audit,
    "# AI-DLC Audit Log\n\n## Human Turn\n**Timestamp**: 2026-07-23T10:00:00Z\n**Event**: HUMAN_TURN\n\n---\n",
  );
  return { root, intent, audit };
}

function run(root: string, verb: string, intent: string, input = `${verb} requested`) {
  return spawnSync(
    process.execPath,
    [STATE, verb, intent, "--user-input", input, "--project-dir", root],
    { encoding: "utf-8" },
  );
}

function registryStatus(root: string): string {
  const path = join(root, "amadeus", "spaces", "default", "intents", "intents.json");
  return JSON.parse(readFileSync(path, "utf-8"))[0].status;
}

function lifecycleEventBlock(
  operationId: string,
  intent: string,
  fromStatus = "in-flight",
): string {
  return `\n## Intent Archived
**Timestamp**: 2026-07-23T10:00:01Z
**Event**: INTENT_ARCHIVED
**Intent**: ${intent}
**From Status**: ${fromStatus}
**To Status**: archived
**Operation Id**: ${operationId}
**User Input**: archive requested
**Human Turn Timestamp**: 2026-07-23T10:00:00Z

---
`;
}

function appendLifecycle(
  event: IntentLifecycleAuditEvent,
  shard: string,
  pd: string,
  intent: string,
  space: string,
): void {
  appendLifecycleAuditEntryUnlocked(event.eventType, {
    Intent: event.intentDir,
    "From Status": event.fromStatus,
    "To Status": event.toStatus,
    "Operation Id": event.operationId,
    "User Input": event.userInput,
    "Human Turn Timestamp": event.humanTurnTimestamp,
  }, pd, intent, space, shard);
}

describe("intent lifecycle transaction CLI", () => {
  test.each(["in-flight", "parked", "complete"])("archives from %s and clears a matching cursor", (status) => {
    const fixture = scaffold(status);
    const result = run(fixture.root, "archive", fixture.intent);
    expect(result.status, result.stderr).toBe(0);
    expect(registryStatus(fixture.root)).toBe("archived");
    expect(() => readFileSync(
      join(fixture.root, "amadeus", "spaces", "default", "intents", "active-intent"),
    )).toThrow();
    const audit = readFileSync(fixture.audit, "utf-8");
    expect(audit.match(/\*\*Event\*\*: INTENT_ARCHIVED/g)?.length).toBe(1);
    expect(audit).toContain("**Human Turn Timestamp**: 2026-07-23T10:00:00Z");
  });

  test("archives a non-active intent without changing the cursor", () => {
    const fixture = scaffold("in-flight", false);
    const cursor = join(fixture.root, "amadeus", "spaces", "default", "intents", "active-intent");
    writeFileSync(cursor, "260723-other\n");
    const result = run(fixture.root, "archive", fixture.intent);
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(cursor, "utf-8")).toBe("260723-other\n");
  });

  test("unarchives to in-flight without selecting the intent", () => {
    const fixture = scaffold("archived", false);
    const result = run(fixture.root, "unarchive", fixture.intent);
    expect(result.status, result.stderr).toBe(0);
    expect(registryStatus(fixture.root)).toBe("in-flight");
    expect(readFileSync(fixture.audit, "utf-8")).toContain("**Event**: INTENT_UNARCHIVED");
  });

  test("rejects a missing HUMAN_TURN without changing registry or audit", () => {
    const fixture = scaffold("in-flight");
    writeFileSync(fixture.audit, "# AI-DLC Audit Log\n");
    const registryPath = join(
      fixture.root,
      "amadeus",
      "spaces",
      "default",
      "intents",
      "intents.json",
    );
    const beforeRegistry = readFileSync(registryPath, "utf-8");
    const beforeAudit = readFileSync(fixture.audit, "utf-8");
    const result = run(fixture.root, "archive", fixture.intent);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("requires an unconsumed HUMAN_TURN");
    expect(readFileSync(registryPath, "utf-8")).toBe(beforeRegistry);
    expect(readFileSync(fixture.audit, "utf-8")).toBe(beforeAudit);
  });

  test("rejects duplicate HUMAN_TURN timestamps before journal creation", () => {
    const fixture = scaffold("in-flight");
    writeFileSync(
      fixture.audit,
      `${readFileSync(fixture.audit, "utf-8")}\n## Human Turn\n**Timestamp**: 2026-07-23T10:00:00Z\n**Event**: HUMAN_TURN\n\n---\n`,
    );
    const result = run(fixture.root, "archive", fixture.intent);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Ambiguous HUMAN_TURN timestamp");
    expect(registryStatus(fixture.root)).toBe("in-flight");
  });

  test("rejects invalid source statuses without consuming the turn", () => {
    const archived = scaffold("archived");
    const archiveResult = run(archived.root, "archive", archived.intent);
    expect(archiveResult.status).toBe(1);
    expect(readFileSync(archived.audit, "utf-8")).not.toContain("INTENT_ARCHIVED");

    const current = scaffold("in-flight");
    const unarchiveResult = run(current.root, "unarchive", current.intent);
    expect(unarchiveResult.status).toBe(1);
    expect(readFileSync(current.audit, "utf-8")).not.toContain("INTENT_UNARCHIVED");
  });

  test.each([
    [false, false, false, "in-flight"],
    [true, false, false, "in-flight"],
    [true, true, false, "archived"],
    [true, true, true, "archived"],
  ] as const)(
    "recovers journal topology %p/%p/%p forward without duplicate audit",
    (auditCommitted, registryCommitted, cursorCommitted, status) => {
      const fixture = scaffold(status);
      const operationId = "123e4567-e89b-42d3-a456-426614174000";
      if (auditCommitted) {
        writeFileSync(
          fixture.audit,
          readFileSync(fixture.audit, "utf-8") +
            lifecycleEventBlock(operationId, fixture.intent),
        );
      }
      if (cursorCommitted) {
        rmSync(join(
          fixture.root,
          "amadeus",
          "spaces",
          "default",
          "intents",
          "active-intent",
        ));
      }
      const journal = join(
        fixture.root,
        "amadeus",
        "spaces",
        "default",
        "intents",
        ".amadeus-intent-status-transaction.json",
      );
      writeFileSync(journal, `${JSON.stringify({
        schemaVersion: 1,
        operationId,
        verb: "archive",
        intentDir: fixture.intent,
        fromStatus: "in-flight",
        toStatus: "archived",
        humanTurn: {
          shard: "fixture.md",
          timestamp: "2026-07-23T10:00:00Z",
        },
        userInput: "archive requested",
        auditCommitted,
        registryCommitted,
        cursorCommitted,
      }, null, 2)}\n`);
      const result = run(fixture.root, "archive", fixture.intent);
      expect(result.status, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout).recovered).toBe(true);
      expect(registryStatus(fixture.root)).toBe("archived");
      expect(readFileSync(fixture.audit, "utf-8")
        .match(/\*\*Event\*\*: INTENT_ARCHIVED/g)?.length).toBe(1);
      expect(() => readFileSync(journal)).toThrow();
    },
  );

  test("serializes eight competing processes: one commits and seven reject", async () => {
    const fixture = scaffold("in-flight");
    const children = Array.from({ length: 8 }, () => Bun.spawn([
      process.execPath,
      STATE,
      "archive",
      fixture.intent,
      "--user-input",
      "archive requested",
      "--project-dir",
      fixture.root,
    ], { stdout: "pipe", stderr: "pipe" }));
    const statuses = await Promise.all(children.map((child) => child.exited));
    expect(statuses.filter((status) => status === 0).length).toBe(1);
    expect(statuses.filter((status) => status !== 0).length).toBe(7);
    expect(registryStatus(fixture.root)).toBe("archived");
    expect(readFileSync(fixture.audit, "utf-8")
      .match(/\*\*Event\*\*: INTENT_ARCHIVED/g)?.length).toBe(1);
  });

  test("serializes eight independent intents without losing any transaction", async () => {
    const root = mkdtempSync(join(tmpdir(), "lifecycle-tx-eight-"));
    roots.push(root);
    const intentsDir = join(root, "amadeus", "spaces", "default", "intents");
    mkdirSync(intentsDir, { recursive: true });
    const rows = Array.from({ length: 8 }, (_, index) => {
      const intent = `260723-intent-${index}`;
      const record = join(intentsDir, intent);
      mkdirSync(join(record, "audit"), { recursive: true });
      writeFileSync(join(record, "amadeus-state.md"), "# AI-DLC State Tracking\n");
      writeFileSync(
        join(record, "audit", `fixture-${index}.md`),
        `# AI-DLC Audit Log

## Human Turn
**Timestamp**: 2026-07-23T10:00:${String(index).padStart(2, "0")}Z
**Event**: HUMAN_TURN

---
`,
      );
      return {
        uuid: `123e4567-e89b-42d3-a456-4266141740${String(index).padStart(2, "0")}`,
        slug: `intent-${index}`,
        dirName: intent,
        status: "in-flight",
      };
    });
    writeFileSync(join(intentsDir, "intents.json"), `${JSON.stringify(rows, null, 2)}\n`);
    const children = rows.map((row) => Bun.spawn([
      process.execPath,
      STATE,
      "archive",
      row.dirName,
      "--user-input",
      `archive ${row.dirName}`,
      "--project-dir",
      root,
    ], { stdout: "pipe", stderr: "pipe" }));
    const statuses = await Promise.all(children.map((child) => child.exited));
    expect(statuses).toEqual(Array(8).fill(0));
    const finalRows = JSON.parse(readFileSync(join(intentsDir, "intents.json"), "utf-8"));
    expect(finalRows.map((row: { status: string }) => row.status)).toEqual(Array(8).fill("archived"));
    for (let index = 0; index < 8; index++) {
      const audit = readFileSync(
        join(intentsDir, `260723-intent-${index}`, "audit", `fixture-${index}.md`),
        "utf-8",
      );
      expect(audit.match(/\*\*Event\*\*: INTENT_ARCHIVED/g)?.length).toBe(1);
    }
  });

  test("times out after the five-second workspace lock budget without mutation", () => {
    const fixture = scaffold("in-flight");
    const lockBase = join(fixture.root, "locks");
    mkdirSync(lockBase);
    const saved = process.env.AMADEUS_LOCK_BASE_DIR;
    process.env.AMADEUS_LOCK_BASE_DIR = lockBase;
    const lock = auditLockDir(fixture.root);
    if (saved === undefined) delete process.env.AMADEUS_LOCK_BASE_DIR;
    else process.env.AMADEUS_LOCK_BASE_DIR = saved;
    mkdirSync(lock);
    writeFileSync(join(lock, "owner.json"), JSON.stringify({
      pid: process.pid,
      startedAtMs: Math.floor(performance.timeOrigin + performance.now()),
    }));
    const registryPath = join(
      fixture.root,
      "amadeus",
      "spaces",
      "default",
      "intents",
      "intents.json",
    );
    const beforeRegistry = readFileSync(registryPath, "utf-8");
    const beforeAudit = readFileSync(fixture.audit, "utf-8");
    const started = performance.now();
    const result = spawnSync(
      process.execPath,
      [STATE, "archive", fixture.intent, "--user-input", "archive requested", "--project-dir", fixture.root],
      {
        encoding: "utf-8",
        env: { ...process.env, AMADEUS_LOCK_BASE_DIR: lockBase },
      },
    );
    expect(result.status).toBe(1);
    expect(performance.now() - started).toBeGreaterThanOrEqual(4_900);
    expect(readFileSync(registryPath, "utf-8")).toBe(beforeRegistry);
    expect(readFileSync(fixture.audit, "utf-8")).toBe(beforeAudit);
  }, 10_000);

  test.each([
    "beforeValidation",
    "beforeJournalWrite",
    "beforeAuditCommit",
    "afterAuditCommit",
    "beforeRegistryCommit",
    "afterRegistryCommit",
    "beforeCursorCommit",
    "afterCursorCommit",
    "beforeJournalDelete",
  ] as const)("recovers after injected durable boundary %s", (boundary) => {
    const fixture = scaffold("in-flight");
    const hooks: LifecycleTransactionHooks = {
      [boundary]: () => {
        throw new Error(boundary);
      },
    };
    expect(() => withIntentLifecyclePreflight(
      fixture.root,
      "default",
      appendLifecycle,
      (context) => runIntentLifecycleTransactionLocked(
        context,
        fixture.intent,
        "archive",
        "archive requested",
        appendLifecycle,
        hooks,
      ),
      hooks,
    )).toThrow(boundary);
    withIntentLifecyclePreflight(
      fixture.root,
      "default",
      appendLifecycle,
      (context, recovery) => {
        if (recovery.kind === "none") {
          runIntentLifecycleTransactionLocked(
            context,
            fixture.intent,
            "archive",
            "archive requested",
            appendLifecycle,
          );
        }
      },
    );
    expect(registryStatus(fixture.root)).toBe("archived");
    expect(readFileSync(fixture.audit, "utf-8")
      .match(/\*\*Event\*\*: INTENT_ARCHIVED/g)?.length).toBe(1);
  });
});

type LifecycleBenchmarkSample = {
  mode: "archive" | "recovery" | "noop";
  size: number;
  elapsedMs: number;
  rssDeltaBytes: number;
  fixtureSha256: string;
};

function benchmarkChild(mode: LifecycleBenchmarkSample["mode"]): LifecycleBenchmarkSample {
  const result = spawnSync(process.execPath, [BENCHMARK_CHILD, "10000", mode], {
    encoding: "utf-8",
  });
  if (result.status !== 0) throw new Error(result.stderr);
  return JSON.parse(result.stdout);
}

function p95(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * 0.95) - 1];
}

function currentGitSha(): string {
  const repositoryRoot = join(import.meta.dir, "..", "..");
  const dotGit = join(repositoryRoot, ".git");
  const dotGitText = statSync(dotGit).isDirectory()
    ? ""
    : readFileSync(dotGit, "utf-8").trim();
  const gitDir = dotGitText.startsWith("gitdir:")
    ? resolve(repositoryRoot, dotGitText.slice("gitdir:".length).trim())
    : dotGit;
  const head = readFileSync(join(gitDir, "HEAD"), "utf-8").trim();
  if (!head.startsWith("ref:")) return head;
  const ref = head.slice("ref:".length).trim();
  const looseRef = join(gitDir, ref);
  if (existsSync(looseRef)) return readFileSync(looseRef, "utf-8").trim();
  const commonDirPath = join(gitDir, "commondir");
  const commonDir = existsSync(commonDirPath)
    ? join(gitDir, readFileSync(commonDirPath, "utf-8").trim())
    : gitDir;
  const packed = readFileSync(join(commonDir, "packed-refs"), "utf-8")
    .split("\n")
    .find((line) => line.endsWith(` ${ref}`));
  if (!packed) throw new Error(`Cannot resolve Git ref ${ref}`);
  return packed.split(" ", 1)[0];
}

describe("intent lifecycle transaction performance contract", () => {
  test("records 100-child p95 and paired incremental RSS with provenance", () => {
    for (let index = 0; index < 10; index++) {
      benchmarkChild("archive");
      benchmarkChild("recovery");
      benchmarkChild("noop");
    }
    const archive = Array.from({ length: 100 }, () => benchmarkChild("archive"));
    const recovery = Array.from({ length: 100 }, () => benchmarkChild("recovery"));
    const noop = Array.from({ length: 100 }, () => benchmarkChild("noop"));
    const rss = archive.map((sample, index) =>
      Math.max(0, sample.rssDeltaBytes - noop[index].rssDeltaBytes)
    );
    const result = {
      samples: 100,
      warmups: 10,
      archiveP95Ms: p95(archive.map((sample) => sample.elapsedMs)),
      recoveryP95Ms: p95(recovery.map((sample) => sample.elapsedMs)),
      rssDifferenceP95MiB: p95(rss) / (1024 * 1024),
      fixtureSha256: archive[0].fixtureSha256,
      gitSha: currentGitSha(),
      bunVersion: Bun.version,
      runnerImage: process.env.ImageOS ?? process.env.RUNNER_OS ?? "local",
      cpuModel: cpus()[0]?.model ?? "unknown",
    };
    console.log(`LIFECYCLE_TRANSACTION_BENCHMARK ${JSON.stringify(result)}`);
    expect(result.archiveP95Ms).toBeLessThanOrEqual(500);
    expect(result.recoveryP95Ms).toBeLessThanOrEqual(750);
    expect(result.rssDifferenceP95MiB).toBeLessThanOrEqual(96);
    expect(new Set(archive.map((sample) => sample.fixtureSha256)).size).toBe(1);
    expect(new Set(recovery.map((sample) => sample.fixtureSha256)).size).toBe(1);
  }, 120_000);
});
