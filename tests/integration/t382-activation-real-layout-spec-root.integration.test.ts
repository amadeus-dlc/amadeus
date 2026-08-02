// covers: file:packages/framework/core/tools/amadeus-plugin-activation.ts
// size: medium
//
// U8 (FR-B3 grounding) — the activation judgment driven against the REAL
// deployment layout, not a synthetic host that happens to contain both halves.
//
// Every sibling activation fixture (t320/t321/t322/t378/t381) writes the
// composition record AND specs/tla/ under one temp root, so the watch glob and
// the record resolve against the same directory. Real installations do not look
// like that: the composition record lives in the HARNESS directory (`.claude/`,
// the plugin host root, `dirname(TOOLS_DIR)`) while the TLA+ specs are a PROJECT
// asset one level up — the formal-model-check stage body itself names them
// project-relative (`--model specs/tla/FormalElection.tla`).
//
// With the two roots conflated, the watch set expands to nothing on a real host:
// the recorded verdict hash becomes the SHA-256 of empty input, the judgment
// pins to `current` for good, and a real spec edit never raises an advisory —
// the FR-B3 nudge exists but can never arrive. This file pins the real layout so
// that regression cannot return: the spec root is the host root's PARENT, while
// the state file and the composition record stay on the host root itself.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  ACTIVATION_PLUGIN,
  ACTIVATION_STATE_FILE,
  ACTIVATION_WATCH_GLOBS,
  type ActivationFs,
  activationAdvisoriesForHost,
  computeSpecHash,
  defaultActivationFs,
  recordActivationVerdict,
  resolveActivationJudgment,
  specRootForHost,
} from "../../packages/framework/core/tools/amadeus-plugin-activation.ts";
import { activationModelMap, writeActivationModelMap } from "../harness/formal-model-fixture.ts";

const COMPOSITION_FILE = ".amadeus-plugin-composition.json";

// The SHA-256 of the empty byte string — what computeSpecHash returns when the
// watched set expands to zero files. The defect's fingerprint: a recorded
// verdict carrying this value means the watcher hashed nothing at all.
const EMPTY_SET_HASH = "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

// The real layout: <projectRoot>/.claude is the plugin host, <projectRoot>/specs
// holds the TLA+ assets.
let projectRoot = "";
let host = "";

function writeFile(abs: string, content: string): void {
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

function composeFormalModelCheck(): void {
  const record = {
    ledger: [],
    plugins: [[ACTIVATION_PLUGIN, { stageIndex: [{ slug: ACTIVATION_PLUGIN }] }]],
  };
  writeFile(join(host, COMPOSITION_FILE), JSON.stringify(record));
}

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), "amadeus-t382-"));
  host = join(projectRoot, ".claude");
  mkdirSync(host, { recursive: true });
  // Specs are a PROJECT asset — one level above the harness directory.
  writeFile(join(projectRoot, "specs/tla/FormalElection.tla"), "MODULE FormalElection\n");
  writeFile(join(projectRoot, "specs/tla/FormalElection.cfg"), "INIT Init\n");
  writeActivationModelMap(projectRoot);
  composeFormalModelCheck();
});

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
});

describe("activation spec root on the real deployment layout", () => {
  test("specRootForHost points one level above the plugin host root", () => {
    expect(specRootForHost(host)).toBe(projectRoot);
  });

  test("the watched set on a real host is non-empty (not the empty-input hash)", () => {
    const judgment = resolveActivationJudgment(host);
    expect(judgment.kind).toBe("never-run");
    // The whole defect in one assertion: a real host whose project carries specs
    // must not hash to the empty set.
    const currentHash = judgment.kind === "never-run" ? judgment.currentHash : "";
    expect(currentHash).not.toBe(EMPTY_SET_HASH);
    expect(currentHash).toBe(computeSpecHash(projectRoot, ["specs/tla/**"]).ok
      ? (computeSpecHash(projectRoot, ["specs/tla/**"]) as { ok: true; hash: string }).hash
      : "");
  });

  test("a real spec edit moves the judgment from current to changed", () => {
    expect(recordActivationVerdict(host)).toBe(true);

    const settled = resolveActivationJudgment(host);
    expect(settled.kind).toBe("current");
    expect(settled.kind === "current" ? settled.hash : "").not.toBe(EMPTY_SET_HASH);
    // Nothing to say while the spec is untouched.
    expect(activationAdvisoriesForHost(host, "requirements-analysis")).toEqual([]);

    // Edit the PROJECT's spec — the edit a user actually makes.
    writeFile(
      join(projectRoot, "specs/tla/FormalElection.tla"),
      "MODULE FormalElection\n\\* a meaningful change\n",
    );

    const after = resolveActivationJudgment(host);
    expect(after.kind).toBe("changed");

    const advisories = activationAdvisoriesForHost(host, "requirements-analysis");
    expect(advisories).toHaveLength(1);
    expect(advisories[0]?.code).toBe("changed");
    expect(advisories[0]?.plugin).toBe(ACTIVATION_PLUGIN);
    expect(advisories[0]?.stage).toBe("requirements-analysis");
  });

  test("the verdict state stays on the host root, not the spec root", () => {
    expect(recordActivationVerdict(host)).toBe(true);
    expect(existsSync(join(host, ACTIVATION_STATE_FILE))).toBe(true);
    expect(existsSync(join(projectRoot, ACTIVATION_STATE_FILE))).toBe(false);
  });

  test("an uncomposed host stays silent even though the project carries specs", () => {
    rmSync(join(host, COMPOSITION_FILE));
    expect(activationAdvisoriesForHost(host, "requirements-analysis")).toEqual([]);
  });

  test("a declared target with a missing cfg is not-ready and cannot record a verdict", () => {
    writeFile(
      join(projectRoot, "specs/tla/model-map.json"),
      activationModelMap(),
    );
    rmSync(join(projectRoot, "specs/tla/FormalElection.cfg"));
    const judgment = resolveActivationJudgment(host);
    expect(judgment).toEqual({
      kind: "not-ready",
      reason: "declared target FormalElection is missing its cfg",
    });
    expect(recordActivationVerdict(host)).toBe(false);
    expect(existsSync(join(host, ACTIVATION_STATE_FILE))).toBe(false);
    expect(activationAdvisoriesForHost(host, "build-and-test")[0]).toMatchObject({
      plugin: ACTIVATION_PLUGIN,
      stage: "build-and-test",
      code: "not-ready",
      reason: "declared target FormalElection is missing its cfg",
    });
  });

  test("a declared target with model and cfg starts at never-run with a structured target", () => {
    writeFile(
      join(projectRoot, "specs/tla/model-map.json"),
      activationModelMap(),
    );
    expect(resolveActivationJudgment(host).kind).toBe("never-run");
    expect(activationAdvisoriesForHost(host, "requirements-analysis")[0]).toMatchObject({
      plugin: ACTIVATION_PLUGIN,
      stage: "requirements-analysis",
      code: "never-run",
      target: "specs/tla",
    });
  });

  test("zero declarations and an invalid map are not-ready and never overwrite a past verdict", async () => {
    expect(recordActivationVerdict(host)).toBe(true);
    const statePath = join(host, ACTIVATION_STATE_FILE);
    const past = await Bun.file(statePath).text();
    writeFile(
      join(projectRoot, "specs/tla/model-map.json"),
      JSON.stringify({ schemaVersion: 2, models: [] }),
    );
    expect(resolveActivationJudgment(host)).toMatchObject({ kind: "not-ready" });
    expect(recordActivationVerdict(host)).toBe(false);
    await expect(Bun.file(statePath).text()).resolves.toBe(past);

    writeFile(join(projectRoot, "specs/tla/model-map.json"), "{not-json");
    expect(resolveActivationJudgment(host)).toMatchObject({ kind: "not-ready" });
    expect(recordActivationVerdict(host)).toBe(false);
    await expect(Bun.file(statePath).text()).resolves.toBe(past);
  });

  test("recording a verdict hashes each declared asset once after readiness", () => {
    const reads = new Map<string, number>();
    const countingFs: ActivationFs = {
      ...defaultActivationFs,
      readFileSync: (path) => {
        reads.set(path, (reads.get(path) ?? 0) + 1);
        return defaultActivationFs.readFileSync(path);
      },
    };
    expect(recordActivationVerdict(host, ACTIVATION_WATCH_GLOBS, "2026-08-02T00:00:00Z", countingFs)).toBe(true);
    expect(reads.get(join(projectRoot, "specs/tla/model-map.json"))).toBe(2);
    for (const relative of [
      "specs/tla/FormalElection.tla",
      "specs/tla/FormalElection.cfg",
    ]) {
      expect(reads.get(join(projectRoot, relative))).toBe(1);
    }
  });

  test("add, delete, and restore a target preserve the meaning of a past successful verdict", async () => {
    rmSync(join(projectRoot, "specs/tla/model-map.json"));
    expect(resolveActivationJudgment(host)).toEqual({ kind: "not-ready", reason: "model map is missing" });
    expect(recordActivationVerdict(host)).toBe(false);

    writeActivationModelMap(projectRoot);
    expect(resolveActivationJudgment(host).kind).toBe("never-run");
    expect(recordActivationVerdict(host)).toBe(true);
    expect(resolveActivationJudgment(host).kind).toBe("current");

    const cfgPath = join(projectRoot, "specs/tla/FormalElection.cfg");
    const cfg = await Bun.file(cfgPath).text();
    rmSync(cfgPath);
    expect(resolveActivationJudgment(host)).toEqual({
      kind: "not-ready",
      reason: "declared target FormalElection is missing its cfg",
    });
    expect(recordActivationVerdict(host)).toBe(false);

    writeFile(cfgPath, cfg);
    expect(resolveActivationJudgment(host).kind).toBe("current");
  });
});
