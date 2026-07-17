// covers: harness-instrument:amadeus-mirror
//
// t232 (process/fs boundary) — drives the amadeus-mirror handlers against a
// temp workspace fixture (real fs, hence integration) with a fake GhRunner
// injected through the C4 port (ADR-4: no fixture branches in production
// code). Falling proofs: duplicate create (FR-2.2), missing Mirror Issue
// field (FR-3.3), landing check with one-sided/absent completion signals
// (FR-4.1 AND, fail-closed), gh-unready (FR-1.3), and the R-3 partial-failure
// path (issue created but the field write fails).

import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type GhResult,
  type GhRunner,
  handleClose,
  handleCreate,
  handleSync,
} from "../../scripts/amadeus-mirror";

const DIR = "260717-mirror-issue-tool";
const roots: string[] = [];

afterEach(() => {
  for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true });
});

function makeWorkspace(over: {
  status?: string;
  intentStatus?: string;
  mirrorIssue?: string | null;
  parked?: boolean;
}): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-mirror-t232-"));
  roots.push(root);
  const intents = join(root, "amadeus", "spaces", "default", "intents");
  mkdirSync(join(intents, DIR), { recursive: true });
  writeFileSync(
    join(intents, "intents.json"),
    `${JSON.stringify([
      {
        uuid: "019f7003-e273-7c0b-85ba-0a6c99d0aa9d",
        slug: "mirror-issue-tool",
        dirName: DIR,
        scope: "amadeus",
        status: over.intentStatus ?? "in-flight",
      },
    ])}\n`,
  );
  const state = [
    "# Amadeus State",
    "",
    "## Project Information",
    "- **Project**: amadeus-mirror ツール(試運転)",
    "- **Scope**: amadeus",
    ...(over.mirrorIssue ? [`- **Mirror Issue**: ${over.mirrorIssue}`] : []),
    "",
    "## Current Status",
    "- **Lifecycle Phase**: INCEPTION",
    "- **Current Stage**: reverse-engineering",
    `- **Status**: ${over.status ?? "Running"}`,
    "- **Last Updated**: 2026-07-17T13:23:34Z",
    "",
    "## Runtime State",
    ...(over.parked
      ? ["- **Parked**: 2026-07-17T13:23:34Z", "- **Parked At Stage**: reverse-engineering"]
      : []),
    "",
    "## Stage Progress",
    "- [x] intent-capture — EXECUTE",
    "- [x] feasibility — EXECUTE",
    "- [-] scope-definition — EXECUTE",
    "",
  ].join("\n");
  writeFileSync(join(intents, DIR, "amadeus-state.md"), state);
  return root;
}

function fakeGh(
  responses: Record<string, GhResult>,
): { run: GhRunner; calls: string[][] } {
  const calls: string[][] = [];
  const run: GhRunner = (args) => {
    calls.push(args);
    const key = args.slice(0, 2).join(" ");
    return responses[key] ?? { kind: "ok", stdout: "" };
  };
  return { run, calls };
}

const CREATED: GhResult = {
  kind: "ok",
  stdout: "https://github.com/amadeus-dlc/amadeus/issues/1161\n",
};

describe("t232 handleCreate", () => {
  test("creates the issue, passes array args with both labels, records the field", () => {
    const root = makeWorkspace({});
    const gh = fakeGh({ "issue create": CREATED });
    expect(handleCreate(root, DIR, gh.run)).toBe(0);
    const createCall = gh.calls.find((c) => c[0] === "issue" && c[1] === "create");
    expect(createCall).toContain("intent-mirror");
    expect(createCall).toContain("enhancement");
    const state = readFileSync(
      join(root, "amadeus", "spaces", "default", "intents", DIR, "amadeus-state.md"),
      "utf-8",
    );
    expect(state).toContain("- **Mirror Issue**: #1161");
  });

  test("duplicate create is refused loud (FR-2.2)", () => {
    const root = makeWorkspace({ mirrorIssue: "#1161" });
    const gh = fakeGh({});
    expect(handleCreate(root, DIR, gh.run)).toBe(1);
    expect(gh.calls.length).toBe(0);
  });

  test("gh-unready fails before any mutation (FR-1.3)", () => {
    const root = makeWorkspace({});
    const gh = fakeGh({
      "auth status": { kind: "error", exitCode: 1, stderr: "not logged in" },
    });
    expect(handleCreate(root, DIR, gh.run)).toBe(1);
    expect(gh.calls.filter((c) => c[0] === "issue").length).toBe(0);
  });

  test("unknown intent dir fails loud (SnapshotOutcome error path)", () => {
    const root = makeWorkspace({});
    expect(handleCreate(root, "no-such-intent", fakeGh({}).run)).toBe(1);
  });

  test("R-3: field write failure after creation surfaces the issue number", () => {
    const root = makeWorkspace({});
    const statePath = join(
      root, "amadeus", "spaces", "default", "intents", DIR, "amadeus-state.md",
    );
    chmodSync(statePath, 0o444);
    const gh = fakeGh({ "issue create": CREATED });
    try {
      expect(handleCreate(root, DIR, gh.run)).toBe(1);
    } finally {
      chmodSync(statePath, 0o644);
    }
  });
});

describe("t232 handleSync", () => {
  test("rewrites the body idempotently (FR-3.2: same material, same body)", () => {
    const root = makeWorkspace({ mirrorIssue: "#1161" });
    const gh = fakeGh({});
    expect(handleSync(root, DIR, gh.run)).toBe(0);
    expect(handleSync(root, DIR, gh.run)).toBe(0);
    const bodies = gh.calls
      .filter((c) => c[0] === "issue" && c[1] === "edit")
      .map((c) => c[c.indexOf("--body") + 1]);
    expect(bodies.length).toBe(2);
    expect(bodies[0]).toBe(bodies[1]);
    expect(bodies[0]).toContain("## 状態");
  });

  test("missing Mirror Issue field fails loud (FR-3.3)", () => {
    const root = makeWorkspace({});
    expect(handleSync(root, DIR, fakeGh({}).run)).toBe(1);
  });
});

describe("t232 handleClose (FR-4.1 AND landing check, fail-closed)", () => {
  test("refuses while the intent is in-flight (both signals missing)", () => {
    const root = makeWorkspace({ mirrorIssue: "#1161" });
    const gh = fakeGh({});
    expect(handleClose(root, DIR, gh.run)).toBe(1);
    expect(gh.calls.filter((c) => c[1] === "close").length).toBe(0);
  });

  test("refuses one-sided completion: intents.json complete but state Running", () => {
    const root = makeWorkspace({ mirrorIssue: "#1161", intentStatus: "complete" });
    expect(handleClose(root, DIR, fakeGh({}).run)).toBe(1);
  });

  test("refuses one-sided completion: state Completed but intents.json in-flight", () => {
    const root = makeWorkspace({ mirrorIssue: "#1161", status: "Completed" });
    expect(handleClose(root, DIR, fakeGh({}).run)).toBe(1);
  });

  test("closes after a final sync when both signals hold", () => {
    const root = makeWorkspace({
      mirrorIssue: "#1161",
      intentStatus: "complete",
      status: "Completed",
    });
    const gh = fakeGh({});
    expect(handleClose(root, DIR, gh.run)).toBe(0);
    const verbs = gh.calls.map((c) => `${c[0]} ${c[1]}`);
    expect(verbs).toContain("issue edit");
    expect(verbs).toContain("issue close");
    expect(verbs.indexOf("issue edit")).toBeLessThan(verbs.indexOf("issue close"));
  });
});

describe("t232 parked state rendering through the real state file", () => {
  test("sync body carries the parked status line", () => {
    const root = makeWorkspace({ mirrorIssue: "#1161", parked: true });
    const gh = fakeGh({});
    expect(handleSync(root, DIR, gh.run)).toBe(0);
    const body = gh.calls.at(-1)?.at(-1) ?? "";
    expect(body).toContain("**parked @ reverse-engineering**");
  });
});
