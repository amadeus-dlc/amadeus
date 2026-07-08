# Changelog

## [1.2.0] - 2026-07-09

- The npm-distributed `@amadeus-dlc/setup` installer (`bunx @amadeus-dlc/setup install` / `npx @amadeus-dlc/setup install`) is now the primary way to install Amadeus-DLC. Pick a harness interactively or pass `--harness`/`--target`/`--yes` for non-interactive use; `amadeus-setup upgrade` updates an existing install with a diff-style plan that preserves your customizations. The manual `cp -r dist/<harness>` steps moved out of the README into the Troubleshooting guide's manual-copy fallback (for when the installer itself isn't reachable).
- Corrected root `package.json` metadata: `license` now reads `(MIT OR Apache-2.0)`, matching the shipped dual-license files (it previously read the mismatched `MIT-0`); the `repository` field now points at this repository instead of a stale reference, and the leftover `directory` subfield from an earlier monorepo layout was removed.

## [1.1.0] - 2026-07-07

- Added **Grill me**, a fourth question interaction mode: a relentless one-question-at-a-time interview — each question with a recommended answer and rationale, facts self-researched with only decisions asked, hybrid termination ("done" any time, continuation check at the depth guideline), and an explicitly confirmed agreement summary before artifact generation. Available at every gated stage's mode selection (annotated as exceptional use in Construction/Operation); answers keep the existing questions-file and per-question `decision`/`answer` audit contract.
- Added the read-only session skill `/amadeus-grilling <file-or-topic>` — the same grilling discipline outside a workflow: terminal-only, never advances the stage pointer, never emits audit events, writes a summary file only on explicit request. Ships in all four harness dists (codex under `.agents/skills/`).
- The grilling discipline lives once in `amadeus-common/protocols/grilling-protocol.md`, adapted from Matt Pocock's grilling skill (mattpocock/skills, MIT License) with attribution.

## [1.0.0] - 2026-07-07

- Realigned the framework version to the 1.0.0 GA Preview baseline: `amadeus-version.ts` still carried the pre-rebrand 2.2.0 while the README badge said 1.0.0. All version surfaces (version.ts, README badge, this changelog) now agree.
- Each `dist/<harness>/` now ships a plain-text `VERSION` file at the engine-dir root (e.g. `.claude/VERSION`), emitted by `scripts/package.ts` from `AMADEUS_VERSION`. An installed copy's framework version is now checkable with `cat .claude/VERSION` — no need to open `tools/amadeus-version.ts` or run the CLI.
