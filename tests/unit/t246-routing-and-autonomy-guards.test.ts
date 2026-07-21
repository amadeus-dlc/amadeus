// covers: function:classifyHelpIntent function:inspectComposeMarker function:assertRecomposeAllowed
// size: small

import { describe, expect, test } from "bun:test";
import {
  assertRecomposeAllowed,
  classifyHelpIntent,
  classifyTerminalCommand,
  inspectComposeMarker,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

const PATH = "/workspace/amadeus/.amadeus-compose-pending";
const TTL = 24 * 60 * 60 * 1000;
const NOW = 2_000_000_000;

describe("t246 classifyHelpIntent canonical matrix", () => {
  test.each([
    [["help"], { kind: "help", source: "bare" }],
    [["-h"], { kind: "help", source: "bare" }],
    [["--help"], { kind: "help", source: "read-only-flag" }],
    [["intent", "help"], { kind: "help", source: "workspace-verb" }],
    [["intent", "-h"], { kind: "help", source: "workspace-verb" }],
    [["space", "help"], { kind: "help", source: "workspace-verb" }],
    [["space", "-h"], { kind: "help", source: "workspace-verb" }],
  ] as const)("%j routes to global help", (tokens, expected) => {
    expect(classifyHelpIntent(tokens)).toEqual(expected);
  });

  test("space-create help forms stay workspace commands for mutation-time refusal", () => {
    expect(classifyHelpIntent(["space-create", "help"])).toEqual({
      kind: "workspace-command",
      verb: "space-create",
      arg: "help",
    });
    expect(classifyHelpIntent(["space-create", "-h"])).toEqual({
      kind: "workspace-command",
      verb: "space-create",
      arg: "-h",
    });
  });

  test("ordinary workspace commands and freeform prose are not stolen", () => {
    expect(classifyHelpIntent(["space", "team-a"])).toEqual({
      kind: "workspace-command",
      verb: "space",
      arg: "team-a",
    });
    expect(classifyHelpIntent(["help", "me", "build", "auth"])).toEqual({
      kind: "freeform",
      words: ["help", "me", "build", "auth"],
    });
    expect(classifyHelpIntent(["build", "a", "help", "desk"])).toEqual({
      kind: "freeform",
      words: ["build", "a", "help", "desk"],
    });
    expect(classifyHelpIntent([])).toEqual({ kind: "freeform", words: [] });
  });

  test("the pre-LLM terminal classifier consumes the same help table", () => {
    expect(classifyTerminalCommand(["intent", "help"])).toEqual({
      subcommand: "help",
      source: "workspace-verb",
    });
    expect(classifyTerminalCommand(["space-create", "-h"])).toEqual({
      subcommand: "space-create",
      arg: "-h",
      source: "workspace-verb",
    });
    expect(classifyTerminalCommand(["space", "team-a", "--status"])).toEqual({
      subcommand: "status",
      source: "read-only-flag",
    });
    expect(classifyTerminalCommand(["help", "me", "build", "auth"])).toBeNull();
  });
});

describe("t246 inspectComposeMarker boundaries", () => {
  test("absent and unreadable observations stay explicit", () => {
    expect(inspectComposeMarker({ kind: "absent", path: PATH }, NOW, TTL)).toEqual({
      kind: "absent",
      path: PATH,
    });
    expect(
      inspectComposeMarker({ kind: "unreadable", path: PATH, reason: "EACCES" }, NOW, TTL),
    ).toEqual({ kind: "unreadable", path: PATH, reason: "EACCES" });
    expect(
      inspectComposeMarker({ kind: "present", path: PATH, mtimeMs: Number.NaN }, NOW, TTL),
    ).toEqual({ kind: "unreadable", path: PATH, reason: "non-finite-mtime" });
    expect(inspectComposeMarker({ kind: "present", path: PATH, mtimeMs: -1 }, NOW, TTL)).toEqual({
      kind: "unreadable",
      path: PATH,
      reason: "negative-mtime",
    });
  });

  test("24h is fresh, 24h+1ms is stale, future mtime clamps to age zero", () => {
    expect(inspectComposeMarker({ kind: "present", path: PATH, mtimeMs: NOW - TTL }, NOW, TTL)).toEqual({
      kind: "fresh",
      path: PATH,
      ageMs: TTL,
      ttlMs: TTL,
    });
    expect(
      inspectComposeMarker({ kind: "present", path: PATH, mtimeMs: NOW - TTL - 1 }, NOW, TTL),
    ).toEqual({ kind: "stale", path: PATH, ageMs: TTL + 1, ttlMs: TTL });
    expect(inspectComposeMarker({ kind: "present", path: PATH, mtimeMs: NOW + 1 }, NOW, TTL)).toEqual({
      kind: "fresh",
      path: PATH,
      ageMs: 0,
      ttlMs: TTL,
    });
  });

  test.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5])(
    "invalid TTL %p is a programmer error",
    (ttlMs) => {
      expect(() => inspectComposeMarker({ kind: "absent", path: PATH }, NOW, ttlMs)).toThrow(/ttl/i);
    },
  );
});

describe("t246 assertRecomposeAllowed", () => {
  test("autonomous denies with the recorded remediation", () => {
    expect(assertRecomposeAllowed("autonomous")).toEqual({
      kind: "denied",
      autonomy: "autonomous",
      reason: "human-gate-required",
      remediation: "switch-to-gated-or-wait-for-swarm",
    });
  });

  test.each(["gated", "unset"] as const)("%s remains allowed", (autonomy) => {
    expect(assertRecomposeAllowed(autonomy)).toEqual({ kind: "allowed", autonomy });
  });
});
