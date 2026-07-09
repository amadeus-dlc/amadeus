# Unit Test Instructions — dynamic-test-size(#699)

> Test Strategy: **Minimal**(refactor scope 既定)— 要件駆動のユニットテスト。本 intent の新規テストは `tests/unit/t-test-size-dynamic.test.ts`(26 tests、`// size: small`、pure in-process)。

## 実行方法

```
bash tests/run-tests.sh --unit --filter "t-test-size"
```

(静的 guard `t-test-size-drift` と動的層 `t-test-size-dynamic` の両方が走る)

単一ファイル直実行: `bun test tests/unit/t-test-size-dynamic.test.ts`

## カバー内容(要件対応)

| テスト群 | 対応 FR/BR |
|---|---|
| floor 境界値(0.999/1.0/29.999/30.0、canonical 定数参照) | FR-4 / BR-1 |
| detectWallClockDrift 成立/不成立(スマートコンストラクタ) | FR-2 / BR-2 |
| buildMeasuredRecord: 注釈あり/なし/無効(degrade) | BR-2 |
| buildTestSizeReport: 集計+file 辞書順 sort(非破壊) | FR-3 / BR-4(決定性) |
| セッションライフサイクル: JUnit 優先/自前計測フォールバック | FR-1 / FR-6 |
| failure isolation: throwing session → note+null(runner 非汚染) | BR-6 / NFR-1 |
| 赤/緑 in-process fixture(small宣言×2.0s → drift / ×0.1s → none) | BR-8 |

## カバレッジ目標

- Minimal 戦略: 新規ロジック(test-size.ts 追加分)の全公開関数に最低1テスト+境界値。実績: 26 tests で全公開追加 API をカバー。`tests/**` は codecov ignore 対象のため Codecov ゲートへの影響なし。
