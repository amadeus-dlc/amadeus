# G004：Bolt の束ね方

## 概要

- 状態: completed
- 対象: Intent `260704-v2-parity-completion` の Delivery Planning
- 反映先: [bolt-plan.md](delivery-planning/bolt-plan.md)

夜間自律進行の事前指示（構築まで自動承認、質問最小化）に基づき、推奨案を自動確定した。

## 確定判断

| ID | 判断 | 状態 | 反映先 | 置き換え先 |
|---|---|---|---|---|
| GD013 | Bolt は 4 個構成にする。B001 は Unit 横断の薄い縦切り（walking skeleton）、B002 以降は関連 Unit の束とする。中間 PR は省略し、Bolt 境界は audit イベントで記録して最終 PR 1 本へ統合する | active | delivery-planning/bolt-plan.md | なし |

## 質問記録

### Q001

- 確認したいこと: Bolt の束ね方。
- 確認が必要な理由: walking skeleton の範囲と、以降の実行単位に効く。
- 推奨回答: 最初だけ薄切り、以降は関連 Unit の束（4 Bolt）。
- 推奨理由: 最大リスクを最初の Bolt で検証し（GD010、GD011 と整合）、以降は検証境界ごとに束ねると DoD が明確になる。
- ユーザー回答: 推奨案を採用（事前の包括承認による自動確定。「中間のPRは無しでOK」の指示を Bolt 境界の運用に反映）。
- 確定判断: GD013
