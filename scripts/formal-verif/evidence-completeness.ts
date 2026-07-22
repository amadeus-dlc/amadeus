import { canonicalIdentity } from "./canonical.ts";
import type { ArmId } from "./contract.ts";
import type { SampleKey } from "./execution-evidence.ts";
import { isVerifiedEvidenceProof, type VerifiedEvidenceProof } from "./fs-evidence-store.ts";

export interface VerifiedCellEvidence {
  proof: VerifiedEvidenceProof;
}

export interface SuiteEvidence {
  arm: ArmId;
  sample: SampleKey;
  inputSetHash: string;
  baselineSha: string;
  armSha: string;
  runnerClass: string;
  orderedSubjects: readonly string[];
  durationMs: number;
  cells: VerifiedCellEvidence[];
}

export type CompletenessFindingKind = "MISSING" | "DUPLICATE" | "HANDWRITTEN" | "METADATA_DRIFT" | "HARNESS_ERROR_CELL" | "SUITE_TIMEOUT" | "VERDICT_DISAGREEMENT";
export interface CompletenessFinding { kind: CompletenessFindingKind; identity: string; cause: string }

export type SuiteProof =
  | { kind: "CompleteSuiteProof"; suite: SuiteEvidence; verifiedBundles: readonly string[]; findings: readonly [] }
  | { kind: "IncompleteSuiteProof"; suite: SuiteEvidence; verifiedBundles: readonly string[]; findings: readonly CompletenessFinding[] };

function sampleIdentity(sample: SampleKey): string { return `${sample.kind}:${sample.runNo}`; }

export function verifySuite(expectedSubjects: readonly string[], suite: SuiteEvidence): SuiteProof {
  const findings: CompletenessFinding[] = [];
  if (expectedSubjects[0] !== "HEALTHY_BASELINE" || new Set(expectedSubjects).size !== expectedSubjects.length || expectedSubjects.join("\0") !== suite.orderedSubjects.join("\0")) findings.push({ kind: "METADATA_DRIFT", identity: "subjects", cause: "canonical subject order drift" });
  const keys = suite.cells.map((cell) => isVerifiedEvidenceProof(cell.proof) ? `${cell.proof.cellKey.arm}:${cell.proof.cellKey.subject}:${sampleIdentity(cell.proof.cellKey.sample)}` : "HANDWRITTEN");
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
  if (duplicates.length > 0) findings.push({ kind: "DUPLICATE", identity: duplicates[0]!, cause: "duplicate cell key" });
  for (const subject of expectedSubjects) if (!suite.cells.some((cell) => isVerifiedEvidenceProof(cell.proof) && cell.proof.cellKey.subject === subject)) findings.push({ kind: "MISSING", identity: subject, cause: "expected cell is missing" });
  for (const cell of suite.cells) {
    if (!isVerifiedEvidenceProof(cell.proof)) { findings.push({ kind: "HANDWRITTEN", identity: "unknown", cause: "store-verified proof is absent" }); continue; }
    const { cellKey, inputSetHash, result } = cell.proof;
    if (!expectedSubjects.includes(cellKey.subject)) findings.push({ kind: "METADATA_DRIFT", identity: cellKey.subject, cause: "cell subject is outside the expected set" });
    if (cellKey.arm !== suite.arm || cellKey.subject !== result.fixtureId || sampleIdentity(cellKey.sample) !== sampleIdentity(suite.sample) || inputSetHash !== suite.inputSetHash || result.arm !== suite.arm || result.armSha !== suite.armSha || result.baselineSha !== suite.baselineSha) findings.push({ kind: "METADATA_DRIFT", identity: cellKey.subject, cause: "cell and suite metadata differ" });
    if (result.verdict === "HARNESS_ERROR") findings.push({ kind: "HARNESS_ERROR_CELL", identity: cellKey.subject, cause: "cell retained a harness error verdict" });
  }
  const verifiedBundles = suite.cells.filter((cell) => isVerifiedEvidenceProof(cell.proof)).map((cell) => cell.proof.bundleId);
  return findings.length === 0 ? { kind: "CompleteSuiteProof", suite, verifiedBundles, findings: [] } : { kind: "IncompleteSuiteProof", suite, verifiedBundles, findings };
}

export type MatrixValidationResult =
  | { kind: "CompleteMatrix"; proofIdentity: string; suites: readonly SuiteEvidence[]; measuredDurationsMs: readonly number[] }
  | { kind: "IncompleteMatrix"; expectedKeys: readonly string[]; verifiedBundles: readonly string[]; findings: readonly CompletenessFinding[] };

export function verifyMatrix(input: { arms: readonly ArmId[]; canonicalSubjects: readonly string[]; suites: readonly SuiteEvidence[] }): MatrixValidationResult {
  const expectedSamples: SampleKey[] = [{ kind: "WARMUP", runNo: 0 }, { kind: "MEASURED", runNo: 1 }, { kind: "MEASURED", runNo: 2 }, { kind: "MEASURED", runNo: 3 }, { kind: "MEASURED", runNo: 4 }, { kind: "MEASURED", runNo: 5 }];
  const expectedKeys = input.arms.flatMap((arm) => expectedSamples.map((sample) => `${arm}:${sampleIdentity(sample)}`));
  const findings: CompletenessFinding[] = [];
  const proofs = input.suites.map((suite) => verifySuite(input.canonicalSubjects, suite));
  for (const proof of proofs) findings.push(...proof.findings);
  for (const key of expectedKeys) {
    const count = input.suites.filter((suite) => `${suite.arm}:${sampleIdentity(suite.sample)}` === key).length;
    if (count === 0) findings.push({ kind: "MISSING", identity: key, cause: "expected suite is missing" });
    if (count > 1) findings.push({ kind: "DUPLICATE", identity: key, cause: "suite key is duplicated" });
  }
  for (const arm of input.arms) {
    const armSuites = input.suites.filter((suite) => suite.arm === arm);
    const first = armSuites[0];
    if (first && armSuites.some((suite) => suite.inputSetHash !== first.inputSetHash || suite.baselineSha !== first.baselineSha || suite.armSha !== first.armSha || suite.runnerClass !== first.runnerClass)) findings.push({ kind: "METADATA_DRIFT", identity: arm, cause: "suite comparison metadata drift" });
    const measured = armSuites.filter((suite) => suite.sample.kind === "MEASURED");
    for (const subject of input.canonicalSubjects) {
      const verdicts = measured.map((suite) => suite.cells.find((cell) => isVerifiedEvidenceProof(cell.proof) && cell.proof.cellKey.subject === subject)?.proof.result.verdict).filter(Boolean);
      if (verdicts.length === 5 && new Set(verdicts).size !== 1) findings.push({ kind: "VERDICT_DISAGREEMENT", identity: `${arm}:${subject}`, cause: "measured verdicts disagree" });
    }
  }
  const verifiedBundles = proofs.flatMap((proof) => proof.verifiedBundles);
  if (findings.length > 0) return { kind: "IncompleteMatrix", expectedKeys, verifiedBundles, findings };
  const measuredDurationsMs = input.suites.filter((suite) => suite.sample.kind === "MEASURED").map((suite) => suite.durationMs);
  return { kind: "CompleteMatrix", proofIdentity: canonicalIdentity({ expectedKeys, verifiedBundles }, "amadeus.formal-verif.complete-matrix.v1").sha256, suites: input.suites, measuredDurationsMs };
}
