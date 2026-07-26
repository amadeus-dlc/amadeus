// Pure reviewer protocol seams shared by every harness runtime.

import { basename, normalize, sep } from "node:path";

interface ArtifactRef {
  path: string;
  present: boolean;
  optional?: boolean;
}

interface UnitRef {
  unit?: string;
  stageFile: string;
  produces: readonly ArtifactRef[];
}

interface ReadScope {
  unit?: string;
  paths: string[];
}

type ReviewerPersona = string;

interface ReviewHeader {
  reviewer: string;
  date: string;
}

const REVIEWER_PERSONAS = new Set([
  "amadeus-architecture-reviewer-agent",
  "amadeus-product-lead-agent",
]);
const UTC_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function assertNonEmptyPath(path: string): void {
  if (path.trim() === "" || path.includes("\n") || path.includes("\r")) {
    throw new Error("review path must be a non-empty single line");
  }
}

function isForbiddenReviewPath(path: string): boolean {
  const name = basename(path).toLowerCase();
  return name === "memory.md" || name === "plan.md" || name.includes("reasoning");
}

function belongsToUnit(path: string, unit: string): boolean {
  const normalized = normalize(path).split(sep).join("/");
  return normalized.includes(`/construction/${unit}/`) ||
    normalized.startsWith(`construction/${unit}/`);
}

export function reviewerReadScope(
  unit: UnitRef,
  consumes: readonly ArtifactRef[],
): ReadScope {
  assertNonEmptyPath(unit.stageFile);
  const paths: string[] = [];
  const seen = new Set<string>();
  const add = (path: string): void => {
    assertNonEmptyPath(path);
    if (isForbiddenReviewPath(path)) {
      throw new Error(`forbidden review path: ${path}`);
    }
    if (!seen.has(path)) {
      seen.add(path);
      paths.push(path);
    }
  };

  add(unit.stageFile);
  for (const artifact of unit.produces) {
    if (!artifact.present) {
      if (artifact.optional) continue;
      throw new Error(`required review artifact is missing: ${artifact.path}`);
    }
    if (unit.unit && !belongsToUnit(artifact.path, unit.unit)) {
      throw new Error(`artifact is outside current unit: ${artifact.path}`);
    }
    add(artifact.path);
  }
  for (const artifact of consumes) {
    if (!artifact.present) {
      throw new Error(`declared consume is missing: ${artifact.path}`);
    }
    add(artifact.path);
  }

  return unit.unit ? { unit: unit.unit, paths } : { paths };
}

export function runtimeReviewIdentity(
  persona: ReviewerPersona,
  utcDate: string,
): ReviewHeader {
  if (!REVIEWER_PERSONAS.has(persona)) {
    throw new Error(`invalid reviewer persona: ${persona || "<empty>"}`);
  }
  if (!UTC_SECONDS.test(utcDate)) {
    throw new Error("review date must be one ISO-8601 UTC line with second precision");
  }
  const parsed = Date.parse(utcDate);
  if (
    !Number.isFinite(parsed) ||
    new Date(parsed).toISOString().replace(".000Z", "Z") !== utcDate
  ) {
    throw new Error("review date is not a real UTC timestamp");
  }
  return { reviewer: persona, date: utcDate };
}
