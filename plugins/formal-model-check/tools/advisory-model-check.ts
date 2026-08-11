import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import {
  docsRoot,
  isPlainObject,
} from "../../../packages/framework/core/tools/amadeus-lib.ts";

export type AdvisoryIdentity = {
  target: string;
  specIdentity: string;
  advisoryInstance: string;
};

export type PendingAdvisory = { identity: AdvisoryIdentity };

export type AdvisoryModelCheckVerdict =
  | { kind: "not-run"; reason: string }
  | { kind: "verified-not-detected"; runId: string }
  | { kind: "detected"; runId: string; counterexampleIdentity: string }
  | { kind: "harness-error"; runId: string; code: string; detail: string }
  | { kind: "invalid"; reason: string };

const OUTPUT_DIR = ".amadeus-advisory-check";

export function advisoryModelCheckOutputDir(
  projectDir: string,
  advisoryInstance: string,
  attempt = 1,
): string {
  const safeInstance = advisoryInstance.replace(/[^A-Za-z0-9._-]+/g, "-");
  const suffix = attempt <= 1 ? "" : `-retry-${attempt}`;
  return join(docsRoot(projectDir), OUTPUT_DIR, `${safeInstance}${suffix}`);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value === value.trim();
}

function digestFile(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function safeProjectFile(projectDir: string, candidate: unknown): string | null {
  if (!nonEmptyString(candidate) || isAbsolute(candidate) || candidate.includes("\\")) return null;
  const path = resolve(projectDir, candidate);
  const rel = relative(resolve(projectDir), path);
  if (rel === "" || rel === ".." || rel.startsWith("../")) return null;
  try {
    const stat = lstatSync(path);
    return stat.isFile() && !stat.isSymbolicLink() ? path : null;
  } catch {
    return null;
  }
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function artifactDirectory(projectDir: string, pending: PendingAdvisory, attempt: number): string | null {
  const requested = advisoryModelCheckOutputDir(projectDir, pending.identity.advisoryInstance, attempt);
  if (existsSync(join(requested, "manifest.json"))) return requested;
  const parent = join(docsRoot(projectDir), OUTPUT_DIR);
  if (!existsSync(parent)) return null;
  const prefix = `${pending.identity.advisoryInstance}.failure-`;
  const failures = readdirSync(parent)
    .filter((name) => name.startsWith(prefix) && existsSync(join(parent, name, "manifest.json")))
    .sort();
  return failures.length === 0 ? null : join(parent, failures.at(-1)!);
}

function invalid(reason: string): AdvisoryModelCheckVerdict {
  return { kind: "invalid", reason };
}

function envelopeProblem(manifest: Record<string, unknown>, pending: PendingAdvisory): string | null {
  if (manifest.schema !== "amadeus.model-check-manifest.v1") return "manifest schema is invalid";
  if (!nonEmptyString(manifest.runId)) return "manifest has no run ID";
  if (manifest.partial !== (manifest.outcome === "HARNESS_ERROR")) {
    return "manifest partial flag does not match its outcome";
  }
  const correlation = manifest.advisory;
  if (!isPlainObject(correlation)) return "manifest advisory correlation does not match the pending instance";
  if (
    correlation.target !== pending.identity.target
    || correlation.specIdentity !== pending.identity.specIdentity
    || correlation.instance !== pending.identity.advisoryInstance
  ) return "manifest advisory correlation does not match the pending instance";
  return null;
}

function provenanceProblem(
  projectDir: string,
  pending: PendingAdvisory,
  manifest: Record<string, unknown>,
): string | null {
  const provenance = manifest.sourceProvenance;
  if (!isPlainObject(provenance)) return "source provenance is missing";
  const modelPath = safeProjectFile(projectDir, provenance.modelPath);
  const cfgPath = safeProjectFile(projectDir, provenance.cfgPath);
  if (modelPath === null || cfgPath === null) return "source provenance does not match current model/config bytes";
  if (
    !String(provenance.modelPath).startsWith(`${pending.identity.target}/`)
    || !String(provenance.cfgPath).startsWith(`${pending.identity.target}/`)
    || !nonEmptyString(provenance.moduleIdentity)
    || !nonEmptyString(provenance.cfgIdentity)
    || provenance.moduleSha256 !== digestFile(modelPath)
    || provenance.cfgSha256 !== digestFile(cfgPath)
  ) return "source provenance does not match current model/config bytes";
  return null;
}

function inventoryProblem(directory: string, manifest: Record<string, unknown>): string | null {
  if (!Array.isArray(manifest.expectedArtifacts) || !Array.isArray(manifest.artifacts)) {
    return "artifact inventory is missing";
  }
  for (const name of manifest.expectedArtifacts) {
    if (!nonEmptyString(name) || name.includes("/") || name.includes("\\")) return "artifact path is unsafe";
    const recorded = manifest.artifacts.find((item) => isPlainObject(item) && item.path === name);
    const path = join(directory, name);
    if (!isPlainObject(recorded) || !existsSync(path)) return `artifact evidence is invalid: ${name}`;
    if (recorded.bytes !== readFileSync(path).byteLength || recorded.sha256 !== digestFile(path)) {
      return `artifact evidence is invalid: ${name}`;
    }
  }
  return null;
}

function verifyNotDetected(directory: string, manifest: Record<string, unknown>): AdvisoryModelCheckVerdict {
  if (manifest.exitCode !== 0 || !(manifest.expectedArtifacts as unknown[]).includes("completion-marker.json")) {
    return invalid("NOT_DETECTED manifest is incomplete");
  }
  const marker = readJson(join(directory, "completion-marker.json"));
  const receipt = readJson(join(directory, "env-receipt.json"));
  if (!isPlainObject(marker) || marker.complete !== true || marker.runId !== manifest.runId) {
    return invalid("completion marker is invalid");
  }
  if (
    !isPlainObject(receipt)
    || receipt.schema !== "amadeus.env-receipt.v1"
    || receipt.runId !== manifest.runId
    || !Array.isArray(receipt.inspections)
    || receipt.inspections.some((item) =>
      !isPlainObject(item) || (item.status !== "passed" && item.status !== "not-applicable")
    )
  ) return invalid("environment provenance is invalid");
  return { kind: "verified-not-detected", runId: manifest.runId as string };
}

function verifyDetected(directory: string, manifest: Record<string, unknown>): AdvisoryModelCheckVerdict {
  if (manifest.exitCode !== 1 || !(manifest.expectedArtifacts as unknown[]).includes("counterexample.json")) {
    return invalid("DETECTED manifest has no counterexample evidence");
  }
  const counterexample = readJson(join(directory, "counterexample.json"));
  if (
    !isPlainObject(counterexample)
    || counterexample.runId !== manifest.runId
    || !nonEmptyString(counterexample.counterexampleIdentity)
  ) return invalid("counterexample evidence is invalid");
  return {
    kind: "detected",
    runId: manifest.runId as string,
    counterexampleIdentity: counterexample.counterexampleIdentity,
  };
}

function verifyHarnessError(manifest: Record<string, unknown>): AdvisoryModelCheckVerdict {
  if (manifest.exitCode !== 2 || !nonEmptyString(manifest.errorCode)) return invalid("HARNESS_ERROR evidence is invalid");
  if (typeof manifest.errorDetail !== "string") return invalid("HARNESS_ERROR evidence is invalid");
  return {
    kind: "harness-error",
    runId: manifest.runId as string,
    code: manifest.errorCode,
    detail: manifest.errorDetail,
  };
}

export function verifyAdvisoryModelCheckOutcome(
  projectDir: string,
  pending: PendingAdvisory,
  attempt = 1,
): AdvisoryModelCheckVerdict {
  const directory = artifactDirectory(projectDir, pending, attempt);
  if (directory === null) return { kind: "not-run", reason: "formal model check artifacts are missing" };
  try {
    const manifest = readJson(join(directory, "manifest.json"));
    if (!isPlainObject(manifest)) return invalid("manifest schema is invalid");
    const problem = envelopeProblem(manifest, pending)
      ?? provenanceProblem(projectDir, pending, manifest)
      ?? inventoryProblem(directory, manifest);
    if (problem !== null) return invalid(problem);
    if (manifest.outcome === "NOT_DETECTED") return verifyNotDetected(directory, manifest);
    if (manifest.outcome === "DETECTED") return verifyDetected(directory, manifest);
    if (manifest.outcome === "HARNESS_ERROR") return verifyHarnessError(manifest);
    return invalid("manifest outcome is invalid");
  } catch (error) {
    return invalid(`model check evidence is unreadable: ${String(error)}`);
  }
}
