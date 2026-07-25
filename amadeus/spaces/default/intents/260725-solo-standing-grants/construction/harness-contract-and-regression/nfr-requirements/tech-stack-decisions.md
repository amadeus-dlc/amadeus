# Tech Stack Decisions: harness-contract-and-regression

## Inputs

`business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`を確認した。

## Decisions

| Concern | Selection | Rationale |
|---|---|---|
| Canonical runtime | Bun 1.3.x compatible + strict TypeScript ESM | core/generator/hooks/testsの現行基盤 |
| Projection | existing harness generator + compiled manifest | 6 harnessの単一正本と将来追加の自動列挙 |
| Presence adapter | 各hostのtrusted UserPromptSubmit session identity → canonical reservation API | UI差を監査意味論へ持ち込まない |
| Runtime state | existing gitignored `.amadeus-sessions/` | new config/persistence modelを作らずsession-local |
| Intent identity | existing `intents.json` UUIDv7/status registry | pathをpublic contractにせず新modelも作らない |
| Persistence | existing Markdown state + append-only audit | grant/audit正本を維持 |
| Verification | `bun:test`、fast-check、existing integration/drift scripts | semantic matrixと生成物収束 |
| Formatting/type | Biome + existing strict typecheck | repository規約 |

## Compatibility and Ownership

canonical coreがdirective、report、state、reservation、hook contractを所有し、各harnessはhost session identityとprompt renderingだけをadapter化する。generated fileを直接編集せず、team leader/delegationと通常human pathへsolo field・lock・reservationを適用しない。

現adapterのidentity seamはClaude/Codex/Cursor/Kiro CLIに存在する。Kiro IDEとOpenCodeはstable host-native identity adapterを追加し、そのintegration fixtureがgreenになるまで本featureのharness acceptanceを満たさない。identity欠落時のshared fallback key、PID、active cursor推測を禁止する。

## Rejected Additions

per-harness bespoke state machine、remote session store、new database/service、standing grant config、pseudo gate、stderr text classifier、新runtime dependencyは導入しない。frozen [PR #1468](https://github.com/amadeus-dlc/amadeus/pull/1468) の実装物もdependencyにしない。

## Traceability and Ownership

| Decision | Upstream | Harness rules | Verification |
|---|---|---|---|
| canonical generator/manifest | FR-24–26, NFR-08 | HR-01–04b | generation/drift |
| trusted session adapter | FR-18, FR-24–25, NFR-01–04 | HR-02–04, HR-08, HR-21 | hook E2E |
| existing intent registry | FR-02, FR-12–18, NFR-03 | HR-04d–e, HR-21, HR-24 | registry/target integration |
| existing runtime/audit/state | NFR-01, NFR-05–06 | HR-05–09, HR-16 | regression suites |
| existing verification stack | NFR-07–08 | HR-15, HR-18–22 | focused/full/type/drift |
