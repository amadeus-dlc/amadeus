# Risk & Sequencing Rationale — 制御バイト検出ゲート(Issue #2814)

上流入力(consumes 全数): requirements.md(NFR-3 fail-closed = リスク対策の要件面)、components.md(変更面の狭さ = 交差リスク評価)、unit-of-work.md(単一 Unit = シーケンシングの自由度)、unit-of-work-dependency.md(依存なし = ブロッキングリスクなし)、unit-of-work-story-map.md(正常系 UX = 偽陽性リスクの許容度ゼロ)

## リスク台帳(RAID)

| # | リスク | 影響 | 対策(実在確認済み) |
|---|---|---|---|
| R-1 | 落ちる実証の注入がツリーへ残留 | ゲート恒久赤・混入の自己実現 | 注入→赤→復元→残渣ゼロを不可分1セット化(FR-CBG-9)。残渣ゼロはバイト走査+git status で機械確認 |
| R-2 | base 前進で新規バイナリが tracked 化し sweep が赤 | CI 恒久赤 | 初期 census はマージ先最終 base で採る(c5-ratchet-census-at-final-base)。PR 発行前の再接地で sweep 再実測 |
| R-3 | full-tree 走査が timeout 30s を超過 | CI flake | RE 実測 16,124 files のバイト走査は直列で数秒級の見込み。実装時に実測記録(FR-CBG-14)、超過時のみ設計再訪 |
| R-4 | 起草成果物自体への制御バイト混入(本 intent で2回実測) | record 汚染 | 書込後バイト走査ノルム(c4-control-byte-drafting、persist 済み)+ 本ゲート自身が着地後は CI で捕捉 |
| R-5 | ci.yml の並行 intent との交差(共有ファイル) | merge 衝突 | 追加は独立ジョブ1ブロック — 挿入位置を既存ジョブ末尾に置き textual conflict 面を最小化。PR 発行直前に origin/main 再実測(base-advance-regrounding) |

## シーケンシング根拠

Bolt 内順序(bolt-plan.md の (1)〜(5))はリスク制御: 落ちる実証を最後に置くのは注入時点で完成済みゲートが必要なため(R-1 の窓を最小化)。TDD 先行(述語→CLI)は Red 実測を伴う vertical slice の規律(team.md tdd-default)。sweep((4))を落ちる実証((5))より先に置くのは、偽陽性ゼロを確認した clean 状態を注入の対照(ベースライン)にするため。
