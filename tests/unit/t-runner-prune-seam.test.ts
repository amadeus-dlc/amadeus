// In-process coverage seam for the #785 orphan-prune fix (FR-3). t129 exercises
// the write/check drift guard end-to-end by spawning the shipped dist CLI, which
// bun's coverage instrumentation cannot see (the spawn blindspot) — so this unit
// test imports the exported pruneOrphanRunners helper directly and drives it
// against a temp skills dir. It proves the discrimination the spawn e2e cannot
// cheaply enumerate: only signature-carrying orphans are removed, while the
// init/compose wrappers and hand-made non-runner dirs are preserved, and the
// prune is idempotent. Behavioural depth stays in t129; this file exists so the
// added lines register in lcov (local-lcov-pre-push norm).

import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleWrite, pruneOrphanRunners } from "../../dist/claude/.claude/tools/amadeus-runner-gen.ts";

const tmpDirs: string[] = [];
afterAll(() => {
  for (const d of tmpDirs) rmSync(d, { recursive: true, force: true });
});

// A runner-signature SKILL.md carries BOTH the `--stage` and `--single` markers
// (isRunnerSkill keys on that pair). A non-runner body omits them.
function runnerBody(slug: string): string {
  return [
    "---",
    `name: amadeus-${slug}`,
    "description: a stage runner",
    "---",
    "# runner",
    "",
    `Drives \`bun .claude/tools/amadeus-orchestrate.ts next --stage ${slug} --single\`.`,
    "",
  ].join("\n");
}

function nonRunnerBody(name: string): string {
  return ["---", `name: amadeus-${name}`, "description: not a runner", "---", "# plain skill", ""].join("\n");
}

function writeSkill(skillsDir: string, dirName: string, body: string): void {
  const dir = join(skillsDir, dirName);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), body, "utf-8");
}

function newSkillsDir(): string {
  const d = mkdtempSync(join(tmpdir(), "runner-prune-seam-"));
  tmpDirs.push(d);
  return d;
}

describe("pruneOrphanRunners — orphan-only prune (in-process seam, #785 FR-3)", () => {
  // ===========================================================================
  // The core discrimination: given a compiled slug set, ONLY signature-carrying
  // runner dirs whose slug is NOT compiled are removed. A compiled runner, a
  // marker-less hand-made dir, and the marker-less init/compose wrappers all
  // survive — proving prune never over-reaches to a non-runner (the FR-3
  // "non-runner handmade dirs must not be deleted" acceptance criterion).
  // ===========================================================================
  test("removes only the signature-carrying orphan; keeps runners, non-runners, and init/compose", () => {
    const skills = newSkillsDir();
    // (a) a valid runner for a compiled slug — must survive.
    writeSkill(skills, "amadeus-code-generation", runnerBody("code-generation"));
    // (b) an orphan runner — signature present, slug NOT compiled — must be pruned.
    writeSkill(skills, "amadeus-dropped-stage", runnerBody("dropped-stage"));
    // (c) a hand-made non-runner dir (no `--stage`/`--single` markers) — must survive.
    writeSkill(skills, "amadeus-my-notes", nonRunnerBody("my-notes"));
    // (d) init/compose wrappers carry no runner signature — must survive.
    writeSkill(skills, "amadeus-init", nonRunnerBody("init"));
    writeSkill(skills, "amadeus-compose", nonRunnerBody("compose"));

    const removed = pruneOrphanRunners(skills, ["code-generation"]);

    expect(removed).toEqual(["dropped-stage"]);
    expect(existsSync(join(skills, "amadeus-dropped-stage"))).toBe(false);
    // Everything that is not a compiled-absent runner is preserved.
    expect(existsSync(join(skills, "amadeus-code-generation"))).toBe(true);
    expect(existsSync(join(skills, "amadeus-my-notes"))).toBe(true);
    expect(existsSync(join(skills, "amadeus-init"))).toBe(true);
    expect(existsSync(join(skills, "amadeus-compose"))).toBe(true);
  });

  // ===========================================================================
  // Idempotent: a second call on the already-pruned tree finds no orphan and is
  // a no-op (FR-3 requires prune to be idempotent).
  // ===========================================================================
  test("is idempotent — a second call finds no orphans and removes nothing", () => {
    const skills = newSkillsDir();
    writeSkill(skills, "amadeus-code-generation", runnerBody("code-generation"));
    writeSkill(skills, "amadeus-dropped-stage", runnerBody("dropped-stage"));

    expect(pruneOrphanRunners(skills, ["code-generation"])).toEqual(["dropped-stage"]);
    // Second call: nothing left to prune.
    expect(pruneOrphanRunners(skills, ["code-generation"])).toEqual([]);
    expect(existsSync(join(skills, "amadeus-code-generation"))).toBe(true);
  });

  // ===========================================================================
  // A missing skills dir is tolerated (returns []), matching handleCheck's
  // onDiskRunnerSlugs guard.
  // ===========================================================================
  test("returns [] when the skills dir does not exist", () => {
    const missing = join(newSkillsDir(), "does-not-exist");
    expect(pruneOrphanRunners(missing, ["code-generation"])).toEqual([]);
  });
});

// Full-handler seam (leader ruling on seam-export-handler-amend): handleWrite
// with an explicit skillsDir generates every runnable runner into a temp dir
// and prunes a pre-planted orphan in the same call — the write-side wiring
// (including the pruneOrphanRunners call site) registers in lcov in-process.
test("handleWrite(skillsDir) generates runners and prunes orphans in a temp dir", () => {
  const dir = mkdtempSync(join(tmpdir(), "amadeus-runner-write-"));
  try {
    const orphan = join(dir, "amadeus-dropped-stage");
    mkdirSync(orphan, { recursive: true });
    writeFileSync(
      join(orphan, "SKILL.md"),
      "runs `bun .claude/tools/amadeus-orchestrate.ts next --stage dropped-stage --single`\n",
    );
    const slugs = handleWrite(dir);
    expect(slugs.length).toBeGreaterThan(0);
    expect(existsSync(join(dir, `amadeus-${slugs[0]}`, "SKILL.md"))).toBe(true);
    expect(existsSync(orphan)).toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
