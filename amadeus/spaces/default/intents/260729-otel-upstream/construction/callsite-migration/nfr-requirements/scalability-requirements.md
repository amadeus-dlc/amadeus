# Scalability Requirements — U7: callsite-migration

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 目標

| 項目 | 目標 | 測定方法 |
|---|---|---|
| 移行対象規模 | 約1600 call site（FR-MIG-2）を batch 分割で全量処理できる。batch 数に上限を設けず、各 batch は独立に commit・rollback 可能 | 静的スキャンで列挙した site 総数と batch 割付表の一致を機械検証 |
| guard 走査のスケーリング | 走査コストはリポジトリファイル数に線形。allowlist 縮小に伴い走査対象の「許容集合」は単調減少し、走査時間は悪化しない | 残存 site 数の単調減少（BR-12）を batch commit ごとに機械確認 |
| 残存 site 可視化 | 残存一覧 report は常時出力可能で、site 数ゼロまで同じ形式を維持する。report 生成は走査結果から O(残存数) で構築 | BR-9 の report を CI artifact として毎実行で生成 |

## 制約

- 移行期間中の新旧混在（未変換 site の Adapter 経由）は runtime コストを site 数に比例させない。Adapter は 1 call あたり O(1) の map 参照のみ（BR-2）
- 段階性の担保: batch 書換え後に残存 site 数が減少しない変更は移行 commit として認めない（BR-12）。この機械判定は走査結果の数値比較のみで完結させ、外部サービスに依存しない

## 適用外とその理由

- 水平スケーリング・同時実行数の増大は対象外。guard・変換・shadow 比較はいずれも単一 CI runner／ローカル実行の短命 process で完結し、分散実行を要求しない（technology-stack.md: HTTP server・database なしの CLI 構成どおり）
