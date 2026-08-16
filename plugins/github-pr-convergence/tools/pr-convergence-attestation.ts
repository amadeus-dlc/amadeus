import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { canonicalUnitSlugs } from "./pr-convergence-presentation.ts";

export const SELF_SCOPES = new Set(["self-document", "self-feature", "self-fix", "self-refactor"]);
export const ATTESTATION_EVENT = "ARTIFACT_ATTESTED";
export const ATTESTATION_HEADING = "## CLI Attestation";
export const OWNER_PROJECTION_HEADING = "## Owner Projection";
export const REPORT_BASENAME = "pr-convergence-report.md";

/** Canonical owner report path shared by the writer and its sensor. */
export function reportPathFor(recordRoot: string, unit: string): string {
  return join(recordRoot, "construction", unit, "code-generation", REPORT_BASENAME);
}

export interface OwnerProjection {
  readonly intent: string;
  readonly intentUuid: string;
  readonly record: string;
  readonly bolt: string;
  readonly memberUnits: readonly string[];
  readonly ownerUnit: string;
  readonly reportPath: string;
  readonly repo: string;
  readonly pr: number;
  readonly head: string;
}

export interface ReportAttestation {
  readonly id: string;
  readonly intent: string;
  readonly intentUuid: string;
  readonly record: string;
  readonly bolt: string;
  readonly unit: string;
  readonly memberUnits?: readonly string[];
  readonly repo: string;
  readonly pr: number;
  readonly localHead: string;
  readonly remoteHead: string;
  readonly prHead: string;
  // The merge a `landed` record is bound to. Present on that kind alone: every
  // other kind is bound to a live checkout instead, and the two bindings are
  // kept disjoint so neither can stand in for the other.
  readonly mergeCommit?: string;
  readonly mergedAt?: string;
  readonly contentDigest: string;
}

export function readRecordScope(recordRoot: string): string | null {
  try {
    const body = readFileSync(join(recordRoot, "amadeus-state.md"), "utf-8");
    return body.match(/^- \*\*Scope\*\*:\s*(\S+)\s*$/m)?.[1] ?? null;
  } catch {
    return null;
  }
}

export function isSelfRecord(recordRoot: string): boolean {
  const scope = readRecordScope(recordRoot);
  return scope !== null && SELF_SCOPES.has(scope);
}

export function reportPayloadDigest(payload: string): string {
  return `sha256:${createHash("sha256").update(payload, "utf-8").digest("hex")}`;
}

export function attestationId(input: Omit<ReportAttestation, "id">): string {
  const canonical = JSON.stringify(input, Object.keys(input).sort());
  return `prca:${createHash("sha256").update(canonical, "utf-8").digest("hex")}`;
}

export function renderAttestation(value: ReportAttestation): string {
  return [
    ATTESTATION_HEADING,
    "",
    `- attestation id: ${value.id}`,
    `- intent: ${value.intent}`,
    `- intent uuid: ${value.intentUuid}`,
    `- record: ${value.record}`,
    `- bolt: ${value.bolt}`,
    `- unit: ${value.unit}`,
    ...(value.memberUnits === undefined ? [] : [`- member units: ${value.memberUnits.join(",")}`]),
    `- repository: ${value.repo}`,
    `- pr: ${value.pr}`,
    `- local head: ${value.localHead}`,
    `- remote head: ${value.remoteHead}`,
    `- pr head: ${value.prHead}`,
    ...(value.mergeCommit === undefined ? [] : [`- merge commit: ${value.mergeCommit}`]),
    ...(value.mergedAt === undefined ? [] : [`- merged at: ${value.mergedAt}`]),
    `- content digest: ${value.contentDigest}`,
    "",
  ].join("\n");
}

export function renderOwnerProjection(value: OwnerProjection): string {
  return [
    OWNER_PROJECTION_HEADING,
    "",
    `- intent: ${value.intent}`,
    `- intent uuid: ${value.intentUuid}`,
    `- record: ${value.record}`,
    `- bolt: ${value.bolt}`,
    `- member units: ${value.memberUnits.join(",")}`,
    `- owner unit: ${value.ownerUnit}`,
    `- report path: ${value.reportPath}`,
    `- repository: ${value.repo}`,
    `- pr: ${value.pr}`,
    `- head: ${value.head}`,
    "",
  ].join("\n");
}

type ProjectionLabel =
  | "attestation id"
  | "bolt"
  | "content digest"
  | "head"
  | "intent"
  | "intent uuid"
  | "local head"
  | "member units"
  | "merge commit"
  | "merged at"
  | "owner unit"
  | "pr"
  | "pr head"
  | "record"
  | "remote head"
  | "report path"
  | "repository"
  | "unit";

function field(body: string, label: ProjectionLabel): string | null {
  return body.match(new RegExp(`^- ${label}:[ \\t]*(.*)$`, "m"))?.[1]?.trim() ?? null;
}

export function parseOwnerProjection(body: string): OwnerProjection | null {
  const start = body.indexOf(OWNER_PROJECTION_HEADING);
  const end = body.indexOf(ATTESTATION_HEADING);
  if (start === -1 || end <= start) return null;
  const section = body.slice(start, end);
  const pr = Number(field(section, "pr"));
  const memberUnits = field(section, "member units");
  const values = {
    intent: field(section, "intent"), intentUuid: field(section, "intent uuid"),
    record: field(section, "record"), bolt: field(section, "bolt"),
    ownerUnit: field(section, "owner unit"), reportPath: field(section, "report path"),
    repo: field(section, "repository"), head: field(section, "head"),
  };
  if (
    !Number.isInteger(pr) || pr <= 0 || memberUnits === null ||
    Object.values(values).some((value) => value === null || value === "")
  ) return null;
  const members = canonicalUnitSlugs(memberUnits.split(","));
  if (!members.ok || members.value.join(",") !== memberUnits) return null;
  return {
    ...(values as Omit<OwnerProjection, "memberUnits" | "pr">),
    memberUnits: members.value,
    pr,
  };
}

/**
 * The merge a landed receipt binds, or the empty pair when it binds none. The
 * two fields travel together: half a merge fact names no merge, so a receipt
 * carrying one of them is malformed rather than partially bound (null).
 */
function mergeFields(section: string): Pick<ReportAttestation, "mergeCommit" | "mergedAt"> | null {
  const mergeCommit = field(section, "merge commit");
  const mergedAt = field(section, "merged at");
  if (mergeCommit === null && mergedAt === null) return {};
  if (mergeCommit === null || mergedAt === null || mergeCommit === "" || mergedAt === "") return null;
  return { mergeCommit, mergedAt };
}

export function parseAttestation(body: string): ReportAttestation | null {
  const start = body.indexOf(ATTESTATION_HEADING);
  if (start === -1) return null;
  const section = body.slice(start);
  const pr = Number(field(section, "pr"));
  const memberUnits = field(section, "member units");
  const values = {
    id: field(section, "attestation id"), intent: field(section, "intent"),
    intentUuid: field(section, "intent uuid"), record: field(section, "record"),
    bolt: field(section, "bolt"), unit: field(section, "unit"),
    repo: field(section, "repository"), localHead: field(section, "local head"),
    remoteHead: field(section, "remote head"), prHead: field(section, "pr head"),
    contentDigest: field(section, "content digest"),
  };
  if (!Number.isInteger(pr) || pr <= 0 || Object.values(values).some((value) => value === null || value === "")) return null;
  const parsedMembers = memberUnits === null ? null : canonicalUnitSlugs(memberUnits.split(","));
  if (parsedMembers !== null && (!parsedMembers.ok || parsedMembers.value.join(",") !== memberUnits)) return null;
  const merge = mergeFields(section);
  if (merge === null) return null;
  return {
    ...(values as Omit<ReportAttestation, "pr" | "memberUnits" | "mergeCommit" | "mergedAt">),
    ...(parsedMembers === null ? {} : { memberUnits: parsedMembers.value }),
    ...merge,
    pr,
  };
}

export function reportPayload(body: string): string {
  const start = body.indexOf(ATTESTATION_HEADING);
  return start === -1 ? body : body.slice(0, start);
}

/**
 * Threat model for the attestation check.
 *
 * The receipt id is an unkeyed digest over public identity fields, so it proves
 * derivation, not authorship. Pairing it with this audit-carriage check defends
 * against the failure this gate actually exists to stop: a convergence report
 * that no CLI run produced — hand-written, hand-edited, copied from another
 * unit, or left behind by a process mistake. Each of those leaves the shard
 * without a matching receipt.
 *
 * It does NOT defend against a deliberate adversary holding repository write
 * access: that adversary can append the matching ARTIFACT_ATTESTED line to the
 * audit shards themselves. Defending against them needs a signing key the
 * repository does not hold, and is outside this gate's trust boundary.
 */
export function auditCarriesAttestation(recordRoot: string, attestation: ReportAttestation): boolean {
  const auditDir = join(recordRoot, "audit");
  if (!existsSync(auditDir)) return false;
  for (const name of readdirSync(auditDir)) {
    if (!name.endsWith(".jsonl")) continue;
    for (const line of readFileSync(join(auditDir, name), "utf-8").split("\n")) {
      if (line.trim() === "") continue;
      try {
        const row = JSON.parse(line) as { event?: string; fields?: Record<string, string>; attributes?: Record<string, string> };
        const fields = row.attributes ?? row.fields ?? {};
        if ((row.event === ATTESTATION_EVENT || fields.Event === ATTESTATION_EVENT) && fields["Attestation Id"] === attestation.id) return true;
      } catch {
        // A torn audit tail cannot establish evidence.
      }
    }
  }
  return false;
}

export function recordRootForReport(reportPath: string): string | null {
  const stageDir = dirname(resolve(reportPath));
  const unitDir = dirname(stageDir);
  const constructionDir = dirname(unitDir);
  if (basename(stageDir) !== "code-generation" || basename(constructionDir) !== "construction") return null;
  return dirname(constructionDir);
}
