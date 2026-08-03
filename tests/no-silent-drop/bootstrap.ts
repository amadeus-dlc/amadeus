import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { isAbsolute, normalize, resolve } from "node:path";
import {
  approvalDigest,
  CANONICAL_PATHS,
  parseApproval,
  parseBaseline,
  parseExemptions,
} from "./ledger.ts";
import {
  type BaselineDoc,
  type BaselineEntry,
  digest,
  type ExemptionDoc,
  InfraFailure,
} from "./model.ts";

const FULL_SHA = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
export const BOOTSTRAP_COMMAND_VERSION = "no-silent-drop-bootstrap-v1";
const BASELINE_PATH = "tests/no-silent-drop/baseline.json";
const EXEMPTIONS_PATH = "tests/no-silent-drop/exemptions.json";

export type BootstrapArtifactRef = { readonly path: string; readonly digest: string };
export type BootstrapEvidenceRefs = {
  readonly raw: BootstrapArtifactRef;
  readonly classification: BootstrapArtifactRef;
  readonly approval: BootstrapArtifactRef;
  readonly approvedEvidence: BootstrapArtifactRef;
};
export type BootstrapApprovedEvidence = {
  readonly schemaVersion: 1;
  readonly revision: string;
  readonly rawDigest: string;
  readonly classificationDigest: string;
  readonly approvalDigest: string;
  readonly ruleBundleDigest: string;
  readonly semanticDependencyDigest: string;
  readonly identities: readonly string[];
};
export type BootstrapProvenance = {
  readonly schemaVersion: 1;
  readonly commandVersion: typeof BOOTSTRAP_COMMAND_VERSION;
  readonly bootstrapBaseRevision: string;
  readonly preRevision: string;
  readonly postRevision: string;
  readonly ruleBundleDigest: string;
  readonly semanticDependencyDigest: string;
  readonly pre: BootstrapEvidenceRefs;
  readonly post: BootstrapEvidenceRefs;
  readonly candidate: BootstrapArtifactRef;
  readonly humanReview: BootstrapArtifactRef;
  readonly approvedPre: {
    readonly identitySetDigest: string;
    readonly entries: readonly BaselineEntry[];
  };
  readonly candidateB0: { readonly identitySetDigest: string };
  readonly initialExemptions: {
    readonly bytesDigest: string;
    readonly identitySetDigest: string;
    readonly entries: ExemptionDoc["entries"];
  };
  readonly removed: readonly { readonly fingerprint: string; readonly issue: "#1874" | "#1878" }[];
  readonly added: readonly string[];
};

export type TrustedPreviousLedgers = {
  readonly baseline: BaselineDoc;
  readonly exemptions: ExemptionDoc;
  readonly source: "git" | "bootstrap";
};

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new InfraFailure("BASELINE_INVALID", `${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function json(text: string, label: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new InfraFailure("BASELINE_INVALID", `${label} is not valid JSON: ${String(error)}`);
  }
}

function nonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new InfraFailure("BASELINE_INVALID", `${label} must be a non-empty string`);
  }
  return value;
}

function sha256(value: unknown, label: string): string {
  const parsed = nonEmptyString(value, label);
  if (!SHA256.test(parsed)) throw new InfraFailure("BASELINE_INVALID", `${label} must be a SHA-256 digest`);
  return parsed;
}

function fullSha(value: unknown, label: string): string {
  const parsed = nonEmptyString(value, label);
  if (!FULL_SHA.test(parsed)) throw new InfraFailure("BASELINE_INVALID", `${label} must be a full revision`);
  return parsed;
}

function safeArtifactPath(repoRoot: string, value: unknown, label: string): string {
  const path = nonEmptyString(value, label);
  const normalized = normalize(path);
  if (isAbsolute(path) || normalized === "." || normalized.startsWith("..") || normalized.includes("/../")) {
    throw new InfraFailure("BASELINE_INVALID", `${label} must be repository-relative`);
  }
  return resolve(repoRoot, normalized);
}

function artifactRef(repoRoot: string, value: unknown, label: string): BootstrapArtifactRef {
  const raw = record(value, label);
  const path = nonEmptyString(raw.path, `${label}.path`);
  safeArtifactPath(repoRoot, path, `${label}.path`);
  return { path, digest: sha256(raw.digest, `${label}.digest`) };
}

function evidenceRefs(repoRoot: string, value: unknown, label: string): BootstrapEvidenceRefs {
  const raw = record(value, label);
  return {
    raw: artifactRef(repoRoot, raw.raw, `${label}.raw`),
    classification: artifactRef(repoRoot, raw.classification, `${label}.classification`),
    approval: artifactRef(repoRoot, raw.approval, `${label}.approval`),
    approvedEvidence: artifactRef(repoRoot, raw.approvedEvidence, `${label}.approvedEvidence`),
  };
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    throw new InfraFailure("BASELINE_INVALID", `${label} must be a string array`);
  }
  if (new Set(value).size !== value.length) throw new InfraFailure("BASELINE_INVALID", `${label} contains duplicates`);
  return value;
}

function parseProvenance(repoRoot: string, text: string): BootstrapProvenance {
  const raw = record(json(text, "bootstrap provenance"), "bootstrap provenance");
  if (raw.schemaVersion !== 1 || raw.commandVersion !== BOOTSTRAP_COMMAND_VERSION) {
    throw new InfraFailure("BASELINE_INVALID", `bootstrap provenance must use schemaVersion 1 and ${BOOTSTRAP_COMMAND_VERSION}`);
  }
  const approvedPre = record(raw.approvedPre, "bootstrap.approvedPre");
  const candidateB0 = record(raw.candidateB0, "bootstrap.candidateB0");
  const initialExemptions = record(raw.initialExemptions, "bootstrap.initialExemptions");
  const preBaseline = parseBaseline(JSON.stringify({
    schemaVersion: 1,
    direction: "shrink-only",
    generatedFrom: { revision: "bootstrap", censusDigest: "bootstrap", approvalDigest: "bootstrap" },
    entries: approvedPre.entries,
  }), "bootstrap approved B_pre");
  const exemptions = parseExemptions(JSON.stringify({ schemaVersion: 1, entries: initialExemptions.entries }));
  if (!Array.isArray(raw.removed)) throw new InfraFailure("BASELINE_INVALID", "bootstrap.removed must be an array");
  const removed = raw.removed.map((value, index) => {
    const entry = record(value, `bootstrap.removed[${index}]`);
    const issue = entry.issue;
    if (issue !== "#1874" && issue !== "#1878") {
      throw new InfraFailure("BASELINE_INVALID", `bootstrap.removed[${index}].issue is not approved`);
    }
    return {
      fingerprint: nonEmptyString(entry.fingerprint, `bootstrap.removed[${index}].fingerprint`),
      issue: issue as "#1874" | "#1878",
    };
  });
  const added = stringArray(raw.added, "bootstrap.added");
  const provenance: BootstrapProvenance = {
    schemaVersion: 1,
    commandVersion: BOOTSTRAP_COMMAND_VERSION,
    bootstrapBaseRevision: fullSha(raw.bootstrapBaseRevision, "bootstrap.bootstrapBaseRevision"),
    preRevision: fullSha(raw.preRevision, "bootstrap.preRevision"),
    postRevision: fullSha(raw.postRevision, "bootstrap.postRevision"),
    ruleBundleDigest: sha256(raw.ruleBundleDigest, "bootstrap.ruleBundleDigest"),
    semanticDependencyDigest: sha256(raw.semanticDependencyDigest, "bootstrap.semanticDependencyDigest"),
    pre: evidenceRefs(repoRoot, raw.pre, "bootstrap.pre"),
    post: evidenceRefs(repoRoot, raw.post, "bootstrap.post"),
    candidate: artifactRef(repoRoot, raw.candidate, "bootstrap.candidate"),
    humanReview: artifactRef(repoRoot, raw.humanReview, "bootstrap.humanReview"),
    approvedPre: {
      identitySetDigest: sha256(approvedPre.identitySetDigest, "bootstrap.approvedPre.identitySetDigest"),
      entries: preBaseline.entries,
    },
    candidateB0: {
      identitySetDigest: sha256(candidateB0.identitySetDigest, "bootstrap.candidateB0.identitySetDigest"),
    },
    initialExemptions: {
      bytesDigest: sha256(initialExemptions.bytesDigest, "bootstrap.initialExemptions.bytesDigest"),
      identitySetDigest: sha256(initialExemptions.identitySetDigest, "bootstrap.initialExemptions.identitySetDigest"),
      entries: exemptions.entries,
    },
    removed,
    added,
  };
  const artifactPaths = [
    provenance.pre.raw.path,
    provenance.pre.classification.path,
    provenance.pre.approval.path,
    provenance.pre.approvedEvidence.path,
    provenance.post.raw.path,
    provenance.post.classification.path,
    provenance.post.approval.path,
    provenance.post.approvedEvidence.path,
    provenance.candidate.path,
    provenance.humanReview.path,
  ];
  if (new Set(artifactPaths).size !== artifactPaths.length) {
    throw new InfraFailure("RULE_INVALID", "bootstrap artifact roles must resolve to distinct literal paths");
  }
  return provenance;
}

function readArtifact(repoRoot: string, ref: BootstrapArtifactRef, label: string): string {
  const absolute = safeArtifactPath(repoRoot, ref.path, `${label}.path`);
  let bytes: string;
  try {
    bytes = readFileSync(absolute, "utf8");
  } catch (error) {
    throw new InfraFailure("BASELINE_INVALID", `${label} is unreadable: ${String(error)}`);
  }
  if (digest(bytes) !== ref.digest) throw new InfraFailure("BASELINE_INVALID", `${label} exact-bytes digest mismatch`);
  return bytes;
}

function validateVersionedJson(bytes: string, label: string): void {
  const value = record(json(bytes, label), label);
  if (value.schemaVersion !== 1) throw new InfraFailure("BASELINE_INVALID", `${label} must use schemaVersion 1`);
}

function parseApprovedEvidence(bytes: string, label: string): BootstrapApprovedEvidence {
  const raw = record(json(bytes, label), label);
  if (raw.schemaVersion !== 1) throw new InfraFailure("BASELINE_INVALID", `${label} must use schemaVersion 1`);
  return {
    schemaVersion: 1,
    revision: fullSha(raw.revision, `${label}.revision`),
    rawDigest: sha256(raw.rawDigest, `${label}.rawDigest`),
    classificationDigest: sha256(raw.classificationDigest, `${label}.classificationDigest`),
    approvalDigest: sha256(raw.approvalDigest, `${label}.approvalDigest`),
    ruleBundleDigest: sha256(raw.ruleBundleDigest, `${label}.ruleBundleDigest`),
    semanticDependencyDigest: sha256(raw.semanticDependencyDigest, `${label}.semanticDependencyDigest`),
    identities: stringArray(raw.identities, `${label}.identities`),
  };
}

function identitySetDigest(identities: readonly string[]): string {
  return digest([...identities].sort().join("\n"));
}

function sameSet(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((identity) => new Set(right).has(identity));
}

function validateEvidenceBundle(
  repoRoot: string,
  refs: BootstrapEvidenceRefs,
  revision: string,
  provenance: BootstrapProvenance,
  label: string,
): { approved: BootstrapApprovedEvidence; approvalBytes: string } {
  const rawBytes = readArtifact(repoRoot, refs.raw, `${label}.raw`);
  const classificationBytes = readArtifact(repoRoot, refs.classification, `${label}.classification`);
  const approvalBytes = readArtifact(repoRoot, refs.approval, `${label}.approval`);
  const approvedBytes = readArtifact(repoRoot, refs.approvedEvidence, `${label}.approvedEvidence`);
  validateVersionedJson(rawBytes, `${label}.raw`);
  validateVersionedJson(classificationBytes, `${label}.classification`);
  parseApproval(approvalBytes);
  const approved = parseApprovedEvidence(approvedBytes, `${label}.approvedEvidence`);
  if (approved.revision !== revision
    || approved.rawDigest !== refs.raw.digest
    || approved.classificationDigest !== refs.classification.digest
    || approved.approvalDigest !== refs.approval.digest
    || approved.ruleBundleDigest !== provenance.ruleBundleDigest
    || approved.semanticDependencyDigest !== provenance.semanticDependencyDigest) {
    throw new InfraFailure("BASELINE_INVALID", `${label} approved evidence binding mismatch`);
  }
  return { approved, approvalBytes };
}

function validateHumanReview(bytes: string, provenance: BootstrapProvenance): void {
  const review = record(json(bytes, "bootstrap human review"), "bootstrap human review");
  if (review.schemaVersion !== 1
    || review.decision !== "approved"
    || typeof review.reviewer !== "string"
    || review.reviewer.trim() === ""
    || typeof review.reviewedAt !== "string"
    || !Number.isFinite(Date.parse(review.reviewedAt))
    || review.candidateDigest !== provenance.candidate.digest
    || review.preApprovedEvidenceDigest !== provenance.pre.approvedEvidence.digest
    || review.postApprovedEvidenceDigest !== provenance.post.approvedEvidence.digest) {
    throw new InfraFailure("BASELINE_INVALID", "bootstrap human review binding is invalid");
  }
}

function assertBootstrap(condition: boolean, message: string): asserts condition {
  if (!condition) throw new InfraFailure("BASELINE_INVALID", message);
}

function readBootstrapProvenance(repoRoot: string): BootstrapProvenance {
  try {
    return parseProvenance(repoRoot, readFileSync(CANONICAL_PATHS.bootstrap(repoRoot), "utf8"));
  } catch (error) {
    if (error instanceof InfraFailure) throw error;
    throw new InfraFailure("BASELINE_MISSING", `bootstrap provenance is missing: ${String(error)}`);
  }
}

function validateCurrentArtifactBindings(
  repoRoot: string,
  provenance: BootstrapProvenance,
  currentBaseline: BaselineDoc,
  currentExemptions: ExemptionDoc,
  post: ReturnType<typeof validateEvidenceBundle>,
): void {
  const baselineBytes = readArtifact(repoRoot, provenance.candidate, "bootstrap.candidate");
  const exemptionsBytes = readArtifact(repoRoot, {
    path: EXEMPTIONS_PATH,
    digest: provenance.initialExemptions.bytesDigest,
  }, "bootstrap.initialExemptions");
  const currentIdentities = currentBaseline.entries.map((entry) => entry.fingerprint);
  const exemptionIdentities = currentExemptions.entries.map((entry) => entry.fingerprint);

  assertBootstrap(provenance.candidate.path === BASELINE_PATH, "bootstrap candidate path is not canonical");
  assertBootstrap(
    digest(baselineBytes) === provenance.candidate.digest,
    "bootstrap candidate B0 exact bytes do not match the current baseline",
  );
  assertBootstrap(
    currentBaseline.generatedFrom.revision === provenance.postRevision,
    "bootstrap post revision does not match the current baseline",
  );
  assertBootstrap(
    identitySetDigest(currentIdentities) === provenance.candidateB0.identitySetDigest,
    "bootstrap B0 identity digest mismatch",
  );
  assertBootstrap(
    currentBaseline.generatedFrom.censusDigest === provenance.candidateB0.identitySetDigest,
    "bootstrap B0 census digest mismatch",
  );
  assertBootstrap(sameSet(post.approved.identities, currentIdentities), "bootstrap post identities mismatch");
  assertBootstrap(
    digest(exemptionsBytes) === provenance.initialExemptions.bytesDigest,
    "bootstrap initial exemption exact-bytes digest mismatch",
  );
  assertBootstrap(
    identitySetDigest(exemptionIdentities) === provenance.initialExemptions.identitySetDigest,
    "bootstrap initial exemption identity digest mismatch",
  );
  assertBootstrap(
    sameSet(exemptionIdentities, provenance.initialExemptions.entries.map((entry) => entry.fingerprint)),
    "bootstrap initial exemption entries mismatch",
  );
}

function validateApprovedPreBindings(
  provenance: BootstrapProvenance,
  pre: ReturnType<typeof validateEvidenceBundle>,
): string[] {
  const preIdentities = provenance.approvedPre.entries.map((entry) => entry.fingerprint);
  assertBootstrap(
    identitySetDigest(preIdentities) === provenance.approvedPre.identitySetDigest,
    "bootstrap B_pre identity digest mismatch",
  );
  assertBootstrap(sameSet(pre.approved.identities, preIdentities), "bootstrap approved B_pre identities mismatch");
  return preIdentities;
}

function validateStrictSubset(
  provenance: BootstrapProvenance,
  preIdentities: readonly string[],
  currentIdentities: readonly string[],
): void {
  const preSet = new Set(preIdentities);
  const currentSet = new Set(currentIdentities);
  const removed = preIdentities.filter((identity) => !currentSet.has(identity)).sort();
  const added = currentIdentities.filter((identity) => !preSet.has(identity)).sort();
  const declaredRemoved = provenance.removed.map((entry) => entry.fingerprint).sort();
  const declaredIssues = [...new Set(provenance.removed.map((entry) => entry.issue))].sort();
  const invalidIssueBinding = provenance.removed.some((removedEntry) =>
    !provenance.approvedPre.entries.find((entry) =>
      entry.fingerprint === removedEntry.fingerprint && entry.issues.includes(removedEntry.issue)));

  assertBootstrap(currentIdentities.length < preIdentities.length, "bootstrap B0 is not smaller than B_pre");
  assertBootstrap(sameSet(removed, declaredRemoved), "bootstrap removed identities mismatch");
  assertBootstrap(added.length === 0, "bootstrap B0 adds identities outside B_pre");
  assertBootstrap(provenance.added.length === 0, "bootstrap provenance declares added identities");
  assertBootstrap(sameSet(declaredIssues, ["#1874", "#1878"]), "bootstrap removed issues must be exactly #1874 and #1878");
  assertBootstrap(!invalidIssueBinding, "bootstrap removed issue binding mismatch");
}

function validatePreviousBindings(
  currentBaseline: BaselineDoc,
  currentExemptions: ExemptionDoc,
  provenance: BootstrapProvenance,
  postApprovalBytes: string,
): void {
  assertBootstrap(
    currentBaseline.generatedFrom.previousDigest === provenance.approvedPre.identitySetDigest,
    "bootstrap baseline previousDigest mismatch",
  );
  assertBootstrap(
    currentExemptions.previousDigest === provenance.initialExemptions.identitySetDigest,
    "bootstrap exemptions previousDigest mismatch",
  );
  assertBootstrap(
    currentBaseline.generatedFrom.approvalDigest === approvalDigest(parseApproval(postApprovalBytes)),
    "bootstrap approval binding mismatch",
  );
}

function validateBootstrap(
  repoRoot: string,
  trustedSha: string,
  currentBaseline: BaselineDoc,
  currentExemptions: ExemptionDoc,
): TrustedPreviousLedgers {
  const provenance = readBootstrapProvenance(repoRoot);
  assertBootstrap(
    provenance.bootstrapBaseRevision === provenance.preRevision,
    "bootstrap base revision does not match the approved pre revision",
  );
  assertBootstrap(
    gitObjectExists(repoRoot, `${provenance.preRevision}^{commit}`)
      && isAncestor(repoRoot, provenance.preRevision, trustedSha),
    "bootstrap pre revision is not an ancestor of the trusted base",
  );
  const pre = validateEvidenceBundle(repoRoot, provenance.pre, provenance.preRevision, provenance, "bootstrap.pre");
  const post = validateEvidenceBundle(repoRoot, provenance.post, provenance.postRevision, provenance, "bootstrap.post");
  const currentIdentities = currentBaseline.entries.map((entry) => entry.fingerprint);
  const preIdentities = validateApprovedPreBindings(provenance, pre);
  validateCurrentArtifactBindings(repoRoot, provenance, currentBaseline, currentExemptions, post);
  validateStrictSubset(provenance, preIdentities, currentIdentities);
  validatePreviousBindings(currentBaseline, currentExemptions, provenance, post.approvalBytes);
  validateHumanReview(readArtifact(repoRoot, provenance.humanReview, "bootstrap.humanReview"), provenance);
  return {
    baseline: {
      schemaVersion: 1,
      direction: "shrink-only",
      generatedFrom: {
        revision: provenance.preRevision,
        censusDigest: provenance.approvedPre.identitySetDigest,
        approvalDigest: approvalDigest(parseApproval(pre.approvalBytes)),
      },
      entries: provenance.approvedPre.entries,
    },
    exemptions: {
      schemaVersion: 1,
      previousDigest: provenance.initialExemptions.identitySetDigest,
      entries: provenance.initialExemptions.entries,
    },
    source: "bootstrap",
  };
}

function gitObjectExists(repoRoot: string, object: string): boolean {
  return spawnSync("git", ["cat-file", "-e", object], { cwd: repoRoot, encoding: "utf8" }).status === 0;
}

function isAncestor(repoRoot: string, ancestor: string, descendant: string): boolean {
  const result = spawnSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  throw new InfraFailure(
    "BASELINE_INVALID",
    `bootstrap base lineage could not be verified: ${result.stderr.trim() || `${ancestor}..${descendant}`}`,
  );
}

function showGitObject(repoRoot: string, object: string, label: string): string {
  const shown = spawnSync("git", ["show", object], { cwd: repoRoot, encoding: "utf8" });
  if (shown.status !== 0) {
    throw new InfraFailure("BASELINE_INVALID", `${label} is unavailable: ${shown.stderr.trim() || object}`);
  }
  return shown.stdout;
}

export function loadTrustedPreviousLedgers(
  repoRoot: string,
  trustedSha: string,
  currentBaseline: BaselineDoc,
  currentExemptions: ExemptionDoc,
): TrustedPreviousLedgers {
  if (!FULL_SHA.test(trustedSha) || !gitObjectExists(repoRoot, `${trustedSha}^{commit}`)) {
    throw new InfraFailure("BASELINE_INVALID", `trusted base is not a resolvable full commit: ${trustedSha}`);
  }
  if (!gitObjectExists(repoRoot, `${trustedSha}:${BASELINE_PATH}`)) {
    return validateBootstrap(repoRoot, trustedSha, currentBaseline, currentExemptions);
  }
  const baselineBytes = showGitObject(repoRoot, `${trustedSha}:${BASELINE_PATH}`, "trusted previous baseline");
  const exemptionBytes = showGitObject(repoRoot, `${trustedSha}:${EXEMPTIONS_PATH}`, "trusted previous exemptions");
  assertBootstrap(
    currentBaseline.generatedFrom.previousDigest === digest(baselineBytes),
    "current baseline previousDigest does not bind the trusted base bytes",
  );
  assertBootstrap(
    currentExemptions.previousDigest === digest(exemptionBytes),
    "current exemptions previousDigest does not bind the trusted base bytes",
  );
  const baseline = parseBaseline(baselineBytes, `baseline at ${trustedSha}`);
  const exemptions = parseExemptions(exemptionBytes);
  return { baseline, exemptions, source: "git" };
}
