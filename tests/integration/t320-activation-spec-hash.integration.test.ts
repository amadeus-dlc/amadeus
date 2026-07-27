// covers: file:packages/framework/core/tools/amadeus-plugin-activation.ts
// size: medium
//
// U6 activation-policy — the spec-hash machinery driven IN-PROCESS against a real
// temp host (fs-tests-integration-first; bun --coverage cannot see a spawned
// child, so every seam is imported and called directly — seam-export-handler-
// amend). Proves: computeSpecHash determinism + rename detection + fail-closed
// read (reliability-design), single-writer state round-trip via temp+rename
// (BR-U6-6), the composed/composed-stage record reads, resolveActivationJudgment
// / activationAdvisoryForHost including the 0-plugin null fast return (BR-U6-4),
// the advisory path never writes state (BR-U6-6), and the module carries no
// TLC-invocation reference (BR-U6-2 falling proof, source level).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACTIVATION_PLUGIN,
  ACTIVATION_STATE_FILE,
  ACTIVATION_WATCH_GLOBS,
  type ActivationFs,
  activationAdvisoryForHost,
  computeSpecHash,
  defaultActivationFs,
  formalModelCheckComposed,
  isComposedPluginStage,
  readActivationState,
  recordActivationVerdict,
  resolveActivationJudgment,
  writeActivationState,
} from "../../packages/framework/core/tools/amadeus-plugin-activation.ts";

const COMPOSITION_FILE = ".amadeus-plugin-composition.json";

let host = "";

function writeSpec(rel: string, content: string): void {
  const abs = join(host, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

// A minimal composition record naming formal-model-check with its opt-in stage in
// the stageIndex (the only fields the activation reads).
function composeFormalModelCheck(): void {
  const record = {
    ledger: [],
    plugins: [[ACTIVATION_PLUGIN, { stageIndex: [{ slug: ACTIVATION_PLUGIN }] }]],
  };
  writeFileSync(join(host, COMPOSITION_FILE), JSON.stringify(record));
}

beforeEach(() => {
  host = mkdtempSync(join(tmpdir(), "amadeus-t320-"));
  writeSpec("specs/tla/FormalElection.tla", "MODULE FormalElection\n");
  writeSpec("specs/tla/FormalElection.cfg", "INIT Init\n");
  writeSpec("specs/tla/model-map.json", "{}\n");
});

afterEach(() => rmSync(host, { recursive: true, force: true }));

describe("t320 computeSpecHash (deterministic, fail-closed)", () => {
  test("identical input -> identical hash (BR-U6-1)", () => {
    const a = computeSpecHash(host, ACTIVATION_WATCH_GLOBS);
    const b = computeSpecHash(host, ACTIVATION_WATCH_GLOBS);
    expect(a.ok && b.ok && a.hash === b.hash).toBe(true);
  });

  test("one byte changed -> changed hash; restore -> original hash", () => {
    const before = computeSpecHash(host, ACTIVATION_WATCH_GLOBS);
    writeSpec("specs/tla/FormalElection.tla", "MODULE FormalElection\nEXTENDS Naturals\n");
    const after = computeSpecHash(host, ACTIVATION_WATCH_GLOBS);
    expect(before.ok && after.ok && before.hash !== after.hash).toBe(true);
    writeSpec("specs/tla/FormalElection.tla", "MODULE FormalElection\n");
    const restored = computeSpecHash(host, ACTIVATION_WATCH_GLOBS);
    expect(before.ok && restored.ok && before.hash === restored.hash).toBe(true);
  });

  test("rename with unchanged content -> changed hash (path is folded in)", () => {
    const before = computeSpecHash(host, ACTIVATION_WATCH_GLOBS);
    rmSync(join(host, "specs/tla/model-map.json"));
    writeSpec("specs/tla/model-map-renamed.json", "{}\n");
    const after = computeSpecHash(host, ACTIVATION_WATCH_GLOBS);
    expect(before.ok && after.ok && before.hash !== after.hash).toBe(true);
  });

  test("empty spec set (base dir absent) -> a determinate ok hash", () => {
    rmSync(join(host, "specs"), { recursive: true, force: true });
    const r = computeSpecHash(host, ACTIVATION_WATCH_GLOBS);
    expect(r.ok).toBe(true);
  });

  test("unreadable spec -> fail-closed { ok: false } (never a partial hash)", () => {
    // Inject a throwing reader for one spec (portable — no EISDIR/empty-read
    // platform divergence). The whole computation must fail closed.
    const throwing: ActivationFs = {
      ...defaultActivationFs,
      readFileSync: (p) => {
        if (p.endsWith("FormalElection.tla")) throw new Error("EACCES (injected)");
        return defaultActivationFs.readFileSync(p);
      },
    };
    const r = computeSpecHash(host, ACTIVATION_WATCH_GLOBS, throwing);
    expect(r.ok).toBe(false);
  });
});

describe("t320 SpecHashState round-trip (single writer, atomic)", () => {
  test("absent state file -> null (never-run)", () => {
    expect(readActivationState(host)).toBeNull();
  });

  test("corrupt state file -> null (fail-closed to never-run)", () => {
    writeFileSync(join(host, ACTIVATION_STATE_FILE), "{ not json");
    expect(readActivationState(host)).toBeNull();
  });

  test("write then read round-trips lastVerdictHash", () => {
    writeActivationState(host, { schema: 1, lastVerdictHash: "sha256:deadbeef", recordedAt: "2026-07-27T00:00:00Z" });
    const state = readActivationState(host);
    expect(state?.lastVerdictHash).toBe("sha256:deadbeef");
    // temp file is renamed away — no residue.
    expect(existsSync(join(host, ACTIVATION_STATE_FILE))).toBe(true);
  });

  test("recordActivationVerdict persists the current spec hash (flow 4)", () => {
    const current = computeSpecHash(host, ACTIVATION_WATCH_GLOBS);
    expect(current.ok).toBe(true);
    const wrote = recordActivationVerdict(host, ACTIVATION_WATCH_GLOBS, "2026-07-27T01:00:00Z");
    expect(wrote).toBe(true);
    expect(current.ok && readActivationState(host)?.lastVerdictHash === current.hash).toBe(true);
  });

  test("recordActivationVerdict on an unreadable spec writes nothing (fail-closed)", () => {
    const throwing: ActivationFs = {
      ...defaultActivationFs,
      readFileSync: (p) => {
        if (p.endsWith(".tla")) throw new Error("EACCES (injected)");
        return defaultActivationFs.readFileSync(p);
      },
    };
    const wrote = recordActivationVerdict(host, ACTIVATION_WATCH_GLOBS, "2026-07-27T02:00:00Z", throwing);
    expect(wrote).toBe(false);
    expect(existsSync(join(host, ACTIVATION_STATE_FILE))).toBe(false);
  });
});

describe("t320 composition reads", () => {
  test("formalModelCheckComposed: false with no record, true once composed (BR-U6-4 gate)", () => {
    expect(formalModelCheckComposed(host)).toBe(false);
    composeFormalModelCheck();
    expect(formalModelCheckComposed(host)).toBe(true);
  });

  test("isComposedPluginStage: only the composed plugin stage slug is a match (FR-7(a))", () => {
    expect(isComposedPluginStage(host, ACTIVATION_PLUGIN)).toBe(false);
    composeFormalModelCheck();
    expect(isComposedPluginStage(host, ACTIVATION_PLUGIN)).toBe(true);
    expect(isComposedPluginStage(host, "code-generation")).toBe(false);
  });

  test("corrupt composition record -> read as not composed (total, never throws)", () => {
    writeFileSync(join(host, COMPOSITION_FILE), "{ not json");
    expect(formalModelCheckComposed(host)).toBe(false);
    expect(isComposedPluginStage(host, ACTIVATION_PLUGIN)).toBe(false);
  });
});

describe("t320 judgment + advisory (host level)", () => {
  test("0-plugin: activationAdvisoryForHost returns null without touching the spec (BR-U6-4)", () => {
    // No composition record → null fast return. A throwing reader proves the
    // spec is never read on the 0-plugin path.
    const throwing: ActivationFs = {
      ...defaultActivationFs,
      readFileSync: (p) => {
        if (p.includes("specs/tla")) throw new Error("spec must not be read when 0-plugin");
        return defaultActivationFs.readFileSync(p);
      },
    };
    expect(activationAdvisoryForHost(host, throwing)).toBeNull();
  });

  test("composed + never-run -> never-run judgment + advisory line", () => {
    composeFormalModelCheck();
    expect(resolveActivationJudgment(host).kind).toBe("never-run");
    expect(activationAdvisoryForHost(host)).toContain("no recorded verdict");
  });

  test("composed + recorded current -> current judgment, no advisory (silent)", () => {
    composeFormalModelCheck();
    recordActivationVerdict(host, ACTIVATION_WATCH_GLOBS, "2026-07-27T03:00:00Z");
    expect(resolveActivationJudgment(host).kind).toBe("current");
    expect(activationAdvisoryForHost(host)).toBeNull();
  });

  test("composed + spec changed after verdict -> changed judgment + CHANGED advisory", () => {
    composeFormalModelCheck();
    recordActivationVerdict(host, ACTIVATION_WATCH_GLOBS, "2026-07-27T04:00:00Z");
    writeSpec("specs/tla/FormalElection.tla", "MODULE FormalElection\nVARIABLES x\n");
    expect(resolveActivationJudgment(host).kind).toBe("changed");
    expect(activationAdvisoryForHost(host)).toContain("CHANGED");
  });

  test("BR-U6-6: the advisory path never writes state (read-only)", () => {
    composeFormalModelCheck();
    recordActivationVerdict(host, ACTIVATION_WATCH_GLOBS, "2026-07-27T05:00:00Z");
    writeSpec("specs/tla/FormalElection.tla", "MODULE FormalElection\nVARIABLES y\n"); // changed
    const stateBefore = readFileSync(join(host, ACTIVATION_STATE_FILE));
    const mtimeBefore = statSync(join(host, ACTIVATION_STATE_FILE)).mtimeMs;
    // A fs whose write/rename throw: if the advisory path tried to write, this
    // throws (falling proof of read-only).
    const noWrite: ActivationFs = {
      ...defaultActivationFs,
      writeFileSync: () => { throw new Error("advisory path must not write"); },
      renameSync: () => { throw new Error("advisory path must not rename"); },
    };
    expect(activationAdvisoryForHost(host, noWrite)).toContain("CHANGED");
    expect(readFileSync(join(host, ACTIVATION_STATE_FILE)).equals(stateBefore)).toBe(true);
    expect(statSync(join(host, ACTIVATION_STATE_FILE)).mtimeMs).toBe(mtimeBefore);
  });
});

describe("t320 BR-U6-2 falling proof: no TLC invocation reference", () => {
  test("the activation module imports/calls no run-model-check / TLC executor", () => {
    // changed | never-run must NOT reach an automatic TLC run (ADR-1 option A vs
    // rejected option D). Source-level guard: a future auto-run wiring would add
    // one of these references and redden this test.
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "..", "..", "packages", "framework", "core", "tools", "amadeus-plugin-activation.ts"),
      "utf-8",
    );
    for (const forbidden of ["run-model-check", "executeReservedModelCheck", "TlcProcess", "spawnSync", "child_process"]) {
      expect(src.includes(forbidden)).toBe(false);
    }
  });
});
