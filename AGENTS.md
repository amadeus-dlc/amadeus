@.agents/rules/amadeus.md
@.agents/rules/amadeus-codex-suffix.md

To avoid collisions with other agents, always create a dedicated worktree and branch and switch to them before starting work.

# AGENTS.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## Project Instructions

- Communicate with the user in Japanese.
- Write documentation in English by default.
- As an exception, write `amadeus/**/*.md` in Japanese.
- Write code comments in English.
- Write commit messages in English.
- If you find violations of these language rules while working, fix them as part of the same change.
- For Amadeus self-development, explicitly select `self-feature`,
  `self-fix`, `self-refactor`, or `self-document` based on the change type. The canonical
  policy is `amadeus/spaces/default/memory/project.md` § Scope Overrides.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Cursor Cloud specific instructions

This is a Bun-only TypeScript monorepo — there is no long-running service, web server, or database. Everything is short-lived CLI invocations (the `amadeus-*.ts` tools under `.claude/tools/`, run via `bun`). The startup update script already installs Bun 1.3.13 and runs `bun install --frozen-lockfile`, so dependencies are ready when a session begins.

- **`bun` on PATH**: the Bun installer appends `~/.bun/bin` to `~/.bashrc`. Non-interactive shells may not pick it up; if `bun` is not found, prefix commands with `export PATH="$HOME/.bun/bin:$PATH"` or call `~/.bun/bin/bun` directly.
- **Standard commands** (see root `package.json` scripts, and `docs/reference/09-testing.md`): `bun run lint` (Biome), `bun run typecheck` (tsc `--noEmit`), `bun run test:ci` (smoke+unit+integration), `bun tests/run-tests.ts --all`. `bun run lint` exits 0 with cognitive-complexity **warnings** (not errors) — that is the expected baseline, not a regression.
- **Pre-commit hook** (lefthook, `lefthook.yml`, #1984, #3405): `bun install` auto-installs a `pre-commit` git hook (via the `prepare` script) that runs `bun run typecheck` (whole-repo), a biome lint scoped to staged files only (`bunx @biomejs/biome check {staged_files}`, resolving to the same devDependency-pinned biome version CI's `bun run lint` uses, restricted via `glob` to the same five directories that script covers — never whole-repo, so a pre-existing finding in an untouched file can't block an unrelated commit, and the step is skipped entirely on a doc-only commit), and `bun scripts/precommit-related-unit-tests.ts` — the last one runs only the `tests/unit/*.test.ts` files whose `covers: file:<path>` header names a staged file. Skip with `git commit --no-verify` for an emergency/WIP commit — CI (`bun run check` + the full test suite) always re-verifies afterward, so skipping never lets a real problem land unnoticed. See `docs/reference/09-testing.md` § Trigger Points.
- **Test timeouts on constrained VMs**: `bun run test:ci` runs files in parallel. On a CPU-constrained cloud VM a handful of heavy integration files (notably the Codex-harness / upstream-migration suites such as `t227-codex-migration-walking-skeleton`, `t-codex-hooks-ownership`, `t-codex-hooks-migration`) can exceed Bun's default per-test timeout on their first (cold-compile) run and report as failures. They are **flaky timeouts, not real failures**: rerun the affected file(s) in isolation with a raised timeout, e.g. `bun test --timeout 120000 <file>`, and they pass. Expect heavy wall-clock drift on integration tests here.
- **`doctor` needs an active intent**: `bun .claude/tools/amadeus-utility.ts doctor` (and `status`) read/write an audit shard and fail with "No intent resolved" on a fresh workspace with no active intent. The engine auto-births the first intent on the first `/amadeus` run; to exercise the engine directly you can birth one with `bun .claude/tools/amadeus-utility.ts intent-birth` (this mutates the tracked `intents.json` and creates an intent record dir — revert those if it was only a throwaway demo).
- **Optional tooling**: the complexity gate uses Python `lizard==1.23.0` (`pip install lizard`, installs to `~/.local/bin`); it is optional and tests skip cleanly without it. Live AI-harness/model tests self-skip when no model provider or `codex`/`claude` CLI is present.
- **Treat `dist/` and generated self-install surfaces as disposable local build output.** Edit framework sources under `packages/framework/core/` or `packages/framework/harness/<name>/`, then run `bun run build`. Do not commit generated `dist/`, `.claude/`, `.codex/`, `.agents/`, `.cursor/`, `.opencode/`, `.kimi-code/`, or `.pi/` files outside the tracked bootstrap/configuration allowlist. CI verifies two isolated builds are byte-identical and `bun run source-only:check` rejects generated files that cross the Git boundary.
