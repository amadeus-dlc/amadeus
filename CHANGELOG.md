# Changelog

## [1.0.0] - 2026-07-07

- Realigned the framework version to the 1.0.0 GA Preview baseline: `amadeus-version.ts` still carried the pre-rebrand 2.2.0 while the README badge said 1.0.0. All version surfaces (version.ts, README badge, this changelog) now agree.
- Each `dist/<harness>/` now ships a plain-text `VERSION` file at the engine-dir root (e.g. `.claude/VERSION`), emitted by `scripts/package.ts` from `AMADEUS_VERSION`. An installed copy's framework version is now checkable with `cat .claude/VERSION` — no need to open `tools/amadeus-version.ts` or run the CLI.
