import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { isAbsolute, normalize, resolve } from "node:path";
import {
  assertEventCustody,
  baselineDocFromFold,
  exemptionsDocFromFold,
  foldEvents,
  loadEvents,
  type FoldedLedger,
  type LoadedEvents,
} from "./events.ts";
import {
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
  readonly removed: readonly {
    readonly fingerprint: string;
    readonly issue: "#1874" | "#1878" | "#1979";
  }[];
  readonly added: readonly string[];
};

export type TrustedPreviousLedgers = {
  readonly baseline: BaselineDoc;
  readonly exemptions: ExemptionDoc;
  readonly source: "events";
  readonly folded: FoldedLedger;
  readonly events: LoadedEvents;
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
    if (issue !== "#1874" && issue !== "#1878" && issue !== "#1979") {
      throw new InfraFailure("BASELINE_INVALID", `bootstrap.removed[${index}].issue is not approved`);
    }
    return {
      fingerprint: nonEmptyString(entry.fingerprint, `bootstrap.removed[${index}].fingerprint`),
      issue: issue as "#1874" | "#1878" | "#1979",
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
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return rightSet.size === right.length && left.every((identity) => rightSet.has(identity));
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

export function readBootstrapProvenance(repoRoot: string): BootstrapProvenance {
  try {
    return parseProvenance(repoRoot, readFileSync(CANONICAL_PATHS.bootstrap(repoRoot), "utf8"));
  } catch (error) {
    if (error instanceof InfraFailure) throw error;
    throw new InfraFailure("BASELINE_MISSING", `bootstrap provenance is missing: ${String(error)}`);
  }
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

/**
 * Bootstrap path after the event-ledger migration (#2338):
 * previousDigest byte-binding is gone. We still verify the historical bootstrap
 * evidence bundle and that the folded grandfather set is a declared subset of
 * approved B_pre (the original shrink that introduced the gate). Chain-of-custody
 * for subsequent commits is the event-file subset check in assertEventCustody.
 */
function validateBootstrapHistory(
  repoRoot: string,
  trustedSha: string,
  folded: FoldedLedger,
): void {
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
  const preIdentities = validateApprovedPreBindings(provenance, pre);
  const currentIdentities = folded.grandfather.map((entry) => entry.fingerprint);
  const preSet = new Set(preIdentities);
  const currentSet = new Set(currentIdentities);
  // An identity that became an exemption is still granted, so it is not a removal.
  const grantedSet = new Set([...currentIdentities, ...folded.exemptions.map((entry) => entry.fingerprint)]);
  const removed = preIdentities.filter((identity) => !grantedSet.has(identity)).sort();
  const added = currentIdentities.filter((identity) => !preSet.has(identity));
  const declaredRemoved = provenance.removed.map((entry) => entry.fingerprint).sort();
  const declaredRemovedSet = new Set(declaredRemoved);
  // Every removal against B_pre must be accounted for: either declared by the
  // bootstrap provenance, or bound to a revoke event in the ledger.
  assertBootstrap(
    declaredRemoved.every((fingerprint) => removed.includes(fingerprint)),
    "bootstrap removed identities mismatch",
  );
  const unaccountedRemovals = removed.filter(
    (fingerprint) => !declaredRemovedSet.has(fingerprint) && !folded.revoked.has(fingerprint),
  );
  assertBootstrap(
    unaccountedRemovals.length === 0,
    `bootstrap removals are neither declared nor revoked: ${unaccountedRemovals.join(", ")}`,
  );
  // Post-migration grants may grow with issue-tracked entries; bootstrap's historical
  // "no adds vs B_pre" applies only to identities that were part of the original B0.
  // We still require the folded set's digest binding to post identities when the
  // folded set equals the original candidate B0; otherwise skip that equality.
  if (identitySetDigest(currentIdentities) === provenance.candidateB0.identitySetDigest) {
    assertBootstrap(sameSet(post.approved.identities, currentIdentities), "bootstrap post identities mismatch");
    assertBootstrap(added.length === 0, "bootstrap B0 adds identities outside B_pre");
  }
  assertBootstrap(
    identitySetDigest(folded.exemptions.map((entry) => entry.fingerprint))
      === provenance.initialExemptions.identitySetDigest
      || folded.exemptions.length === 0,
    "bootstrap initial exemption identity digest mismatch",
  );
  validateHumanReview(readArtifact(repoRoot, provenance.humanReview, "bootstrap.humanReview"), provenance);
  parseApproval(post.approvalBytes);
}

function gitObjectExists(repoRoot: string, object: string): boolean {
  return spawnSync("git", ["cat-file", "-e", object], { cwd: repoRoot, encoding: "utf8" }).status === 0;
}

export function isAncestor(repoRoot: string, ancestor: string, descendant: string): boolean {
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

/**
 * Event-ledger custody compares event sets only, so an identical or unrelated
 * trusted base would hide deletions. Require strict ancestry of HEAD: reachable
 * from HEAD, and not reachable back (which rules out HEAD itself).
 */
function assertStrictAncestorOfHead(repoRoot: string, trustedSha: string): void {
  if (!isAncestor(repoRoot, trustedSha, "HEAD") || isAncestor(repoRoot, "HEAD", trustedSha)) {
    throw new InfraFailure(
      "BASELINE_INVALID",
      `trusted base is not a strict ancestor of HEAD: ${trustedSha}`,
    );
  }
}

/**
 * Load the head event ledger, fold it, and enforce event-file custody against the
 * trusted base. Replaces previousDigest byte-binding (#2338).
 */
export function loadTrustedPreviousLedgers(
  repoRoot: string,
  trustedSha: string,
): TrustedPreviousLedgers {
  if (!FULL_SHA.test(trustedSha) || !gitObjectExists(repoRoot, `${trustedSha}^{commit}`)) {
    throw new InfraFailure("BASELINE_INVALID", `trusted base is not a resolvable full commit: ${trustedSha}`);
  }
  const events = loadEvents(repoRoot);
  const folded = foldEvents(events.byUlid.values());
  assertEventCustody(repoRoot, trustedSha, events, folded);

  // Historical bootstrap evidence remains informative when the trusted base has
  // no event directory yet (first adoption / pre-migration parent).
  if (gitObjectExists(repoRoot, `${trustedSha}:${CANONICAL_PATHS.eventsRel}`)) {
    assertStrictAncestorOfHead(repoRoot, trustedSha);
  } else {
    validateBootstrapHistory(repoRoot, trustedSha, folded);
  }

  return {
    baseline: baselineDocFromFold(folded, trustedSha, folded.effectiveDigest),
    exemptions: exemptionsDocFromFold(folded),
    source: "events",
    folded,
    events,
  };
}
