# Security Test Instructions

## Scope

directive path の allowlist と reviewer read scope が Unit 境界を越えないことを確認する。

## Commands and expectations

`bun run source-only:check` と reviewer protocol の focused tests を実行し、外部入力による任意パス読取りや未検証 state 遷移がないことを確認する。
