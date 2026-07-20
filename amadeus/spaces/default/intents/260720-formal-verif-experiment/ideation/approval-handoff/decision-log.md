# Decision Log — 260720-formal-verif-experiment (ideation)

## 上流入力(consumes 全数): intent-statement.md, scope-document.md, intent-backlog.md, feasibility-assessment.md, constraint-register.md

## 裁定一覧(時系列)

| # | 裁定 | 決定者 | 日時(UTC) | 記録先 |
|---|---|---|---|---|
| D-1 | 問題定義 = 停止条件の確立(正しさの判定基準を閉じた集合に) | ユーザー | 2026-07-20(グリリング Q1) | intent-statement.md |
| D-2 | prose ノルムのみでは不十分 — 決定論ツールを AI が機械的に回す構成が必要 | ユーザー | 2026-07-20 | intent-statement.md |
| D-3 | 実験実施(「TLA+の実験を入れよう」) | ユーザー | 2026-07-20 | intent-statement.md(トリガー) |
| D-4 | 実験設計 = 既知欠陥再注入×2アーム対照、全件検出必須→コスト最小 | 6体グリリング収斂+ユーザー承認(leader 台帳登録 04:35Z ack) | 2026-07-20 | intent-statement.md、scope-document.md C-4 |
| D-5 | Alloy は2アーム先行の取りこぼし時のみ(Q1=A) | ユーザー直接裁定 | 2026-07-20T04:40:41Z | intent-capture-questions.md |
| D-6 | JVM ツールは gh-scripts-boundary と同境界(Q2=A) | ユーザー直接裁定 | 2026-07-20T04:40:41Z | intent-capture-questions.md |
| D-7 | 勝者アームは本採用初版として育てる(Q3=A) | ユーザー直接裁定 | 2026-07-20T04:40:41Z | intent-capture-questions.md |
| D-8 | ideation 完了で park、record PR+ミラー Issue、construction はユーザー判断 | ユーザー指示+intent-first ノルム | 2026-07-20 | constraint-register.md C-6/C-8 |
| D-9 | blind 分離(両アームを同一エージェントが書かない)を hard 制約化 | conductor(R-1 緩和、6体一致知見の適用) | 2026-07-20 | scope-document.md C-5 |
| D-10 | 残 ideation ステージの自動進行グラント(未決判断時のみ停止) | ユーザー明示グラント | 2026-07-20T04:45Z 頃 | 会話+各ステージ diary |

## リスク受容と代替緩和(approval-handoff:c1 準拠)

- **R-1 共通モード故障**: 受容せず、blind 分離(D-9)で緩和。代替案(事後クロスチェックのみ)は 6体グリリングの実測(両陣営が共通モードを認めた)に基づき不採用 — 合意済み緩和として raid-log.md R-1 に反映済み
- **R-2 スペック忠実性**: 落ちる実証を各アームの完成条件化(既存ノルムの適用)で緩和 — raid-log.md R-2 反映済み
- **A-3 1日規模見積り(中確信度)**: 超過時は M-1〜M-5 完了を優先し M-6 を翌セッション送りにする段階縮退を許容(新規リスクではなく工程順の保険 — intent-backlog.md の実行順が縮退境界)
