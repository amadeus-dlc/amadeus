import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalIdentity } from "../../plugins/formal-model-check/tools/canonical.ts";
import { updateModelMap } from "../../packages/framework/core/tools/amadeus-sensor-model-completeness.ts";
import { runTlaAuthoring } from "../../plugins/formal-model-check/tools/tla-authoring.ts";
import { EvidenceBundle, EvidenceEnvelopeCodec } from "../../plugins/formal-model-check/tools/tla-evidence.ts";
import { readModelMapSnapshot, traceSubjectsOf } from "../../plugins/formal-model-check/tools/tla-applicability.ts";
import {
  RegistrationCommitter,
  createRegistrationPorts,
} from "../../plugins/formal-model-check/tools/tla-registration.ts";
import type { AggregateDigest, StableId, VerifiedBundle } from "../../plugins/formal-model-check/tools/tla-evidence.ts";
import type { HumanApprovalRef } from "../../plugins/formal-model-check/tools/tla-applicability.ts";

// U4 handler pin (nfr-design/logical-components.md § 層構成): the committer and
// the completeness sensor both touch the real filesystem, so these live in the
// integration tier (cid:code-generation:fs-tests-integration-first).

const BUNDLE_DIGEST = `sha256:${"e".repeat(64)}`;

const roots: string[] = [];

function makeProject(): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-u4-registration-"));
  roots.push(root);
  mkdirSync(join(root, "specs", "tla"), { recursive: true });
  mkdirSync(join(root, "packages", "framework", "core", "tools"), { recursive: true });
  const model = "---- MODULE FormalElection ----\n====\n";
  const cfg = "SPECIFICATION Spec\n";
  writeFileSync(join(root, "specs", "tla", "FormalElection.tla"), model);
  writeFileSync(join(root, "specs", "tla", "FormalElection.cfg"), cfg);
  const implPath = "packages/framework/core/tools/amadeus-election-0.ts";
  const body = "// implementation 0\n";
  writeFileSync(join(root, implPath), body);
  writeFileSync(
    join(root, "specs", "tla", "model-map.json"),
    `${JSON.stringify(
      {
        schemaVersion: 2,
        models: [
          {
            name: "FormalElection",
            model: {
              path: "specs/tla/FormalElection.tla",
              identity: canonicalIdentity(model, "amadeus.formal-verif.tla.module.v1").sha256,
            },
            cfg: {
              path: "specs/tla/FormalElection.cfg",
              identity: canonicalIdentity(cfg, "amadeus.formal-verif.tla.cfg.v1").sha256,
            },
            entries: [{ implPath, sha256: Bun.CryptoHasher.hash("sha256", body, "hex") }],
            evidenceBundle: { digest: BUNDLE_DIGEST },
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  return root;
}

function readMap(root: string): { models: { evidenceBundle?: { digest: string } }[] } {
  return JSON.parse(readFileSync(join(root, "specs", "tla", "model-map.json"), "utf8"));
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("completeness sensor round-trip (BR-U4-12)", () => {
  test("an impl-only refresh keeps the registered evidenceBundle reference", async () => {
    const root = makeProject();
    writeFileSync(
      join(root, "packages", "framework", "core", "tools", "amadeus-election-0.ts"),
      "// implementation 0 revised\n",
    );

    const result = await updateModelMap({ projectRoot: root, implOnly: true });
    expect(result).toMatchObject({ ok: true, code: "IMPL_ONLY_UPDATED" });
    expect(readMap(root).models[0]?.evidenceBundle).toEqual({ digest: BUNDLE_DIGEST });
  });
});

const SUBJECT_IDENTITY = `sha256:${"1".repeat(64)}` as AggregateDigest;
const MODEL_IDENTITY = "a".repeat(64);
const CFG_IDENTITY = "b".repeat(64);
const IMPL_SHA = "c".repeat(64);
const APPROVED_AT = "2026-08-05T00:00:00Z";

function entryFor(name: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name,
    model: { path: `specs/tla/${name}.tla`, identity: MODEL_IDENTITY },
    cfg: { path: `specs/tla/${name}.cfg`, identity: CFG_IDENTITY },
    entries: [{ implPath: "packages/framework/core/tools/amadeus-election.ts", sha256: IMPL_SHA }],
    ...extra,
  };
}

function mapText(models: readonly Record<string, unknown>[]): string {
  return `${JSON.stringify({ schemaVersion: 2, models }, null, 2)}\n`;
}

/** A real audit shard line the provenance re-check can resolve (BR-U4-11). */
function shardWithApproval(root: string): { path: string; approval: HumanApprovalRef } {
  const line = JSON.stringify({
    timestamp: APPROVED_AT,
    eventName: "amadeus.human.turn",
    attributes: { Event: "HUMAN_TURN" },
  });
  const path = join(root, "shard.jsonl");
  writeFileSync(path, `${line}\n`);
  return {
    path,
    approval: {
      shard: path,
      timestamp: APPROVED_AT,
      eventIdentity: Bun.CryptoHasher.hash("sha256", line, "hex"),
    },
  };
}

function verifiedBundleIn(root: string): VerifiedBundle {
  const store = join(root, "evidence");
  const receipt = { recorded: true } as const;
  const applicability = {
    route: "author-new",
    subjectIdentity: SUBJECT_IDENTITY,
    subjectSeries: `sha256:${"5".repeat(64)}`,
    subjects: ["FR-010"],
    predecessor: { kind: "root" },
  } as const;
  const built = EvidenceBundle.build(
    store,
    {
      kind: "authoring-bundle",
      parts: {
        applicability,
        trace: receipt,
        proof: receipt,
        review: receipt,
        approval: receipt,
      },
    },
    { kind: "root" },
    { subjectIdentity: SUBJECT_IDENTITY, generatedAt: APPROVED_AT, generatedBy: "t449" },
  );
  if (!built.ok) throw new Error(`bundle build failed: ${JSON.stringify(built.error)}`);
  const verified = EvidenceBundle.verify(store, built.value, SUBJECT_IDENTITY);
  if (!verified.ok) throw new Error(`bundle verify failed: ${JSON.stringify(verified.error)}`);
  return verified.value;
}

function preconditionsFor(approval: HumanApprovalRef, freshness: unknown = { kind: "current" }): Record<string, unknown> {
  return {
    applicability: { route: "author-new", subjectIdentity: SUBJECT_IDENTITY },
    coverage: { __brand: "CoverageProof", subjectsDigest: "s", rowsDigest: "r", invariantsDigest: "i" },
    freshness,
    proof: {
      tlcExploration: {
        outcome: "not-detected",
        completionMarker: "Model checking completed",
        stateStatistics: { statesGenerated: 1, distinctStates: 1 },
        toolchainVersionLine: "TLC2",
      },
      fallingProofs: [],
      vacuityProof: { obligations: [] },
      reductionEvidence: { items: [] },
      boundIdentity: SUBJECT_IDENTITY,
    },
    review: {
      reviewer: "reviewer",
      modelAuthor: "author",
      verdict: "READY",
      reviewedAt: APPROVED_AT,
      artifactDigests: [],
    },
    humanApproval: approval,
  };
}

function workspace(): { root: string; mapPath: string } {
  const root = mkdtempSync(join(tmpdir(), "amadeus-u4-commit-"));
  roots.push(root);
  const mapPath = join(root, "model-map.json");
  writeFileSync(mapPath, mapText([entryFor("Mirror")]));
  return { root, mapPath };
}

describe("registration commit on the real filesystem (FR-010)", () => {
  test("registers when every precondition is current, replacing the map atomically", () => {
    const { root, mapPath } = workspace();
    const { approval } = shardWithApproval(root);
    const bundle = verifiedBundleIn(root);
    const draft = entryFor("Election", { evidenceBundle: { digest: bundle.ref.digest } });

    const committed = RegistrationCommitter.commit(
      draft,
      bundle,
      preconditionsFor(approval),
      createRegistrationPorts({ mapPath, now: () => APPROVED_AT }),
    );

    expect(committed.ok).toBe(true);
    if (!committed.ok) return;
    expect(committed.value).toEqual({
      entryName: "Election",
      bundle: { digest: bundle.ref.digest },
      registeredAt: APPROVED_AT,
    });
    const written = JSON.parse(readFileSync(mapPath, "utf8"));
    expect(written.models.map((model: { name: string }) => model.name)).toEqual(["Election", "Mirror"]);
    expect(written.models[0].evidenceBundle).toEqual({ digest: bundle.ref.digest });
  });

  test("refuses stale evidence and leaves the map untouched (AC-006)", () => {
    const { root, mapPath } = workspace();
    const before = readFileSync(mapPath, "utf8");
    const { approval } = shardWithApproval(root);
    const bundle = verifiedBundleIn(root);
    const stale = { kind: "stale", recorded: SUBJECT_IDENTITY, current: `sha256:${"9".repeat(64)}` };

    const committed = RegistrationCommitter.commit(
      entryFor("Election", { evidenceBundle: { digest: bundle.ref.digest } }),
      bundle,
      preconditionsFor(approval, stale),
      createRegistrationPorts({ mapPath, now: () => APPROVED_AT }),
    );

    expect(committed.ok).toBe(false);
    if (committed.ok) return;
    expect(committed.error).toEqual({
      kind: "preconditions-failed",
      failures: [{ kind: "stale-evidence", recorded: SUBJECT_IDENTITY, current: `sha256:${"9".repeat(64)}` }],
    });
    expect(readFileSync(mapPath, "utf8")).toEqual(before);
  });

  test("refuses an approval whose shard holds no matching HUMAN_TURN", () => {
    const { root, mapPath } = workspace();
    const { approval } = shardWithApproval(root);
    const bundle = verifiedBundleIn(root);
    const forged = { ...approval, eventIdentity: "0".repeat(64) };

    const committed = RegistrationCommitter.commit(
      entryFor("Election", { evidenceBundle: { digest: bundle.ref.digest } }),
      bundle,
      preconditionsFor(forged),
      createRegistrationPorts({ mapPath, now: () => APPROVED_AT }),
    );

    expect(committed.ok).toBe(false);
    if (committed.ok) return;
    expect(committed.error).toEqual({
      kind: "preconditions-failed",
      failures: [{ kind: "approval-provenance-invalid" }],
    });
  });

  test("refuses a draft that names a different bundle than the verified one", () => {
    const { root, mapPath } = workspace();
    const { approval } = shardWithApproval(root);
    const bundle = verifiedBundleIn(root);

    const committed = RegistrationCommitter.commit(
      entryFor("Election", { evidenceBundle: { digest: `sha256:${"7".repeat(64)}` } }),
      bundle,
      preconditionsFor(approval),
      createRegistrationPorts({ mapPath, now: () => APPROVED_AT }),
    );

    expect(committed.ok).toBe(false);
    if (committed.ok) return;
    expect(committed.error.kind).toBe("validator-rejected");
    expect(existsSync(mapPath)).toBe(true);
  });

  test("refuses to overwrite a map a third party changed after the snapshot (BR-U4-13/16)", () => {
    const { root, mapPath } = workspace();
    const { approval } = shardWithApproval(root);
    const bundle = verifiedBundleIn(root);
    const ports = createRegistrationPorts({ mapPath, now: () => APPROVED_AT });
    const intruderMap = mapText([entryFor("Mirror"), entryFor("Other")]);
    let reads = 0;
    // The write lands between the snapshot read and the re-read, which is the
    // window the conflict check exists to close.
    const racing = {
      ...ports,
      readMapBytes: (): string => {
        reads += 1;
        if (reads === 2) writeFileSync(mapPath, intruderMap);
        return ports.readMapBytes();
      },
    };

    const committed = RegistrationCommitter.commit(
      entryFor("Election", { evidenceBundle: { digest: bundle.ref.digest } }),
      bundle,
      preconditionsFor(approval),
      racing,
    );

    expect(committed.ok).toBe(false);
    if (committed.ok) return;
    expect(committed.error).toEqual({ kind: "concurrent-modification" });
    expect(readFileSync(mapPath, "utf8")).toEqual(intruderMap);
  });

  test("refuses when the shard the approval names cannot be read", () => {
    const { root, mapPath } = workspace();
    const bundle = verifiedBundleIn(root);
    const approval: HumanApprovalRef = {
      shard: join(root, "no-such-shard.jsonl"),
      timestamp: APPROVED_AT,
      eventIdentity: "f".repeat(64),
    };

    const committed = RegistrationCommitter.commit(
      entryFor("Election", { evidenceBundle: { digest: bundle.ref.digest } }),
      bundle,
      preconditionsFor(approval),
      createRegistrationPorts({ mapPath, now: () => APPROVED_AT }),
    );

    expect(committed.ok).toBe(false);
    if (committed.ok) return;
    expect(committed.error).toEqual({
      kind: "preconditions-failed",
      failures: [{ kind: "approval-provenance-invalid" }],
    });
  });

  test("reports an io-failure when the map itself cannot be read", () => {
    const { root } = workspace();
    const { approval } = shardWithApproval(root);
    const bundle = verifiedBundleIn(root);

    const committed = RegistrationCommitter.commit(
      entryFor("Election", { evidenceBundle: { digest: bundle.ref.digest } }),
      bundle,
      preconditionsFor(approval),
      createRegistrationPorts({ mapPath: join(root, "absent-map.json"), now: () => APPROVED_AT }),
    );

    expect(committed.ok).toBe(false);
    if (committed.ok) return;
    expect(committed.error.kind).toBe("io-failure");
  });

  test("reports an io-failure and keeps the old map when the publish fails", () => {
    const { root, mapPath } = workspace();
    const before = readFileSync(mapPath, "utf8");
    const { approval } = shardWithApproval(root);
    const bundle = verifiedBundleIn(root);
    const ports = createRegistrationPorts({ mapPath: join(root, "missing-dir", "model-map.json") });

    const committed = RegistrationCommitter.commit(
      entryFor("Election", { evidenceBundle: { digest: bundle.ref.digest } }),
      bundle,
      preconditionsFor(approval),
      { ...ports, readMapBytes: () => before },
    );

    expect(committed.ok).toBe(false);
    if (committed.ok) return;
    expect(committed.error.kind).toBe("io-failure");
    expect(readFileSync(mapPath, "utf8")).toEqual(before);
  });
});

describe("registration hands the entry to the hold evaluator (FR-010 handoff)", () => {
  test("the evaluator resolves the trace subjects of a freshly registered model", () => {
    const { root, mapPath } = workspace();
    const { approval } = shardWithApproval(root);
    const bundle = verifiedBundleIn(root);
    const store = join(root, "evidence");

    const committed = RegistrationCommitter.commit(
      entryFor("Election", { evidenceBundle: { digest: bundle.ref.digest } }),
      bundle,
      preconditionsFor(approval),
      createRegistrationPorts({ mapPath, now: () => APPROVED_AT }),
    );
    expect(committed.ok).toBe(true);

    const snapshot = readModelMapSnapshot(readFileSync(mapPath, "utf8"), (digest) => {
      const parsed = EvidenceEnvelopeCodec.parseBundleDigest(digest);
      if (!parsed.ok) return null;
      const parts = EvidenceBundle.read(store, { digest: parsed.value });
      return parts.ok ? traceSubjectsOf(parts.value) : null;
    });

    expect(snapshot?.models).toEqual([
      { name: "Election", traceSubjects: ["FR-010"] as unknown as readonly StableId[] },
      { name: "Mirror", traceSubjects: [] },
    ]);
  });
});

describe("existing model compatibility (FR-013, AC-008)", () => {
  test("registering a third model leaves the two shipped entries byte for byte", () => {
    const { root } = workspace();
    const shipped = readFileSync(join(import.meta.dir, "..", "..", "specs", "tla", "model-map.json"), "utf8");
    const mapPath = join(root, "shipped-map.json");
    writeFileSync(mapPath, shipped);
    const { approval } = shardWithApproval(root);
    const bundle = verifiedBundleIn(root);

    const committed = RegistrationCommitter.commit(
      entryFor("Zeta", { evidenceBundle: { digest: bundle.ref.digest } }),
      bundle,
      preconditionsFor(approval),
      createRegistrationPorts({ mapPath, now: () => APPROVED_AT }),
    );

    expect(committed.ok).toBe(true);
    const before = JSON.parse(shipped);
    const after = JSON.parse(readFileSync(mapPath, "utf8"));
    expect(after.models.map((model: { name: string }) => model.name)).toEqual([
      "FormalElection",
      "MirrorLifecycle",
      "Zeta",
    ]);
    expect(JSON.stringify(after.models.slice(0, 2), null, 2)).toEqual(JSON.stringify(before.models, null, 2));
  });
});

describe("tla-authoring commit subcommand", () => {
  function cliWorkspace(): {
    root: string;
    mapPath: string;
    draftPath: string;
    preconditionsPath: string;
    bundle: VerifiedBundle;
  } {
    const { root, mapPath } = workspace();
    const { approval } = shardWithApproval(root);
    const bundle = verifiedBundleIn(root);
    const draftPath = join(root, "draft.json");
    const preconditionsPath = join(root, "preconditions.json");
    writeFileSync(
      draftPath,
      JSON.stringify(entryFor("Election", { evidenceBundle: { digest: bundle.ref.digest } })),
    );
    writeFileSync(preconditionsPath, JSON.stringify(preconditionsFor(approval)));
    return { root, mapPath, draftPath, preconditionsPath, bundle };
  }

  test("registers through the CLI and prints the receipt", async () => {
    const { root, mapPath, draftPath, preconditionsPath, bundle } = cliWorkspace();
    const lines: string[] = [];

    const exitCode = await runTlaAuthoring(
      [
        "commit",
        "--draft", draftPath,
        "--bundle", bundle.ref.digest,
        "--preconditions", preconditionsPath,
        "--model-map", mapPath,
        "--store", join(root, "evidence"),
      ],
      (line) => lines.push(line),
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(lines[0] as string)).toMatchObject({
      ok: true,
      receipt: { entryName: "Election", bundle: { digest: bundle.ref.digest } },
    });
    expect(JSON.parse(readFileSync(mapPath, "utf8")).models[0].name).toBe("Election");
  });

  test("exits 1 with the typed failure when a precondition is stale", async () => {
    const { root, mapPath, draftPath, preconditionsPath, bundle } = cliWorkspace();
    const before = readFileSync(mapPath, "utf8");
    const preconditions = JSON.parse(readFileSync(preconditionsPath, "utf8"));
    preconditions.freshness = { kind: "stale", recorded: SUBJECT_IDENTITY, current: `sha256:${"9".repeat(64)}` };
    writeFileSync(preconditionsPath, JSON.stringify(preconditions));
    const lines: string[] = [];

    const exitCode = await runTlaAuthoring(
      [
        "commit",
        "--draft", draftPath,
        "--bundle", bundle.ref.digest,
        "--preconditions", preconditionsPath,
        "--model-map", mapPath,
        "--store", join(root, "evidence"),
      ],
      (line) => lines.push(line),
    );

    expect(exitCode).toBe(1);
    expect(JSON.parse(lines[0] as string)).toMatchObject({
      ok: false,
      failure: { kind: "preconditions-failed" },
    });
    expect(readFileSync(mapPath, "utf8")).toEqual(before);
  });

  test("exits 1 when the named bundle fails verification", async () => {
    const { root, mapPath, draftPath, preconditionsPath } = cliWorkspace();
    const lines: string[] = [];

    const exitCode = await runTlaAuthoring(
      [
        "commit",
        "--draft", draftPath,
        "--bundle", `sha256:${"3".repeat(64)}`,
        "--preconditions", preconditionsPath,
        "--model-map", mapPath,
        "--store", join(root, "evidence"),
      ],
      (line) => lines.push(line),
    );

    expect(exitCode).toBe(1);
    expect(JSON.parse(lines[0] as string).ok).toBe(false);
  });

  test("exits 2 when the preconditions document is not an object", async () => {
    const { root, mapPath, draftPath, preconditionsPath, bundle } = cliWorkspace();
    writeFileSync(preconditionsPath, JSON.stringify(["not", "an", "object"]));
    const lines: string[] = [];

    const exitCode = await runTlaAuthoring(
      [
        "commit",
        "--draft", draftPath,
        "--bundle", bundle.ref.digest,
        "--preconditions", preconditionsPath,
        "--model-map", mapPath,
        "--store", join(root, "evidence"),
      ],
      (line) => lines.push(line),
    );

    expect(exitCode).toBe(2);
    expect(JSON.parse(lines[0] as string).error).toContain("--preconditions");
  });

  test("exits 1 when the preconditions carry no applicability identity", async () => {
    const { root, mapPath, draftPath, preconditionsPath, bundle } = cliWorkspace();
    const preconditions = JSON.parse(readFileSync(preconditionsPath, "utf8"));
    delete preconditions.applicability;
    writeFileSync(preconditionsPath, JSON.stringify(preconditions));
    const lines: string[] = [];

    const exitCode = await runTlaAuthoring(
      [
        "commit",
        "--draft", draftPath,
        "--bundle", bundle.ref.digest,
        "--preconditions", preconditionsPath,
        "--model-map", mapPath,
        "--store", join(root, "evidence"),
      ],
      (line) => lines.push(line),
    );

    expect(exitCode).toBe(1);
    expect(JSON.parse(lines[0] as string)).toMatchObject({
      failure: { kind: "preconditions-failed" },
    });
  });

  test("exits 2 when a required flag is missing", async () => {
    const lines: string[] = [];
    const exitCode = await runTlaAuthoring(["commit", "--draft", "draft.json"], (line) => lines.push(line));
    expect(exitCode).toBe(2);
    expect(JSON.parse(lines[0] as string).usage).toContain("commit --draft");
  });
});
