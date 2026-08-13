# coverage-patch-quick

An **advisory**, sub-three-minute approximation of the CI Patch Coverage Gate,
run locally before pushing a committed slice (issue #2933).

## Purpose

The canonical Patch Coverage Gate runs inside the CI job `Coverage Report
(head)`. Its verdict costs three seconds; its *input* — the merged LCOV of the
full suite — costs about eleven minutes (measured on CI job 94095568607). That
cost pushes work into the "push and see what CI says" loop, so uncovered added
lines are discovered after the round trip instead of before it.

This CLI shortens the input: it runs only the tests that plausibly cover the
files you changed, writes their LCOV into a scratch directory, and hands that
LCOV to the repository's own gate through the `AMADEUS_PATCH_LCOV` seam. The
verdict logic is never duplicated — it is the same `tests/coverage-patch-gate.ts`
CI runs.

## Scope: self-development only

The plugin is activated by name in this workspace's `amadeus/config.json`
(`plugin.activation.names`). It ships inert inside distribution bundles: a
project that does not name it never loads it.

It depends at runtime on two files that are **not** distributed —
`tests/coverage-patch-gate.ts` and `tests/.coverage-registry.json`. Outside the
Amadeus development repository those are absent, and the CLI exits non-zero with
an explicit message rather than pretending to have measured anything. Loud
failure where the gate is absent is the intended behaviour, not a defect.

## Usage

```bash
bun plugins/coverage-patch-quick/tools/coverage-patch-quick-cli.ts --check
```

Environment:

- `AMADEUS_PATCH_BASE_REF` — diff base (default `origin/main`, the gate's own
  default).

The tool evaluates **committed slices only**. The gate refuses a dirty working
tree and offers no seam to disable that check, so commit or stash first; the
refusal is surfaced as a non-zero exit with that instruction.

Coverage is written to a fresh directory under the system temp dir, never to the
repository's `coverage/`: `tests/run-tests.ts` deletes that root on start, and
coverage measurement must have a single owner. Do not run this while another
coverage or test command of yours is running.

## Exit contract

- **0** — the approximation completed. The gate's verdict and counts are printed
  verbatim, PASS or FAIL, followed by the advisory banner. The tool never blocks
  a push.
- **non-zero** — the approximation could not be carried out: not a git
  repository, gate or registry absent, `git diff` failed, `bun test` could not be
  spawned, no LCOV produced, or the gate returned no verdict (including its
  dirty-tree refusal).

## Known constraints (why this is an approximation)

1. The targeted LCOV is **not** the merged CI LCOV. Multi-line type annotation
   continuation lines are absent from a targeted run's DA records and present in
   the merged one, so that class of uncovered line is structurally invisible here
   (see `amadeus/spaces/default/memory/project.md`, Learnings Inbox).
2. Coverage contributed by tests **outside** the selected set is invisible, so
   the tool can report a false red.
3. Green here does not guarantee green in CI. Only the CI Patch Coverage Gate
   decides a PR.
4. The run evaluates against a **derived allowlist**, not the canonical one. The
   gate's STALE check treats an exemption whose file or resolved range has no
   measurable line as ledger rot and hard-fails before evaluating anything —
   which a targeted LCOV structurally triggers (measured on this repository:
   432 entries, 373 stale, gate exit 1 with no verdict). So the CLI writes a
   filtered copy into its scratch dir, keeping only the exemptions the targeted
   LCOV can still measure, and points `AMADEUS_PATCH_ALLOWLIST` at that copy.
   `tests/.coverage-patch-allowlist.json` is read-only here and CI keeps using
   it unchanged. Which entries survive is decided by the gate's own exported
   resolver, loaded at runtime — the staleness logic is not reimplemented.
   Dropping exemptions can only make this approximation stricter than CI, never
   laxer.
5. The changed-file to test mapping is heuristic: it joins changed paths to
   registry units by path token and exported symbol. Changed files that no test
   claims are reported as `UNMAPPED` — their added lines will read uncovered
   here.
6. The sibling Project Coverage Gate (full-suite totals compared against a
   committed baseline) cannot be approximated from a targeted LCOV and is out of
   scope for this plugin.

## Timing contract

The run must stay under three minutes so it fits the `pr-convergence` stage's
"verify first" window (local verification under three minutes runs before the
push; anything longer runs alongside it).
