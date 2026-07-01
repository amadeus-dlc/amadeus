# Construction Notes

## 対象タスク

- B001/T001
- B001/T002

## 実行方針

- `amadeus-decision-review` の source skill を先に更新する。
- stage 前提確認は、decision review の入力証拠と判断ノードとして扱う。
- stage2 は stage0 採用判断なしに次回 stage0 として扱わないことを明記する。

## 対象外

- host environment の自動検出は実装しない。
- stage0 採用判断の自動化は行わない。
- GitHub Issue の自動作成は行わない。

## 実装判断

- `upstream_feedback_required` を decision review の outcome に追加した。
- 前提不成立分類は `repair_only`、`upstream_feedback_required`、`follow_up_issue_candidate` の条件で説明した。
- 配布対象 skill には repo 内 Issue 番号を入れず、一般化した説明だけを追加した。

## 検証入口

- `npm run test:it:amadeus-templates`
- `npm run test:it:amadeus-contracts`
- `npm run diff:check`

## 未確認事項

なし。
