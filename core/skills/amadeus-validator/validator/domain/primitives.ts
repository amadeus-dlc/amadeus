import { type ArtifactPath } from "./artifact-path";

export type { ArtifactPath } from "./artifact-path";
export type { DomainPrimitive } from "./domain-primitive";

export function artifactPath(value: string): ArtifactPath {
  const normalized = normalize(value);
  if (normalized.length === 0) throw new Error("ArtifactPath must not be blank");
  if (normalized.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(normalized)) throw new Error(`ArtifactPath must be relative: ${value}`);
  if (normalized.split("/").includes("..")) throw new Error(`ArtifactPath must stay inside artifact root: ${value}`);
  return { kind: "ArtifactPath", value: normalized };
}

function normalize(value: string): string {
  return String(value ?? "").trim().replaceAll("\\", "/");
}
