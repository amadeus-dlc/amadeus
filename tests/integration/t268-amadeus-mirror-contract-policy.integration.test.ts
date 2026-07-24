// t268 — C0->C1->C2 contract flow, filesystem security, and dependency purity.
// covers: packages/framework/core/tools/amadeus-mirror-config.ts, amadeus-mirror-policy.ts, amadeus-mirror-types.ts
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveMirrorConfig } from "../../packages/framework/core/tools/amadeus-mirror-config.ts";
import {
  decideMirrorAction,
  mirrorEventIdentity,
} from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";

const TOOLS = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "packages",
  "framework",
  "core",
  "tools",
);
const INTENT = "260719-mirror-productization";
const roots: string[] = [];
const isRoot = typeof process.getuid === "function" && process.getuid() === 0;

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function project(): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-mirror-t268-"));
  roots.push(root);
  return root;
}

function globalPath(root: string): string {
  return join(root, "amadeus", "config.json");
}

function writeConfig(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value)}\n`, "utf-8");
}

function importSources(file: string): string[] {
  const text = readFileSync(join(TOOLS, file), "utf-8");
  return [...text.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1] ?? "");
}

describe("t268 one-way C0->C1->C2 flow", () => {
  test("a resolved lifecycle mode drives a policy decision", () => {
    const root = project();
    writeConfig(globalPath(root), { "auto-mirror": "auto" });
    const outcome = resolveMirrorConfig(root, INTENT);
    expect(outcome.kind).toBe("resolved");
    if (outcome.kind !== "resolved") return;
    const event = mirrorEventIdentity(
      "intent-uuid",
      { kind: "workflow-completed", instance: "wc-1" },
      "create",
    );
    const decision = decideMirrorAction({
      kind: "lifecycle",
      mode: outcome.config.autoMirror,
      event,
      state: {
        revision: 1,
        issueNumber: null,
        provenance: null,
        receipts: {},
        warnings: [],
        repairChallenges: {},
      },
    });
    expect(decision).toEqual({ kind: "execute", operation: "create", event });
  });
});

describe("t268 filesystem security", () => {
  test("a symlink escaping the workspace root is a read failure", () => {
    const root = project();
    const outside = join(root, "outside.json");
    writeFileSync(outside, JSON.stringify({ "auto-mirror": "auto" }), "utf-8");
    mkdirSync(dirname(globalPath(root)), { recursive: true });
    symlinkSync(outside, globalPath(root));
    const outcome = resolveMirrorConfig(root, INTENT);
    expect(outcome.kind).toBe("invalid");
    if (outcome.kind === "invalid") {
      expect(outcome.issues[0]?.kind).toBe("read-failure");
      const issue = outcome.issues[0];
      if (issue?.kind === "read-failure") expect(issue.summary).toContain("escapes");
    }
  });

  test("a config file above the size limit is a read failure", () => {
    const root = project();
    mkdirSync(dirname(globalPath(root)), { recursive: true });
    const oversize = `{"auto-mirror":"auto"}${" ".repeat(1024 * 1024 + 16)}`;
    writeFileSync(globalPath(root), oversize, "utf-8");
    const outcome = resolveMirrorConfig(root, INTENT);
    expect(outcome.kind).toBe("invalid");
    if (outcome.kind === "invalid") {
      const issue = outcome.issues[0];
      expect(issue?.kind).toBe("read-failure");
      if (issue?.kind === "read-failure") expect(issue.summary).toContain("size limit");
    }
  });

  test.skipIf(isRoot)("an unreadable config file is a read failure", () => {
    const root = project();
    writeConfig(globalPath(root), { "auto-mirror": "auto" });
    chmodSync(globalPath(root), 0o000);
    const outcome = resolveMirrorConfig(root, INTENT);
    expect(outcome.kind).toBe("invalid");
    if (outcome.kind === "invalid") expect(outcome.issues[0]?.kind).toBe("read-failure");
  });

  test("diagnostics and sources never leak an absolute path or raw bytes", () => {
    const root = project();
    // One read-failure layer plus one valid layer to exercise both fields.
    mkdirSync(join(root, "amadeus", "config.json"), { recursive: true });
    const outcome = resolveMirrorConfig(root, INTENT);
    expect(outcome.kind).toBe("invalid");
    if (outcome.kind === "invalid") {
      for (const issue of outcome.issues) {
        expect(issue.path.startsWith("amadeus/")).toBe(true);
        expect(issue.path).not.toContain(root);
        if (issue.kind === "read-failure") expect(issue.summary).not.toContain(root);
      }
    }
  });
});

describe("t268 dependency purity", () => {
  test("C0 types module imports nothing at runtime", () => {
    expect(importSources("amadeus-mirror-types.ts")).toEqual([]);
  });

  test("C2 policy imports only the C0 types module", () => {
    expect(importSources("amadeus-mirror-policy.ts")).toEqual(["./amadeus-mirror-types.ts"]);
  });

  test("C1 config module exposes no filesystem write API", () => {
    const text = readFileSync(join(TOOLS, "amadeus-mirror-config.ts"), "utf-8");
    for (const forbidden of [
      "writeFileSync",
      "appendFileSync",
      "mkdirSync",
      "rmSync",
      "unlinkSync",
      "child_process",
    ]) {
      expect(text).not.toContain(forbidden);
    }
  });
});
