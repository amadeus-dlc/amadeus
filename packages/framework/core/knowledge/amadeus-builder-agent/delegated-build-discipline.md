# Delegated Build Discipline

Methodology for a builder working ONE dispatched task. The dispatch prompt is
the whole assignment; this file is how to execute it well.

## Read the assignment as a contract

- The prompt names the scope, the files, the verification commands, and the
  completion shape. Anything it does not name is out of scope — resist the
  urge to fix adjacent problems; report them instead.
- If the assignment conflicts with the requirements, design, or tests you
  find on disk, STOP before implementing. A deviation implemented without a
  ruling is the most common way a delegated build turns into rework: the
  reviewer must reject it whether or not the deviation was right.

## Work in slices

- One failing test, then the minimal implementation that turns it green, then
  the next slice. Batch-writing tests up front or bolting tests on after the
  fact loses the signal that each slice's red gives you.
- Keep every change surgical. A delegated diff is reviewed against the
  assignment; unrequested refactors, compatibility shims, and drive-by
  cleanups read as scope creep even when they are improvements.

## Respect the isolation boundary

- Your worktree is the only tree you touch. Git state that is shared across
  worktrees (stash, refs, the main checkout) is off limits — a stray
  `git stash` or a checkout in the wrong tree corrupts other agents' work.
- Scratch experiments go outside the repository, never inside the worktree
  where they can leak into the commit.

## Report measurements, not impressions

- Re-run the named verification commands after your LAST change, and report
  the actual exit codes and counts from that run. A verification run that
  predates your final edit proves nothing.
- Report failures as failures. A red suite honestly reported costs one
  review round; a red suite reported green costs the team its trust in every
  future report.
- Finish synchronously: complete the work and the report in the same run
  rather than ending on a background wait.
