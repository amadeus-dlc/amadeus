import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

export const SELF_SCOPES = new Set(["self-document", "self-feature", "self-fix", "self-refactor"]);
export const ATTESTATION_EVENT = "ARTIFACT_ATTESTED";
export const ATTESTATION_HEADING = "## CLI Attestation";

export interface ReportAttestation {
  readonly id: string;
  readonly intent: string;
  readonly intentUuid: string;
  readonly record: string;
  readonly bolt: string;
  readonly unit: string;
  readonly repo: string;
  readonly pr: number;
  readonly localHead: string;
  readonly remoteHead: string;
  readonly prHead: string;
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
    `- repository: ${value.repo}`,
    `- pr: ${value.pr}`,
    `- local head: ${value.localHead}`,
    `- remote head: ${value.remoteHead}`,
    `- pr head: ${value.prHead}`,
    `- content digest: ${value.contentDigest}`,
    "",
  ].join("\n");
}

function field(body: string, label: string): string | null {
  return body.match(new RegExp(`^- ${label}:[ \\t]*(.*)$`, "m"))?.[1]?.trim() ?? null;
}

export function parseAttestation(body: string): ReportAttestation | null {
  const start = body.indexOf(ATTESTATION_HEADING);
  if (start === -1) return null;
  const section = body.slice(start);
  const pr = Number(field(section, "pr"));
  const values = {
    id: field(section, "attestation id"), intent: field(section, "intent"),
    intentUuid: field(section, "intent uuid"), record: field(section, "record"),
    bolt: field(section, "bolt"), unit: field(section, "unit"),
    repo: field(section, "repository"), localHead: field(section, "local head"),
    remoteHead: field(section, "remote head"), prHead: field(section, "pr head"),
    contentDigest: field(section, "content digest"),
  };
  if (!Number.isInteger(pr) || pr <= 0 || Object.values(values).some((value) => value === null || value === "")) return null;
  return { ...(values as Omit<ReportAttestation, "pr">), pr };
}

export function reportPayload(body: string): string {
  const start = body.indexOf(ATTESTATION_HEADING);
  return start === -1 ? body : body.slice(0, start);
}

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
