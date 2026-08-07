# Security Test Instructions — 260807-merged-pr-convergence

上流入力(consumes 全数): unit landed-report の `code-generation-plan.md`(TDD 計画と裁定)と `code-summary.md`(実装・検証実績 — `construction/landed-report/code-generation/`)。

## 適用判定 — 専用 SAST/DAST は適用外、fail-closed/偽装防御の検証は適用

セキュリティ専用 NFR は不在。専用 SAST/DAST は新設しない(cid:build-and-test:c3 — 実測明記のある場合のみ比例選定)。

## ガード整合の検証(本変更の実質)

- fail-closed 保存: 未知 lifecycle state の throw(t482 exit 2 固定)・MERGED なのに mergedAt/oid null の throw(t481)。
- 偽装防御: 手書き landed report の converged 矛盾・フィールド欠落・unparseable merged at を sensor が finding 化(t450 両側実測)。
- 残余の台帳: #2412(state 欠落 fail-open)/ #2417(landed への override 許容)— いずれも選挙裁定付き deferral。
- 依存追加ゼロ。stderr digest 化(機微不保持)は無変更。
