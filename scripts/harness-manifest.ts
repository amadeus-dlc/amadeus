// Runtime validation for authored harness manifests.
//
// TypeScript catches mistakes in repository builds, while this validator keeps
// dynamically loaded manifests fail-closed: unknown fields, unsafe paths, and
// case-folding collisions are rejected before the packager reads any resource.

import { posix, win32 } from "node:path";
import type {
  HarnessManifest,
  HarnessResource,
  NativeRuntimeContract,
  StageEntrySurface,
} from "./manifest-types.ts";

const MANIFEST_KEYS = new Set([
  "name",
  "mirrorSurface",
  "harnessDir",
  "stageEntry",
  "nativeRuntime",
  "resources",
  "coreDirs",
  "harnessFiles",
  "frontmatterAdditions",
  "modelPins",
  "onboarding",
  "rulesRename",
  "authoredExempt",
  "skipRunnerGen",
  "emit",
]);
const RESOURCE_KEYS = new Set(["kind", "source", "destination", "load"]);
const RESOURCE_KINDS = new Set<HarnessResource["kind"]>([
  "skill",
  "question-annex",
  "extension",
  "driver",
]);
const RUNTIME_KEYS = new Set([
  "package",
  "minimumVersion",
  "projectTrust",
  "trustIsSandbox",
  "autoApproveProjectTrust",
  "mutateTrustStore",
]);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNormalizedRelativePath(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) return false;
  if (value.includes("\\") || value.startsWith("/") || win32.isAbsolute(value)) return false;
  const segments = value.split("/");
  return segments.every((segment) => segment !== "" && segment !== "." && segment !== "..") &&
    posix.normalize(value) === value;
}

function unknownKeys(value: Record<string, unknown>, allowed: ReadonlySet<string>): string[] {
  return Object.keys(value).filter((key) => !allowed.has(key)).sort();
}

function validateStageEntry(value: unknown, findings: string[]): value is StageEntrySurface {
  if (!record(value)) {
    findings.push("stageEntry must be an object");
    return false;
  }
  if (value.kind === "runner") {
    const extra = unknownKeys(value, new Set(["kind", "root"]));
    if (extra.length > 0) findings.push(`stageEntry has unknown field(s): ${extra.join(", ")}`);
    if (!isNormalizedRelativePath(value.root)) findings.push("stageEntry.root must be a normalized project-relative path");
    return extra.length === 0 && isNormalizedRelativePath(value.root);
  }
  if (value.kind === "command") {
    const extra = unknownKeys(value, new Set(["kind", "path"]));
    if (extra.length > 0) findings.push(`stageEntry has unknown field(s): ${extra.join(", ")}`);
    if (!isNormalizedRelativePath(value.path)) findings.push("stageEntry.path must be a normalized project-relative path");
    return extra.length === 0 && isNormalizedRelativePath(value.path);
  }
  findings.push("stageEntry.kind must be runner or command");
  return false;
}

function validateRuntime(value: unknown, findings: string[]): value is NativeRuntimeContract {
  if (!record(value)) {
    findings.push("nativeRuntime must be an object");
    return false;
  }
  const extra = unknownKeys(value, RUNTIME_KEYS);
  if (extra.length > 0) findings.push(`nativeRuntime has unknown field(s): ${extra.join(", ")}`);
  if (typeof value.package !== "string" || value.package.length === 0)
    findings.push("nativeRuntime.package must be a non-empty string");
  if (typeof value.minimumVersion !== "string" || value.minimumVersion.length === 0)
    findings.push("nativeRuntime.minimumVersion must be a non-empty string");
  if (value.projectTrust !== "native") findings.push("nativeRuntime.projectTrust must be native");
  for (const key of ["trustIsSandbox", "autoApproveProjectTrust", "mutateTrustStore"] as const) {
    if (value[key] !== false) findings.push(`nativeRuntime.${key} must be false`);
  }
  return extra.length === 0;
}

function expectedLoad(kind: HarnessResource["kind"]): HarnessResource["load"] {
  if (kind === "skill" || kind === "extension") return "native";
  if (kind === "question-annex") return "annex";
  return "internal";
}

function resourceKind(value: unknown): HarnessResource["kind"] | null {
  return typeof value === "string" && RESOURCE_KINDS.has(value as HarnessResource["kind"])
    ? value as HarnessResource["kind"]
    : null;
}

function resourceFamily(kind: HarnessResource["kind"]): "skills" | "extensions" | "drivers" {
  if (kind === "extension") return "extensions";
  if (kind === "driver") return "drivers";
  return "skills";
}

function validateResourcePaths(
  candidate: Record<string, unknown>,
  label: string,
  harnessDir: unknown,
  findings: string[],
): void {
  if (!isNormalizedRelativePath(candidate.source)) findings.push(`${label}.source is unsafe`);
  if (!isNormalizedRelativePath(candidate.destination)) {
    findings.push(`${label}.destination is unsafe`);
    return;
  }
  if (typeof harnessDir === "string" && !candidate.destination.startsWith(`${harnessDir}/`))
    findings.push(`${label}.destination must be beneath ${harnessDir}/`);
}

function validateResourceKind(
  candidate: Record<string, unknown>,
  label: string,
  harnessDir: unknown,
  findings: string[],
): void {
  const kind = resourceKind(candidate.kind);
  if (kind === null) {
    findings.push(`${label}.kind is invalid`);
    return;
  }
  const want = expectedLoad(kind);
  if (candidate.load !== want) findings.push(`${label}.load must be ${want} for ${kind}`);
  if (typeof harnessDir !== "string" || !isNormalizedRelativePath(candidate.destination)) return;
  const family = resourceFamily(kind);
  if (!candidate.destination.startsWith(`${harnessDir}/${family}/`))
    findings.push(`${label}.destination must be in the ${family} resource family`);
}

function recordCaseFoldedPath(
  raw: unknown,
  role: "source" | "destination",
  label: string,
  seen: Set<string>,
  findings: string[],
): void {
  if (typeof raw !== "string") return;
  const folded = raw.normalize("NFC").toLocaleLowerCase("en-US");
  if (seen.has(folded)) findings.push(`${label}.${role} duplicates another resource after case-folding`);
  seen.add(folded);
}

function validateResource(
  candidate: unknown,
  index: number,
  harnessDir: unknown,
  sources: Set<string>,
  destinations: Set<string>,
  findings: string[],
): void {
  const label = `resources[${index}]`;
  if (!record(candidate)) {
    findings.push(`${label} must be an object`);
    return;
  }
  const extra = unknownKeys(candidate, RESOURCE_KEYS);
  if (extra.length > 0) findings.push(`${label} has unknown field(s): ${extra.join(", ")}`);
  validateResourcePaths(candidate, label, harnessDir, findings);
  validateResourceKind(candidate, label, harnessDir, findings);
  recordCaseFoldedPath(candidate.source, "source", label, sources, findings);
  recordCaseFoldedPath(candidate.destination, "destination", label, destinations, findings);
}

function validateResources(
  value: unknown,
  harnessDir: unknown,
  findings: string[],
): value is readonly HarnessResource[] {
  if (!Array.isArray(value)) {
    findings.push("resources must be an array");
    return false;
  }
  const sources = new Set<string>();
  const destinations = new Set<string>();
  value.forEach((candidate, index) => {
    validateResource(candidate, index, harnessDir, sources, destinations, findings);
  });
  return true;
}

function validateManifestIdentity(value: Record<string, unknown>, findings: string[]): void {
  if (typeof value.name !== "string" || value.name.length === 0) findings.push("name must be a non-empty string");
  if (typeof value.mirrorSurface !== "string" || value.mirrorSurface.length === 0)
    findings.push("mirrorSurface must be a non-empty string");
  if (typeof value.harnessDir !== "string" || !/^\.[a-z0-9][a-z0-9._-]*$/u.test(value.harnessDir))
    findings.push("harnessDir must be one normalized dot-directory segment");
}

function validateManifestCollections(value: Record<string, unknown>, findings: string[]): void {
  if (!Array.isArray(value.coreDirs)) findings.push("coreDirs must be an array");
  if (!Array.isArray(value.harnessFiles)) findings.push("harnessFiles must be an array");
  if (!Array.isArray(value.authoredExempt)) findings.push("authoredExempt must be an array");
  if (!(value.rulesRename === null || typeof value.rulesRename === "string"))
    findings.push("rulesRename must be a string or null");
  if (!(value.emit === null || typeof value.emit === "function")) findings.push("emit must be a function or null");
  validateModelPins(value.modelPins, findings);
}

function validateModelPins(value: unknown, findings: string[]): void {
  if (value === undefined) return;
  if (!record(value)) {
    findings.push("modelPins must be an object");
    return;
  }
  const entries = Object.entries(value);
  if (entries.length === 0) findings.push("modelPins must declare at least one tier");
  for (const [alias, modelId] of entries) {
    if (!/^[a-z][a-z0-9-]*$/u.test(alias)) findings.push(`modelPins alias "${alias}" must be a lowercase tier token`);
    if (typeof modelId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/u.test(modelId))
      findings.push(`modelPins["${alias}"] must be a harness-native model id`);
  }
}

/** Validate the closed authored manifest schema without touching the filesystem. */
export function validateHarnessManifest(value: unknown): readonly string[] {
  const findings: string[] = [];
  if (!record(value)) return ["manifest must be an object"];
  const extra = unknownKeys(value, MANIFEST_KEYS);
  if (extra.length > 0) findings.push(`manifest has unknown field(s): ${extra.join(", ")}`);
  validateManifestIdentity(value, findings);
  validateManifestCollections(value, findings);
  validateStageEntry(value.stageEntry, findings);
  if (value.nativeRuntime !== undefined) validateRuntime(value.nativeRuntime, findings);
  if (value.resources !== undefined) validateResources(value.resources, value.harnessDir, findings);
  return findings.sort();
}

export function assertHarnessManifest(value: unknown): asserts value is HarnessManifest {
  const findings = validateHarnessManifest(value);
  if (findings.length > 0) throw new Error(`harness manifest rejected:\n  ${findings.join("\n  ")}`);
}
