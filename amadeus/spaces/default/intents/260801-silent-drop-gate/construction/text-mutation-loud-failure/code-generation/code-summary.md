# Code Summary — text-mutation-loud-failure

## 実装結果

- 統合コミット: `0f4bccde6`（元 Bolt commit: `41cc4d9d3`）
- `packages/framework/core/tools/amadeus-lib.ts` に opaque validated state、discriminated mutation result、typed loud failure、private success construction を追加した。
- `amadeus-state.ts`、`amadeus-jump.ts`、`amadeus-utility.ts` の全 production callsite を明示的 result 消費へ移行した。
- per-unit record は `(unit, slug)` で一意化し、unit 内 duplicate と文脈なしの曖昧 target を fail-closed にした。
- unit／integration test、coverage registry／ratchet、全 harness projection を更新した。

## 検証結果

- focused／regression: 123件成功。最終 scope 縮小後の t108／t76／t77／t82 は66件成功。
- typecheck、lint、package check、promote-self check、coverage registry freshness、swarm referee `bun run check`: 成功。
- full CI の初回 stale coverage は registry 更新で解消し、再実行は smoke 完走後の unit 開始まで失敗なしだった。

## 計画との差分

当初の文書全体での slug 一意性は、正当な per-unit 重複と衝突した。silent first-match へ戻さず、既存 state model の unit section を target scope として `(unit, slug)` 一意性へ修正した。
