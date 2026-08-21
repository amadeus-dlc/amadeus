// covers: file:packages/framework/core/tools/amadeus-advisory-choice.ts
// size: medium
//
// t470 — recovering a schema 1 advisory choice store (#2330).
//
// #2253 moved the store to schema 2 and deliberately refused to translate the
// old shape: a schema 1 store fails to parse, and every reader turns that into a
// fail-closed hold (ADR-9, pinned by t458). That is the right refusal, but it
// left an intent whose store predates the migration with no way out at all —
// `report` answers `advisory choice evidence is invalid: ...` forever, and no
// human answer can clear it because the store the answer would be written to is
// the unreadable one.
//
// The recovery verb is the exit. It reads the schema 1 store WITHOUT reusing
// parseStore, salvages the pending advisories through the unchanged parsePending
// (pending has been schema 1 all along), DISCARDS the receipts rather than
// guessing what a `humanTurn`-only receipt means under the provenance union, and
// writes a schema 2 store. Discarding the receipts is what makes the advisories
// unanswered again — which is exactly ADR-9's "ask the human again", now
// reachable instead of merely correct.
//
// What is asserted here:
//
//   FR-2.1  pending is salvaged, receipts are dropped, the store is schema 2.
//   FR-2.2  one store only — the one the caller named.
//   FR-2.3  a store whose pending belongs to another intent is refused, loudly
//           and without a byte of change (#2352 defence).
//   FR-2.4  the outcome names the dropped receipts, whether the advisories must
//           be presented again, and the discarded run-now receipt count.
//   AC-2c   the report-side block is gone afterwards: an open advisory is asked
//           again, and a store that had no open advisory returns to normal flow.

import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  advisoryReportHoldReason,
  guardAdvisoryChoices,
  recoverSchema1AdvisoryStore,
  recoverSchema1AdvisoryStoreCli,
  type AdvisoryChoiceStore,
  type PendingAdvisory,
} from "../../packages/framework/core/tools/amadeus-advisory-choice.ts";
import { docsRoot } from "../../packages/framework/core/tools/amadeus-lib.ts";
import type { Advisory } from "../../packages/framework/core/tools/amadeus-plugin-runtime.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  seedStateFile,
} from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";

const STAGE = "requirements-analysis";

const TOOL = join(
  import.meta.dir,
  "..",
  "..",
  "packages",
  "framework",
  "core",
  "tools",
  "amadeus-advisory-choice.ts",
);

const advisory: Advisory = {
  plugin: "conformance-fixture",
  code: "changed",
  message: "advisory: conformance-fixture FIXTURE CHANGED",
  stage: STAGE,
  target: "conformance-fixture:fixture-change",
  specIdentity: "sha256:abc",
};

function storePath(projectDir: string): string {
  return join(docsRoot(projectDir), ".amadeus-advisory-choice.json");
}

function readRawStore(projectDir: string): Record<string, unknown> {
  return JSON.parse(readFileSync(storePath(projectDir), "utf-8")) as Record<string, unknown>;
}

function writeRawStore(projectDir: string, store: unknown): void {
  writeFileSync(storePath(projectDir), `${JSON.stringify(store, null, 2)}\n`);
}

// A receipt exactly as builds before #2253 wrote it: schema 1, and a bare
// `humanTurn` where the union now lives. Nothing in the recovery path is allowed
// to interpret this shape beyond counting it.
function legacyReceipt(pending: PendingAdvisory, choice: string): Record<string, unknown> {
  return {
    schema: 1,
    identity: pending.identity,
    choice,
    humanTurn: {
      timestamp: "2026-08-01T00:00:00.000Z",
      shard: "legacy-shard",
      eventIdentity: "0".repeat(64),
    },
    recordedAt: "2026-08-01T00:00:00.000Z",
  };
}

// The store as an intent that never migrated has it: the pending the guard
// itself wrote, demoted to schema 1, carrying legacy receipts.
function seedSchema1Project(choices: readonly string[]): { projectDir: string; pending: PendingAdvisory } {
  const projectDir = createTestProject();
  seedStateFile(projectDir, join(FIXTURES_DIR, "state-mid-inception.md"));
  expect(guardAdvisoryChoices(projectDir, STAGE, [advisory]).kind).toBe("hold");
  const store = readRawStore(projectDir);
  const pending = (store.pending as PendingAdvisory[])[0]!;
  store.schema = 1;
  store.receipts = choices.map((choice) => legacyReceipt(pending, choice));
  writeRawStore(projectDir, store);
  return { projectDir, pending };
}

const projects: string[] = [];
function track<T extends { projectDir: string }>(value: T): T {
  projects.push(value.projectDir);
  return value;
}
afterEach(() => {
  resetOtelPerProject();
  for (const dir of projects.splice(0)) cleanupTestProject(dir);
});

describe("advisory store recovery: salvage (FR-2.1)", () => {
  test("schema 1のstoreはpendingを保ったままschema 2へ回復しreceiptsは破棄される", () => {
    const { projectDir, pending } = track(seedSchema1Project(["run-now", "run-now"]));

    const result = recoverSchema1AdvisoryStore(projectDir);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const store = readRawStore(projectDir) as unknown as AdvisoryChoiceStore;
    expect(store.schema).toBe(2);
    expect(store.receipts).toHaveLength(0);
    expect(store.pending).toHaveLength(1);
    expect(store.pending[0]).toEqual(pending);
  });
});

describe("advisory store recovery: outcome contract (FR-2.4)", () => {
  test("回復結果はdropped件数・再提示の要否・リセットされた形式検査回数を明示する", () => {
    const { projectDir } = track(seedSchema1Project(["run-now", "defer-with-risk", "run-now"]));

    const result = recoverSchema1AdvisoryStore(projectDir);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      pendingSalvaged: 1,
      receiptsDropped: 3,
      rePresentationRequired: true,
      // Counting is all recovery does with a legacy run-now receipt; it assigns
      // no plugin-specific execution meaning to that choice.
      runNowReceiptsReset: 2,
    });
  });
});

describe("advisory store recovery: misdirection defence (FR-2.3 / AC-2b)", () => {
  test("pendingが別intentのものならloudに拒否しstoreを1バイトも変えない", () => {
    const { projectDir } = track(seedSchema1Project(["run-now"]));
    const store = readRawStore(projectDir);
    const pending = store.pending as PendingAdvisory[];
    pending[0]!.identity.intentRun = "019ffffff-dead-7000-b000-000000000000";
    writeRawStore(projectDir, store);
    const before = readFileSync(storePath(projectDir), "utf-8");

    const result = recoverSchema1AdvisoryStore(projectDir);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("does not belong to the active intent");
    expect(readFileSync(storePath(projectDir), "utf-8")).toBe(before);
  });

  // A receipts-only store has no pending row to carry the owner's identity, so
  // the pending check above is vacuous exactly where the whole content of the
  // store is about to be thrown away. The receipts carry an identity too, and
  // reading the intent run off one is a safety read, not a translation: nothing
  // about what the receipt MEANT is interpreted, and the receipt is discarded
  // either way.
  test("pendingが0件でもreceiptsが別intentのものならloudに拒否される", () => {
    const { projectDir } = track(seedSchema1Project(["run-now"]));
    const store = readRawStore(projectDir);
    const receipts = store.receipts as { identity: { intentRun: string } }[];
    receipts[0]!.identity = { ...receipts[0]!.identity, intentRun: "019ffffff-dead-7000-b000-000000000000" };
    store.pending = [];
    writeRawStore(projectDir, store);
    const before = readFileSync(storePath(projectDir), "utf-8");

    const result = recoverSchema1AdvisoryStore(projectDir);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("does not belong to the active intent");
    expect(readFileSync(storePath(projectDir), "utf-8")).toBe(before);
  });

  // Ignoring a receipt whose identity cannot be read looks conservative and is
  // the opposite: with no pending row to name the owner, an unreadable receipt
  // is a receipt about to be deleted with its owner never established. Silence
  // is not evidence of belonging, so the unverifiable case refuses too.
  test("pendingが0件でreceiptの所有者を読めない場合は所有者未確認として拒否される", () => {
    const { projectDir } = track(seedSchema1Project(["run-now"]));
    const store = readRawStore(projectDir);
    const receipts = store.receipts as Record<string, unknown>[];
    delete (receipts[0]!.identity as Record<string, unknown>).intentRun;
    store.pending = [];
    writeRawStore(projectDir, store);
    const before = readFileSync(storePath(projectDir), "utf-8");

    const result = recoverSchema1AdvisoryStore(projectDir);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("ownership cannot be verified");
    expect(readFileSync(storePath(projectDir), "utf-8")).toBe(before);
  });
});

describe("advisory store recovery: receipts-only store (AC-2a)", () => {
  test("pendingが0件のstoreはschema 2へ正常化され再提示は不要と示される", () => {
    const { projectDir } = track(seedSchema1Project(["defer-with-risk"]));
    const seeded = readRawStore(projectDir);
    seeded.pending = [];
    writeRawStore(projectDir, seeded);

    const result = recoverSchema1AdvisoryStore(projectDir);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      pendingSalvaged: 0,
      receiptsDropped: 1,
      rePresentationRequired: false,
      runNowReceiptsReset: 0,
    });
    const store = readRawStore(projectDir) as unknown as AdvisoryChoiceStore;
    expect(store).toEqual({ schema: 2, pending: [], receipts: [] });
  });

  test("閉じたpendingしか残っていないstoreも再提示不要として扱われる", () => {
    const { projectDir } = track(seedSchema1Project(["run-now"]));
    const seeded = readRawStore(projectDir);
    (seeded.pending as PendingAdvisory[])[0]!.closedAt = "2026-08-02T00:00:00.000Z";
    writeRawStore(projectDir, seeded);

    const result = recoverSchema1AdvisoryStore(projectDir);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pendingSalvaged).toBe(1);
    expect(result.value.rePresentationRequired).toBe(false);
  });
});

describe("advisory store recovery: refusals", () => {
  test("既にschema 2のstoreは回復対象ではないとしてloudに拒否される", () => {
    const projectDir = track({ projectDir: createTestProject() }).projectDir;
    seedStateFile(projectDir, join(FIXTURES_DIR, "state-mid-inception.md"));
    expect(guardAdvisoryChoices(projectDir, STAGE, [advisory]).kind).toBe("hold");
    const before = readFileSync(storePath(projectDir), "utf-8");

    const result = recoverSchema1AdvisoryStore(projectDir);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("not schema 1");
    expect(readFileSync(storePath(projectDir), "utf-8")).toBe(before);
  });

  // The two arms below guard the read itself rather than the store's content,
  // so they are reached before any advisory is understood. Both are driven
  // through the exported seam in-process: the spawned CLI would exercise the
  // same code, but bun --coverage does not attribute a child process to the
  // parent report, and an arm nothing measures is an arm nothing protects. The
  // reason string is asserted exactly, because it is the only thing that
  // distinguishes which of the refusals actually ran.
  test("JSONとして読めないstoreはunreadableとして拒否され破棄されない", () => {
    const { projectDir } = track(seedSchema1Project(["run-now"]));
    writeFileSync(storePath(projectDir), "{broken");
    const before = readFileSync(storePath(projectDir), "utf-8");

    const result = recoverSchema1AdvisoryStore(projectDir);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toStartWith("advisory choice store is unreadable:");
    expect(readFileSync(storePath(projectDir), "utf-8")).toBe(before);
  });

  test("pending/receiptsが配列でないstoreはshape不正として拒否され破棄されない", () => {
    const { projectDir } = track(seedSchema1Project(["run-now"]));
    writeRawStore(projectDir, { schema: 1, pending: "not-array", receipts: [] });
    const before = readFileSync(storePath(projectDir), "utf-8");

    const result = recoverSchema1AdvisoryStore(projectDir);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("advisory choice store shape is invalid");
    expect(readFileSync(storePath(projectDir), "utf-8")).toBe(before);
  });

  test("pendingが壊れているstoreはfail-closedで拒否され破棄されない", () => {
    const { projectDir } = track(seedSchema1Project(["run-now"]));
    const store = readRawStore(projectDir);
    (store.pending as Record<string, unknown>[])[0]!.message = "";
    writeRawStore(projectDir, store);
    const before = readFileSync(storePath(projectDir), "utf-8");

    const result = recoverSchema1AdvisoryStore(projectDir);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("pending message/createdAt is invalid");
    expect(readFileSync(storePath(projectDir), "utf-8")).toBe(before);
  });
});

describe("advisory store recovery: report closure (AC-2c)", () => {
  test("回復前はschema不正でreportが塞がれ、回復後は同じadvisoryが再提示される", () => {
    const { projectDir, pending } = track(seedSchema1Project(["run-now"]));

    expect(advisoryReportHoldReason(projectDir, STAGE)).toContain("advisory choice evidence is invalid");

    expect(recoverSchema1AdvisoryStore(projectDir).ok).toBe(true);

    // The block is no longer about the store's schema: it is the advisory
    // itself, unanswered, which is the state a human can act on.
    expect(advisoryReportHoldReason(projectDir, STAGE)).toBe(
      `unresolved advisory choice: ${pending.identity.plugin}/${pending.identity.code}/${pending.identity.advisoryInstance}`,
    );
  });

  test("pendingが0件のstoreは回復後にreportのブロックが消える", () => {
    const { projectDir } = track(seedSchema1Project(["run-now"]));
    const seeded = readRawStore(projectDir);
    seeded.pending = [];
    writeRawStore(projectDir, seeded);

    expect(advisoryReportHoldReason(projectDir, STAGE)).toContain("advisory choice evidence is invalid");
    expect(recoverSchema1AdvisoryStore(projectDir).ok).toBe(true);
    expect(advisoryReportHoldReason(projectDir, STAGE)).toBeNull();
  });
});

describe("advisory store recovery: CLI surface (FR-2.5)", () => {
  function captured(run: () => number): { code: number; out: string[]; err: string[] } {
    const out: string[] = [];
    const err: string[] = [];
    const log = spyOn(console, "log").mockImplementation((line: unknown) => void out.push(String(line)));
    const error = spyOn(console, "error").mockImplementation((line: unknown) => void err.push(String(line)));
    try {
      return { code: run(), out, err };
    } finally {
      log.mockRestore();
      error.mockRestore();
    }
  }

  test("回復に成功したCLIは1行のJSONを出しexit 0を返す", () => {
    const { projectDir } = track(seedSchema1Project(["run-now", "defer-with-risk"]));

    const result = captured(() => recoverSchema1AdvisoryStoreCli(projectDir));

    expect(result.code).toBe(0);
    expect(result.err).toEqual([]);
    expect(result.out).toHaveLength(1);
    expect(JSON.parse(result.out[0]!)).toEqual({
      recovered: true,
      pending_salvaged: 1,
      receipts_dropped: 2,
      re_presentation_required: true,
      run_now_receipts_reset: 1,
    });
  });

  test("拒否されたCLIは理由をstderrへ出しexit 1を返す", () => {
    const { projectDir } = track(seedSchema1Project(["run-now"]));
    const store = readRawStore(projectDir);
    (store.pending as PendingAdvisory[])[0]!.identity.intentRun = "019ffffff-dead-7000-b000-000000000000";
    writeRawStore(projectDir, store);

    const result = captured(() => recoverSchema1AdvisoryStoreCli(projectDir));

    expect(result.code).toBe(1);
    expect(result.out).toEqual([]);
    expect(result.err.join("\n")).toContain("does not belong to the active intent");
  });

  test("spawnしたCLIのrecover-schema-1腕が実際に配線されている", () => {
    const { projectDir } = track(seedSchema1Project(["run-now"]));

    const spawned = spawnSync(
      process.execPath,
      [TOOL, "recover-schema-1", "--project-dir", projectDir],
      { encoding: "utf8", env: { ...process.env } },
    );

    expect(spawned.status).toBe(0);
    expect(JSON.parse(spawned.stdout ?? "")).toMatchObject({ recovered: true, receipts_dropped: 1 });
    expect((readRawStore(projectDir) as unknown as AdvisoryChoiceStore).schema).toBe(2);
  });

  test("未知のsubcommandは従来どおりusageを出して拒否される", () => {
    const { projectDir } = track(seedSchema1Project(["run-now"]));

    const spawned = spawnSync(
      process.execPath,
      [TOOL, "recover-schema-2", "--project-dir", projectDir],
      { encoding: "utf8", env: { ...process.env } },
    );

    expect(spawned.status).toBe(1);
    expect(spawned.stderr ?? "").toContain("recover-schema-1");
  });
});
