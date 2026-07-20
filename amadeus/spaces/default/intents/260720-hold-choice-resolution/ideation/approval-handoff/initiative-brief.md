# Initiative Brief — 260720-hold-choice-resolution

上流入力(consumes 全数): intent-statement.md、scope-document.md、intent-backlog.md、feasibility-assessment.md、constraint-register.md

## 概要

多肢 choice tie 由来の hold を人間解決する際の勝者 choice 表現ギャップ(Issue #1267 = E-TCRCG e4 留保の履行)を、feasibility-assessment.md の GO 判定(再接地後実測)と scope-document.md の Must 5/Won't 5 の範囲で解消する。

## Inception への引き継ぎ物

| 成果物 | 内容 | 消費先 |
| --- | --- | --- |
| scope-document.md | M-1〜M-5 / W-1〜W-5、境界1基準 | RA の FR 導出元 |
| intent-backlog.md | B-1(契約判定+設計選挙 — 最優先)→B-2→B-3 | RA/design の順序 |
| constraint-register.md | C-1〜C-6(e4 並行合意・E-TCRCG 非変更・契約判定・persist-through) | 全 construction 工程 |
| raid-log.md | R-1〜R-3 / A-2(旧 A-1 は再実測で解消済み) | RA 以降で現存再実測 |

## SKIP ステージの N/A 根拠(approval-handoff:c4)

market-research / team-formation / rough-mockups は scope=amadeus の SKIP — 補完しない。編成はユーザー承認済みディスパッチ(02:47Z、4 intent 並列)、UI 不在(CLI 契約のみ)、市場妥当性は E-TCRRA2 既決(tie→hold 経路)の構造必然が代替。リソース確約は Ideation 範囲に限定(c3 — named mob・schedule を捏造しない)。

## リスクと緩和(c1)

- R-1(受理形の型不整合)→ 設計選挙で受理形裁定+判別 union。代替緩和: HOLD_RESOLUTIONS テーブル互換の文字列キー形(choice:N)に限定する案も選挙候補に含める。
- R-3(契約変更該当時の承認遅延)→ B-1 前倒し+park 許容。代替緩和: 該当判定が「追加語彙のみ=非変更」なら RA 内で確定しエスカレーション不要の分岐を明示。
