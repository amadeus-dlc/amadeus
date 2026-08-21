// covers: file:packages/framework/core/tools/amadeus-plugin-runtime.ts, function:advisoryLatchDir
// size: medium
//
// The host latch is GENERIC over plugin names and advisory codes: whatever a
// plugin declares, the host latches it once and stays silent until the state
// changes. That genericity is the whole point — the latch must never know a
// concrete plugin — so this file drives it with a plugin identity that exists
// nowhere else, and pins the latch directory the engine derives for an intent.

import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  advisoryLatchPath,
  unlatchedAdvisories,
  type Advisory,
} from "../../packages/framework/core/tools/amadeus-plugin-runtime.ts";
import { advisoryLatchDir } from "../../packages/framework/core/tools/amadeus-lib.ts";

const roots: string[] = [];

afterEach(() => {
  roots.splice(0).forEach((root) => {
    rmSync(root, { recursive: true, force: true });
  });
});

describe("generic host latch", () => {
  test("host latch is generic over arbitrary plugin names and codes", () => {
    const advisory: Advisory = {
      plugin: "fixture-plugin",
      code: "fixture-hold",
      message: "hold",
      stage: "fixture-stage",
    };
    const dir = join(mkdtempSync(join(tmpdir(), "amadeus-t381-latch-")), "latch");
    roots.push(join(dir, ".."));
    expect(unlatchedAdvisories(dir, [advisory], "2026-08-11T00:00:00Z")).toEqual([advisory]);
    expect(unlatchedAdvisories(dir, [advisory])).toEqual([]);
    expect(advisoryLatchPath(dir, advisory.plugin, advisory.code)).toEndWith("fixture-plugin.fixture-hold");
    expect(advisoryLatchDir("/project", "intent-a", "space-a")).toEndWith(
      "amadeus/spaces/space-a/intents/intent-a/.amadeus-advisory-latch",
    );
  });

  test("an unreadable latch fails open", () => {
    const advisory: Advisory = { plugin: "p", code: "c", message: "m", stage: "s" };
    const raised = unlatchedAdvisories("/unused", [advisory], "now", {
      existsSync: () => { throw new Error("EACCES"); },
      mkdirSync: () => { throw new Error("EACCES"); },
      writeFileSync: () => { throw new Error("EACCES"); },
    });
    expect(raised).toEqual([advisory]);
  });
});
