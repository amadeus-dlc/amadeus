# Scalability Design — U8: legacy-writer-removal

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

scalability-requirements.md の結論（通常意味でのスケーラビリティ要件はほぼ不適用、残るのは判定コストの CI 内収容のみ）に対する設計。

## 判定コストのスケール設計

- call-site guard の走査コストは全ソース木（現行 ~655 テスト・core 53+ TypeScript 規模）の線形走査で完結し、削除対象となる ~1600 call site（FR-MIG-2）規模でも CI ジョブ内で完結する（performance-design の 10 分予算内に包含）
- retention 判定器は Intent 件数に対する単純走査であり、Intent ごとの追加 process 起動・ネットワーク問合せを持たない。件数増で判定アルゴリズムの変更を要しない
- 六 checker は互いに独立に実行可能で、1 checker の FAIL/UNKNOWN が他 checker の実行を停止させない。全条件の結果を常に集約する（business-logic-model.md § 削除ゲート 1-3）

## 不適用の明文化

- 同時実行数・スループット・データ容量の増大に対する要件は、本 Unit の成果物（判定器・削除手続き）に該当する面がない。定量的制約は performance-design の CI 時間予算に集約した
- ゲート評価の実行は 1 Intent につき 1 回の削除手続きで完結し、複数 Intent 同時評価や評価結果の蓄積管理を要件に含めない（report の永続化は CI artifact 機構に委譲、BR-16）

## 検証設計

- 判定器の fixture 件数可変テストで retention 判定の件数依存性を確認し、評価器の集約ロジック単体テストで checker 独立性を固定する
