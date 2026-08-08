// size: medium
//
// Regression pin for #2464 — bare (no --project-dir) CLI spawns must be pinned to
// a CLEAN workspace via CLAUDE_PROJECT_DIR, never left to the ambient cwd.
//
// THE DEFECT. t17's runStateBare and t66's next-stage walk drove
// `amadeus-state.ts lookup next-stage <slug> <scope>` with NEITHER --project-dir
// NOR CLAUDE_PROJECT_DIR. resolveProjectDir (amadeus-lib.ts) then falls through to
// its cwd-workspace-marker rung (#2413) and resolves the REPO's own amadeus/
// workspace, so the walk reads whatever gitignored ambient state
// (amadeus-state.md SKIP suffixes + checkboxes) happens to sit on the developer's
// machine. The tests went red for an ambient reason, with no source change.
//
// WHAT THIS FILE PINS (both halves, deliberately):
//   (a) the FIX's closure — with a hostile workspace as cwd but CLAUDE_PROJECT_DIR
//       pointing at a clean one, the walk answers from the clean workspace
//       (i.e. the static scope grid: intent-capture -> market-research);
//   (b) the LADDER ORDER env > cwd-marker (ruling E-PWF-CGDEV2) — with the env
//       unset, the SAME spawn from the SAME cwd bends to the hostile state file
//       (market-research is suffixed SKIP there, so the walk steps past it to
//       feasibility). This is the falling proof kept resident: if the env rung
//       ever stopped winning, (a) would report this same bent answer.
//
// The hostile workspace carries the full marker predicate (an amadeus/ dir AND a
// harness tools/ dir) so rung 3 genuinely fires; without it the walk would fall
// through to script-path derivation and the pin would prove nothing.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BUN = process.execPath;
const STATE_TS = join(
  import.meta.dir, "..", "..", "dist", "claude", ".claude", "tools", "amadeus-state.ts",
);

// A state file whose IDEATION rows disagree with the static `feature` grid:
// intent-capture is already [x] and market-research carries a SKIP suffix, so a
// walk threaded through THIS state answers `feasibility`, not `market-research`.
const HOSTILE_STATE = `# AI-DLC State Tracking

## Project Information
- **Scope**: feature

## Stage Progress

### IDEATION PHASE
- [x] intent-capture — EXECUTE
- [ ] market-research — SKIP
- [ ] feasibility — EXECUTE
`;

let hostile = "";
let clean = "";

function seedWorkspace(root: string): void {
  mkdirSync(join(root, "amadeus", "spaces", "default", "intents"), { recursive: true });
  // The marker predicate needs a harness dir carrying tools/, not just amadeus/.
  mkdirSync(join(root, ".claude", "tools"), { recursive: true });
  writeFileSync(join(root, "amadeus", "active-space"), "default\n", "utf-8");
}

beforeAll(() => {
  hostile = mkdtempSync(join(tmpdir(), "amadeus-ambient-hostile-"));
  clean = mkdtempSync(join(tmpdir(), "amadeus-ambient-clean-"));
  seedWorkspace(hostile);
  seedWorkspace(clean);
  const record = join(hostile, "amadeus", "spaces", "default", "intents", "260101-hostile-aaaaaaaa");
  mkdirSync(record, { recursive: true });
  writeFileSync(join(record, "amadeus-state.md"), HOSTILE_STATE, "utf-8");
  writeFileSync(
    join(hostile, "amadeus", "spaces", "default", "intents", "active-intent"),
    "260101-hostile-aaaaaaaa\n",
    "utf-8",
  );
});

afterAll(() => {
  for (const dir of [hostile, clean]) {
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

// Bare argv (no --project-dir) — exactly the shape t17's runStateBare and t66's
// walk use. `projectDir` selects what CLAUDE_PROJECT_DIR is set to; undefined
// deletes it so the cwd-marker rung takes over.
function bareLookup(cwd: string, projectDir: string | undefined): string {
  const env: Record<string, string | undefined> = { ...process.env };
  if (projectDir === undefined) delete env.CLAUDE_PROJECT_DIR;
  else env.CLAUDE_PROJECT_DIR = projectDir;
  const res = spawnSync(BUN, [STATE_TS, "lookup", "next-stage", "intent-capture", "feature"], {
    cwd,
    env: env as NodeJS.ProcessEnv,
    encoding: "utf8",
  });
  return `${res.stdout ?? ""}${res.stderr ?? ""}`.trim();
}

describe("#2464 bare amadeus-state spawns are pinned by CLAUDE_PROJECT_DIR", () => {
  test("env unset: the cwd workspace marker wins and the walk bends to ambient state", () => {
    expect(bareLookup(hostile, undefined)).toBe("feasibility");
  });

  test("env set to a clean workspace: the walk answers from the clean workspace", () => {
    expect(bareLookup(hostile, clean)).toBe("market-research");
  });
});
