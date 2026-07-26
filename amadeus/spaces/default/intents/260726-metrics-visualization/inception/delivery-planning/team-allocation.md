# Team Allocation — metrics 可視化(B1 後続)

上流入力(consumes 全数): requirements.md, components.md, unit-of-work.md, unit-of-work-dependency.md, unit-of-work-story-map.md, team-practices.md

## 体制(ソロモード)

| 役割 | 担当 | 備考 |
|---|---|---|
| conductor / builder | 本セッション(ソロ) | Bolt 1・2 とも直列実行(unit-of-work-dependency.md の DAG に並行余地なし)。team-practices.md の対応表どおり既存 practices の範囲で作業 |
| reviewer | §12a reviewer subagent(独立コンテキスト) | 自己実装の自己レビュー禁止の代替として独立 subagent レビューを適用 |
| 承認者 | ユーザー | walking-skeleton ゲート(Bolt 1)・PR マージ・ラダープロンプト選択 |

## 配分の注記

- Team Formation は SKIP されており、存在しないメンバー・モブ・スケジュールを確約しない(approval-handoff:c3)。本 allocation は実在するソロ体制の記録のみ
- 見積り規模(unit-of-work.md: U1 350〜450行 / U2 250〜380行)は1セッションで完遂可能な範囲。requirements.md AC 表・components.md の T-1/T-2 検証は各 Bolt 内で builder 自身が実行し、reviewer が独立検分する
