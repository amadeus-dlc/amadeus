// t259 — U1 elections-registry real-FS tests (Bolt B1 space-record-catalog).
// Layer: integration (touches a tmp elections root — fs-tests-integration-first).
// Covers the fs-bound registry surface and its wiring into Store.create/setState:
// append/read round-trip, duplicate/corrupt fail-closed, the absent-vs-row-missing
// setState split, the create e2e (open verb), and the create order contract.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Election } from "../../packages/framework/core/tools/amadeus-election-model";
import { handleOpen } from "../../packages/framework/core/tools/amadeus-election";
import {
  type ElectionRegistryEntry,
  appendElectionToRegistry,
  electionsRegistryPath,
  readElectionsRegistry,
  Store,
  updateElectionStatus,
} from "../../packages/framework/core/tools/amadeus-election-store";

let root = "";

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "elections-registry-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function entry(electionId: string, status: ElectionRegistryEntry["status"] = "draft"): ElectionRegistryEntry {
  return { electionId, dirName: electionId, createdAt: "2026-07-22T00:00:00Z", status };
}

function election(electionId: string) {
  const parsed = Election.parse({
    electionId,
    kind: "zero-confirm",
    question: "q",
    choices: [{ internalNo: 1, label: "a" }],
    voters: ["alice", "bob"],
  });
  if (!parsed.ok) throw new Error("definition must parse");
  return parsed.value;
}

// Write a raw ElectionFile directly (bypassing Store.create) so no registry row
// exists — used to exercise the absent/row-missing setState branches.
function seedElectionFileWithoutRow(electionId: string): void {
  const dir = join(root, electionId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "election.json"),
    JSON.stringify(
      { electionId, kind: "k", question: "q", choices: [], voters: ["a"], state: "draft" },
      null,
      2,
    ),
  );
}

describe("append / read round-trip", () => {
  test("absent registry -> append starts a fresh [] and read returns the row", () => {
    expect(readElectionsRegistry(root)).toEqual({ kind: "absent" });
    const a = appendElectionToRegistry(root, entry("E-A"));
    expect(a.ok).toBe(true);
    const read = readElectionsRegistry(root);
    expect(read.kind).toBe("ok");
    if (read.kind === "ok") {
      expect(read.entries).toHaveLength(1);
      expect(read.entries[0]).toEqual(entry("E-A"));
    }
    // second distinct election appends
    expect(appendElectionToRegistry(root, entry("E-B", "open")).ok).toBe(true);
    const read2 = readElectionsRegistry(root);
    if (read2.kind === "ok") {
      expect(read2.entries.map((e) => e.electionId)).toEqual(["E-A", "E-B"]);
    }
  });

  test("unknown EXTRA fields on disk survive read (ignored, row still ok)", () => {
    writeFileSync(
      electionsRegistryPath(root),
      JSON.stringify([{ ...entry("E-A"), note: "future", weight: 7 }], null, 2),
    );
    const read = readElectionsRegistry(root);
    expect(read.kind).toBe("ok");
    if (read.kind === "ok") expect(read.entries[0]).toEqual(entry("E-A"));
  });
});

describe("duplicate -> loud (fail-closed)", () => {
  test("appending the same electionId twice returns duplicate and leaves the file unchanged", () => {
    expect(appendElectionToRegistry(root, entry("E-DUP")).ok).toBe(true);
    const before = readFileSync(electionsRegistryPath(root), "utf8");
    const second = appendElectionToRegistry(root, entry("E-DUP", "open"));
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe("duplicate");
    // no partial write: the file is byte-identical and still holds exactly one row
    expect(readFileSync(electionsRegistryPath(root), "utf8")).toBe(before);
    const read = readElectionsRegistry(root);
    if (read.kind === "ok") expect(read.entries).toHaveLength(1);
  });
});

describe("corrupt injection -> fail-closed, never reinitialize", () => {
  test("unparseable JSON -> read corrupt; append/update refuse; file left intact", () => {
    writeFileSync(electionsRegistryPath(root), "{ this is not json");
    const read = readElectionsRegistry(root);
    expect(read.kind).toBe("corrupt");

    const appended = appendElectionToRegistry(root, entry("E-A"));
    expect(appended.ok).toBe(false);
    if (!appended.ok) expect(appended.error).toBe("corrupt");

    const updated = updateElectionStatus(root, "E-A", "open");
    expect(updated.ok).toBe(false);
    if (!updated.ok) expect(updated.error).toBe("corrupt");

    // never silently reinitialize: the corrupt bytes are still on disk
    expect(readFileSync(electionsRegistryPath(root), "utf8")).toBe("{ this is not json");
  });

  test("a row failing the 4-field check makes the whole read corrupt", () => {
    writeFileSync(electionsRegistryPath(root), JSON.stringify([{ electionId: "E-A" }], null, 2));
    expect(readElectionsRegistry(root).kind).toBe("corrupt");
  });

  test("a non-array root is corrupt", () => {
    writeFileSync(electionsRegistryPath(root), JSON.stringify({ electionId: "E-A" }, null, 2));
    expect(readElectionsRegistry(root).kind).toBe("corrupt");
  });

  test("an unreadable elections.json reads corrupt (io fault-injection)", () => {
    const path = electionsRegistryPath(root);
    writeFileSync(path, JSON.stringify([entry("E-A")], null, 2));
    chmodSync(path, 0o000);
    const read = readElectionsRegistry(root);
    chmodSync(path, 0o644); // restore so afterEach can clean up
    expect(read.kind).toBe("corrupt");
  });
});

describe("create io-error branches (fault-injection)", () => {
  test("a root path that is a file (not a dir) -> create fails io-error before any row", () => {
    const fileRoot = join(root, "iamafile");
    writeFileSync(fileRoot, "x"); // root cannot be mkdir'd -> mkdir(root) throws
    const res = Store.create(fileRoot, election("E-X"));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("io-error");
  });
});

describe("updateElectionStatus row-missing", () => {
  test("registry present but no row for the id -> loud not-found", () => {
    expect(appendElectionToRegistry(root, entry("E-A")).ok).toBe(true);
    const res = updateElectionStatus(root, "E-MISSING", "open");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("not-found");
  });

  test("existing row is updated in place, siblings untouched", () => {
    expect(appendElectionToRegistry(root, entry("E-A")).ok).toBe(true);
    expect(appendElectionToRegistry(root, entry("E-B")).ok).toBe(true);
    expect(updateElectionStatus(root, "E-B", "tallied").ok).toBe(true);
    const read = readElectionsRegistry(root);
    if (read.kind === "ok") {
      expect(read.entries.find((e) => e.electionId === "E-A")?.status).toBe("draft");
      expect(read.entries.find((e) => e.electionId === "E-B")?.status).toBe("tallied");
    }
  });
});

describe("Store.setState registry wiring (absent vs row-missing)", () => {
  test("absent registry -> setState is a no-op ok, no elections.json is created", () => {
    seedElectionFileWithoutRow("E-NOREG");
    const res = Store.setState(root, "E-NOREG", "open");
    expect(res.ok).toBe(true);
    expect(existsSync(electionsRegistryPath(root))).toBe(false);
    // the election.json state still advanced
    const ej = JSON.parse(readFileSync(join(root, "E-NOREG", "election.json"), "utf8"));
    expect(ej.state).toBe("open");
  });

  test("registry present + legacy row missing -> setState uses the loud migration path", () => {
    // E-A goes through Store.create (registry gets a row); E-B is a pre-migration
    // direct-name directory and therefore intentionally has no row.
    expect(Store.create(root, election("E-A")).ok).toBe(true);
    seedElectionFileWithoutRow("E-B");
    const res = Store.setState(root, "E-B", "open");
    expect(res.ok).toBe(true);
    const ej = JSON.parse(readFileSync(join(root, "E-B", "election.json"), "utf8"));
    expect(ej.state).toBe("open");
  });

  test("registry present + row present -> setState syncs the row status", () => {
    expect(Store.create(root, election("E-A")).ok).toBe(true);
    expect(Store.setState(root, "E-A", "collecting").ok).toBe(true);
    const read = readElectionsRegistry(root);
    if (read.kind === "ok") {
      expect(read.entries.find((e) => e.electionId === "E-A")?.status).toBe("collecting");
    }
  });
});

describe("create e2e via the open verb", () => {
  test("open -> row resolves the date-prefixed physical dir and status mirrors election.json", () => {
    const electionId = "E-SRCB1CG";
    const defPath = join(root, "def.json");
    writeFileSync(
      defPath,
      JSON.stringify({
        electionId,
        kind: "zero-confirm",
        question: "学習候補 0 件でよいか",
        choices: [{ internalNo: 1, label: "0件で可" }],
        voters: ["alice", "bob"],
      }),
    );
    const code = handleOpen(root, defPath);
    expect(code).toBe(0);

    const read = readElectionsRegistry(root);
    expect(read.kind).toBe("ok");
    if (read.kind !== "ok") throw new Error("registry must be ok");
    const row = read.entries.find((e) => e.electionId === electionId);
    expect(row).toBeDefined();
    if (!row) throw new Error("row must exist");
    expect(row.dirName).toMatch(/^\d{6}-e-srcb1cg$/);
    expect(existsSync(join(root, row.dirName, "election.json"))).toBe(true);
    expect(row.status).toBe("open"); // draft -> open transition synced

    // election.json is the source of truth; the row status mirrors it
    const ej = JSON.parse(readFileSync(join(root, row.dirName, "election.json"), "utf8"));
    expect(ej.state).toBe("open");
    expect(row.status).toBe(ej.state);
  });
});

describe("create order contract (row append BEFORE dir creation)", () => {
  test("a pre-existing registry row for the id aborts create with duplicate and no dir side-effect", () => {
    const electionId = "E-ORDER";
    // Seed a registry row first — no election dir exists yet.
    expect(appendElectionToRegistry(root, entry(electionId)).ok).toBe(true);
    expect(existsSync(join(root, electionId))).toBe(false);

    // create must attempt the registry append (which fails duplicate) BEFORE it
    // creates the electionId directory — so the dir must NOT appear on failure.
    const res = Store.create(root, election(electionId));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("duplicate");
    expect(existsSync(join(root, electionId))).toBe(false); // observable order: no dir
  });

  test("create success writes the row with status draft and a date-prefixed dirName", () => {
    expect(Store.create(root, election("E-FRESH")).ok).toBe(true);
    const read = readElectionsRegistry(root);
    if (read.kind === "ok") {
      const row = read.entries.find((e) => e.electionId === "E-FRESH");
      expect(row?.status).toBe("draft");
      expect(row?.dirName).toMatch(/^\d{6}-e-fresh$/);
      expect(row?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      expect(existsSync(join(root, row?.dirName ?? "", "election.json"))).toBe(true);
    }
  });
});
