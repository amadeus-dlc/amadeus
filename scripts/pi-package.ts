import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import piManifest from "../packages/framework/harness/pi/manifest.ts";
import { transform } from "./harness-transform.ts";
import type { HarnessResourceDescriptor } from "./manifest-types.ts";

export type PiPackageMetadata = Readonly<{
  extensions: readonly string[];
  skills: readonly string[];
}>;

export type PiCandidateGraph = Readonly<{
  catalogDigest: string;
  resources: readonly HarnessResourceDescriptor[];
  setupPaths: readonly string[];
  package: PiPackageMetadata;
}>;

export type PiSourceIdentity =
  | Readonly<{ kind: "formal"; source: "local" | "git"; revision: string; catalogDigest: string; locator: string }>
  | Readonly<{ kind: "blocked"; reason: string }>;

function canonicalJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJsonValue);
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record).sort().map((key) => [key, canonicalJsonValue(record[key])]),
    );
  }
  return value;
}

function stableJson(value: unknown): string {
  return JSON.stringify(canonicalJsonValue(value));
}

function packagePath(destination: string): string {
  return `./dist/pi/${destination}`;
}

export function piCatalogDigest(resources: readonly HarnessResourceDescriptor[]): string {
  return createHash("sha256").update(stableJson(resources)).digest("hex");
}

export function expectedPiPackageMetadata(): PiPackageMetadata {
  const resources = piManifest.resources ?? [];
  return Object.freeze({
    extensions: Object.freeze(
      resources.filter((resource) => resource.kind === "extension" && resource.load === "native")
        .map((resource) => packagePath(resource.destination)),
    ),
    skills: Object.freeze(
      resources.filter((resource) => resource.kind === "skill" && resource.load === "native")
        .map((resource) => packagePath(posix.dirname(resource.destination))),
    ),
  });
}

export function buildPiCandidateGraph(repoRoot: string): PiCandidateGraph {
  const sourceRoot = join(repoRoot, "packages", "framework", "harness", "pi");
  const resources = (piManifest.resources ?? []).map((resource) => {
    const sourcePath = join(sourceRoot, ...resource.source.split("/"));
    const projected = transform(sourcePath, readFileSync(sourcePath), piManifest.harnessDir, piManifest.rulesRename);
    return Object.freeze({
      ...resource,
      sha256: createHash("sha256").update(projected).digest("hex"),
    });
  });
  const catalogDigest = piCatalogDigest(resources);
  return Object.freeze({
    catalogDigest,
    resources: Object.freeze(resources),
    setupPaths: Object.freeze(resources.map((resource) => resource.destination)),
    package: expectedPiPackageMetadata(),
  });
}

export function piPackageMetadataProblems(value: unknown): string[] {
  const expected = expectedPiPackageMetadata();
  if (typeof value !== "object" || value === null || Array.isArray(value)) return ["root package.json pi field is missing"];
  const record = value as Record<string, unknown>;
  const problems: string[] = [];
  const keys = Object.keys(record).sort();
  if (keys.join(",") !== "extensions,skills") problems.push("root package.json pi field must contain only extensions and skills");
  if (JSON.stringify(record.extensions) !== JSON.stringify(expected.extensions)) problems.push("root package.json pi.extensions differs from the Pi manifest");
  if (JSON.stringify(record.skills) !== JSON.stringify(expected.skills)) problems.push("root package.json pi.skills differs from the Pi manifest");
  return problems;
}

export function localPiSourceIdentity(
  locator: string,
  revision: string,
  clean: boolean,
  catalogDigest: string,
): PiSourceIdentity {
  if (!clean) return Object.freeze({ kind: "blocked", reason: "local repository is not clean" });
  if (!/^[0-9a-f]{40}$/u.test(revision)) return Object.freeze({ kind: "blocked", reason: "local revision is not a full commit SHA" });
  return Object.freeze({ kind: "formal", source: "local", revision, catalogDigest, locator });
}

export function gitPiSourceIdentity(locator: string, revision: string, catalogDigest: string): PiSourceIdentity {
  if (!/^[0-9a-f]{40}$/u.test(revision)) return Object.freeze({ kind: "blocked", reason: "git source is not pinned to a full commit SHA" });
  const originalPath = canonicalGitSourcePath(locator);
  if (originalPath === null) return Object.freeze({ kind: "blocked", reason: "git source URL path is not canonical" });
  let url: URL;
  try {
    url = new URL(locator);
  } catch {
    return Object.freeze({ kind: "blocked", reason: "git source URL is not canonical" });
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "") {
    return Object.freeze({ kind: "blocked", reason: "git source URL is not credential-free canonical HTTPS" });
  }
  if (url.pathname !== originalPath || url.pathname.includes("..") || dirname(url.pathname) === ".") {
    return Object.freeze({ kind: "blocked", reason: "git source URL path is not canonical" });
  }
  return Object.freeze({ kind: "formal", source: "git", revision, catalogDigest, locator: url.toString() });
}

function canonicalGitSourcePath(locator: string): string | null {
  const sourceMatch = /^https:\/\/[^/?#]+(?<path>\/[^?#]*)$/u.exec(locator);
  const originalPath = sourceMatch?.groups?.path;
  if (
    originalPath === undefined
    || originalPath.startsWith("//")
    || originalPath.endsWith("/")
    || originalPath.split("/").slice(1).some((segment) => segment === "" || segment === "." || segment === "..")
  ) return null;
  return originalPath;
}
