# Integration Test Instructions — metrics 可視化

上流入力(consumes 全数): code-generation-plan.md, code-summary.md

両 unit の code-generation-plan.md(実施計画・検証手順)と code-summary.md(変更ファイル・検証結果)を検証対象の定義として消費する。

## 実行

```bash
bun test tests/integration/t298-metrics-visualize.integration.test.ts
```

## 対象(AMADEUS_METRICS_ROOT env seam、spawn+in-process 二重駆動)

18テスト: --write 生成 / fail-closed 落ちる実証4種(壊れ JSON・空 dir・不在 dir・dangling symlink → 全て exit 1+zero-write)/ usage exit 2 / 実データ sweep(123件・6コレクタ出現)/ --check round trip・tampered・missing / over-ceiling zero-write / AC-7 契約 grep(timeseries の fs write import 不在)
