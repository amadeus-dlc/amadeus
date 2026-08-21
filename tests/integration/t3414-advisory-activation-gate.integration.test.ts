// covers: function:advisoriesForHost, function:activationSelectionFilter
// size: medium
//
// t3414 (integration) — the activation gate on declared-advisory supply
// (issue #3414). Mechanism: in-process drive of advisoriesForHost against a
// temp project root with an injected evaluator; zero spawn, zero LLM.
//
// WHY THIS EXISTS: advisoriesForHost derives its plugin set from
// `<hostRoot>/.amadeus-plugin-composition.json` — a machine-local snapshot of
// the LAST compose, not a statement about what the project selects today. A
// plugin dropped from `plugin.activation.names` therefore kept supplying
// advisories (and, once its manifest was gone too, a per-call "no manifest on
// any known face" warning) out of a stale snapshot until the next compose
// rewrote it. That is the defense-in-depth half of #3414: the projection sweep
// removes the residue at build time, this gate refuses to read it at runtime.
//
// WHAT IS UNDER TEST (both sides):
//   1. With an EXPLICIT selection, only a selected plugin's advisories are
//      supplied and only its evaluator runs.
//   2. A stale snapshot entry raises nothing AND warns nothing — the stale
//      manifest face is never even resolved.
//   3. Without an explicit `plugin` key the snapshot governs unchanged, which
//      is compose's own predicate (an absent key selects everything).
//   4. A malformed config falls open to the snapshot rather than silencing
//      every advisory.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { advisoriesForHost } from "../../packages/framework/core/tools/amadeus-advisory-declaration.ts";

const CHECKPOINT = "code-generation";

let projectRoot = "";
let hostRoot = "";

const declaration = (code: string) => [
  {
    code,
    checkpoints: [CHECKPOINT],
    evaluator: { argv: ["bun", "tools/evaluate.ts"] },
  },
];

function compose(...plugins: string[]): void {
  writeFileSync(
    join(hostRoot, ".amadeus-plugin-composition.json"),
    JSON.stringify({
      ledger: [],
      plugins: plugins.map((name) => [name, { plugin: name, stageIndex: [] }]),
    }),
    "utf8",
  );
}

function declareManifest(plugin: string): void {
  mkdirSync(join(projectRoot, "plugins", plugin), { recursive: true });
  writeFileSync(
    join(projectRoot, "plugins", plugin, "plugin.json"),
    JSON.stringify({ name: plugin, tools: [], advisories: declaration(`${plugin}-hold`) }),
    "utf8",
  );
}

function writeConfig(raw: unknown): void {
  mkdirSync(join(projectRoot, "amadeus"), { recursive: true });
  writeFileSync(
    join(projectRoot, "amadeus", "config.json"),
    typeof raw === "string" ? raw : JSON.stringify(raw),
    "utf8",
  );
}

function supply(): { codes: string[]; ran: string[][]; warnings: string[] } {
  const ran: string[][] = [];
  const warnings: string[] = [];
  const raised = advisoriesForHost(
    hostRoot,
    CHECKPOINT,
    undefined,
    (argv) => {
      ran.push([...argv]);
      return {
        status: 1,
        stdout: JSON.stringify({
          ok: false,
          verdict: { kind: "hold", reasons: [{ kind: "stale" }], message: "advisory: stale" },
        }),
      };
    },
    (message) => warnings.push(message),
  );
  return { codes: raised.map((advisory) => String(advisory.code)), ran, warnings };
}

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), "t3414-activation-gate-"));
  hostRoot = join(projectRoot, ".harness");
  mkdirSync(hostRoot, { recursive: true });
});

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
});

describe("t3414 activation gate on declared advisories", () => {
  test("an explicit selection supplies only the selected plugin's advisories", () => {
    compose("kept", "dropped");
    declareManifest("kept");
    declareManifest("dropped");
    writeConfig({ plugin: { activation: { names: ["kept"] } } });
    const { codes, ran } = supply();
    expect(codes).toEqual(["kept-hold"]);
    // The deselected plugin's evaluator is never launched.
    expect(ran).toEqual([["bun", join(projectRoot, "plugins", "kept", "tools", "evaluate.ts")]]);
  });

  test("a stale snapshot entry whose source is gone raises and warns nothing", () => {
    compose("kept", "retired");
    declareManifest("kept");
    writeConfig({ plugin: { activation: { names: ["kept"] } } });
    const { codes, warnings } = supply();
    expect(codes).toEqual(["kept-hold"]);
    expect(warnings).toEqual([]);
  });

  test("falling proof: without the gate the same tree raises the deselected plugin", () => {
    // The pre-fix behaviour, reproduced by removing the only thing the gate
    // reads: with no explicit `plugin` key the snapshot governs, exactly as
    // compose itself selects, and both plugins supply.
    compose("kept", "dropped");
    declareManifest("kept");
    declareManifest("dropped");
    writeConfig({ swarm: { unit: { concurrency: { limit: 1 } } } });
    const { codes } = supply();
    expect(codes.sort()).toEqual(["dropped-hold", "kept-hold"]);
  });

  test("no config at all leaves the snapshot governing", () => {
    compose("kept", "dropped");
    declareManifest("kept");
    declareManifest("dropped");
    const { codes } = supply();
    expect(codes.sort()).toEqual(["dropped-hold", "kept-hold"]);
  });

  test("a malformed config falls open to the snapshot instead of silencing every advisory", () => {
    compose("kept", "dropped");
    declareManifest("kept");
    declareManifest("dropped");
    writeConfig("{ not json");
    const { codes } = supply();
    expect(codes.sort()).toEqual(["dropped-hold", "kept-hold"]);
  });

  test("an empty explicit selection supplies nothing", () => {
    compose("retired");
    declareManifest("retired");
    writeConfig({ plugin: { activation: { names: [] } } });
    const { codes, ran, warnings } = supply();
    expect(codes).toEqual([]);
    expect(ran).toEqual([]);
    expect(warnings).toEqual([]);
  });
});
