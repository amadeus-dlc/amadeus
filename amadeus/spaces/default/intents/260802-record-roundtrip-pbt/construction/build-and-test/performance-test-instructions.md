# Performance Test Instructions — record-roundtrip-pbt (#1980)

上流入力(consumes 全数): code-generation-plan.md(全6 unit — 各 Bolt の実装方針・TDD・検証計画)、code-summary.md(全6 unit — 着地 PR・実装内容・テスト・実測ゲート・逸脱裁定)

## 選定範囲

Test Strategy は Comprehensive だが、**承認済み NFR と実在境界へ trace できる範囲だけを生成する**(cid:build-and-test:bt-proportional-selection)。本 intent で trace 可能な性能要件は次の1件のみで、負荷試験・auto-scaling・DAST は対象境界が存在しないため生成しない。

## NFR-4(決定性と実行時間)

code-generation-plan.md の各 PBT unit が出荷条件として持つ基準:

- **PR CI 階層**: 新規 PBT ファイル群の `bun test` 直接実行の合計が **2秒以内**
- **決定性**: PBT_SEED 固定により同一 seed で反例が再現すること

## 実行

```bash
bun test tests/unit/t416-election-model-roundtrip.pbt.test.ts \
         tests/integration/t417-election-store-failclosed.pbt.test.ts \
         tests/unit/t418-state-receipts-codec.pbt.test.ts \
         tests/unit/t419-state-field-codec.pbt.test.ts
# 深掘り階層(非ブロッキング、手動)
AMADEUS_PBT_DEEP=1 bun test --timeout=30000 <上記 + tests/unit/t274-amadeus-mirror-state-codec.test.ts>
```

## 既知の実測(code-summary.md からの転記)

| 対象 | 実測 |
|---|---|
| election-readpath の新規2本 | `Ran 7 tests across 2 files. [179.00ms]` |
| state-pbt の新規2本 | 255ms / 99ms / 105ms(3回) |
| mirror-property の t274 増分 | ≈20ms(追加前 93〜98ms → 107〜121ms) |
| 深掘り5本(ジョブ命令形) | 36 pass / 600,283 assertions / real 8.42s |

深掘り階層は **CI のブロッキング集合に入れない**(FR-5b)。所要時間の上限は `timeout-minutes: 5`(実測 8.8s × K=3 + setup 120s ≈ 146s → ×2 → 切り上げ。K は推定であり初回実 run で再導出する)。

## 生成しなかった検査と理由

- 負荷試験・スループット測定 — 常駐サービスが存在せず(全て単発 CLI / テスト実行)、測定対象の SLI がない
- スケーラビリティ検査 — nfr-design が `cid:nfr-design:c1` に従い常駐サービス機構を非適用と判定済み
