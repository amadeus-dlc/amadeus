# Initiative Brief — 260720-formal-verif-experiment

## 上流入力(consumes 全数): intent-statement.md, scope-document.md, intent-backlog.md, feasibility-assessment.md, constraint-register.md

## エレベータピッチ

選挙 CLI で実測された「仕様の穴」クラスのバグを教材に、**どの決定論的判定器構成(TLA+/TLC vs TS内完結)が実際にこのクラスを検出できるか**を1日規模の対照実験で決着させる。既知欠陥を再注入したブランチ群に両アームを blind 適用し、全件検出必須→コスト最小の基準で勝者を採用。勝者は本採用初版として育て、「新規設計全般に効く停止条件」の土台にする(intent-statement.md の成功指標に対応)。

## 承認内容(この handoff が確約するもの)

- **スコープ**: scope-document.md の Must 6項目(M-1〜M-6)のみ。Won't 5項目(Alloy 条件付き除外、本採用ゲート化、他領域適用、Z3、配布面変更)は実施しない
- **実行計画**: intent-backlog.md の B-1〜B-5(dependency/risk-first 順、blind 分離 hard 制約)
- **実現性**: feasibility-assessment.md の GO 判定(Java/fast-check/対象面/修正 PR 実在は実測済み、TLC 未導入と台帳計数差の⚠2点は construction 前解消クラス)
- **制約**: constraint-register.md C-1〜C-8(JVM 境界、blind 分離、park 後の record PR+ユーザー判断ゲート)

## リソース確約の限定(approval-handoff:c3 準拠)

team-formation は本スコープで SKIP のため、named mob・construction スケジュールをここで捏造しない。本 handoff が確約するリソースは inception の分析(park 解除後に実施する場合)までに限定し、construction の staffing(実装エージェント割当・e2/e4 非交差確認)は delivery-planning 相当の判断時に leader+ユーザーが承認する。

## SKIP ステージの扱い(approval-handoff:c4 準拠)

market-research・team-formation・rough-mockups は amadeus スコープで SKIP。存在しない競合分析・チーム評価・ワイヤーフレームを補完しない。N/A 根拠: 本 intent は repo 内部の工学実験であり、市場・UI・新規チーム編成の入力を持たない。代わりの内部証拠は 6体グリリング証言(実験設計の収斂)と feasibility 実測。後続の decision point は park 解除時のユーザー判断。

## 次のアクション(handoff 先)

1. ideation 完了 → **park**(ユーザー指示)
2. record PR 発行+独立2名レビュー、ミラー Issue 起票(intent-first ノルム)
3. park 解除(ユーザー判断)→ inception(requirements-analysis で欠陥台帳確定 = B-1)へ
