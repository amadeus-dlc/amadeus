# Unit of Work Story Map — 260807-merged-pr-convergence

上流入力(consumes 全数): `unit-of-work.md`(Unit 定義)、`requirements`(FR/AC)、`components` / `component-methods` / `services` / `component-dependency` / `decisions`(設計面 — Unit 内スライスの導出元)。

## ストーリーマップ(Unit: landed-report 内の垂直スライス)

| # | スライス(TDD 1件ずつ) | 対応 FR/AC | 価値 |
|---|---|---|---|
| 1 | PrLifecycleState 閉集合 parse(Red: 未知値 throw) | FR-1.2 / AC-1b | fail-closed の土台 |
| 2 | gh-runner クエリ拡張 + RawPrState | FR-1.1 / AC-1a | MERGED 観測可能に |
| 3 | status の landed 短絡(sleep 0 回・exit 0・verdict) | FR-2.1〜2.3 / AC-2a-c | 50秒待ち解消 |
| 4 | report の landed variant + render + 書込 | FR-3.1〜3.3 / AC-3a-c | guard 通過(中核価値) |
| 5 | sensor kind 拡張 + checkLanded | FR-4.1〜4.2 / AC-4a-b | 偽装検出の対 |
| 6 | stage 文書 + docs 棚卸し | FR-5.1〜5.2 | 語彙3面の一貫 |

## 実装順序と walking skeleton

スライス 1→2→3→4→5→6 の順で実装(観測 → 判定 → I/O → 検証 → 文書)。全スライスが揃って初めて end-to-end(マージ済み PR → landed report → sensor PASS)が成立する = walking skeleton は Unit 全体で1本。TDD(NFR-1)によりスライスごとに Red 実測 → 最小実装 → Green を反復する。
