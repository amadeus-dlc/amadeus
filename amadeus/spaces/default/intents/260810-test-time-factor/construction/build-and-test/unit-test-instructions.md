# 単体テスト手順 — TEST_TIME_FACTOR

上流の [`code-generation-plan.md`](../{unit-name}/code-generation/code-generation-plan.md) と [`code-summary.md`](../{unit-name}/code-generation/code-summary.md) にある `FR-1`〜`FR-8` の実装契約を検証する。

## セットアップと実行

テストフレームワークは `bun:test`、テストデータはテスト内の一時 workspace と文字列 fixture を使用する。

```sh
TEST_TIME_FACTOR=1 bun test tests/unit/t-test-time-factor.test.ts tests/unit/t-test-time-factor-consumers.test.ts
TEST_TIME_FACTOR=2 bun tests/run-tests.ts --unit
```

## 期待するカバレッジ

- 未指定=`1`、係数 `1`/`2`/`3`、小数の切り上げ、不正値、safe-integer overflow を網羅する。
- runner の既定値と明示基準値へ係数を一度だけ適用する。
- `AMADEUS_TEST_TIMEOUT` を最終値として再係数化しない。
- 性能閾値、意図的な timeout/hang、ISO 境界、本番 timeout が不変である。

## 成功条件

- unit tier の failed files / assertions がともに `0` である。
- テストは外部サービスや共有可変状態に依存せず、各 fixture を実行内で作成・破棄する。
