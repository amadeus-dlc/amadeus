# Integration Test Instructions — 260730-open-bug-batch-2

上流入力(consumes 全数): 6 unit の code-generation-plan.md・code-summary.md(fix-1769-degrade-multiunit / fix-1749-phase-check-name / fix-1734-scopegrid-order / fix-1735-autosolo-protocol / fix-1742-sensor-scope / fix-1750-intent-initialized)— 検証対象・手順・実測証拠は各 unit の plan/summary から導出。

## 対象

- #1769: t367(uncovered-unique 両側+directive.unit+covered 単一契約、15 pass)
- #1749: t368(正準名 drift、完全テンプレート検証、2 pass)
- #1735: t369(auto-solo フック drift、8 pass / 170 assertions)+ codex live e2e t-exec-codex-autosolo-s13(SKIP ガード様式)
- #1750: t371(intent-initialized boundary — SKIP スコープ birth 直後 emit / off 非発火 / pending 再試行 / 冪等)+ mirror 契約 9-10 files(t265系/t282/t361/t287/t291、214-215 pass)
- #1742: PR #1758 の CI(t94/t95 期待値更新込み 17 pass)

## 実測

全て各 PR の CI green で担保(マージ済み6 PR: #1774 #1776 #1781 #1782 #1758 #1791)。
