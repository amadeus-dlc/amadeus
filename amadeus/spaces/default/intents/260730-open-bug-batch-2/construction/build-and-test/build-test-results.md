# Build Test Results — 260730-open-bug-batch-2

上流入力(consumes 全数): 6 unit の code-generation-plan.md・code-summary.md(fix-1769-degrade-multiunit / fix-1749-phase-check-name / fix-1734-scopegrid-order / fix-1735-autosolo-protocol / fix-1742-sensor-scope / fix-1750-intent-initialized)— 検証対象・手順・実測証拠は各 unit の plan/summary から導出。

## Bolt 別結果(すべてマージ済み・Issue クローズ済み)

| Bolt | PR | CI | 落ちる実証 | 特記 |
|---|---|---|---|---|
| #1769 | #1774 | 17 pass | 2セット(4テスト赤/2テスト赤→復元) | E-OBB2-CG1 裁定 B、レビュー2件対処 |
| #1749 | #1776 | 17-18 pass | 正本 revert 0/2→復元 2/2 | Minor 2件対処(完全テンプレート化) |
| #1734 | #1781 | 17 pass | 旧実装 2 fail/own-property 回帰 | Major 1件対処+無音転位再ピン(689) |
| #1735 | #1782 | 17 pass | 3種(文言 revert/旧 fixture/--file 省略) | Medium 3+Major 2 対処、排他3分岐化 |
| #1742 | #1758 | 17 pass | (別セッション実装、受入条件は CI 担保) | 引き取り型 |
| #1750 | #1791 | 17 pass(attempt 2) | base checkout 7赤/pending revert 1赤 | digestMatrix 分散フレーク再帰属、レビュー2件対処 |

## 総合判定

全 Bolt green。未検証面(codex 実運用発火・intent-initialized 初回実走)は summary の書き分けどおり明示引き継ぎ。
