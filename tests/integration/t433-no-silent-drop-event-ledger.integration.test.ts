// covers: contract:no-silent-drop:event-ledger, issue:2338
// size: medium
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  assertEventCustody,
  baselineDocFromFold,
  encodeEvent,
  eventPath,
  exemptionsDocFromFold,
  foldEvents,
  listEventUlidsAtRevision,
  loadEvents,
  loadEventsFromDir,
  parseLedgerEvent,
  type GrantEvent,
  type LedgerEvent,
  type RevokeEvent,
  type SnapshotEvent,
} from "../no-silent-drop/events.ts";
import { digest } from "../no-silent-drop/model.ts";
import { isUlid, mintUlid, parseUlid, ulidFromSeed } from "../no-silent-drop/ulid.ts";
import { noSilentDropTrustedBase } from "../lib/no-silent-drop-trusted-base.ts";

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function grant(
  fingerprint: string,
  ulid = ulidFromSeed(`test:grant:${fingerprint}`),
  kind: "grandfather" | "exemption" = "grandfather",
): GrantEvent {
  return {
    schemaVersion: 1,
    ulid,
    op: "grant",
    kind,
    fingerprint,
    ruleId: kind === "exemption" ? "NSD002" : "NSD001",
    file: "a.ts",
    reason: "tracked grandfather",
    issues: ["#2338"],
  };
}

function revoke(fingerprint: string, ulid = ulidFromSeed(`test:revoke:${fingerprint}`)): RevokeEvent {
  return { schemaVersion: 1, ulid, op: "revoke", fingerprint };
}

function gitRunners(root: string): {
  runGit: (args: string[]) => string;
  git: (args: string[]) => string;
} {
  const runGit = (args: string[]) => {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr);
    return result.stdout.trim();
  };
  const git = (args: string[]) =>
    runGit(["-c", "user.name=T", "-c", "user.email=t@example.com", ...args]);
  return { runGit, git };
}

describe("t433 no-silent-drop event ledger (#2338)", () => {
  test("fold is order-independent: grant/revoke order does not change the effective set", () => {
    const a = grant("fp-a");
    const b = grant("fp-b");
    const r = revoke("fp-a");
    const regrant = grant("fp-a", ulidFromSeed("test:regrant:fp-a"));
    const forward = foldEvents([a, b, r]);
    const reversed = foldEvents([r, b, a]);
    expect(forward.effectiveDigest).toBe(reversed.effectiveDigest);
    expect(forward.grandfather.map((entry) => entry.fingerprint)).toEqual(["fp-b"]);
    expect(reversed.grandfather.map((entry) => entry.fingerprint)).toEqual(["fp-b"]);

    const regrantForward = foldEvents([a, r, regrant]);
    const regrantReversed = foldEvents([regrant, r, a]);
    expect(regrantForward.effectiveDigest).toBe(regrantReversed.effectiveDigest);
    expect(regrantForward.grandfather.map((entry) => entry.fingerprint)).toEqual([]);
    expect(regrantReversed.grandfather.map((entry) => entry.fingerprint)).toEqual([]);
  });

  test("parallel event-file additions merge without path conflict", () => {
    const root = mkdtempSync(join(tmpdir(), "nsd-parallel-"));
    tempRoots.push(root);
    const { runGit, git } = gitRunners(root);
    runGit(["init", "-q"]);
    mkdirSync(join(root, "tests/no-silent-drop/events"), { recursive: true });
    writeFileSync(join(root, "tests/no-silent-drop/events/.gitkeep"), "");
    git(["add", "."]);
    git(["commit", "-qm", "base"]);
    const base = runGit(["rev-parse", "HEAD"]);

    runGit(["checkout", "-qb", "pr-a"]);
    const eventA = grant("fp-a", mintUlid());
    writeFileSync(join(root, `tests/no-silent-drop/events/${eventA.ulid}.json`), encodeEvent(eventA));
    git(["add", "."]);
    git(["commit", "-qm", "grant-a"]);

    runGit(["checkout", "-qb", "pr-b", base]);
    const eventB = grant("fp-b", mintUlid());
    writeFileSync(join(root, `tests/no-silent-drop/events/${eventB.ulid}.json`), encodeEvent(eventB));
    git(["add", "."]);
    git(["commit", "-qm", "grant-b"]);

    runGit(["checkout", "-qb", "integrate", base]);
    const mergeA = spawnSync(
      "git",
      ["-c", "user.name=T", "-c", "user.email=t@example.com", "merge", "--no-ff", "-m", "merge a", "pr-a"],
      { cwd: root, encoding: "utf8" },
    );
    expect(mergeA.status).toBe(0);
    const mergeB = spawnSync(
      "git",
      ["-c", "user.name=T", "-c", "user.email=t@example.com", "merge", "--no-ff", "-m", "merge b", "pr-b"],
      { cwd: root, encoding: "utf8" },
    );
    expect(mergeB.status).toBe(0);
    const folded = foldEvents(loadEvents(root).byUlid.values());
    expect(folded.grandfather.map((entry) => entry.fingerprint).sort()).toEqual(["fp-a", "fp-b"]);
  });

  test("ledger-touching merge does not require previousDigest rebind for the next check", () => {
    // Regression for #2338: custody is a file-set subset check, so appending a
    // grant and then checking against the pre-append revision stays green.
    const root = mkdtempSync(join(tmpdir(), "nsd-rebind-free-"));
    tempRoots.push(root);
    const { runGit, git } = gitRunners(root);
    mkdirSync(join(root, "tests/no-silent-drop/events"), { recursive: true });
    runGit(["init", "-q"]);
    const first = grant("fp-1", mintUlid());
    writeFileSync(join(root, `tests/no-silent-drop/events/${first.ulid}.json`), encodeEvent(first));
    git(["add", "."]);
    git(["commit", "-qm", "first"]);
    const base = runGit(["rev-parse", "HEAD"]);

    const second = grant("fp-2", mintUlid());
    writeFileSync(join(root, `tests/no-silent-drop/events/${second.ulid}.json`), encodeEvent(second));
    git(["add", "."]);
    git(["commit", "-qm", "second"]);

    const loaded = loadEvents(root);
    const folded = foldEvents(loaded.byUlid.values());
    expect(() => assertEventCustody(root, base, loaded, folded)).not.toThrow();
    expect(folded.grandfather.map((entry) => entry.fingerprint).sort()).toEqual(["fp-1", "fp-2"]);
  });

  test("in-place mutation of a shared event file fails custody", () => {
    const root = mkdtempSync(join(tmpdir(), "nsd-mutate-"));
    tempRoots.push(root);
    const { runGit, git } = gitRunners(root);
    mkdirSync(join(root, "tests/no-silent-drop/events"), { recursive: true });
    runGit(["init", "-q"]);
    const first = grant("fp-1", mintUlid());
    writeFileSync(join(root, `tests/no-silent-drop/events/${first.ulid}.json`), encodeEvent(first));
    git(["add", "."]);
    git(["commit", "-qm", "first"]);
    const base = runGit(["rev-parse", "HEAD"]);
    writeFileSync(
      join(root, `tests/no-silent-drop/events/${first.ulid}.json`),
      encodeEvent({ ...first, fingerprint: "fp-hijacked", reason: "mutated in place", issues: ["#2338"] }),
    );
    const loaded = loadEvents(root);
    const folded = foldEvents(loaded.byUlid.values());
    expect(() => assertEventCustody(root, base, loaded, folded)).toThrow("in-place mutation forbidden");
  });

  test("grant contract rejects empty reason and missing issues", () => {
    const badReason: LedgerEvent = {
      ...grant("fp"),
      reason: "   ",
    };
    const badIssues = {
      schemaVersion: 1 as const,
      ulid: ulidFromSeed("bad-issues"),
      op: "grant" as const,
      kind: "grandfather" as const,
      fingerprint: "fp",
      ruleId: "NSD001" as const,
      file: "a.ts",
      reason: "ok",
      issues: [] as string[],
    };
    expect(() => parseLedgerEvent(JSON.stringify(badReason))).toThrow("reason");
    expect(() => parseLedgerEvent(JSON.stringify(badIssues))).toThrow("issues");
  });

  test("parseLedgerEvent rejects malformed grants, revokes, and snapshots", () => {
    const ulid = ulidFromSeed("parse:bad");
    expect(() => parseLedgerEvent("{", ulid)).toThrow("not valid JSON");
    expect(() => parseLedgerEvent(JSON.stringify({ schemaVersion: 2, ulid, op: "grant" }), ulid)).toThrow(
      "schemaVersion 1",
    );
    expect(() => parseLedgerEvent(JSON.stringify({ schemaVersion: 1, ulid: "not-a-ulid", op: "grant" }))).toThrow(
      "ulid is invalid",
    );
    expect(() =>
      parseLedgerEvent(JSON.stringify({ ...grant("fp"), ulid: ulidFromSeed("other") }), ulid),
    ).toThrow("does not match filename");
    expect(() =>
      parseLedgerEvent(
        JSON.stringify({
          schemaVersion: 1,
          ulid,
          op: "grant",
          kind: "weird",
          fingerprint: "fp",
          ruleId: "NSD001",
          file: "a.ts",
          reason: "ok",
          issues: ["#1"],
        }),
      ),
    ).toThrow("kind");
    expect(() =>
      parseLedgerEvent(
        JSON.stringify({
          schemaVersion: 1,
          ulid,
          op: "grant",
          kind: "grandfather",
          fingerprint: "  ",
          ruleId: "NSD001",
          file: "a.ts",
          reason: "ok",
          issues: ["#1"],
        }),
      ),
    ).toThrow("fingerprint");
    expect(() =>
      parseLedgerEvent(
        JSON.stringify({
          schemaVersion: 1,
          ulid,
          op: "grant",
          kind: "grandfather",
          fingerprint: "fp",
          ruleId: "NSD999",
          file: "a.ts",
          reason: "ok",
          issues: ["#1"],
        }),
      ),
    ).toThrow("ruleId");
    expect(() =>
      parseLedgerEvent(
        JSON.stringify({
          schemaVersion: 1,
          ulid,
          op: "grant",
          kind: "grandfather",
          fingerprint: "fp",
          ruleId: "NSD001",
          file: "../escape.ts",
          reason: "ok",
          issues: ["#1"],
        }),
      ),
    ).toThrow("file");
    expect(() =>
      parseLedgerEvent(JSON.stringify({ schemaVersion: 1, ulid, op: "revoke", fingerprint: "  " }), ulid),
    ).toThrow("fingerprint");
    expect(() =>
      parseLedgerEvent(
        JSON.stringify({
          schemaVersion: 1,
          ulid,
          op: "snapshot",
          effectiveDigest: "not-hex",
          effective: [],
          deleteUlids: [],
        }),
        ulid,
      ),
    ).toThrow("effectiveDigest");
    expect(() =>
      parseLedgerEvent(
        JSON.stringify({
          schemaVersion: 1,
          ulid,
          op: "snapshot",
          effectiveDigest: "a".repeat(64),
          effective: "nope",
          deleteUlids: [],
        }),
        ulid,
      ),
    ).toThrow("effective must be an array");
    expect(() =>
      parseLedgerEvent(
        JSON.stringify({
          schemaVersion: 1,
          ulid,
          op: "snapshot",
          effectiveDigest: "a".repeat(64),
          effective: [],
          deleteUlids: ["not-ulid"],
        }),
        ulid,
      ),
    ).toThrow("deleteUlids");
    const dup = ulidFromSeed("dup-delete");
    expect(() =>
      parseLedgerEvent(
        JSON.stringify({
          schemaVersion: 1,
          ulid,
          op: "snapshot",
          effectiveDigest: digest(""),
          effective: [],
          deleteUlids: [dup, dup],
        }),
        ulid,
      ),
    ).toThrow("duplicates");
    expect(() =>
      parseLedgerEvent(
        JSON.stringify({
          schemaVersion: 1,
          ulid,
          op: "snapshot",
          effectiveDigest: digest(""),
          effective: [null],
          deleteUlids: [],
        }),
        ulid,
      ),
    ).toThrow("effective[0]");
    expect(() => parseLedgerEvent(JSON.stringify({ schemaVersion: 1, ulid, op: "bind" }), ulid)).toThrow(
      "op must be grant",
    );
  });

  test("foldEvents materializes generators and validates snapshots", () => {
    const g = grant("fp-g");
    const e = grant("fp-e", ulidFromSeed("ex"), "exemption");
    const folded = foldEvents(
      (function* () {
        yield g;
        yield e;
      })(),
    );
    expect(folded.exemptions.map((entry) => entry.fingerprint)).toEqual(["fp-e"]);
    expect(folded.grandfather.map((entry) => entry.fingerprint)).toEqual(["fp-g"]);

    const stillPresent = grant("fp-keep", mintUlid());
    const snap: SnapshotEvent = {
      schemaVersion: 1,
      ulid: mintUlid(),
      op: "snapshot",
      effectiveDigest: digest("fp-keep"),
      effective: [
        {
          fingerprint: "fp-keep",
          kind: "grandfather",
          ruleId: "NSD001",
          file: "a.ts",
          reason: "kept",
          issues: ["#2338"],
        },
      ],
      deleteUlids: [stillPresent.ulid],
    };
    expect(() => foldEvents([stillPresent, snap])).toThrow("still present");

    const staleSnap: SnapshotEvent = {
      schemaVersion: 1,
      ulid: mintUlid(),
      op: "snapshot",
      effectiveDigest: "b".repeat(64),
      effective: [
        {
          fingerprint: "fp-x",
          kind: "grandfather",
          ruleId: "NSD001",
          file: "a.ts",
          reason: "x",
          issues: ["#2338"],
        },
      ],
      deleteUlids: [],
    };
    expect(() => foldEvents([staleSnap])).toThrow("does not match its embedded effective set");
  });

  test("loadEventsFromDir and custody reject missing, invalid, and unenumerated deletes", () => {
    expect(() => loadEventsFromDir(join(tmpdir(), "nsd-absent-events-dir"))).toThrow("event ledger is missing");

    const badNameRoot = mkdtempSync(join(tmpdir(), "nsd-bad-name-"));
    tempRoots.push(badNameRoot);
    mkdirSync(join(badNameRoot, "tests/no-silent-drop/events"), { recursive: true });
    writeFileSync(join(badNameRoot, "tests/no-silent-drop/events/not-a-ulid.json"), "{}\n");
    expect(() => loadEvents(badNameRoot)).toThrow("event filename is not <ulid>.json");

    const root = mkdtempSync(join(tmpdir(), "nsd-custody-delete-"));
    tempRoots.push(root);
    const { runGit, git } = gitRunners(root);
    mkdirSync(join(root, "tests/no-silent-drop/events"), { recursive: true });
    runGit(["init", "-q"]);
    const kept = grant("fp-kept", mintUlid());
    const doomed = grant("fp-doomed", mintUlid());
    writeFileSync(join(root, `tests/no-silent-drop/events/${kept.ulid}.json`), encodeEvent(kept));
    writeFileSync(join(root, `tests/no-silent-drop/events/${doomed.ulid}.json`), encodeEvent(doomed));
    git(["add", "."]);
    git(["commit", "-qm", "base"]);
    const base = runGit(["rev-parse", "HEAD"]);
    expect(listEventUlidsAtRevision(root, base).has(kept.ulid)).toBe(true);

    rmSync(join(root, `tests/no-silent-drop/events/${doomed.ulid}.json`));
    const missingLoaded = loadEvents(root);
    const missingFolded = foldEvents(missingLoaded.byUlid.values());
    expect(() => assertEventCustody(root, base, missingLoaded, missingFolded)).toThrow(
      "deleted without snapshot enumeration",
    );

    const snapshotUlid = mintUlid();
    const snap: SnapshotEvent = {
      schemaVersion: 1,
      ulid: snapshotUlid,
      op: "snapshot",
      effectiveDigest: digest("fp-kept"),
      effective: [
        {
          fingerprint: "fp-kept",
          kind: "grandfather",
          ruleId: "NSD001",
          file: "a.ts",
          reason: "kept",
          issues: ["#2338"],
        },
      ],
      deleteUlids: [doomed.ulid],
    };
    writeFileSync(join(root, `tests/no-silent-drop/events/${snapshotUlid}.json`), encodeEvent(snap));
    const okLoaded = loadEvents(root);
    const okFolded = foldEvents(okLoaded.byUlid.values());
    expect(() => assertEventCustody(root, base, okLoaded, okFolded)).not.toThrow();

    const forgedUlid = mintUlid();
    const forged: SnapshotEvent = {
      schemaVersion: 1,
      ulid: forgedUlid,
      op: "snapshot",
      effectiveDigest: digest("fp-forged"),
      effective: [
        {
          fingerprint: "fp-forged",
          kind: "grandfather",
          ruleId: "NSD001",
          file: "a.ts",
          reason: "forged",
          issues: ["#2338"],
        },
      ],
      deleteUlids: [kept.ulid],
    };
    writeFileSync(join(root, `tests/no-silent-drop/events/${forgedUlid}.json`), encodeEvent(forged));
    rmSync(join(root, `tests/no-silent-drop/events/${kept.ulid}.json`));
    const forgedLoaded = loadEvents(root);
    const forgedFolded = foldEvents(forgedLoaded.byUlid.values());
    expect(() => assertEventCustody(root, base, forgedLoaded, forgedFolded)).toThrow(
      "does not match the pre-delete fold",
    );

    const alienDelete: SnapshotEvent = {
      schemaVersion: 1,
      ulid: mintUlid(),
      op: "snapshot",
      effectiveDigest: digest("fp-kept"),
      effective: [
        {
          fingerprint: "fp-kept",
          kind: "grandfather",
          ruleId: "NSD001",
          file: "a.ts",
          reason: "kept",
          issues: ["#2338"],
        },
      ],
      deleteUlids: [mintUlid()],
    };
    // Reset to a valid compact state then try deleting a ULID never on base.
    writeFileSync(join(root, `tests/no-silent-drop/events/${kept.ulid}.json`), encodeEvent(kept));
    rmSync(join(root, `tests/no-silent-drop/events/${forgedUlid}.json`));
    writeFileSync(join(root, `tests/no-silent-drop/events/${alienDelete.ulid}.json`), encodeEvent(alienDelete));
    const alienLoaded = loadEvents(root);
    const alienFolded = foldEvents(alienLoaded.byUlid.values());
    expect(() => assertEventCustody(root, base, alienLoaded, alienFolded)).toThrow(
      "was not present on the trusted base",
    );

    expect(() => assertEventCustody(root, "deadbeef", okLoaded, okFolded)).toThrow("full commit");
  });

  test("noSilentDropTrustedBase prefers merge-base and falls back to HEAD^", () => {
    const root = mkdtempSync(join(tmpdir(), "nsd-trusted-base-"));
    tempRoots.push(root);
    const { runGit, git } = gitRunners(root);
    mkdirSync(join(root, "tests/no-silent-drop/events"), { recursive: true });
    runGit(["init", "-q"]);
    writeFileSync(join(root, "tests/no-silent-drop/events/.gitkeep"), "");
    git(["add", "."]);
    git(["commit", "-qm", "first"]);
    const parent = runGit(["rev-parse", "HEAD"]);
    writeFileSync(join(root, "README"), "x\n");
    git(["add", "."]);
    git(["commit", "-qm", "second"]);
    expect(noSilentDropTrustedBase(root)).toBe(parent);

    const bare = mkdtempSync(join(tmpdir(), "nsd-trusted-bare-"));
    tempRoots.push(bare);
    const clone = spawnSync("git", ["clone", "--bare", root, bare], { encoding: "utf8" });
    expect(clone.status).toBe(0);
    runGit(["remote", "add", "origin", bare]);
    runGit(["fetch", "origin"]);
    runGit(["update-ref", "refs/remotes/origin/main", parent]);
    expect(noSilentDropTrustedBase(root)).toBe(parent);

    expect(noSilentDropTrustedBase(join(tmpdir(), "nsd-no-events-"))).toBeNull();
  });

  test("fold helpers project baseline and exemption documents", () => {
    const folded = foldEvents([grant("fp-g"), grant("fp-e", ulidFromSeed("ex-doc"), "exemption")]);
    const baseline = baselineDocFromFold(folded, "rev", "census", "approval");
    expect(baseline.entries.map((entry) => entry.fingerprint)).toEqual(["fp-g"]);
    expect(baseline.generatedFrom).toEqual({
      revision: "rev",
      censusDigest: "census",
      approvalDigest: "approval",
    });
    expect(exemptionsDocFromFold(folded).entries.map((entry) => entry.fingerprint)).toEqual(["fp-e"]);
  });

  test("mintUlid rejects an out-of-range timestamp", () => {
    expect(() => mintUlid(-1)).toThrow("timestamp out of range");
  });

  test("ULIDs use the standard bit layout: 2 leading pad bits and a 48-bit timestamp prefix", () => {
    // 0x0000_0000_0001 ms → the 10-character timestamp prefix must end in "1".
    expect(mintUlid(1).slice(0, 10)).toBe("0000000001");
    expect(mintUlid(Date.now()).charCodeAt(0)).toBeLessThanOrEqual("7".charCodeAt(0));
    // The trailing character carries entropy, so it is not confined to a 4-multiple.
    const trailing = new Set(Array.from({ length: 64 }, () => mintUlid().slice(-1)));
    expect(trailing.size).toBeGreaterThan(8);
    expect(isUlid(`8${"0".repeat(25)}`)).toBe(false);
    expect(() => parseUlid("Z".repeat(26), "ulid")).toThrow("is not a ULID");
  });

  test("load and custody cover remaining fail-closed arms", () => {
    const revokeUlid = ulidFromSeed("parse:revoke-ok");
    expect(parseLedgerEvent(JSON.stringify(revoke("fp-ok", revokeUlid)), revokeUlid).op).toBe("revoke");
    expect(eventPath(revokeUlid)).toBe(`tests/no-silent-drop/events/${revokeUlid}.json`);

    const fileAsDir = mkdtempSync(join(tmpdir(), "nsd-file-as-dir-"));
    tempRoots.push(fileAsDir);
    const blocked = join(fileAsDir, "events-as-file");
    writeFileSync(blocked, "not a directory\n");
    expect(() => loadEventsFromDir(blocked)).toThrow("event ledger is unreadable");

    const unreadableFileRoot = mkdtempSync(join(tmpdir(), "nsd-unreadable-event-"));
    tempRoots.push(unreadableFileRoot);
    const eventsDir = join(unreadableFileRoot, "tests/no-silent-drop/events");
    mkdirSync(eventsDir, { recursive: true });
    const blockedUlid = mintUlid();
    mkdirSync(join(eventsDir, `${blockedUlid}.json`));
    expect(() => loadEvents(unreadableFileRoot)).toThrow("is unreadable");

    const root = mkdtempSync(join(tmpdir(), "nsd-custody-edges-"));
    tempRoots.push(root);
    const { runGit, git } = gitRunners(root);
    runGit(["init", "-q"]);
    mkdirSync(join(root, "tests/no-silent-drop"), { recursive: true });
    writeFileSync(join(root, "README"), "base\n");
    git(["add", "."]);
    git(["commit", "-qm", "no-events"]);
    const emptyEventsSha = runGit(["rev-parse", "HEAD"]);
    expect(listEventUlidsAtRevision(root, emptyEventsSha).size).toBe(0);

    mkdirSync(join(root, "tests/no-silent-drop/events"), { recursive: true });
    const first = grant("fp-1", mintUlid());
    writeFileSync(join(root, `tests/no-silent-drop/events/${first.ulid}.json`), encodeEvent(first));
    writeFileSync(join(root, "tests/no-silent-drop/events/NOTAVALIDULIDFILENAME.json"), "{}\n");
    git(["add", "."]);
    git(["commit", "-qm", "bad-name"]);
    const badNameSha = runGit(["rev-parse", "HEAD"]);
    expect(() => listEventUlidsAtRevision(root, badNameSha)).toThrow("trusted base event filename is not a ULID");
    rmSync(join(root, "tests/no-silent-drop/events/NOTAVALIDULIDFILENAME.json"));
    git(["add", "-A"]);
    git(["commit", "-qm", "clean-name"]);
    const base = runGit(["rev-parse", "HEAD"]);

    const second = grant("fp-2", mintUlid());
    writeFileSync(join(root, `tests/no-silent-drop/events/${second.ulid}.json`), encodeEvent(second));
    const snapUlid = mintUlid();
    const snap: SnapshotEvent = {
      schemaVersion: 1,
      ulid: snapUlid,
      op: "snapshot",
      effectiveDigest: digest(["fp-1", "fp-2"].sort().join("\n")),
      effective: [
        {
          fingerprint: "fp-1",
          kind: "grandfather",
          ruleId: "NSD001",
          file: "a.ts",
          reason: "kept",
          issues: ["#2338"],
        },
        {
          fingerprint: "fp-2",
          kind: "grandfather",
          ruleId: "NSD001",
          file: "a.ts",
          reason: "added",
          issues: ["#2338"],
        },
      ],
      deleteUlids: [],
    };
    writeFileSync(join(root, `tests/no-silent-drop/events/${snapUlid}.json`), encodeEvent(snap));
    const withGrant = loadEvents(root);
    const withGrantFolded = foldEvents(withGrant.byUlid.values());
    expect(() => assertEventCustody(root, base, withGrant, withGrantFolded)).not.toThrow();

    rmSync(join(root, `tests/no-silent-drop/events/${first.ulid}.json`));
    expect(() => assertEventCustody(root, base, withGrant, withGrantFolded)).toThrow("head event");

    expect(() =>
      assertEventCustody(root, "a".repeat(40), withGrant, withGrantFolded),
    ).toThrow("not a resolvable full commit");
  });
});
