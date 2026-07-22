# Integration Test Instructions

上流入力(consumes 全数): code-generation-plan.md, code-summary.md

## 対象と境界

- 実 FS を跨ぐ結合面: fixture registry / evidence store / provenance store / TLC toolchain fetch / blind scan(いずれも tests/integration/ の t-formal-verif-* 群)
- U5 skeleton 統合 harness: `tests/integration/t-formal-verif-tla-skeleton.integration.test.ts` ほか(freeze→Arm T→#1252 composition の closed contract)
- U6 blind 境界: `tests/integration/t-formal-verif-arm-s-blind.integration.test.ts`(実ソース走査で禁止 import 0 件+allowlist 厳密一致)

## 実行コマンド

| 対象 | コマンド |
| --- | --- |
| formal-verif integration 全数 | `bun test tests/integration/t-formal-verif-*.test.ts` |
| E2E(U5 command surface) | `bun test tests/e2e/t-formal-verif-tla-skeleton.test.ts` |

## 環境

- 一時ディレクトリは各テストが自前確保・破棄。repo 外 scratch 規律に準拠
- クロスユニット結合(U1 dispatcher ← U2〜U8 handlers)は U8 wiring test が handler 一意性と error propagation を検証

## 既知の残課題

- B1 skeleton 側 tests tsconfig の型エラー 9 件(tla-skeleton-harness ほか)は既存 baseline。bun test 実行自体の green とは独立(記録: build-test-results.md)
