# Build Instructions — Codex Duration Bounds

## 対象と上流

4 Unitの各 `code-generation-plan.md` と `code-summary.md` を入力に、依存順 #1602 → #1998 → #1999 → #1919 でmainへ着地した統合状態を検証する。対象は最新main `11fc8a7206c2b6960d122ef7cd99ef404fd846ce` であり、Codex専用実装ではなく全7 harness共通coreとharness adapter境界を含む。

- #1602: [PR #2031](https://github.com/amadeus-dlc/amadeus/pull/2031)、merge `8448fdc6e59ca0e55b6f701bcec125c5c336fe8b`
- #1998: [PR #2048](https://github.com/amadeus-dlc/amadeus/pull/2048)、merge `a9b96e3ee6bccb4ac04702a9621ce92886e96a05`
- #1999: [PR #2063](https://github.com/amadeus-dlc/amadeus/pull/2063)、merge `845fd2c936d81d4ca7ef121709717f366ec28f28`
- #1919: [PR #2071](https://github.com/amadeus-dlc/amadeus/pull/2071)、merge `a8e1ce025a918310ab7d803270bb6fc6b649c598`
- #1919追補: [PR #2075](https://github.com/amadeus-dlc/amadeus/pull/2075)、merge `11fc8a7206c2b6960d122ef7cd99ef404fd846ce`

## 環境準備

```bash
mise trust
bun install --frozen-lockfile
```

Bun 1.3.13、TypeScript strict、lockfile既定依存だけを使用する。model provider credential、remote collector、長時間service、databaseは不要である。

## Build と配布面検証

```bash
bun run typecheck
bun run lint
bun scripts/package.ts --check
bun run promote:self:check
```

lintの既存cognitive-complexity warningはexit 0の既知baselineとして扱い、新規errorと区別する。package driftはhand-authored sourceを修正してから再生成し、`dist/`やpromoted treeを直接編集しない。

## 合格基準

typecheck error 0、lint error 0、7 harnessのpackage drift 0、5 self-install faceのdrift 0を必須とする。full regressionと対象testは別途全件Greenにし、live substrate未提供による自己skipを製品failureと混同しない。
