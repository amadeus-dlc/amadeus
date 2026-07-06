import { type ArtifactPath, artifactPath } from "./primitives";

export function cleanMarkdownLinkTarget(target: string): string {
  return String(target ?? "").split("#", 2)[0].split(/\s+/, 2)[0] ?? "";
}

export function resolveArtifactLinkTarget(sourcePath: ArtifactPath | string, rawLinkTarget: string): ArtifactPath {
  const source = asArtifactPath(sourcePath);
  const sourceDir = dirname(source.value);
  const cleanTarget = cleanMarkdownLinkTarget(rawLinkTarget);
  rejectUnsupportedTarget(cleanTarget);
  const path = normalizeInsideArtifactRoot([...splitPath(sourceDir), ...splitPath(cleanTarget)], rawLinkTarget);
  return artifactPath(path);
}

export function tryResolveArtifactLinkTarget(sourcePath: ArtifactPath | string, rawLinkTarget: string): ArtifactPath | undefined {
  try {
    return resolveArtifactLinkTarget(sourcePath, rawLinkTarget);
  } catch {
    return undefined;
  }
}

function asArtifactPath(value: ArtifactPath | string): ArtifactPath {
  return typeof value === "string" ? artifactPath(value) : value;
}

function dirname(path: string): string {
  const index = path.lastIndexOf("/");
  if (index === -1) return "";
  return path.slice(0, index);
}

function splitPath(path: string): string[] {
  if (path.length === 0) return [];
  return path.replaceAll("\\", "/").split("/");
}

function rejectUnsupportedTarget(cleanTarget: string): void {
  const normalizedTarget = cleanTarget.replaceAll("\\", "/");
  if (/^[a-z][a-z0-9+.-]*:/i.test(cleanTarget) || normalizedTarget.startsWith("//")) {
    throw new Error(`Markdown link target must be relative: ${cleanTarget}`);
  }
  if (normalizedTarget.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(cleanTarget)) {
    throw new Error(`Markdown link target must not be absolute: ${cleanTarget}`);
  }
}

function normalizeInsideArtifactRoot(segments: string[], rawLinkTarget: string): string {
  const stack: string[] = [];
  for (const segment of segments) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (stack.length === 0) throw new Error(`Markdown link target must stay inside artifact root: ${rawLinkTarget}`);
      stack.pop();
    } else {
      stack.push(segment);
    }
  }
  if (stack.length === 0) throw new Error(`Markdown link target must not point to artifact root: ${rawLinkTarget}`);
  return stack.join("/");
}
