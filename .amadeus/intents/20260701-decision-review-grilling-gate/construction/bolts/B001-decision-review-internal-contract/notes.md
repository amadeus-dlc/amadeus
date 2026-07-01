# Construction Notes

## 対象タスク

- B001/T001
- B001/T002

## 実行方針

- `amadeus-decision-review` は内部 skill として追加する。
- decision review は判断ゲートであり、質問実行は `amadeus-grilling` に委譲する。
- outcome は `grill_required`、`no_grill`、`repair_only`、`follow_up_issue_candidate` に限定する。
- source skill と昇格先 skill は同じ契約にそろえる。

## 対象外

- `amadeus-grilling` の質問作法は変更しない。
- Grilling Decision Trail の配置は変更しない。
- 既存 Intent 成果物は一括移行しない。

## 実装判断

- `amadeus-decision-review` は source skill と昇格先 skill の両方に新設した。
- skill 本文は判断ゲートに限定し、質問実行を `amadeus-grilling` に委譲する契約にした。
- outcome は `grill_required`、`no_grill`、`repair_only`、`follow_up_issue_candidate` に限定した。

## 検証入口

- `npm run typecheck`
- `npm run diff:check`

## 未確認事項

なし。
