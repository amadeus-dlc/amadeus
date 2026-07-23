# §13 学習候補 — reverse-engineering(260723-fixture-shard-pollution)

提出: conductor e4、2026-07-23T01:47Z 頃。leader の 0件確認選挙用 verbatim 正本。

## 候補: 0件(不採用整理のみ)

diary surface 4件(c1〜c4)はいずれも既存 cid の機械的執行で新規ノルム候補なし:

| # | source | 要旨 | 不採用理由 |
|---|---|---|---|
| c1 | Interpretations | record-sync 着地確認→origin/main 先行マージ→祖先最小距離 base 採用(dist 101→13) | cid:rescan-base-ancestry+rescan-prompt-record-sync の機械的執行(着地済み record-sync の取り込みは同 cid が既に予定する効用) |
| c2 | Interpretations | センサー構造不適合→conductor 手動確認代替(照合4点・placeholder 0・現在マーカー単一) | cid:re-sensors-codekb-filter-mismatch(知識クラス)の執行 |
| c3 | Deviations | intents.json 衝突の dirName 和集合解消(68行・parse OK・markers 0) | cid:intents-json-union-resolution の機械的執行 |
| c4 | Tradeoffs | Developer→Architect 直列+乖離ゼロ時は無編集(外科的最小) | cid:reverse-engineering:c3+surgical 原則の執行 |

parked open questions: 3件(t118 実汚染未実測 / 修正対象集合の選挙 / _resetCloneIdForTests 配線先)— requirements/design へ申し送り済み(re-scan record 参照)。
