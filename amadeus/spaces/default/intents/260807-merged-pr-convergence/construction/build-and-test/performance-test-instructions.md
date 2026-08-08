# Performance Test Instructions — 260807-merged-pr-convergence

上流入力(consumes 全数): unit landed-report の `code-generation-plan.md`(TDD 計画と裁定)と `code-summary.md`(実装・検証実績 — `construction/landed-report/code-generation/`)。

## 適用判定 — 専用負荷試験は適用外

承認済み要件に性能 NFR は不在(NFR-1〜4 = TDD/検証集合/配布境界/台帳波及)。専用試験は新設しない(cid:build-and-test:c4)。

## 患部対応の既存面

- 性能効果(マージ済み PR の約50秒 → 即時)は AC-2a の決定的シーム検証(sleep seam 0 回)で構成要素を確認済み — 実時間測定より優先(cid:build-and-test:wtfbt-c3 の型)。retry 定数の出典 = predicate.ts:204-205。
