// Drives the U3 referee against the real TLC toolchain: acquires the pinned
// tla2tools jar, runs a baseline exploration plus a falling and a vacuity
// mutant, and prints the resulting ProofEvidence or ProofFailure as JSON.
//
// Same shape as tla-real-toolchain-probe.ts: a standalone probe, not a CI test.
// It needs JAVA_HOME on the pinned OpenJDK and network access for the first
// jar fetch, so the default suite never runs it.
//
//   JAVA_HOME=<openjdk-26.0.1> bun tests/formal-verif/support/tla-referee-real-toolchain-probe.ts [root]

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRefereeToolchain } from "../../../plugins/formal-model-check/tools/tla-referee-toolchain.ts";
import {
  InvariantNameCodec,
  ProofObligations,
  type InvariantName,
  type ModelArtifacts,
} from "../../../plugins/formal-model-check/tools/tla-referees.ts";
import { IdentityDigest } from "../../../plugins/formal-model-check/tools/tla-evidence.ts";
import type { StableId } from "../../../plugins/formal-model-check/tools/tla-evidence.ts";

if (!process.env.JAVA_HOME) throw new Error("JAVA_HOME is required and must point to OpenJDK 26.0.1");

function unwrap<T, E>(result: { ok: true; value: T } | { ok: false; error: E }): T {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}

const root = process.argv[2] ?? mkdtempSync(join(tmpdir(), "amadeus-tla-referee-probe-"));
const workspaceRoot = join(root, "workspace");
mkdirSync(workspaceRoot, { recursive: true });

// A bounded counter: TypeOK holds under exhaustive exploration, and the counter
// does reach a non-zero state, so the witness is genuinely reachable.
const MODULE = [
  "---- MODULE Counter ----",
  "EXTENDS Naturals",
  "VARIABLE ticks",
  "TypeOK == ticks \\in 0..3",
  "Init == ticks = 0",
  "Next == ticks' = IF ticks < 3 THEN ticks + 1 ELSE ticks",
  "Spec == Init /\\ [][Next]_ticks",
  "====",
  "",
].join("\n");

const CONFIG = ["SPECIFICATION Spec", "INVARIANT TypeOK", ""].join("\n");

const subject = unwrap(IdentityDigest.normalizeStableId("FR-008"));
const identity = IdentityDigest.aggregateDigest([
  [subject, IdentityDigest.contentDigest(subject, "bounded counter")],
]);

const modulePath = join(workspaceRoot, "Counter.tla");
const configPath = join(workspaceRoot, "Counter.cfg");
const reductionManifestPath = join(workspaceRoot, "Counter.reduction.json");
writeFileSync(modulePath, MODULE, "utf8");
writeFileSync(configPath, CONFIG, "utf8");
writeFileSync(
  reductionManifestPath,
  JSON.stringify({
    declaredIdentity: identity,
    items: [
      {
        reductionItem: "ticks \\in 0..3",
        preservedMeaning: "unbounded tick growth is represented by four states",
        sourceSubjects: [subject],
      },
    ],
    injections: {
      TypeOK: {
        witness: "ticks > 0",
        fallingMutation: { find: "TypeOK == ticks \\in 0..3", replace: "TypeOK == ticks \\in 0..2" },
      },
    },
  }),
  "utf8",
);

const model: ModelArtifacts = { modulePath, configPath, reductionManifestPath };
const invariants: InvariantName[] = [unwrap(InvariantNameCodec.parse("TypeOK"))];
// The pinned jar cache lives outside the per-run root so repeated probes
// reuse it instead of re-fetching on every invocation.
const cacheRoot = process.env.AMADEUS_TLA_CACHE_ROOT ?? join(tmpdir(), "amadeus-tla-referee-cache");
const toolchain = createRefereeToolchain({ cacheRoot });

const startedAt = new Date().toISOString();
const proof = await ProofObligations.evaluate(model, invariants, identity, toolchain);
const finishedAt = new Date().toISOString();

console.log(
  JSON.stringify({
    root,
    versionLine: toolchain.versionLine,
    startedAt,
    finishedAt,
    outcome: proof.ok ? { kind: "proof-evidence", evidence: proof.value } : { kind: "proof-failure", failure: proof.error },
  }),
);
if (!proof.ok) process.exitCode = 1;
