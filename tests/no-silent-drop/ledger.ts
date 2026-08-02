import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  type ApprovalDoc,
  type BaselineDoc,
  type BaselineEntry,
  digest,
  type ExemptionDoc,
  type Finding,
  InfraFailure,
  RULE_IDS,
} from "./model.ts";

const FULL_SHA = /^[0-9a-f]{40}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseJson(text: string, label: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new InfraFailure("BASELINE_INVALID", `${label} is not valid JSON: ${String(error)}`);
  }
}

function parseBaselineEntry(raw: unknown, index: number, label: string): BaselineEntry {
  if (!isRecord(raw)
    || typeof raw.fingerprint !== "string"
    || !RULE_IDS.includes(raw.ruleId as (typeof RULE_IDS)[number])
    || typeof raw.file !== "string"
    || raw.file.startsWith("/")
    || raw.file.includes("..")
    || typeof raw.reason !== "string"
    || raw.reason.trim() === ""
    || !Array.isArray(raw.issues)
    || !raw.issues.every((issue) => typeof issue === "string")) {
    throw new InfraFailure("BASELINE_INVALID", `${label}.entries[${index}] is invalid`);
  }
  return raw as BaselineEntry;
}

export function parseBaseline(text: string, label = "baseline"): BaselineDoc {
  const value = parseJson(text, label);
  if (!isRecord(value) || value.schemaVersion !== 1 || value.direction !== "shrink-only") {
    throw new InfraFailure("BASELINE_INVALID", `${label} must use schemaVersion 1 and direction shrink-only`);
  }
  if (!isRecord(value.generatedFrom) || !Array.isArray(value.entries)) {
    throw new InfraFailure("BASELINE_INVALID", `${label} generatedFrom/entries are invalid`);
  }
  const generatedFrom = value.generatedFrom;
  for (const field of ["revision", "censusDigest", "approvalDigest"] as const) {
    if (typeof generatedFrom[field] !== "string") {
      throw new InfraFailure("BASELINE_INVALID", `${label}.generatedFrom.${field} must be a string`);
    }
  }
  const entries: BaselineEntry[] = [];
  const fingerprints = new Set<string>();
  for (const [index, raw] of value.entries.entries()) {
    const entry = parseBaselineEntry(raw, index, label);
    if (fingerprints.has(entry.fingerprint)) {
      throw new InfraFailure("BASELINE_INVALID", `${label} contains duplicate fingerprint ${entry.fingerprint}`);
    }
    fingerprints.add(entry.fingerprint);
    entries.push(entry);
  }
  return {
    schemaVersion: 1,
    direction: "shrink-only",
    generatedFrom: {
      revision: generatedFrom.revision as string,
      censusDigest: generatedFrom.censusDigest as string,
      approvalDigest: generatedFrom.approvalDigest as string,
    },
    entries,
  };
}

export function parseExemptions(text: string): ExemptionDoc {
  const value = parseJson(text, "exemptions");
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.entries)) {
    throw new InfraFailure("BASELINE_INVALID", "exemptions must use schemaVersion 1 with an entries array");
  }
  const fingerprints = new Set<string>();
  const entries = value.entries.map((raw, index) => {
    if (!isRecord(raw)
      || typeof raw.fingerprint !== "string"
      || typeof raw.reason !== "string"
      || raw.reason.trim() === "") {
      throw new InfraFailure("BASELINE_INVALID", `exemptions.entries[${index}] is invalid`);
    }
    if (fingerprints.has(raw.fingerprint)) {
      throw new InfraFailure("BASELINE_INVALID", `exemptions contains duplicate fingerprint ${raw.fingerprint}`);
    }
    fingerprints.add(raw.fingerprint);
    return { fingerprint: raw.fingerprint, reason: raw.reason };
  });
  return { schemaVersion: 1, entries };
}

export function parseApproval(text: string): ApprovalDoc {
  const value = parseJson(text, "approval");
  if (!isRecord(value) || value.schemaVersion !== 1 || typeof value.censusDigest !== "string" || !Array.isArray(value.entries)) {
    throw new InfraFailure("BASELINE_INVALID", "approval must use schemaVersion 1 with censusDigest and entries");
  }
  const entries = value.entries.map((raw, index) => {
    if (!isRecord(raw)
      || typeof raw.fingerprint !== "string"
      || (raw.classification !== "TP" && raw.classification !== "FP")
      || typeof raw.reason !== "string"
      || raw.reason.trim() === ""
      || !Array.isArray(raw.issues)
      || !raw.issues.every((issue) => typeof issue === "string")) {
      throw new InfraFailure("BASELINE_INVALID", `approval.entries[${index}] is invalid`);
    }
    return {
      fingerprint: raw.fingerprint,
      classification: raw.classification as "TP" | "FP",
      reason: raw.reason,
      issues: raw.issues as string[],
    };
  });
  return { schemaVersion: 1, censusDigest: value.censusDigest, entries };
}

export function readBaseline(path: string, required: boolean): BaselineDoc | null {
  try {
    return parseBaseline(readFileSync(path, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      if (!required) return null;
      throw new InfraFailure("BASELINE_MISSING", `baseline is missing: ${path}`);
    }
    throw error;
  }
}

export function readExemptions(path: string): ExemptionDoc {
  try {
    return parseExemptions(readFileSync(path, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new InfraFailure("BASELINE_MISSING", `exemptions are missing: ${path}`);
    }
    throw error;
  }
}

export function filterExemptions(findings: readonly Finding[], exemptions: ExemptionDoc): Finding[] {
  const exempt = new Set(exemptions.entries.map((entry) => entry.fingerprint));
  return findings.filter((finding) => !exempt.has(finding.fingerprint));
}

export function addedFindings(findings: readonly Finding[], baseline: BaselineDoc): Finding[] {
  const allowed = new Set(baseline.entries.map((entry) => entry.fingerprint));
  return findings.filter((finding) => !allowed.has(finding.fingerprint));
}

export function assertShrinkOnly(current: BaselineDoc, base: BaselineDoc): void {
  const allowed = new Set(base.entries.map((entry) => entry.fingerprint));
  const added = current.entries.filter((entry) => !allowed.has(entry.fingerprint));
  if (added.length > 0) {
    throw new InfraFailure(
      "BASELINE_INVALID",
      `baseline ratchet rejects ${added.length} addition/replacement(s): ${added.map((entry) => entry.fingerprint).join(", ")}`,
    );
  }
}

export function trustedBaseSha(): string | null {
  const source = process.env.AMADEUS_NSD_TRUSTED_BASE_SHA
    ?? process.env.GITHUB_BASE_SHA
    ?? process.env.GITHUB_EVENT_BEFORE;
  if (source === undefined || source === "") return null;
  if (!FULL_SHA.test(source)) {
    throw new InfraFailure("BASELINE_INVALID", `trusted base must be an event-specific full SHA, got ${source}`);
  }
  return source;
}

export function baselineAtRevision(repoRoot: string, sha: string): BaselineDoc {
  const object = `${sha}:tests/no-silent-drop/baseline.json`;
  const shown = spawnSync("git", ["show", object], { cwd: repoRoot, encoding: "utf8" });
  if (shown.status !== 0) {
    throw new InfraFailure(
      "BASELINE_INVALID",
      `trusted base does not contain an unambiguous baseline: ${shown.stderr.trim() || object}`,
    );
  }
  return parseBaseline(shown.stdout, `baseline at ${sha}`);
}

export function approvalDigest(approval: ApprovalDoc): string {
  return digest(JSON.stringify({
    schemaVersion: approval.schemaVersion,
    censusDigest: approval.censusDigest,
    entries: [...approval.entries].sort((a, b) => a.fingerprint.localeCompare(b.fingerprint)),
  }));
}

export function validateApproval(approval: ApprovalDoc, findings: readonly Finding[], censusDigest: string): void {
  if (approval.censusDigest !== censusDigest) {
    throw new InfraFailure("BASELINE_INVALID", "approval censusDigest does not match the validated snapshot");
  }
  const expected = new Set(findings.map((finding) => finding.fingerprint));
  const received = new Set<string>();
  for (const entry of approval.entries) {
    if (received.has(entry.fingerprint) || !expected.has(entry.fingerprint)) {
      throw new InfraFailure("BASELINE_INVALID", `approval contains duplicate or unknown finding ${entry.fingerprint}`);
    }
    received.add(entry.fingerprint);
    if (entry.classification === "FP") {
      throw new InfraFailure("BASELINE_INVALID", `unapproved FP cannot enter the baseline: ${entry.fingerprint}`);
    }
  }
  const missing = [...expected].filter((fingerprint) => !received.has(fingerprint));
  if (missing.length > 0) {
    throw new InfraFailure("BASELINE_INVALID", `approval is missing ${missing.length} finding classification(s)`);
  }
}

export function buildCandidate(
  revision: string,
  censusDigest: string,
  approval: ApprovalDoc,
  findings: readonly Finding[],
): BaselineDoc {
  const findingByFingerprint = new Map(findings.map((finding) => [finding.fingerprint, finding]));
  return {
    schemaVersion: 1,
    direction: "shrink-only",
    generatedFrom: { revision, censusDigest, approvalDigest: approvalDigest(approval) },
    entries: approval.entries.map((entry) => {
      const finding = findingByFingerprint.get(entry.fingerprint) as Finding;
      return {
        fingerprint: entry.fingerprint,
        ruleId: finding.ruleId,
        file: finding.file,
        reason: entry.reason,
        issues: entry.issues,
      };
    }).sort((a, b) => a.fingerprint.localeCompare(b.fingerprint)),
  };
}

export const CANONICAL_PATHS = {
  baseline: (root: string) => join(root, "tests", "no-silent-drop", "baseline.json"),
  exemptions: (root: string) => join(root, "tests", "no-silent-drop", "exemptions.json"),
  approval: (root: string) => join(root, "tests", "no-silent-drop", "approval.json"),
} as const;
