# Code Generation Plan — U1 boundary-guard

> 上流入力(consumes 全数): business-logic-model、business-rules、domain-entities、performance-design、security-design、reliability-design、logical-components(FD/ND の確定設計を実装へ転写)

## 実装対象(logical-components の表どおり)

1. `tests/unit/t258-boundary-guard.test.ts`(**番号 t258 予約** — 現行最大 unit t252 / integration t256、e1 進行中の t257 を回避。swarm-test-number-reservation): 述語1 `scanDistributionTreeForScriptsRefs`(substring 検出・出現単位・allowlist 免除)、述語2 `findDuplicatedAssets`(重複不変量3状態)、`AllowRule.parse`(id 非空+pattern 検証の Result 型)、`SCAN_ROOTS` canonical 定数 — 全て同ファイル内 export+入力データ駆動テスト
2. `tests/integration/t258-boundary-guard.integration.test.ts`: 実 FS 走査(SCAN_ROOTS 配下収集)→述語1 live 適用(allowlist 込み)+述語2 live 適用(scripts/ vs core/tools+core/skills)
3. `tests/fixtures/boundary-guard/`: 落ちる実証 fixture(scripts/ 参照を含む SKILL 断片)

## 落ちる実証の段取り(FR-5b、Bolt 1 内)

- fixture 赤: unit テストで fixture が Finding を返すことを assert(常時 green の証明テスト)
- **live 赤の実測**: 本 Unit 時点では contrib SKILL の scripts/ 参照が現存するため integration の live 述語1検査は**赤になる — これが落ちる実証の実測**。赤の実測値(Finding 件数・所在)を code-summary へ記録し、U2(同 Bolt)の SKILL 書き換えで green 化する。CI へは Bolt PR(U1+U2 同乗)で green の状態のみが乗る
- 重複不変量 live は現状 green(scripts のみ実在)で即時有効

## 検証コマンド

bun test tests/unit/t258-boundary-guard.test.ts / bun test tests/integration/t258-boundary-guard.integration.test.ts(live 述語1のみ赤を許容・記録)/ bun run typecheck / bun run lint

## 逸脱の扱い

設計(FD/ND)からの逸脱は実装前に停止して conductor へ申告(既存様式への準拠と判断する場合も停止対象)。
