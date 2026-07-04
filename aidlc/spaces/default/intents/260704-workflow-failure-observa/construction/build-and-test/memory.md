# Build and Test Memory

## Interpretations

- 2026-07-04T10:24:00Z — Active Test Strategy は `Comprehensive` と解釈した。根拠は `aidlc-state.md` の `Test Strategy` である。
- 2026-07-04T10:24:00Z — この stage の build は deployable binary 生成ではなく、TypeScript 型検査、lint、contract check、deterministic eval を build readiness の根拠にする。

## Deviations

- 2026-07-04T10:24:00Z — `npm run test:all` は `parity:check` で停止するため、成功系の `test:it:all` と失敗系の `parity:check` を分けて記録した。

## Tradeoffs

- 2026-07-04T10:24:00Z — 外部 collector、dashboard、cloud infrastructure は検証対象にしない。U001 から U003 の code-summary が、それらを範囲外としているためである。

## Open questions

- 2026-07-04T10:24:00Z — parity lock 対象ファイルの hash 不一致は、人間承認付き例外にするか、配布基準を更新するかを次 stage 以降で判断する必要がある。
