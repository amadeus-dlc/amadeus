# Build and Test Summary — 260730-open-bug-batch-2

上流入力(consumes 全数): 6 unit の code-generation-plan.md・code-summary.md(fix-1769-degrade-multiunit / fix-1749-phase-check-name / fix-1734-scopegrid-order / fix-1735-autosolo-protocol / fix-1742-sensor-scope / fix-1750-intent-initialized)— 検証対象・手順・実測証拠は各 unit の plan/summary から導出。

## 要約

6 Bolt(=6 Issue)すべて PR マージ・Issue クローズ・着地 grep 実測済み: #1769→#1774、#1749→#1776、#1734→#1781、#1735→#1782、#1742→#1758(引き取り)、#1750→#1791。§12a architecture-reviewer は6 unit 全て iteration 1 READY(origin/main 実測レビュー)。

## 検証の書き分け

検証済み = 静的検査・unit/integration・drift・落ちる実証(各 Bolt 1-3 セット)・6 PR の CI green・着地 grep。未検証 = (1) #1735 の codex 実運用発火(次回 codex セッションで観測、不発なら reopen) (2) #1750 の intent-initialized boundary の実運用初回発火(次の新規 intent birth が最初の実走)。

## 判定

条件付き READY — 上記未検証2面を明示引き継ぎのうえゲートへ進む(bt-verdict-names-unverified-facets 準拠)。
