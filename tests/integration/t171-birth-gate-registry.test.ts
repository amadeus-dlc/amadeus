// covers: subcommand:amadeus-orchestrate:next, subcommand:amadeus-utility:intent-birth, subcommand:amadeus-utility:intent-select-response, function:intentPickPromptIfRecordsExist, function:birthPrintDirective, function:buildIntentSelectionSnapshot, function:resolveCurrentIntentSelectionResponse, function:listIntents, function:activeSpace
//
// Mechanism: cli (spawned dist tools) — birth + `next` run end-to-end the way
// the conductor runs them.
//
// Blocker B1 — the no-state birth gate (Branch 7b valid-scope positional /
// Branch 9a explicit --scope flag) fires purely on `!stateContent`, but
// stateContent is empty in TWO worlds: a truly empty workspace (zero intents →
// birth) AND a workspace that already holds intents whose per-user
// active-intent CURSOR is unset (a fresh clone of a >1-intent workspace — the
// cursor is gitignored). Without the guard the gate would mint a DUPLICATE
// intent over the existing ones, violating "auto-birth fires only on ZERO
// intents". The fix: before birthing, consult listIntents over the active
// space; if intents EXIST but none is flagged active, emit a `select-intent` directive
// that lists them and accepts the human's displayed choice, instead of the birth
// `print`. The zero-intent case STILL births unchanged.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  cleanupTestProject,
  createTestProject,
  removeWorkspaceRecord,
} from "../harness/fixtures.ts";
import { readIntentRegistry } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import {
  intentPickPromptIfRecordsExist,
} from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  handleIntentSelectionResponse,
} from "../../packages/framework/core/tools/amadeus-utility.ts";

const BUN = process.execPath;
const REPO_ROOT = join(import.meta.dir, "..", "..");
const UTIL = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "amadeus-utility.ts");
const ORCH = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "amadeus-orchestrate.ts");

let proj: string;

beforeEach(() => {
  proj = createTestProject();
  // P9: the birth gate's whole point is consulting an EMPTY registry (zero
  // intents → birth; >0 intents + no cursor → prompt). createTestProject seeds
  // ONE default intent record + registry row, so strip it to restore the
  // zero-intent baseline every case here assumes. (Mirrors t160's beforeEach.)
  removeWorkspaceRecord(proj);
});
afterEach(() => {
  cleanupTestProject(proj);
});

interface Run {
  status: number;
  stdout: string;
  out: string;
}
function util(args: string[], p = proj): Run {
  const env = { ...process.env };
  delete env.AMADEUS_DEFAULT_SCOPE;
  const r = Bun.spawnSync({
    cmd: [BUN, UTIL, ...args, "--project-dir", p],
    stdout: "pipe",
    stderr: "pipe",
    env,
  });
  const stdout = r.stdout.toString();
  return { status: r.exitCode, stdout, out: `${stdout}${r.stderr.toString()}` };
}
function next(args: string[], p = proj): Run {
  const env = { ...process.env };
  delete env.AMADEUS_DEFAULT_SCOPE;
  const r = Bun.spawnSync({
    cmd: [BUN, ORCH, "next", ...args, "--project-dir", p],
    stdout: "pipe",
    stderr: "pipe",
    env,
  });
  const stdout = r.stdout.toString();
  return { status: r.exitCode, stdout, out: `${stdout}${r.stderr.toString()}` };
}

const intentsDir = (p: string, space = "default"): string =>
  join(p, "amadeus", "spaces", space, "intents");
const cursorPath = (p: string, space = "default"): string =>
  join(intentsDir(p, space), "active-intent");
const recordDirs = (p: string, space = "default"): string[] =>
  readdirSync(intentsDir(p, space)).filter((d) =>
    existsSync(join(intentsDir(p, space), d, "amadeus-state.md")),
  );

function writeIntentRegistryFixture(entries: unknown): void {
  const dir = intentsDir(proj);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "intents.json"),
    `${JSON.stringify(entries, null, 2)}\n`,
    "utf-8",
  );
}

function writeIntentRecordFixture(dirName: string): void {
  const recordDir = join(intentsDir(proj), dirName);
  mkdirSync(recordDir, { recursive: true });
  writeFileSync(
    join(recordDir, "amadeus-state.md"),
    "# AI-DLC State Tracking\n",
    "utf-8",
  );
}

describe("t171 birth gate consults the intent registry (Blocker B1)", () => {
  // ----------------------------------------------------------------
  // (1) >1 intents + no active-intent cursor (fresh clone) → PROMPT, not birth
  // ----------------------------------------------------------------
  describe("a multi-intent workspace with the cursor unset prompts to pick — never births a duplicate", () => {
    // Build the fixture: birth two intents (each birth sets the cursor to the
    // last-born), then DELETE the active-intent cursor to simulate a fresh clone
    // (the cursor is gitignored per-user state, never carried by a clone).
    const seedTwoIntentsNoCursor = (): string[] => {
      expect(util(["intent-birth", "--scope", "poc"]).status).toBe(0);
      expect(util(["intent-birth", "--scope", "feature"]).status).toBe(0);
      const records = recordDirs(proj);
      expect(records.length).toBe(2);
      // Drop the per-user cursor → records on disk, nothing flagged active.
      rmSync(cursorPath(proj), { force: true });
      expect(existsSync(cursorPath(proj))).toBe(false);
      return records;
    };

    test("Branch 9a emits `select-intent` with the existing intents, not a birth print", () => {
      seedTwoIntentsNoCursor();
      const r = next(["--scope", "poc"]);
      const d = JSON.parse(r.stdout.trim());
      expect(intentPickPromptIfRecordsExist(proj)).toEqual(d);
      // NOT a birth print: the gate must not name intent-birth here.
      expect(d.kind).not.toBe("print");
      expect(d.kind).toBe("select-intent");
      expect(d.message ?? "").not.toContain("intent-birth");
      // The human answers this gate directly. The conductor owns applying the
      // response and continuing; the question must not instruct the human to
      // run an internal command or re-run the engine.
      expect(d.question).toBe("Choose an existing intent to continue.");
      expect(d.question).not.toContain("/amadeus intent");
      expect(d.question).not.toContain("re-run");
      // The displayed options, rather than the prose question, carry the
      // registry-backed choices. These births passed no description, so each
      // label is its scope token ("poc", "feature").
      const slugs = readIntentRegistry(proj).map((e) => e.slug);
      expect(slugs.length).toBe(2);
      expect(d.options).toEqual(slugs);
      expect(d.selection_token).toMatch(/^[0-9a-f]{64}$/);
      expect(JSON.parse(next(["--scope", "poc"]).stdout.trim()).selection_token).toBe(
        d.selection_token,
      );
      // No third intent was born and the cursor is still unset.
      expect(recordDirs(proj).length).toBe(2);
      expect(existsSync(cursorPath(proj))).toBe(false);
    });

    test("Branch 7b (bare valid-scope positional) also prompts, not births", () => {
      seedTwoIntentsNoCursor();
      const r = next(["poc"]); // positional valid-scope name, no --scope flag
      const d = JSON.parse(r.stdout.trim());
      expect(d.kind).toBe("select-intent");
      expect(d.options).toEqual(readIntentRegistry(proj).map((e) => e.slug));
      expect(d.message ?? "").not.toContain("intent-birth");
      expect(d.question).toBe("Choose an existing intent to continue.");
      expect(recordDirs(proj).length).toBe(2); // no duplicate born
    });

    test("the utility maps a full-width ordinal and selects under one lock", () => {
      seedTwoIntentsNoCursor();
      const firstRecord = readIntentRegistry(proj)[0].dirName;
      if (firstRecord === undefined) throw new Error("fixture intent has no record directory");
      const directive = JSON.parse(next(["--scope", "poc"]).stdout.trim());

      const selected = util([
        "intent-select-response",
        directive.selection_token,
        "１",
      ]);

      expect(selected.status, selected.out).toBe(0);
      expect(readFileSync(cursorPath(proj), "utf-8").trim()).toBe(firstRecord);
      const repeated = util([
        "intent-select-response",
        directive.selection_token,
        "1",
      ]);
      expect(repeated.status).toBe(1);
      expect(repeated.out).toContain("no longer pending");
      expect(readFileSync(cursorPath(proj), "utf-8").trim()).toBe(firstRecord);
    });

    test("the in-process utility boundary applies the validated response", () => {
      seedTwoIntentsNoCursor();
      const firstRecord = readIntentRegistry(proj)[0].dirName;
      if (firstRecord === undefined) throw new Error("fixture intent has no record directory");
      const directive = intentPickPromptIfRecordsExist(proj);
      if (directive?.kind !== "select-intent") {
        throw new Error("fixture did not produce an intent selection");
      }

      handleIntentSelectionResponse(proj, [
        "intent-select-response",
        directive.selection_token,
        "１",
      ]);

      expect(readFileSync(cursorPath(proj), "utf-8").trim()).toBe(firstRecord);
    });

    test("the in-process utility boundary accepts an exact displayed label", () => {
      seedTwoIntentsNoCursor();
      const registry = readIntentRegistry(proj);
      const secondRecord = registry[1].dirName;
      if (secondRecord === undefined) throw new Error("fixture intent has no record directory");
      const directive = intentPickPromptIfRecordsExist(proj);
      if (directive?.kind !== "select-intent") {
        throw new Error("fixture did not produce an intent selection");
      }

      handleIntentSelectionResponse(proj, [
        "intent-select-response",
        directive.selection_token,
        registry[1].slug,
      ]);

      expect(readFileSync(cursorPath(proj), "utf-8").trim()).toBe(secondRecord);
    });

    test("the utility rejects an out-of-range ordinal without a cursor", () => {
      seedTwoIntentsNoCursor();
      const directive = JSON.parse(next(["--scope", "poc"]).stdout.trim());

      const rejected = util([
        "intent-select-response",
        directive.selection_token,
        "3",
      ]);

      expect(rejected.status).toBe(1);
      expect(rejected.out).toContain("does not match a displayed option");
      expect(existsSync(cursorPath(proj))).toBe(false);
    });

    test("a cursor write failure rejects the selection instead of reporting success", () => {
      seedTwoIntentsNoCursor();
      const directive = JSON.parse(next(["--scope", "poc"]).stdout.trim());
      mkdirSync(cursorPath(proj));

      const rejected = util([
        "intent-select-response",
        directive.selection_token,
        "1",
      ]);

      expect(rejected.status).toBe(1);
      expect(rejected.out).toContain("active-intent cursor");
      expect(rejected.stdout).not.toContain("Active intent");
    });

    test("cursor selection replaces a symlink atomically without modifying its target", () => {
      seedTwoIntentsNoCursor();
      const firstRecord = readIntentRegistry(proj)[0].dirName;
      if (firstRecord === undefined) throw new Error("fixture intent has no record directory");
      const directive = JSON.parse(next(["--scope", "poc"]).stdout.trim());
      const external = join(proj, "external-cursor-target");
      writeFileSync(external, "external\n", "utf-8");
      symlinkSync(external, cursorPath(proj));

      const selected = util([
        "intent-select-response",
        directive.selection_token,
        "1",
      ]);

      expect(selected.status, selected.out).toBe(0);
      expect(readFileSync(external, "utf-8")).toBe("external\n");
      expect(readFileSync(cursorPath(proj), "utf-8").trim()).toBe(firstRecord);
    });

    test("a stale token cannot select a replacement intent with the same display label", () => {
      seedTwoIntentsNoCursor();
      const directive = JSON.parse(next(["--scope", "poc"]).stdout.trim());
      const registry = readIntentRegistry(proj);
      const replaced = registry[0];
      if (!replaced?.dirName) throw new Error("fixture intent has no record directory");
      const replacementDir = `${replaced.dirName}-replacement`;
      renameSync(
        join(intentsDir(proj), replaced.dirName),
        join(intentsDir(proj), replacementDir),
      );
      registry[0] = {
        ...replaced,
        uuid: "00000000-0000-7000-8000-000000000099",
        dirName: replacementDir,
      };
      writeIntentRegistryFixture(registry);

      const rejected = util([
        "intent-select-response",
        directive.selection_token,
        "1",
      ]);

      expect(rejected.status).toBe(1);
      expect(rejected.out).toContain("does not match the current registry");
      expect(existsSync(cursorPath(proj))).toBe(false);
    });

    test("archived intents are omitted from the selectable snapshot", () => {
      seedTwoIntentsNoCursor();
      const registry = readIntentRegistry(proj);
      registry[0] = { ...registry[0], status: "archived" };
      writeIntentRegistryFixture(registry);

      const r = next(["--scope", "poc"]);
      const d = JSON.parse(r.stdout.trim());

      expect(d.kind).toBe("select-intent");
      expect(d.options).toEqual([registry[1].slug]);
      expect(existsSync(cursorPath(proj))).toBe(false);
    });

    test("an orphan is omitted when registry-backed intents remain selectable", () => {
      seedTwoIntentsNoCursor();
      const orphan = "260101-orphan-alongside-valid";
      writeIntentRecordFixture(orphan);

      const d = JSON.parse(next(["--scope", "poc"]).stdout.trim());

      expect(d.kind).toBe("select-intent");
      expect(d.options).toEqual(readIntentRegistry(proj).map((entry) => entry.slug));
      expect(JSON.stringify(d)).not.toContain(orphan);
      expect(recordDirs(proj)).toHaveLength(3);
    });

    test("all-archived entries emit an error instead of a selection or birth", () => {
      seedTwoIntentsNoCursor();
      const registry = readIntentRegistry(proj).map((entry) => ({
        ...entry,
        status: "archived" as const,
      }));
      writeIntentRegistryFixture(registry);

      const d = JSON.parse(next(["--scope", "poc"]).stdout.trim());

      expect(d.kind).toBe("error");
      expect(d.message).toContain("none are selectable");
      for (const entry of registry) expect(d.message).toContain(entry.dirName);
      expect(recordDirs(proj)).toHaveLength(2);
    });

    test("a pending response is rejected when every displayed intent becomes archived", () => {
      seedTwoIntentsNoCursor();
      const directive = JSON.parse(next(["--scope", "poc"]).stdout.trim());
      const registry = readIntentRegistry(proj).map((entry) => ({
        ...entry,
        status: "archived" as const,
      }));
      writeIntentRegistryFixture(registry);

      const rejected = util([
        "intent-select-response",
        directive.selection_token,
        "1",
      ]);

      expect(rejected.status).toBe(1);
      expect(rejected.out).toContain("No selectable intents remain");
      expect(existsSync(cursorPath(proj))).toBe(false);
    });

    test("the utility rejects caller-supplied options and a modified token", () => {
      seedTwoIntentsNoCursor();
      const directive = JSON.parse(next(["--scope", "poc"]).stdout.trim());

      const injectedOptions = util([
        "intent-select-response",
        directive.selection_token,
        "1",
        "feature",
        "poc",
      ]);
      const modifiedToken = util([
        "intent-select-response",
        `${directive.selection_token}x`,
        "1",
      ]);
      const forgedOptionSet = util([
        "intent-select-response",
        "0".repeat(64),
        "1",
      ]);

      expect(injectedOptions.status).toBe(1);
      expect(injectedOptions.out).toContain("Usage:");
      expect(modifiedToken.status).toBe(1);
      expect(modifiedToken.out).toContain("does not match the current registry snapshot");
      expect(forgedOptionSet.status).toBe(1);
      expect(forgedOptionSet.out).toContain("does not match the current registry snapshot");
      expect(existsSync(cursorPath(proj))).toBe(false);
    });
  });

  describe("display labels and registry identities remain unambiguous", () => {
    test("a cross-namespace label collision falls back to record directory labels", () => {
      const firstDir = "260101-first-record";
      const secondDir = "260101-second-record";
      const thirdDir = "260101-third-record";
      const registry = [
        {
          uuid: "00000000-0000-7000-8000-000000000201",
          slug: "same",
          dirName: firstDir,
          scope: "poc",
          status: "in-flight",
        },
        {
          uuid: "00000000-0000-7000-8000-000000000202",
          slug: "same",
          dirName: secondDir,
          scope: "poc",
          status: "in-flight",
        },
        {
          uuid: "00000000-0000-7000-8000-000000000203",
          slug: firstDir,
          dirName: thirdDir,
          scope: "poc",
          status: "in-flight",
        },
      ];
      for (const entry of registry) writeIntentRecordFixture(entry.dirName);
      writeIntentRegistryFixture(registry);

      const directive = intentPickPromptIfRecordsExist(proj);

      expect(directive?.kind).toBe("select-intent");
      if (directive?.kind !== "select-intent") {
        throw new Error("fixture did not produce an intent selection");
      }
      expect(directive.options).toEqual([firstDir, secondDir, thirdDir]);
    });

    test.each([
      {
        name: "duplicate labels",
        rows: [
          {
            uuid: "00000000-0000-7000-8000-000000000211",
            slug: "same",
            dirName: "260101-shared-record",
          },
          {
            uuid: "00000000-0000-7000-8000-000000000212",
            slug: "same",
            dirName: "260101-shared-record",
          },
        ],
        message: "labels must be unique",
      },
      {
        name: "duplicate UUIDs",
        rows: [
          {
            uuid: "00000000-0000-7000-8000-000000000221",
            slug: "first",
            dirName: "260101-first-record",
          },
          {
            uuid: "00000000-0000-7000-8000-000000000221",
            slug: "second",
            dirName: "260101-second-record",
          },
        ],
        message: "UUIDs must be unique",
      },
      {
        name: "duplicate record directories",
        rows: [
          {
            uuid: "00000000-0000-7000-8000-000000000231",
            slug: "first",
            dirName: "260101-shared-record",
          },
          {
            uuid: "00000000-0000-7000-8000-000000000232",
            slug: "second",
            dirName: "260101-shared-record",
          },
        ],
        message: "record directories must be unique",
      },
    ])("rejects $name from the public intent-prompt boundary", ({ rows, message }) => {
      const recordNames = new Set(rows.map((row) => row.dirName));
      for (const dirName of recordNames) {
        writeIntentRecordFixture(dirName);
      }
      // A single physical record is implicitly active even without a cursor.
      // Add an unclaimed record so the no-cursor selection boundary is reached
      // for corrupt registries whose rows both claim the same directory.
      if (recordNames.size === 1) {
        writeIntentRecordFixture("260101-unclaimed-orphan");
      }
      writeIntentRegistryFixture(rows.map((row) => ({
        ...row,
        scope: "poc",
        status: "in-flight",
      })));

      expect(() => intentPickPromptIfRecordsExist(proj)).toThrow(message);
    });
  });

  describe("unselectable intent entries fail closed instead of birthing duplicates", () => {
    test("an orphan record emits an actionable error that names the record", () => {
      const orphan = "260101-orphan-record";
      writeIntentRecordFixture(orphan);

      const r = next(["--scope", "poc"]);
      expect(r.status, r.out).toBe(0);
      const d = JSON.parse(r.stdout.trim());

      expect(d.kind).toBe("error");
      expect(d.message).toContain(orphan);
      expect(d.message).toContain("Repair the intent registry");
      expect(recordDirs(proj)).toEqual([orphan]);
      expect(existsSync(cursorPath(proj))).toBe(false);
    });

    test("a registry-only entry emits an actionable error", () => {
      writeIntentRegistryFixture([
        {
          uuid: "00000000-0000-7000-8000-000000000123",
          slug: "missing-record",
          dirName: "260101-missing-record",
          scope: "poc",
          status: "in-flight",
        },
      ]);

      const r = next(["--scope", "poc"]);
      expect(r.status, r.out).toBe(0);
      const d = JSON.parse(r.stdout.trim());

      expect(d.kind).toBe("error");
      expect(d.message).toContain("missing-record");
      expect(d.message).toContain("registry-only");
      expect(recordDirs(proj)).toEqual([]);
    });
  });

  // ----------------------------------------------------------------
  // (2) ZERO intents → STILL births exactly as before
  // ----------------------------------------------------------------
  describe("a fresh empty workspace still names intent-birth (unchanged)", () => {
    test("Branch 9a births on zero intents", () => {
      const r = next(["--scope", "poc"]);
      const d = JSON.parse(r.stdout.trim());
      expect(d.kind).toBe("print");
      expect(d.message).toContain("intent-birth --scope poc");
      // Read-only: next did not birth anything itself.
      expect(existsSync(intentsDir(proj))).toBe(false);
    });

    test("Branch 7b births on zero intents (bare valid-scope positional)", () => {
      const r = next(["poc"]);
      const d = JSON.parse(r.stdout.trim());
      expect(d.kind).toBe("print");
      expect(d.message).toContain("intent-birth --scope poc");
      expect(existsSync(intentsDir(proj))).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // (3) A single intent with the cursor set → the happy path resolves it
  //     (NOT a birth, NOT a prompt) — the active intent's state drives `next`.
  // ----------------------------------------------------------------
  test("one intent with a live cursor resolves to its workflow (neither birth nor prompt)", () => {
    expect(util(["intent-birth", "--scope", "poc"]).status).toBe(0);
    expect(recordDirs(proj).length).toBe(1);
    expect(existsSync(cursorPath(proj))).toBe(true);
    const r = next(["--scope", "poc"]);
    const d = JSON.parse(r.stdout.trim());
    // The lone born intent has a live cursor + state → the engine reads its
    // position and advances; it must NOT re-name intent-birth nor prompt to pick.
    expect(d.kind).not.toBe("ask");
    if (d.kind === "print") expect(d.message).not.toContain("intent-birth");
    // The cursor was never disturbed.
    const cursor = readFileSync(cursorPath(proj), "utf-8").trim();
    expect(recordDirs(proj)).toContain(cursor);
  });
});
