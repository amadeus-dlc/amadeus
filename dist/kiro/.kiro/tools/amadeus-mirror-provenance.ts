// amadeus-mirror-provenance.ts — S5 Marker Codec + S6 Provenance Verifier (C4).
//
// Pure module: renders/parses the one-line Issue marker, verifies ownership
// (repository + marker identity + issue number all match), and classifies
// re-discovery candidates with the fail-closed decision table. Imports C0 types
// only; no filesystem, process, or GitHub. It never interprets human Issue body
// text beyond the exact machine marker, and never rounds 0/1/many candidates.

import type {
  CandidateOutcome,
  MarkerOutcome,
  MirrorCreateIdentity,
  MirrorProvenance,
  OwnershipOutcome,
  RemoteMirrorIssue,
  RepositoryIdentity,
} from "./amadeus-mirror-types.ts";

const MARKER_PREFIX = "<!-- amadeus-intent-mirror:v1 ";
const MARKER_SUFFIX = " -->";
// Global matcher for the exact envelope; the payload is base64url (no padding).
const MARKER_RE = /<!-- amadeus-intent-mirror:v1 ([A-Za-z0-9_-]+) -->/g;

export const MARKER_MAX_PAYLOAD_BYTES = 256 * 1024;

// Canonical payload order: schema, intentUuid, intentDir,
// repository.owner, repository.name, repository.canonical, operationId,
// preparedAt (business-logic-model.md Marker Codec).
function canonicalMarkerPayload(identity: MirrorCreateIdentity): string {
  return JSON.stringify({
    schema: identity.schema,
    intentUuid: identity.intentUuid,
    intentDir: identity.intentDir,
    repository: {
      owner: identity.repository.owner,
      name: identity.repository.name,
      canonical: identity.repository.canonical,
    },
    operationId: identity.operationId,
    preparedAt: identity.preparedAt,
  });
}

// Render the marker from a PERSISTED create identity only. The caller is
// responsible for only passing an identity returned from a successful prepare
// write; this function does not itself distinguish a candidate object.
export function renderMirrorMarker(identity: MirrorCreateIdentity): string {
  const payload = Buffer.from(canonicalMarkerPayload(identity), "utf-8").toString(
    "base64url",
  );
  return `${MARKER_PREFIX}${payload}${MARKER_SUFFIX}`;
}

function decodeMarkerIdentity(
  payloadB64: string,
): { ok: true; identity: MirrorCreateIdentity } | { ok: false; issue: string } {
  if (Buffer.byteLength(payloadB64, "utf-8") > MARKER_MAX_PAYLOAD_BYTES)
    return { ok: false, issue: "marker payload exceeds size limit" };
  let jsonBytes: Buffer;
  try {
    jsonBytes = Buffer.from(payloadB64, "base64url");
  } catch {
    return { ok: false, issue: "marker payload not base64url" };
  }
  // Re-encode round-trip guards against non-canonical base64url spellings.
  if (jsonBytes.toString("base64url") !== payloadB64)
    return { ok: false, issue: "marker payload not canonical base64url" };
  let value: unknown;
  try {
    value = JSON.parse(jsonBytes.toString("utf-8"));
  } catch {
    return { ok: false, issue: "marker payload not JSON" };
  }
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return { ok: false, issue: "marker payload not an object" };
  const v = value as Record<string, unknown>;
  const repo = v.repository;
  if (v.schema !== 1) return { ok: false, issue: "marker schema not 1" };
  if (typeof v.intentUuid !== "string" || v.intentUuid.length === 0)
    return { ok: false, issue: "marker intentUuid invalid" };
  if (typeof v.intentDir !== "string" || v.intentDir.length === 0)
    return { ok: false, issue: "marker intentDir invalid" };
  if (typeof v.operationId !== "string" || v.operationId.length === 0)
    return { ok: false, issue: "marker operationId invalid" };
  if (typeof v.preparedAt !== "string" || v.preparedAt.length === 0)
    return { ok: false, issue: "marker preparedAt invalid" };
  if (typeof repo !== "object" || repo === null)
    return { ok: false, issue: "marker repository invalid" };
  const r = repo as Record<string, unknown>;
  if (
    typeof r.owner !== "string" ||
    typeof r.name !== "string" ||
    typeof r.canonical !== "string"
  )
    return { ok: false, issue: "marker repository fields invalid" };
  const canonicalExpected = `${r.owner.toLowerCase()}/${r.name.toLowerCase()}`;
  if (r.canonical !== canonicalExpected)
    return { ok: false, issue: "marker repository not canonical" };
  const identity: MirrorCreateIdentity = {
    schema: 1,
    intentUuid: v.intentUuid,
    intentDir: v.intentDir,
    repository: {
      owner: r.owner,
      name: r.name,
      canonical: r.canonical as `${string}/${string}`,
    },
    operationId: v.operationId,
    preparedAt: v.preparedAt,
  };
  // Canonicalisation guard: the payload must be byte-identical to the canonical
  // rendering of the parsed identity (rejects reordered / padded encodings).
  if (canonicalMarkerPayload(identity) !== jsonBytes.toString("utf-8"))
    return { ok: false, issue: "marker payload not canonical json" };
  return { ok: true, identity };
}

export function parseMirrorMarker(body: string): MarkerOutcome {
  MARKER_RE.lastIndex = 0;
  const matches: string[] = [];
  for (;;) {
    const m = MARKER_RE.exec(body);
    if (m === null) break;
    matches.push(m[1]);
  }
  if (matches.length === 0) return { kind: "missing" };
  if (matches.length > 1)
    return { kind: "invalid", issues: ["multiple mirror markers present"] };
  const decoded = decodeMarkerIdentity(matches[0]);
  if (!decoded.ok) return { kind: "invalid", issues: [decoded.issue] };
  return { kind: "parsed", identity: decoded.identity };
}

function createIdentityEquals(
  a: MirrorCreateIdentity,
  b: MirrorCreateIdentity,
): boolean {
  return (
    a.schema === b.schema &&
    a.intentUuid === b.intentUuid &&
    a.intentDir === b.intentDir &&
    a.repository.canonical === b.repository.canonical &&
    a.operationId === b.operationId &&
    a.preparedAt === b.preparedAt
  );
}

// Ordered ownership verification (business-logic-model.md Ownership section).
export function verifyOwnership(input: {
  remoteIssue: RemoteMirrorIssue;
  localProvenance: MirrorProvenance;
}): OwnershipOutcome {
  const { remoteIssue, localProvenance } = input;
  if (
    remoteIssue.repository.canonical !==
    localProvenance.createIdentity.repository.canonical
  ) {
    return {
      kind: "wrong-repository",
      summary: "remote repository does not match local provenance repository",
    };
  }
  const marker = parseMirrorMarker(remoteIssue.body);
  if (marker.kind === "missing")
    return { kind: "missing-marker", summary: "issue body has no mirror marker" };
  if (marker.kind === "invalid")
    return { kind: "mismatch", summary: "issue marker is invalid" };
  if (!createIdentityEquals(marker.identity, localProvenance.createIdentity))
    return { kind: "mismatch", summary: "marker identity does not match provenance" };
  if (remoteIssue.number !== localProvenance.issueNumber)
    return { kind: "mismatch", summary: "issue number does not match provenance" };
  return { kind: "verified", issue: remoteIssue };
}

export type CandidateLocalState =
  | "fresh-prepared"
  | "attempted-or-unknown"
  | "pending-no-effect"
  | "provenance-present";

export type CandidateClassifyInput = Readonly<{
  localState: CandidateLocalState;
  // ownership-verified candidates: the marker identity equals localCreateIdentity.
  verifiedCandidates: readonly RemoteMirrorIssue[];
  // number of candidates that carried a marker that did NOT match identity.
  mismatchCandidateCount: number;
  // create identity of the local receipt (needed to build adopt provenance).
  localCreateIdentity: MirrorCreateIdentity;
  // existing provenance for the convergence case.
  provenance?: MirrorProvenance;
  now: string; // for a freshly-built adopt provenance
}>;

function sortByIssueNumber(
  issues: readonly RemoteMirrorIssue[],
): RemoteMirrorIssue[] {
  return [...issues].sort((a, b) => a.number - b.number);
}

// Fail-closed candidate classification; independent of candidate array order.
export function classifyCandidates(input: CandidateClassifyInput): CandidateOutcome {
  const verified = sortByIssueNumber(input.verifiedCandidates);

  // 2+ verified candidates => ambiguous regardless of local state.
  if (verified.length >= 2) return { kind: "safety-blocked", reason: "ambiguous" };
  // A candidate whose marker identity mismatched => explicit mismatch block.
  if (input.mismatchCandidateCount > 0)
    return { kind: "safety-blocked", reason: "mismatch" };

  if (input.localState === "provenance-present") {
    if (verified.length === 1 && input.provenance)
      return { kind: "adopt", issue: verified[0], provenance: input.provenance };
    // marker lost / no verifiable candidate under an existing link => fail closed.
    return { kind: "safety-blocked", reason: "mismatch" };
  }

  if (verified.length === 1) {
    const provenance: MirrorProvenance = {
      schema: 1,
      createIdentity: input.localCreateIdentity,
      issueNumber: verified[0].number,
      createdAt: input.now,
    };
    return { kind: "adopt", issue: verified[0], provenance };
  }

  // verified.length === 0
  if (input.localState === "fresh-prepared" || input.localState === "pending-no-effect")
    return { kind: "create-new" };
  // attempted-or-unknown with 0 candidates => never auto-create a second issue.
  return { kind: "safety-blocked", reason: "zero-after-attempt" };
}

// Precondition guard (FR-3): the local receipt's create identity must match the
// current execution context on intent UUID, directory, and canonical repository
// BEFORE any candidate search or remote create.
export function createIdentityMatchesContext(
  identity: MirrorCreateIdentity,
  context: { intentUuid: string; intentDir: string; repository: RepositoryIdentity },
): boolean {
  return (
    identity.intentUuid === context.intentUuid &&
    identity.intentDir === context.intentDir &&
    identity.repository.canonical === context.repository.canonical
  );
}
