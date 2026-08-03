import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import piManifest from "../packages/framework/harness/pi/manifest.ts";
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

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
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
  const resources = (piManifest.resources ?? []).map((resource) => Object.freeze({
    ...resource,
    sha256: createHash("sha256").update(readFileSync(join(sourceRoot, ...resource.source.split("/")))).digest("hex"),
  }));
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
  let url: URL;
  try {
    url = new URL(locator);
  } catch {
    return Object.freeze({ kind: "blocked", reason: "git source URL is not canonical" });
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "") {
    return Object.freeze({ kind: "blocked", reason: "git source URL is not credential-free canonical HTTPS" });
  }
  if (url.pathname.includes("..") || dirname(url.pathname) === ".") {
    return Object.freeze({ kind: "blocked", reason: "git source URL path is not canonical" });
  }
  return Object.freeze({ kind: "formal", source: "git", revision, catalogDigest, locator: url.toString() });
}
