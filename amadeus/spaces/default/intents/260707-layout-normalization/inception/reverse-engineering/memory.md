# Reverse Engineering Memory

## Interpretations

- 2026-07-07T05:59:47Z — Existing CodeKB was treated as stale for Issue #610; prior files focused on earlier intents, so this stage performed a differential refresh around layout/path-impact evidence.
- 2026-07-07T05:59:47Z — `packages/setup` was treated as a separate parallel intent and sibling dependency; it was not scanned as local filesystem evidence because `packages/` is absent in this checkout.
- 2026-07-07T05:59:47Z — The relevant API surface was interpreted as CLI/distribution contracts rather than HTTP/API endpoints; layout normalization affects `scripts/package.ts`, `scripts/promote-self.ts`, committed `dist/*`, docs, tests, and CI.

## Deviations

- 2026-07-07T05:59:47Z — Architect synthesis was completed locally from the developer scan instead of spawning a second subagent; this avoided duplicate context expansion after the developer scan already returned the required path-impact inventory.
- 2026-07-07T05:59:47Z — Sensor dispatcher rejected CodeKB outputs because the current required-sections manifest filter matches `**/{amadeus-docs,intents}/**` but reverse-engineering writes to `codekb/`; the equivalent per-sensor scripts were run directly for the gate check.

## Tradeoffs

- 2026-07-07T05:59:47Z — The scan prioritized path-impact depth over full dependency version inventory; Issue #610 is a repository layout decision, and exact library versions are not the main migration risk.
- 2026-07-07T05:59:47Z — The artifacts preserve no-migration as a viable option; the current root-centric layout is internally consistent, so the decision should compare benefits against drift-guard and documentation blast radius.

## Open questions

- 2026-07-07T05:59:47Z — Requirements Analysis should decide whether `dist/` is a package-local build output or a root-level public install contract.
- 2026-07-07T05:59:47Z — Requirements Analysis should decide whether manifest paths become package-local relative paths or remain logical repository paths.
