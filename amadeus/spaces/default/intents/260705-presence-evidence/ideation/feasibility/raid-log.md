# RAID ログ — Presence Evidence（260705-presence-evidence）

上流入力: [constraint-register.md](constraint-register.md)

## Risks

| ID | リスク | 緩和 |
|---|---|---|
| R-1 | 候補 1 を単独採用すると現行運用（転記 evidence）が全拒否され、docs 系 Intent が停止する | feasibility 実測 1 を採否判断の入力に明示（セット採用か不採用の二択に整理） |
| R-2 | 秒窓相関は「窓内に別目的の HUMAN_TURN が偶然ある」誤受理を生む | 窓の意味論を設計で明示し、残余リスクは文書化（防止は PR gate が最終防衛の現行整理を維持） |
| R-3 | 並行 Intent と amadeus-state.ts が衝突する | Construction 前のピア連絡（CON-5） |

## Assumptions

| ID | 前提 | 検証 |
|---|---|---|
| A-1 | 実測した時系列パターン（転記前の mint なし、同秒ティア）は他 Intent でも同様 | 260705-engine-installer / steering-learnings の shard でも確認可能（同じ運用で生成） |

## Issues / Dependencies

- I-1: 採否は契約級（人間個別確認待ち）。
- D-1: engineer1 #428（tools 更新）、engineer3 #504+#507（tools 変更）との接触面。
