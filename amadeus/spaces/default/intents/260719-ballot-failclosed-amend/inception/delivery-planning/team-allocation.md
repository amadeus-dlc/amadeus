# Team Allocation — 260719-ballot-failclosed-amend

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md(検証コマンド・レビュー体制の既決プラクティスは team-practices.md の live 温存版に従う)

## 割当

| 役割 | 担当 | 根拠 |
| --- | --- | --- |
| conductor | e2 | leader ディスパッチ(2026-07-19T15:00:57Z、ユーザー承認済み編成) |
| builder(Bolt 1) | e2 配下の developer subagent(worktree 隔離、同期完遂・逸脱停止・書込範囲の標準文言つき) | subagent-utilization。並行 builder は本 intent では 1(単一 Bolt) |
| reviewer(成果物) | architecture-reviewer subagent(書込禁止+verdict 最終テキストのみ — E-BFAADS13 追補適用) | ステージ宣言 |
| PR レビュアー | 実装者(e2)以外のメンバー — PR 作成時に e2 が先行指名し leader 報告に含める(pr-reviewer-nomination-creator-first) | independent-review-on-pr、自己レビュー禁止 |

## リソース制約

rate-limit-idle-allowance に従い、待機(e1 #1261 着地待ち等)はエラー扱いしない。
