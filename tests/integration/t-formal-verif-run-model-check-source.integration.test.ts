import { afterEach, describe, expect, test } from "bun:test";
import {
  cpSync,
  chmodSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadRunModelCheckSource } from "../../plugins/formal-model-check/tools/run-model-check-source.ts";

describe("run-model-check source adapter", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  function copyCanonicalSource(): { root: string; model: string; cfg: string } {
    const root = mkdtempSync(join(tmpdir(), "run-model-check-source-"));
    roots.push(root);
    const model = join(root, "FormalElection.tla");
    const cfg = join(root, "FormalElection.cfg");
    cpSync("specs/tla/FormalElection.tla", model);
    cpSync("specs/tla/FormalElection.cfg", cfg);
    return { root, model, cfg };
  }

  test("loads variable canonical paths through the U1 source identity", () => {
    const paths = copyCanonicalSource();
    const result = loadRunModelCheckSource(paths.model, paths.cfg);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.workspaceRoot).toBe(realpathSync(paths.root));
    expect(result.value.moduleName).toBe("FormalElection");
    expect(result.value.modelReceipt.moduleBytesIdentity).toBe(result.value.source.moduleIdentity);
    expect(result.value.modelReceipt.cfgBytesIdentity).toBe(result.value.source.cfgIdentity);
    // The trace vocabulary rides the verified source: map-declared values,
    // moduleName from the model name (never a map-side duplicate).
    expect(result.value.vocabulary).toEqual({
      moduleName: "FormalElection",
      namedInvariants: [
        "ChoiceWinner",
        "UnknownChoiceRejected",
        "ReceivedAtAxis",
        "InvalidTimestampRejected",
        "AmendSubmission",
        "UnknownRefRejected",
        "PerVoterResolution",
      ],
      traceStateVariables: [
        "initialBudget",
        "amendBudget",
        "accepted",
        "holdMarkers",
        "holdBudget",
        "tally",
        "reexamRequired",
      ],
    });
  });

  test("rejects a request for a model with no verified source binding", () => {
    // A fabricated module name is an explicit MODEL_LOAD failure — the
    // byte-pin binds by requested model name, never by position.
    const paths = copyCanonicalSource();
    const unknown = join(paths.root, "NoSuch.tla");
    cpSync("specs/tla/FormalElection.tla", unknown);
    expect(loadRunModelCheckSource(unknown, paths.cfg)).toMatchObject({
      ok: false,
      error: { kind: "MODEL_LOAD", code: "MODEL_MAP_INVALID" },
    });
  });

  test("loads the registered MirrorLifecycle source with its map-supplied vocabulary", () => {
    const mirror = mkdtempSync(join(tmpdir(), "run-model-check-source-mirror-"));
    roots.push(mirror);
    const mirrorModel = join(mirror, "MirrorLifecycle.tla");
    const mirrorCfg = join(mirror, "MirrorLifecycle.cfg");
    cpSync("specs/tla/MirrorLifecycle.tla", mirrorModel);
    cpSync("specs/tla/MirrorLifecycle.cfg", mirrorCfg);
    const result = loadRunModelCheckSource(mirrorModel, mirrorCfg);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.source.model.name).toBe("MirrorLifecycle");
    expect(result.value.vocabulary).toEqual({
      moduleName: "MirrorLifecycle",
      namedInvariants: ["TypeOK", "NoCloseWithoutLandedSync", "NoDuplicateCreate"],
      traceStateVariables: ["receipts", "issueNumber", "boundaryIdx"],
    });
    const electionPaths = copyCanonicalSource();
    const election = loadRunModelCheckSource(electionPaths.model, electionPaths.cfg);
    expect(election.ok).toBe(true);
    if (!election.ok) return;
    expect(result.value.modelReceipt).toEqual(election.value.modelReceipt);
  });

  test("rejects source drift and symlink inputs", () => {
    const drifted = copyCanonicalSource();
    writeFileSync(drifted.model, "---- MODULE FormalElection ----\n====\n");
    expect(loadRunModelCheckSource(drifted.model, drifted.cfg)).toMatchObject({
      ok: false,
      error: { kind: "SOURCE_DRIFT", code: "SOURCE_DRIFT" },
    });

    const linked = copyCanonicalSource();
    const link = join(linked.root, "Linked.tla");
    symlinkSync(linked.model, link);
    expect(loadRunModelCheckSource(link, linked.cfg)).toMatchObject({
      ok: false,
      error: { kind: "MODEL_LOAD", code: "MODEL_UNREADABLE" },
    });

    expect(loadRunModelCheckSource(`${linked.model}.txt`, linked.cfg)).toMatchObject({
      ok: false,
      error: { code: "MODEL_UNREADABLE" },
    });
    expect(loadRunModelCheckSource(join(linked.root, "missing.tla"), linked.cfg)).toMatchObject({
      ok: false,
      error: { code: "MODEL_UNREADABLE" },
    });
  });

  test("rejects a cfg outside the model workspace and cfg drift", () => {
    const left = copyCanonicalSource();
    const right = copyCanonicalSource();
    expect(loadRunModelCheckSource(left.model, right.cfg)).toMatchObject({
      ok: false,
      error: { code: "CFG_UNREADABLE" },
    });
    writeFileSync(left.cfg, "SPECIFICATION Missing\n");
    expect(loadRunModelCheckSource(left.model, left.cfg)).toMatchObject({
      ok: false,
      error: { kind: "SOURCE_DRIFT", relativePath: left.cfg },
    });

    const unreadable = copyCanonicalSource();
    chmodSync(unreadable.model, 0o000);
    try {
      expect(loadRunModelCheckSource(unreadable.model, unreadable.cfg)).toMatchObject({
        ok: false,
        error: { code: "MODEL_UNREADABLE" },
      });
    } finally {
      chmodSync(unreadable.model, 0o600);
    }

    const raced = copyCanonicalSource();
    expect(loadRunModelCheckSource(raced.model, raced.cfg, {
      readBytes: () => {
        throw new Error("file disappeared after path verification");
      },
    })).toMatchObject({
      ok: false,
      error: {
        code: "MODEL_UNREADABLE",
        cause: expect.any(Error),
      },
    });
  });

  test("keeps no code-level vocabulary defaults in the supply path (BR-V1 grep guard)", () => {
    // Same shape as the loader adapter source check: the vocabulary has no
    // code-level duplicate after the move to model-map.json (t404 pins values;
    // this pins the ABSENCE of the removed constants).
    const arm = readFileSync("plugins/formal-model-check/tools/tla-arm.ts", "utf8");
    const toolchain = readFileSync("plugins/formal-model-check/tools/tlc-toolchain.ts", "utf8");
    expect(arm).not.toContain("TLA_NAMED_INVARIANTS");
    expect(arm).not.toContain("TlaNamedInvariant");
    expect(toolchain).not.toContain("TRACE_STATE_VARIABLES");
  });
});
