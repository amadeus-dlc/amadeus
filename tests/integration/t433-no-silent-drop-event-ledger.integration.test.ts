// covers: contract:no-silent-drop:event-ledger, issue:2338
// size: medium
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  assertEventCustody,
  encodeEvent,
  foldEvents,
  loadEvents,
  parseLedgerEvent,
  type GrantEvent,
  type LedgerEvent,
  type RevokeEvent,
} from "../no-silent-drop/events.ts";
import { mintUlid, ulidFromSeed } from "../no-silent-drop/ulid.ts";

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function grant(fingerprint: string, ulid = ulidFromSeed(`test:grant:${fingerprint}`)): GrantEvent {
  return {
    schemaVersion: 1,
    ulid,
    op: "grant",
    kind: "grandfather",
    fingerprint,
    ruleId: "NSD001",
    file: "a.ts",
    reason: "tracked grandfather",
    issues: ["#2338"],
  };
}

function revoke(fingerprint: string, ulid = ulidFromSeed(`test:revoke:${fingerprint}`)): RevokeEvent {
  return { schemaVersion: 1, ulid, op: "revoke", fingerprint };
}

describe("t433 no-silent-drop event ledger (#2338)", () => {
  test("fold is order-independent: grant/revoke order does not change the effective set", () => {
    const a = grant("fp-a");
    const b = grant("fp-b");
    const r = revoke("fp-a");
    const forward = foldEvents([a, b, r]);
    const reversed = foldEvents([r, b, a]);
    expect(forward.effectiveDigest).toBe(reversed.effectiveDigest);
    expect(forward.grandfather.map((entry) => entry.fingerprint)).toEqual(["fp-b"]);
    expect(reversed.grandfather.map((entry) => entry.fingerprint)).toEqual(["fp-b"]);
  });

  test("parallel event-file additions merge without path conflict", () => {
    const root = mkdtempSync(join(tmpdir(), "nsd-parallel-"));
    tempRoots.push(root);
    const runGit = (args: string[]) => {
      const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
      if (result.status !== 0) throw new Error(result.stderr);
      return result.stdout.trim();
    };
    const git = (args: string[]) =>
      runGit(["-c", "user.name=T", "-c", "user.email=t@example.com", ...args]);
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
    const mergeA = spawnSync("git", ["-c", "user.name=T", "-c", "user.email=t@example.com", "merge", "--no-ff", "-m", "merge a", "pr-a"], { cwd: root, encoding: "utf8" });
    expect(mergeA.status).toBe(0);
    const mergeB = spawnSync("git", ["-c", "user.name=T", "-c", "user.email=t@example.com", "merge", "--no-ff", "-m", "merge b", "pr-b"], { cwd: root, encoding: "utf8" });
    expect(mergeB.status).toBe(0);
    expect(mergeB.stdout + mergeB.stderr).not.toContain("CONFLICT");
  });

  test("ledger-touching merge does not require previousDigest rebind for the next check", () => {
    // Regression for #2338: custody is a file-set subset check, so appending a
    // grant and then checking against the pre-append revision stays green.
    const root = mkdtempSync(join(tmpdir(), "nsd-rebind-free-"));
    tempRoots.push(root);
    const runGit = (args: string[]) => {
      const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
      if (result.status !== 0) throw new Error(result.stderr);
      return result.stdout.trim();
    };
    const git = (args: string[]) =>
      runGit(["-c", "user.name=T", "-c", "user.email=t@example.com", ...args]);
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
    const git = (args: string[]) => {
      const result = spawnSync("git", ["-c", "user.name=T", "-c", "user.email=t@example.com", ...args], {
        cwd: root,
        encoding: "utf8",
      });
      if (result.status !== 0) throw new Error(result.stderr);
      return result.stdout.trim();
    };
    mkdirSync(join(root, "tests/no-silent-drop/events"), { recursive: true });
    spawnSync("git", ["init", "-q"], { cwd: root });
    const first = grant("fp-1", mintUlid());
    writeFileSync(join(root, `tests/no-silent-drop/events/${first.ulid}.json`), encodeEvent(first));
    git(["add", "."]);
    git(["commit", "-qm", "first"]);
    const base = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim();
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
});
