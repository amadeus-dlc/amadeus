# Decision Log — amadeus-mirror ツール(ideation)

上流入力(consumes 全数): intent-statement.md、scope-document.md、intent-backlog.md、feasibility-assessment.md、constraint-register.md

## 決定一覧(ideation 全ステージ)

| # | 決定 | ステージ | 出典 |
|---|---|---|---|
| 1 | 配布形態 = repo ローカル(scripts/)。framework 昇格は別 intent | intent-capture Q1 | intent-capture-questions.md |
| 2 | close = 確認後ツール実行+着地機械検査(不成立 exit 1) | intent-capture Q2 | 同上 |
| 3 | sync = Issue 本文の状態セクション書き換え(一方向) | intent-capture Q3 | 同上 |
| 4 | 成功指標3点(1コマンド起票/定型3要素/close 検査) | intent-capture Q4 | 同上 |
| 5 | クロスレビューは intent birth PR(record PR)で実施、マージが着手前提 | intent-capture Q5 | 同上+norm PR #1159(a74938d2b) |
| 6 | 実現性前提3点確定(gh/状態源/Bun-only)、残リスク=park 可読性 | feasibility Q1 | feasibility-questions.md |
| 7 | 自動発火 = out(手動3コマンドのみ) | scope-definition Q1 | scope-definition-questions.md |
| 8 | intent-mirror ラベル新設 | scope-definition Q2 | 同上 |
| 9 | park 再開条件 = record PR マージ+ユーザー再開指示 | approval-handoff Q1 | approval-handoff-questions.md |

## 却下・保留

- ミラー Issue コメントへの verdict 記載案 — 却下(record PR に一本化、決定5)
- park 状態の正フィールド — design 段へ保留(raid-log R1)
