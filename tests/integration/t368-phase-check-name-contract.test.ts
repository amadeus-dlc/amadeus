// covers: none (documentation-contract guard; the engine side is
// packages/framework/core/tools/amadeus-state.ts verifyPhaseCheckArtifact)
//
// t368 (integration) — phase-boundary artifact name contract (Issue #1749).
//
// The engine refuses to complete a phase boundary unless
// `<record>/verification/phase-check-<phase>.md` exists (amadeus-state.ts).
// The governance protocol and the reference docs used to instruct a bracketed
// legacy spelling, which produced an artifact the engine never accepts. These
// predicates pin the canonical name across the source of truth and every
// generated distribution surface.
//
// This runs a real `git ls-files` / `git grep` enumeration over the tracked
// corpus (process boundary to git), so it belongs to the integration tier
// rather than the unit tier.
//
// Excluded scope: `amadeus/spaces/**` — the workspace record and memory layers
// quote the legacy spelling as historical narrative (the 2026-07-08 learning
// that chose the canonical name over the governance wording). Those are
// records of what was said, not instructions to follow.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dir, "..", "..");
// Assembled from fragments on purpose: spelling the legacy name as one literal
// would make this file its own first offender once it is tracked, and the guard
// would then need to exempt itself. The exclusion scope stays exactly the
// record layer.
const LEGACY_NAME = `[phase-${"boundary"}]-verification`;
// The whole template the engine resolves, not just the stem: a bare
// `phase-check-` prefix would also accept a wrong directory or a wrong
// extension, neither of which the engine ever looks for.
const CANONICAL_TEMPLATE = "verification/phase-check-<phase>.md";
const RECORD_SCOPE = "amadeus/spaces/";
const GOVERNANCE_REL = "amadeus-common/protocols/stage-protocol-governance.md";

function git(args: string[]): { status: number; stdout: string } {
  const r = spawnSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { status: r.status ?? -1, stdout: r.stdout ?? "" };
}

function lines(stdout: string): string[] {
  return stdout
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Tracked files containing the legacy spelling. `git grep -F` is a fixed-string
// search, so the bracket characters need no escaping.
function filesWithLegacyName(): string[] {
  const res = git(["grep", "-lF", LEGACY_NAME]);
  // 0 = matches found, 1 = none; anything higher is a real git failure.
  expect(res.status === 0 || res.status === 1).toBe(true);
  return lines(res.stdout);
}

// Every tracked copy of the governance protocol: the canonical source under
// packages/, plus the dist and self-install trees generated from it.
function governanceCopies(): string[] {
  const res = git(["ls-files", "--", `*${GOVERNANCE_REL}`]);
  expect(res.status).toBe(0);
  return lines(res.stdout);
}

describe("t368 phase-check artifact name contract", () => {
  test("no tracked instruction surface still names the legacy artifact", () => {
    const offenders = filesWithLegacyName().filter((p) => !p.startsWith(RECORD_SCOPE));
    expect(offenders).toEqual([]);
  });

  test("every governance copy instructs the canonical phase-check template", () => {
    const copies = governanceCopies();
    // The canonical source plus at least the generated surfaces — a collapsed
    // corpus would make the predicate above vacuous.
    expect(copies.length).toBeGreaterThan(1);
    expect(copies).toContain(`packages/framework/core/${GOVERNANCE_REL}`);

    const res = git(["grep", "-lF", CANONICAL_TEMPLATE, "--", ...copies]);
    expect(res.status).toBe(0);
    expect(lines(res.stdout).sort()).toEqual([...copies].sort());
  });
});
