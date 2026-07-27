// covers: packages/framework/core/tools/amadeus-mirror.ts
// size: medium
//
// t300 (process/fs boundary) — regression for the mirror write⇔read asymmetry
// (#1547 / #1534). The mutation lifecycle persists mirror existence only in the
// v1 mirror-state block (issueNumber + provenance); status and the duplicate-
// create guard must read that same authority, not the legacy "Mirror Issue"
// field. Drives a real create through the guarded lifecycle (fake gateway,
// deterministic audit port) so a genuine v1 block is written, then asserts:
//   (1) status recognises the recorded issue (not mirror-missing) — #1547a;
//   (2) a second create is refused loud with "mirror already exists: #N" — #1547b;
//   (3) negative control: an absent block and an issueNumber:null block both
//       report mirror-missing.

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type GhResult,
  type GhRunner,
  handleStatus,
  main,
} from "../../packages/framework/core/tools/amadeus-mirror.ts";
import { runMirrorLifecycleBoundary } from "../../packages/framework/core/tools/amadeus-mirror-lifecycle.ts";
import {
  EMPTY_MIRROR_STATE,
  mirrorIssueNumberFromDocument,
  parseMirrorStateDocument,
  renderMirrorStateBlock,
} from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";
import {
  createMirrorStateStorePorts,
  type MirrorStateStorePorts,
} from "../../packages/framework/core/tools/amadeus-mirror-state-store.ts";
import type {
  GatewayOutcome,
  MirrorGitHubGateway,
  MirrorMutationPermit,
  RemoteMirrorIssue,
  RepositoryIdentity,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";

const SPACE = "default";
const DIR = "260726-mirror-state-read-a1b2c3d4";
const NOW = "2026-07-26T00:00:00Z";
const REPO: RepositoryIdentity = { owner: "acme", name: "app", canonical: "acme/app" };
const ISSUE = 101;

const roots: string[] = [];
afterEach(() => {
  for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true });
});

function ok<T>(value: T): GatewayOutcome<T> {
  return { kind: "ok", value };
}

// Records the created issue and its body so status can be handed the exact body
// the lifecycle wrote through the fake GitHub boundary.
class FakeGateway implements MirrorGitHubGateway {
  issue: RemoteMirrorIssue | null = null;
  async readiness(): Promise<GatewayOutcome<void>> {
    return ok(undefined);
  }
  async createIssue(
    _permit: MirrorMutationPermit,
    content: { title: string; body: string },
  ): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    this.issue = {
      repository: REPO,
      number: ISSUE,
      title: content.title,
      body: content.body,
      state: "OPEN",
    };
    return ok(this.issue);
  }
  async findIssuesByMarker(): Promise<GatewayOutcome<readonly RemoteMirrorIssue[]>> {
    return ok(this.issue ? [this.issue] : []);
  }
  async viewIssue(): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    return ok(this.issue as RemoteMirrorIssue);
  }
  async editIssue(
    _permit: MirrorMutationPermit,
    body: string,
  ): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    this.issue = { ...(this.issue as RemoteMirrorIssue), body };
    return ok(this.issue);
  }
  async closeIssue(): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    this.issue = { ...(this.issue as RemoteMirrorIssue), state: "CLOSED" };
    return ok(this.issue);
  }
}

function makeWorkspace(opts: { block: "absent" | "empty" }): {
  root: string;
  statePath: string;
  ports: MirrorStateStorePorts;
} {
  const root = mkdtempSync(join(tmpdir(), "amadeus-mirror-t300-"));
  roots.push(root);
  const intents = join(root, "amadeus", "spaces", SPACE, "intents");
  mkdirSync(join(intents, DIR), { recursive: true });
  writeFileSync(
    join(intents, "intents.json"),
    JSON.stringify([
      {
        uuid: "019f7003-e273-7c0b-85ba-0a6c99d0aa9d",
        slug: "mirror-state-read",
        dirName: DIR,
        scope: "amadeus-bugfix",
        repos: [REPO.canonical],
        status: "in-flight",
      },
    ]),
  );
  const statePath = join(intents, DIR, "amadeus-state.md");
  writeFileSync(
    statePath,
    [
      "# Amadeus State",
      "",
      "- **Project**: mirror state read regression",
      "- **Lifecycle Phase**: INCEPTION",
      "- **Current Stage**: reverse-engineering",
      "- **Status**: Running",
      `- **Last Updated**: ${NOW}`,
      "",
      ...(opts.block === "empty" ? [renderMirrorStateBlock(EMPTY_MIRROR_STATE), ""] : []),
    ].join("\n"),
  );
  writeFileSync(join(root, "amadeus", "config.json"), JSON.stringify({ "auto-mirror": "auto" }));
  const real = createMirrorStateStorePorts({ projectDir: root, statePath, intent: DIR, space: SPACE });
  // Keep audit delivery deterministic without a full clone/registry (t278/t282 pattern).
  const ports: MirrorStateStorePorts = {
    ...real,
    appendArtifactUpdated: () => ({ kind: "appended" as const }),
  };
  return { root, statePath, ports };
}

// Drive a real create through the guarded lifecycle with the fake gateway and
// deterministic ports, so the v1 block (issueNumber + provenance) is written.
async function driveCreate(
  root: string,
  ports: MirrorStateStorePorts,
  gateway: FakeGateway,
  instance: string,
): Promise<number> {
  const runLifecycle: Parameters<typeof main>[3] = (request) =>
    runMirrorLifecycleBoundary(request, {
      gateway,
      ports,
      now: () => NOW,
      newOperationId: () => `op-${instance}`,
    });
  return main(["create", "--instance", instance, "--intent", DIR], root, noGh(), runLifecycle);
}

function capture(): { logs: string[]; errs: string[]; restore: () => void } {
  const logs: string[] = [];
  const errs: string[] = [];
  const log = console.log;
  const err = console.error;
  console.log = (...a: unknown[]) => void logs.push(a.join(" "));
  console.error = (...a: unknown[]) => void errs.push(a.join(" "));
  return {
    logs,
    errs,
    restore: () => {
      console.log = log;
      console.error = err;
    },
  };
}

function noGh(): GhRunner {
  return () => ({ kind: "ok", stdout: "" });
}
function statusGh(responses: Record<string, GhResult>): GhRunner {
  return (args) => responses[args.slice(0, 2).join(" ")] ?? { kind: "ok", stdout: "" };
}

describe("t300 status reads the v1 authority (FR-1, #1547a)", () => {
  test("after a real create, status recognises the issue and reports it in sync", async () => {
    const { root, statePath, ports } = makeWorkspace({ block: "empty" });
    const gateway = new FakeGateway();
    expect(await driveCreate(root, ports, gateway, "c1")).toBe(0);

    // The v1 block now carries the issue number; the legacy field is never written.
    const doc = readFileSync(statePath, "utf-8");
    const parsed = parseMirrorStateDocument(doc);
    expect(parsed.kind === "ok" && parsed.snapshot.issueNumber).toBe(ISSUE);
    // The v1 block is the boundary decision's authority (FR-3).
    expect(mirrorIssueNumberFromDocument(doc)).toBe(ISSUE);
    expect(doc).not.toContain("- **Mirror Issue**:");

    const cap = capture();
    let code: number;
    try {
      code = handleStatus(
        root,
        DIR,
        statusGh({ "issue view": { kind: "ok", stdout: JSON.stringify({ body: gateway.issue?.body }) } }),
      );
    } finally {
      cap.restore();
    }
    expect(code).toBe(0);
    expect(cap.logs.join("\n")).not.toContain("mirror-missing");
    expect(cap.logs.join("\n")).toContain("in sync");
  });

  test("a recorded issue that 404s on GitHub is reported as mirror-missing divergence", async () => {
    const { root, ports } = makeWorkspace({ block: "empty" });
    const gateway = new FakeGateway();
    expect(await driveCreate(root, ports, gateway, "c1")).toBe(0);

    const cap = capture();
    let code: number;
    try {
      code = handleStatus(
        root,
        DIR,
        statusGh({ "issue view": { kind: "error", exitCode: 1, stderr: "HTTP 404: Not Found" } }),
      );
    } finally {
      cap.restore();
    }
    expect(code).toBe(1);
    expect(cap.logs.join("\n")).toContain("mirror-missing");
    expect(cap.logs.join("\n")).toContain(`#${ISSUE}`);
  });
});

describe("t300 duplicate create is refused loud (FR-3, #1547b)", () => {
  test("a second create is refused with the issue number and does not touch GitHub", async () => {
    const { root, ports } = makeWorkspace({ block: "empty" });
    const first = new FakeGateway();
    expect(await driveCreate(root, ports, first, "c1")).toBe(0);

    const second = new FakeGateway();
    const cap = capture();
    let code: number;
    try {
      code = await driveCreate(root, ports, second, "c2");
    } finally {
      cap.restore();
    }
    expect(code).not.toBe(0);
    expect(cap.errs.join("\n")).toContain(`mirror already exists: #${ISSUE}`);
    expect(cap.errs.join("\n")).toContain("duplicate create is refused; run sync instead");
    // The guard fires before the lifecycle, so no issue is created on the second gateway.
    expect(second.issue).toBeNull();
  });
});

describe("t300 negative control: no recorded issue is mirror-missing (FR-1)", () => {
  test("an absent v1 block reports mirror-missing", () => {
    const { root } = makeWorkspace({ block: "absent" });
    const cap = capture();
    let code: number;
    try {
      code = handleStatus(root, DIR, statusGh({}));
    } finally {
      cap.restore();
    }
    expect(code).toBe(1);
    expect(cap.logs.join("\n")).toContain("mirror-missing");
  });

  test("an issueNumber:null v1 block reports mirror-missing (create not completed)", () => {
    const { root, statePath } = makeWorkspace({ block: "empty" });
    expect(mirrorIssueNumberFromDocument(readFileSync(statePath, "utf-8"))).toBeNull();
    const cap = capture();
    let code: number;
    try {
      code = handleStatus(root, DIR, statusGh({}));
    } finally {
      cap.restore();
    }
    expect(code).toBe(1);
    expect(cap.logs.join("\n")).toContain("mirror-missing");
  });
});
