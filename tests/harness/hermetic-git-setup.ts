// hermetic-git-setup.ts — #3413: the harness-wide seam, wired as bunfig.toml's
// `[test] preload` so it runs in EVERY `bun test` process before any test module
// is evaluated.
//
// Why a preload and not just the runner. tests/run-tests.ts already scrubs its
// own process environment, which covers every file it spawns. But a fixture is
// also reachable without it — `bun test tests/unit/x.test.ts` typed directly, an
// editor's test runner, or any future wiring — and the environment that made
// #3413 destructive (a pre-commit hook started from a linked worktree, where git
// exports an absolute GIT_DIR that outranks every `cwd:`/`-C` a fixture passes)
// is inherited by all of them equally. Scrubbing `process.env` here means every
// git subprocess a test spawns — through tests/harness helpers, through a
// fixture's own spawnSync, through an amadeus tool under test — resolves the
// directory it was actually given.
import {
  applyHermeticGitEnv,
  materializeHermeticGitConfig,
} from "../lib/hermetic-git-env.ts";

applyHermeticGitEnv(process.env, materializeHermeticGitConfig());
