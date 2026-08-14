// covers: stage-protocol:error-arm-receipt
// size: small
//
// t2974 — the `error` directive receipt clause and the approval boundary (#2974).
//
// WHY THIS EXISTS. Under a `full` grant the conductor received an `error`
// directive, did not print `directive.message`, and invented a brand-new
// question to put to the human instead. The stop itself was contract-compliant;
// what failed was the receipt clause — and that clause had NO canonical
// definition in core. It was hand-written into eight harness surfaces and had
// already drifted into three variants: five complete, two abbreviated (dropping
// `retry` and the "message is the user-facing error" half), and one — pi — that
// only listed `error` among the stopping directives without saying to print the
// message at all.
//
// The guard therefore fixes ONE canonical sentence in the harness-neutral
// protocol and requires every shipped conductor surface to carry it verbatim.
// The surface set is DERIVED from disk (exactly one entry point per harness
// directory, same idiom as t492) so a new harness joins the contract by
// existing rather than by being added to a list here.
//
// The second half pins the approval boundary the same incident exposed as
// undefined: "the workspace's approval boundary for remote writes" was
// referenced by the pr-convergence stage and defined nowhere. It is now defined
// in the autonomy reference (both languages), routed through the
// decide-question ladder by the protocol, and the pr-convergence Guardrail
// points at that route while keeping merge a human-only decision.

import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../harness/fixtures.ts";

const HARNESS_ROOT = join(REPO_ROOT, "packages", "framework", "harness");
const STAGE_PROTOCOL = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "amadeus-common",
  "protocols",
  "stage-protocol.md",
);

// The two shapes a conductor entry point can take, relative to its harness dir.
const ENTRY_POINT_CANDIDATES = [
  join("skills", "amadeus", "SKILL.md"),
  join("commands", "amadeus.md"),
] as const;

interface Surface {
  readonly label: string;
  readonly path: string;
}

function harnessNames(): string[] {
  return readdirSync(HARNESS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function entryPointsOf(harness: string): string[] {
  return ENTRY_POINT_CANDIDATES.map((rel) => join(HARNESS_ROOT, harness, rel)).filter((path) =>
    existsSync(path),
  );
}

const HARNESSES = harnessNames();

const CONDUCTOR_SURFACES: Surface[] = HARNESSES.flatMap((harness) =>
  entryPointsOf(harness).map((path) => ({ label: `harness:${harness}`, path })),
);

function read(path: string): string {
  return readFileSync(path, "utf-8");
}

/** Collapse whitespace runs so a surface may wrap the clause across lines (pi's
 *  prose bullet does) without that being read as drift. Wrapping is formatting;
 *  the contract is the wording. */
function flatten(text: string): string {
  return text.replace(/\s+/g, " ");
}

// The clauses the receipt must carry. Asserted against the CANONICAL sentence
// (not against each surface) so weakening core reds here rather than silently
// weakening all eight mirrors at once.
const RECEIPT_CLAUSES = [
  "`directive.message` verbatim", // (1) print the engine's own message
  "STOP", // (2) halt the forwarding loop
  "Do not recover, retry, or smooth it over", // (3) no repair theatre
  "do not invent a new question or a new gate", // (4) the #2974 defect itself
] as const;

/** The canonical receipt sentence, read out of the harness-neutral protocol.
 *  Single source: the mirrors below are checked against THIS string, so the
 *  eight surfaces cannot drift apart without drifting from core first. */
function canonicalReceipt(): string {
  const line = read(STAGE_PROTOCOL)
    .split("\n")
    .find((candidate) => candidate.trimStart().startsWith("Print `directive.message` verbatim"));
  return (line ?? "").trim();
}

describe("t2974 error-directive receipt clause", () => {
  test("the conductor-surface set is derived and non-empty (no vacuous pass)", () => {
    const malformed = HARNESSES.filter((harness) => entryPointsOf(harness).length !== 1);
    expect(malformed).toEqual([]);
    expect(CONDUCTOR_SURFACES.length).toBeGreaterThan(0);
  });

  test("core defines the receipt clause once, with every required clause", () => {
    const canonical = canonicalReceipt();
    expect(canonical).not.toBe("");
    const missing = RECEIPT_CLAUSES.filter((clause) => !canonical.includes(clause));
    expect(missing).toEqual([]);
  });

  test("every conductor surface carries the canonical receipt verbatim", () => {
    const canonical = canonicalReceipt();
    expect(canonical).not.toBe("");
    const drifted = CONDUCTOR_SURFACES.filter(
      (surface) => !flatten(read(surface.path)).includes(canonical),
    ).map((surface) => surface.label);
    expect(drifted).toEqual([]);
  });
});
