// t2997 — sensor-side settings resolution and argv hand-off (#2997 C4).
// covers: packages/framework/core/tools/amadeus-sensor.ts
// covers: packages/framework/core/tools/amadeus-plugin-runtime.ts
// size: medium
//
// Integration tier by SIZE, not by behaviour: the injected PluginRuntimeFs fake
// spells the node:fs method names (existsSync / readFileSync), which the static
// size classifier reads as a filesystem signal. The test itself is pure.

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import type { PluginRuntimeFs } from "../../packages/framework/core/tools/amadeus-plugin-runtime.ts";
import {
  pluginSettingsArgs,
  pluginSettingsOverrides,
  resolvePluginSettingsForSensor,
  settingsFailureOutcome,
} from "../../packages/framework/core/tools/amadeus-sensor.ts";
import type { AmadeusConfigOutcome } from "../../packages/framework/core/tools/amadeus-config.ts";
import { scaleTestTime } from "../lib/test-time-factor.ts";

const HOST = "/w/.claude";

const DECLARATION = {
  "fetch-throttle-seconds": { type: "number", default: 600, description: "throttle" },
  mode: { type: "enum", values: ["fast", "thorough"], default: "fast", description: "mode" },
};

// A composition record whose single plugin owns the git-drift sensor manifest.
function composition(owned: readonly string[]): string {
  return JSON.stringify({
    ledger: [],
    plugins: [["git-drift", { plugin: "git-drift", ownedPaths: owned, stageIndex: [] }]],
  });
}

function fakeFs(files: Readonly<Record<string, string>>): PluginRuntimeFs {
  return {
    existsSync: (path) => Object.hasOwn(files, path),
    readFileSync: (path) => Buffer.from(files[path] ?? ""),
  };
}

function host(manifest: unknown, owned = ["sensors/amadeus-git-drift.md"]): PluginRuntimeFs {
  return fakeFs({
    [join(HOST, ".amadeus-plugin-composition.json")]: composition(owned),
    [join(HOST, ".amadeus-plugin-src", "git-drift", "plugin.json")]: JSON.stringify(manifest),
  });
}

const DECLARING_PLUGIN = { name: "git-drift", settings: DECLARATION };

describe("t2997 sensor settings resolution", () => {
  test("a sensor whose plugin declares no settings resolves to nothing", () => {
    const resolved = resolvePluginSettingsForSensor("git-drift", HOST, "/w", {
      fs: host({ name: "git-drift" }),
      readOverrides: () => ({}),
    });
    expect(resolved).toBeNull();
  });

  test("a sensor with no owning plugin resolves to nothing", () => {
    const resolved = resolvePluginSettingsForSensor(
      "required-sections",
      HOST,
      "/w",
      { fs: host(DECLARING_PLUGIN), readOverrides: () => ({}) },
    );
    expect(resolved).toBeNull();
  });

  test("declared defaults resolve when the config carries no overrides", () => {
    const resolved = resolvePluginSettingsForSensor("git-drift", HOST, "/w", {
      fs: host(DECLARING_PLUGIN),
      readOverrides: () => ({}),
    });
    expect(resolved).toEqual({
      ok: true,
      settings: { "fetch-throttle-seconds": 600, mode: "fast" },
    });
  });

  test("only the owning plugin's overrides are applied", () => {
    const resolved = resolvePluginSettingsForSensor(
      "git-drift",
      HOST,
      "/w",
      {
        fs: host(DECLARING_PLUGIN),
        readOverrides: () => ({ "git-drift": { mode: "thorough" }, other: { mode: "nonsense" } }),
      },
    );
    expect(resolved).toEqual({
      ok: true,
      settings: { "fetch-throttle-seconds": 600, mode: "thorough" },
    });
  });

  test("an override the declaration does not know aborts the resolution", () => {
    const resolved = resolvePluginSettingsForSensor(
      "git-drift",
      HOST,
      "/w",
      { fs: host(DECLARING_PLUGIN), readOverrides: () => ({ "git-drift": { unknown: 1 } }) },
    );
    expect(resolved?.ok).toBe(false);
  });
});

describe("t2997 sensor settings argv", () => {
  test("a resolved set becomes exactly one --settings-json argument", () => {
    expect(pluginSettingsArgs({ ok: true, settings: { mode: "fast" } })).toEqual([
      "--settings-json",
      '{"mode":"fast"}',
    ]);
  });

  test("no declaration adds no arguments at all", () => {
    expect(pluginSettingsArgs(null)).toEqual([]);
  });
});

// The dispatcher ends its invocation-error paths in process.exit; in-process
// that is converted into a throwable so the drive can report the exit code.
// Mirrors t-sensor-fire-seam's driveExit. stderr is silenced because
// dispatchError prints the diagnostic under test.
class ExitSignal extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}

function driveExit(fn: () => void): { status: number; stderr: string } {
  const origExit = process.exit.bind(process);
  const origWrite = process.stderr.write.bind(process.stderr);
  let stderr = "";
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderr += String(chunk);
    return true;
  }) as typeof process.stderr.write;
  let status = 0;
  try {
    fn();
  } catch (err) {
    if (err instanceof ExitSignal) status = err.code;
    else throw err;
  } finally {
    process.exit = origExit;
    process.stderr.write = origWrite;
  }
  return { status, stderr };
}

describe("t2997 sensor settings fail-closed dispatch", () => {
  test("a staged manifest whose declaration is invalid aborts the dispatch", () => {
    const drive = driveExit(() => {
      resolvePluginSettingsForSensor("git-drift", HOST, "/w", {
        fs: host({
          name: "git-drift",
          settings: { "api-token": { type: "string", default: "", description: "d" } },
        }),
        readOverrides: () => ({}),
      });
    });
    expect(drive.status).toBe(1);
    expect(drive.stderr).toContain("settings declaration is invalid");
    expect(drive.stderr).toContain("must not name a credential");
  });

  test("a staged manifest that is present but unparsable aborts the dispatch", () => {
    const fs: PluginRuntimeFs = {
      existsSync: () => true,
      readFileSync: (path) =>
        Buffer.from(
          path.endsWith("plugin.json")
            ? "{not json"
            : composition(["sensors/amadeus-git-drift.md"]),
        ),
    };
    const drive = driveExit(() => {
      resolvePluginSettingsForSensor("git-drift", HOST, "/w", { fs, readOverrides: () => ({}) });
    });
    expect(drive.status).toBe(1);
    expect(drive.stderr).toContain("manifest is unreadable");
  });
});

describe("t2997 plugin.settings overrides from the layered configuration", () => {
  function resolved(settings: Record<string, Record<string, string | number | boolean>>) {
    return {
      kind: "resolved",
      config: { plugin: { settings } },
      sources: [],
    } as unknown as AmadeusConfigOutcome;
  }

  test("a resolved configuration yields its plugin.settings map", () => {
    const overrides = pluginSettingsOverrides("/w", () =>
      resolved({ "git-drift": { mode: "thorough" } }),
    );
    expect(overrides).toEqual({ "git-drift": { mode: "thorough" } });
  });

  test("an empty configuration yields an empty override set", () => {
    expect(pluginSettingsOverrides("/w", () => resolved({}))).toEqual({});
  });

  test("an invalid configuration aborts rather than firing on defaults", () => {
    const invalid = {
      kind: "invalid",
      issues: [
        {
          kind: "invalid-value",
          layer: "project",
          path: "amadeus/config.json",
          key: "plugin.settings",
          actualType: "key API-KEY",
          expected: "object mapping plugin names to non-secret setting keys",
        },
      ],
    } as unknown as AmadeusConfigOutcome;
    const drive = driveExit(() => {
      pluginSettingsOverrides("/w", () => invalid);
    });
    expect(drive.status).toBe(1);
    expect(drive.stderr).toContain("configuration is invalid");
    expect(drive.stderr).toContain("plugin.settings in amadeus/config.json");
  });
});

describe("t2997 settings failure becomes a sensor finding", () => {
  const ctx = {
    sensor: { id: "git-drift", path: ".claude/sensors/amadeus-git-drift.md" },
    stageSlug: "code-generation",
    outputPath: "/w/out.md",
    fireId: "abcd1234",
    detailPath: "/w/.amadeus-sensors/code-generation/git-drift-abcd1234.md",
    scriptArgs: [],
    scriptAbsPath: "/w/.claude/tools/amadeus-sensor-git-drift.ts",
    // The fixture never waits on this budget — settingsFailureOutcome short-
    // circuits before any spawn — but it is a per-sensor timeout field, so it
    // goes through scaleTestTime like every other test-side timeout.
    timeoutMs: scaleTestTime(60_000),
    outputDigest: "sha256:0",
  } as unknown as Parameters<typeof settingsFailureOutcome>[0];

  test("a successful resolution contributes no outcome", () => {
    expect(settingsFailureOutcome(ctx, { ok: true, settings: { mode: "fast" } })).toBeNull();
  });

  test("an absent resolution contributes no outcome", () => {
    expect(settingsFailureOutcome(ctx, null)).toBeNull();
  });

  test("a failed resolution names the offending key in a FAILED detail body", () => {
    const outcome = settingsFailureOutcome(ctx, {
      ok: false,
      error: {
        code: "enum-out-of-range",
        plugin: "git-drift",
        key: "mode",
        detail: "value must be one of fast | thorough",
      },
    });
    expect(outcome?.kind).toBe("failed");
    if (outcome?.kind !== "failed") return;
    expect(outcome.findingsCount).toBe(1);
    expect(outcome.durationMs).toBe(0);
    expect(outcome.detailBody).toContain("plugin-settings:enum-out-of-range");
    // The finding rides inside the detail file's JSON fence, so the plugin and
    // key names appear with escaped quotes.
    expect(outcome.detailBody).toContain('plugin \\"git-drift\\" setting \\"mode\\"');
    expect(outcome.detailBody).toContain("value must be one of fast | thorough");
    expect(outcome.detailBody).toContain("git-drift finding — code-generation");
  });
});
