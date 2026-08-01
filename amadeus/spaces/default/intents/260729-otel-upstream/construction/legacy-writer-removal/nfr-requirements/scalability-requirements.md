# Scalability Requirements — U8: legacy-writer-removal

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 適用範囲の限定

本 Unit は新規ランタイム API・常駐プロセス・データ蓄積を追加しないため、通常意味でのスケーラビリティ要件（負荷・同時実行・容量）はほぼ不適用である。残るのは「判定コストが対象規模に対して CI 内に収まるか」の一点のみであり、以下に限定して定める。

## 目標

| 項目 | 目標 | 測定方法 |
|---|---|---|
| call-site guard の走査コスト | 全ソース木（現行 ~655 テスト・core 53+ TypeScript 規模）の静的検査が線形走査で完結し、削除対象となる ~1600 call site（FR-MIG-2）規模でも CI ジョブ内で完結する | guard の CI 実行時間計測（performance-requirements.md の 10 分予算内に包含） |
| retention 判定の Intent 数依存 | retention 判定器は Intent 件数に対する単純走査であり、Intent ごとの追加プロセス起動・ネットワーク問合せを持たない。件数増で判定アルゴリズムの変更を要しない | 判定器の fixture 件数可変テスト |
| checker の独立性 | 六 checker は互いに独立に実行可能で、1 checker の FAIL/UNKNOWN が他 checker の実行を停止させない（全条件の結果を常に集約する） | 評価器の集約ロジック単体テスト |

## 不適用とする理由

- 同時実行数・スループット・データ容量の増大に対する要件は、本 Unit の成果物（判定器・削除手続き）に該当する面がない。性能上の定量的制約は performance-requirements.md の CI 時間予算に集約した
- ゲート評価の実行は 1 Intent につき 1 回の削除手続きで完結し、複数 Intent 同時評価や評価結果の蓄積管理を要件に含めない（report の永続化は CI artifact 機構に委譲、BR-16）
